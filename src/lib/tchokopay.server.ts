/**
 * TchokoPay payment service (server-only).
 *
 * The rest of the application only depends on the PaymentService interface below,
 * so the exact TchokoPay endpoints/payloads can be adjusted from their official
 * documentation without touching any other part of the app.
 *
 * Secrets are read from server environment variables only:
 *   TCHOKOPAY_API_KEY, TCHOKOPAY_SECRET, TCHOKOPAY_BASE_URL
 *
 * If credentials are absent the service runs in DEVELOPMENT MODE: it refuses to
 * create payments and NEVER reports a payment as successful.
 */

export type PaymentStatus = "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "CANCELLED";

export interface CreatePaymentInput {
  reference: string;
  amount: number;
  currency: string;
  description: string;
  customer: { name: string; email: string; phone: string };
  callbackUrl: string;
  returnUrl: string;
}

export interface CreatePaymentResult {
  ok: boolean;
  configured: boolean;
  reference: string;
  checkoutUrl?: string | undefined;
  providerTransactionId?: string | undefined;
  status: PaymentStatus;
  error?: string | undefined;
}

export interface VerifyPaymentResult {
  ok: boolean;
  configured: boolean;
  status: PaymentStatus;
  providerTransactionId?: string | undefined;
  error?: string | undefined;
}

export interface WebhookResult {
  valid: boolean;
  reference?: string | undefined;
  providerTransactionId?: string | undefined;
  status?: PaymentStatus | undefined;
  error?: string | undefined;
}

export interface PaymentService {
  isConfigured(): boolean;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyPayment(reference: string): Promise<VerifyPaymentResult>;
  handleWebhook(rawBody: string, headers: Headers): Promise<WebhookResult>;
}

function config() {
  return {
    apiKey: process.env["TCHOKOPAY_API_KEY"] ?? "",
    secret: process.env["TCHOKOPAY_SECRET"] ?? "",
    baseUrl: (process.env["TCHOKOPAY_BASE_URL"] ?? "https://api.tchokopay.com").replace(/\/$/, ""),
  };
}

function mapStatus(raw: unknown): PaymentStatus {
  const value = String(raw ?? "").toUpperCase();
  if (["PAID", "SUCCESS", "SUCCEEDED", "COMPLETED", "CONFIRMED"].includes(value)) return "PAID";
  if (["FAILED", "ERROR", "DECLINED"].includes(value)) return "FAILED";
  if (["CANCELLED", "CANCELED", "EXPIRED"].includes(value)) return "CANCELLED";
  if (["PROCESSING", "IN_PROGRESS"].includes(value)) return "PROCESSING";
  return "PENDING";
}

async function hmacHex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
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

export const tchokoPay: PaymentService = {
  isConfigured() {
    const { apiKey, secret } = config();
    return apiKey.length > 0 && secret.length > 0;
  },

  async createPayment(input) {
    const { apiKey, baseUrl } = config();
    if (!this.isConfigured()) {
      return {
        ok: false,
        configured: false,
        reference: input.reference,
        status: "PENDING",
        error: "PAYMENT_PROVIDER_NOT_CONFIGURED",
      };
    }

    try {
      const res = await fetch(`${baseUrl}/v1/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          reference: input.reference,
          amount: input.amount,
          currency: input.currency,
          description: input.description,
          customer: input.customer,
          callback_url: input.callbackUrl,
          return_url: input.returnUrl,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        return {
          ok: false,
          configured: true,
          reference: input.reference,
          status: "FAILED",
          error: String(data["message"] ?? `PROVIDER_HTTP_${res.status}`),
        };
      }

      return {
        ok: true,
        configured: true,
        reference: input.reference,
        checkoutUrl: (data["checkout_url"] ?? data["payment_url"] ?? data["url"]) as string | undefined,
        providerTransactionId: (data["transaction_id"] ?? data["id"]) as string | undefined,
        status: mapStatus(data["status"]),
      };
    } catch (error) {
      return {
        ok: false,
        configured: true,
        reference: input.reference,
        status: "FAILED",
        error: error instanceof Error ? error.message : "PROVIDER_UNREACHABLE",
      };
    }
  },

  async verifyPayment(reference) {
    const { apiKey, baseUrl } = config();
    if (!this.isConfigured()) {
      return { ok: false, configured: false, status: "PENDING", error: "PAYMENT_PROVIDER_NOT_CONFIGURED" };
    }
    try {
      const res = await fetch(`${baseUrl}/v1/payments/${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) {
        return {
          ok: false,
          configured: true,
          status: "PENDING",
          error: String(data["message"] ?? `PROVIDER_HTTP_${res.status}`),
        };
      }
      return {
        ok: true,
        configured: true,
        status: mapStatus(data["status"]),
        providerTransactionId: (data["transaction_id"] ?? data["id"]) as string | undefined,
      };
    } catch (error) {
      return {
        ok: false,
        configured: true,
        status: "PENDING",
        error: error instanceof Error ? error.message : "PROVIDER_UNREACHABLE",
      };
    }
  },

  async handleWebhook(rawBody, headers) {
    const { secret } = config();
    if (!secret) return { valid: false, error: "PAYMENT_PROVIDER_NOT_CONFIGURED" };

    const signature =
      headers.get("x-tchokopay-signature") ?? headers.get("x-signature") ?? "";
    if (!signature) return { valid: false, error: "MISSING_SIGNATURE" };

    const expected = await hmacHex(secret, rawBody);
    if (!timingSafeEqual(signature.toLowerCase().replace(/^sha256=/, ""), expected)) {
      return { valid: false, error: "INVALID_SIGNATURE" };
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return { valid: false, error: "INVALID_JSON" };
    }

    const data = (payload["data"] as Record<string, unknown> | undefined) ?? payload;
    return {
      valid: true,
      reference: (data["reference"] ?? data["payment_reference"]) as string | undefined,
      providerTransactionId: (data["transaction_id"] ?? data["id"]) as string | undefined,
      status: mapStatus(data["status"]),
    };
  },
};
