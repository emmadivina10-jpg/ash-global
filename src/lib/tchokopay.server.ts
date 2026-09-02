/**
 * TchokoPay Merchant API (Connect) adapter — server only.
 *
 * Base: https://connect.tchokopay.com/v1
 *   POST /collect/charge      direct mobile-money collection (prompt on the payer's phone)
 *   GET  /collect/{reference} authoritative status of a collection
 *   GET  /account/providers   the networks we may charge
 *
 * Reference model (do not blur these two):
 *   merchantReference — OURS. `ACT-…`, `BKG-…`, `PLK-…`. Stored in payment_reference.
 *   reference         — THEIRS. `REQ-…`. Stored in provider_transaction_id.
 *
 * Secrets (server env only):
 *   TCHOKOPAY_API_KEY         tchoko_live_… / tchoko_test_…
 *   TCHOKOPAY_WEBHOOK_SECRET  whsec_… (HMAC-SHA256 over `timestamp.rawBody`)
 *   TCHOKOPAY_CONNECT_URL     optional base override
 *   TCHOKOPAY_BASE_URL        legacy API base, only used to settle pre-migration payments
 *
 * Without an API key the adapter refuses to charge and NEVER reports success.
 */

export type PaymentStatus = "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "CANCELLED";
export type FailureCategory = "ABANDONED" | "DECLINED" | "SYSTEM" | null;

export interface ChargeInput {
  /** Our identifier, echoed back by TchokoPay everywhere. */
  merchantReference: string;
  amount: number;
  currency: string;
  /** ISO country of the phone number, e.g. "CM". */
  country: string;
  /** Network code from GET /account/providers, e.g. "mtn_cm". */
  provider: string;
  /** Local-format mobile money number. */
  phone: string;
  description?: string;
}

export interface ChargeResult {
  ok: boolean;
  configured: boolean;
  status: PaymentStatus;
  /** TchokoPay's REQ- reference. Present when ok. */
  providerReference?: string | undefined;
  /** Stable error code to branch on (INVALID_REQUEST, FORBIDDEN, …). */
  error?: string | undefined;
  /** Human-readable provider message, safe to show. */
  message?: string | undefined;
  param?: string | undefined;
}

export interface CollectionResult {
  ok: boolean;
  configured: boolean;
  status: PaymentStatus;
  providerReference?: string | undefined;
  merchantReference?: string | undefined;
  failureCategory?: FailureCategory;
  error?: string | undefined;
  message?: string | undefined;
}

export interface ProviderOption {
  provider: string;
  name: string;
  method: string;
  country: string;
}

export interface WebhookResult {
  valid: boolean;
  /** True only when the HMAC signature was cryptographically verified. */
  signatureVerified: boolean;
  event?: string | undefined;
  /** TchokoPay's REQ-/PO- reference (webhook field `invoiceReference`). */
  providerReference?: string | undefined;
  merchantReference?: string | undefined;
  status?: PaymentStatus | undefined;
  failureReason?: string | undefined;
  error?: string | undefined;
  /** True for disburse.* deliveries, which carry a different body. */
  isDisbursement?: boolean;
}

function config() {
  return {
    apiKey: process.env["TCHOKOPAY_API_KEY"] ?? "",
    webhookSecret: process.env["TCHOKOPAY_WEBHOOK_SECRET"] ?? "",
    baseUrl: (process.env["TCHOKOPAY_CONNECT_URL"] ?? "https://connect.tchokopay.com/v1").replace(/\/$/, ""),
    legacyBaseUrl: (process.env["TCHOKOPAY_BASE_URL"] ?? "").replace(/\/$/, ""),
  };
}

/** Maps every documented lifecycle state onto the vocabulary the app stores. */
export function mapStatus(raw: unknown): PaymentStatus {
  const value = String(raw ?? "").toUpperCase();
  if (["SUCCESS", "SUCCEEDED", "PAID", "COMPLETED", "CONFIRMED"].includes(value)) return "PAID";
  if (["FAILED", "ERROR", "DECLINED", "REFUSED"].includes(value)) return "FAILED";
  if (["CANCELLED", "CANCELED", "EXPIRED"].includes(value)) return "CANCELLED";
  if (["PROCESSING", "IN_PROGRESS", "SENT"].includes(value)) return "PROCESSING";
  return "PENDING";
}

function mapFailureCategory(raw: unknown): FailureCategory {
  const value = String(raw ?? "").toUpperCase();
  return value === "ABANDONED" || value === "DECLINED" || value === "SYSTEM" ? value : null;
}

/** Local format is what the API expects: strip spaces, punctuation and the country code. */
export function normalizePhone(phone: string, country = "CM"): string {
  const digits = String(phone ?? "").replace(/\D+/g, "");
  const dialing: Record<string, string> = { CM: "237", NG: "234", CI: "225", SN: "221", GA: "241" };
  const code = dialing[country.toUpperCase()];
  if (code && digits.startsWith(code) && digits.length > code.length + 6) return digits.slice(code.length);
  return digits;
}

async function hmacHex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

type ApiError = { code?: string; message?: string; param?: string };

async function request(
  path: string,
  init: RequestInit & { idempotencyKey?: string },
): Promise<{ ok: boolean; status: number; data: Record<string, unknown>; list: unknown[] | null; error: ApiError }> {
  const { apiKey, baseUrl } = config();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
  };
  if (init.body) headers["Content-Type"] = "application/json";
  if (init.idempotencyKey) headers["Idempotency-Key"] = init.idempotencyKey.slice(0, 200);

  const res = await fetch(`${baseUrl}${path}`, { ...init, headers: { ...headers, ...(init.headers ?? {}) } });
  const parsed: unknown = await res.json().catch(() => ({}));
  const list = Array.isArray(parsed) ? parsed : null;
  const data = (list ? {} : (parsed as Record<string, unknown>)) ?? {};

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      data,
      list,
      error: {
        code: String(data["code"] ?? (res.status === 401 ? "UNAUTHORIZED" : `PROVIDER_HTTP_${res.status}`)),
        ...(typeof data["message"] === "string" ? { message: data["message"] as string } : {}),
        ...(typeof data["param"] === "string" ? { param: data["param"] as string } : {}),
      },
    };
  }
  return { ok: true, status: res.status, data, list, error: {} };
}

let providerCache: { at: number; value: ProviderOption[] } | null = null;

const PROVIDER_NAMES: Record<string, string> = {
  mtn_cm: "MTN MoMo",
  orange_cm: "Orange Money",
};

export const tchokoPay = {
  isConfigured(): boolean {
    return config().apiKey.length > 0;
  },

  webhookSecretConfigured(): boolean {
    return config().webhookSecret.length > 0;
  },

  /** GET /account/providers — the network picker is built from this, never hardcoded. */
  async listProviders(country?: string): Promise<{ ok: boolean; configured: boolean; providers: ProviderOption[] }> {
    if (!this.isConfigured()) return { ok: false, configured: false, providers: [] };

    const fresh = providerCache && Date.now() - providerCache.at < 5 * 60_000 ? providerCache.value : null;
    let all = fresh;

    if (!all) {
      try {
        const res = await request("/account/providers", { method: "GET" });
        if (!res.ok || !res.list) return { ok: false, configured: true, providers: [] };
        all = res.list
          .map((row) => row as Record<string, unknown>)
          .filter((row) => row["available"] !== false)
          .map((row) => {
            const code = String(row["providerCode"] ?? row["provider"] ?? "");
            return {
              provider: code,
              name: String(row["name"] ?? PROVIDER_NAMES[code] ?? code.replace(/_/g, " ").toUpperCase()),
              method: String(row["method"] ?? "MOBILE_MONEY"),
              country: String(row["country"] ?? "").toUpperCase(),
            };
          })
          .filter((row) => row.provider.length > 0);
        providerCache = { at: Date.now(), value: all };
      } catch {
        return { ok: false, configured: true, providers: [] };
      }
    }

    const filtered = country ? all.filter((p) => p.country === country.toUpperCase()) : all;
    return { ok: true, configured: true, providers: filtered.length ? filtered : all };
  },

  /** POST /collect/charge — pushes a prompt to the payer's phone. Nobody has paid yet. */
  async createCharge(input: ChargeInput): Promise<ChargeResult> {
    if (!this.isConfigured()) {
      return { ok: false, configured: false, status: "PENDING", error: "PAYMENT_PROVIDER_NOT_CONFIGURED" };
    }

    const phone = normalizePhone(input.phone, input.country);
    if (phone.length < 8) {
      return { ok: false, configured: true, status: "FAILED", error: "INVALID_REQUEST", param: "phone" };
    }

    try {
      const res = await request("/collect/charge", {
        method: "POST",
        idempotencyKey: input.merchantReference,
        body: JSON.stringify({
          amount: input.amount,
          currency: input.currency,
          country: input.country.toUpperCase(),
          provider: input.provider,
          phone,
          merchantReference: input.merchantReference,
          ...(input.description ? { description: input.description.slice(0, 120) } : {}),
        }),
      });

      if (!res.ok) {
        return {
          ok: false,
          configured: true,
          status: "FAILED",
          error: res.error.code ?? "PAYMENT_START_FAILED",
          message: res.error.message ?? undefined,
          param: res.error.param ?? undefined,
        };
      }

      return {
        ok: true,
        configured: true,
        status: mapStatus(res.data["status"]),
        providerReference: String(res.data["reference"] ?? ""),
      };
    } catch (error) {
      return {
        ok: false,
        configured: true,
        status: "PENDING",
        error: "PROVIDER_UNREACHABLE",
        message: error instanceof Error ? error.message : undefined,
      };
    }
  },

  /** GET /collect/{reference} — the only source of truth for "did it clear?". */
  async getCollection(providerReference: string): Promise<CollectionResult> {
    if (!this.isConfigured()) {
      return { ok: false, configured: false, status: "PENDING", error: "PAYMENT_PROVIDER_NOT_CONFIGURED" };
    }
    if (!providerReference) return { ok: false, configured: true, status: "PENDING", error: "NOT_FOUND" };

    try {
      const res = await request(`/collect/${encodeURIComponent(providerReference)}`, { method: "GET" });
      if (!res.ok) {
        return {
          ok: false,
          configured: true,
          status: "PENDING",
          error: res.error.code ?? "PROVIDER_ERROR",
          message: res.error.message ?? undefined,
        };
      }
      return {
        ok: true,
        configured: true,
        status: mapStatus(res.data["status"]),
        providerReference: String(res.data["reference"] ?? providerReference),
        merchantReference: (res.data["merchantReference"] as string | undefined) ?? undefined,
        failureCategory: mapFailureCategory(res.data["failureCategory"]),
      };
    } catch (error) {
      return {
        ok: false,
        configured: true,
        status: "PENDING",
        error: "PROVIDER_UNREACHABLE",
        message: error instanceof Error ? error.message : undefined,
      };
    }
  },

  /**
   * Pre-migration payments were created on the old API, where our own reference
   * was the lookup key. Only used to drain leftovers; never for new charges.
   */
  async verifyLegacyPayment(reference: string): Promise<CollectionResult> {
    const { apiKey, legacyBaseUrl } = config();
    if (!apiKey || !legacyBaseUrl) {
      return { ok: false, configured: false, status: "PENDING", error: "LEGACY_API_NOT_CONFIGURED" };
    }
    try {
      const res = await fetch(`${legacyBaseUrl}/v1/payments/${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        return { ok: false, configured: true, status: "PENDING", error: `PROVIDER_HTTP_${res.status}` };
      }
      return {
        ok: true,
        configured: true,
        status: mapStatus(data["status"]),
        providerReference: (data["reference"] as string | undefined) ?? reference,
      };
    } catch {
      return { ok: false, configured: true, status: "PENDING", error: "PROVIDER_UNREACHABLE" };
    }
  },

  /**
   * Verifies and parses a webhook delivery.
   *
   * HMAC-SHA256 over `${timestamp}.${rawBody}`, compared against
   * X-TchokoPay-Signature. Deliveries older than five minutes are rejected even
   * with a valid signature, so a captured delivery cannot be replayed later.
   */
  async handleWebhook(rawBody: string, headers: Headers): Promise<WebhookResult> {
    const { webhookSecret } = config();
    const event = headers.get("x-tchokopay-event") ?? undefined;

    let signatureVerified = false;
    if (webhookSecret) {
      const signature = (headers.get("x-tchokopay-signature") ?? "").replace(/^sha256=/i, "").toLowerCase();
      const timestamp = headers.get("x-tchokopay-timestamp") ?? "";
      if (!signature || !timestamp) {
        return { valid: false, signatureVerified: false, error: "MISSING_SIGNATURE", event };
      }
      const age = Math.abs(Date.now() / 1000 - Number(timestamp));
      if (!Number.isFinite(age) || age > 300) {
        return { valid: false, signatureVerified: false, error: "STALE_DELIVERY", event };
      }
      const expected = await hmacHex(webhookSecret, `${timestamp}.${rawBody}`);
      if (!timingSafeEqual(signature, expected)) {
        return { valid: false, signatureVerified: false, error: "INVALID_SIGNATURE", event };
      }
      signatureVerified = true;
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return { valid: false, signatureVerified, error: "INVALID_JSON", event };
    }

    const name = String(event ?? payload["event"] ?? "");
    // Disbursement deliveries wrap their fields in `data` and use `reference`.
    if (name.startsWith("disburse.") || name.startsWith("payout.")) {
      const body = (payload["data"] as Record<string, unknown> | undefined) ?? payload;
      return {
        valid: true,
        signatureVerified,
        event: name,
        isDisbursement: true,
        providerReference: (body["reference"] as string | undefined) ?? undefined,
        merchantReference: (body["merchantReference"] as string | undefined) ?? undefined,
        status: mapStatus(body["status"]),
      };
    }

    const body = (payload["data"] as Record<string, unknown> | undefined) ?? payload;
    return {
      valid: true,
      signatureVerified,
      event: name || undefined,
      isDisbursement: false,
      // Collection deliveries name TchokoPay's own reference `invoiceReference`.
      providerReference: (body["invoiceReference"] ?? body["reference"]) as string | undefined,
      merchantReference: (body["merchantReference"] as string | undefined) ?? undefined,
      status: mapStatus(body["status"]),
      failureReason: (body["failureReason"] as string | undefined) ?? undefined,
    };
  },
};
