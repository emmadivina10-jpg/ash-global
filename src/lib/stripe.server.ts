/**
 * Minimal Stripe REST client for the Worker runtime.
 * Card payments are the international rail: anyone with a card (including
 * Cameroonians) can pay this way, while mobile money stays Cameroon-only.
 */

/** XAF per 1 USD. Used to present a card price for a XAF-denominated booking. */
import { LIVE_PROVIDER_TRANSFERS_ENABLED, LIVE_PROVIDER_ONBOARDING_ENABLED } from "./stripe-release-policy";
export const XAF_PER_USD = 620;

export function xafToUsdCents(xaf: number): number {
  // Round up to the nearest cent so the platform never under-collects.
  return Math.max(50, Math.ceil((xaf / XAF_PER_USD) * 100));
}

function key(): string | null {
  const value = process.env["STRIPE_SECRET_KEY"];
  return value && (value.startsWith("sk_live_") || value.startsWith("rk_live_")) ? value : null;
}

async function stripeRequest(
  path: string,
  init?: { method?: string; body?: URLSearchParams; idempotencyKey?: string; connectedAccount?: string },
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const secret = key();
  if (!secret) return { ok: false, status: 0, data: { error: { message: "STRIPE_NOT_CONFIGURED" } } };

  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
      ...(init?.idempotencyKey ? { "Idempotency-Key": init.idempotencyKey } : {}),
      ...(init?.connectedAccount ? { "Stripe-Account": init.connectedAccount } : {}),
    },
    ...(init?.body ? { body: init.body } : {}),
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: response.ok, status: response.status, data };
}

export type StripeSession = {
  ok: boolean;
  configured: boolean;
  id: string | null;
  checkoutUrl: string | null;
  error: string | null;
};

export const stripePay = {
  configured(): boolean {
    return key() !== null;
  },

  async createCheckoutSession(input: {
    reference: string;
    amountCents: number;
    currency: string;
    description: string;
    email?: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
  }): Promise<StripeSession> {
    if (!key()) {
      return { ok: false, configured: false, id: null, checkoutUrl: null, error: "STRIPE_NOT_CONFIGURED" };
    }

    const body = new URLSearchParams();
    body.set("mode", "payment");
    body.set("client_reference_id", input.reference);
    body.set("success_url", input.successUrl);
    body.set("cancel_url", input.cancelUrl);
    body.set("line_items[0][quantity]", "1");
    body.set("line_items[0][price_data][currency]", input.currency.toLowerCase());
    body.set("line_items[0][price_data][unit_amount]", String(input.amountCents));
    body.set("line_items[0][price_data][product_data][name]", input.description.slice(0, 120));
    if (input.email) body.set("customer_email", input.email);
    body.set("metadata[reference]", input.reference);
    for (const [k, v] of Object.entries(input.metadata ?? {})) body.set(`metadata[${k}]`, v);

    const result = await stripeRequest("checkout/sessions", { method: "POST", body, idempotencyKey: `ash_checkout_${input.reference}` });
    if (!result.ok) {
      const err = result.data["error"] as { message?: string } | undefined;
      return { ok: false, configured: true, id: null, checkoutUrl: null, error: err?.message ?? "STRIPE_ERROR" };
    }
    return {
      ok: true,
      configured: true,
      id: (result.data["id"] as string) ?? null,
      checkoutUrl: (result.data["url"] as string) ?? null,
      error: null,
    };
  },

  /** Verifies a checkout session server-side. Stripe is the source of truth. */
  async verifySession(sessionId: string): Promise<{
    ok: boolean;
    configured: boolean;
    status: "PAID" | "PENDING" | "FAILED" | "CANCELLED";
    paymentIntentId: string | null;
    error: string | null;
    amountTotal?: number | null;
    currency?: string | null;
    reference?: string | null;
  }> {
    if (!key()) {
      return { ok: false, configured: false, status: "PENDING", paymentIntentId: null, error: "STRIPE_NOT_CONFIGURED" };
    }
    const result = await stripeRequest(`checkout/sessions/${encodeURIComponent(sessionId)}`);
    if (!result.ok) {
      const err = result.data["error"] as { message?: string } | undefined;
      return { ok: false, configured: true, status: "PENDING", paymentIntentId: null, error: err?.message ?? "STRIPE_ERROR" };
    }
    const paymentStatus = result.data["payment_status"] as string | undefined;
    const sessionStatus = result.data["status"] as string | undefined;
    const intent = result.data["payment_intent"];
    const paymentIntentId = typeof intent === "string" ? intent : null;

    const status: "PAID" | "PENDING" | "FAILED" | "CANCELLED" =
      paymentStatus === "paid"
        ? "PAID"
        : sessionStatus === "expired"
          ? "CANCELLED"
          : "PENDING";

    return {
      ok: true, configured: true, status, paymentIntentId, error: null,
      amountTotal: typeof result.data["amount_total"] === "number" ? (result.data["amount_total"] as number) : null,
      currency: typeof result.data["currency"] === "string" ? (result.data["currency"] as string) : null,
      reference: typeof result.data["client_reference_id"] === "string" ? (result.data["client_reference_id"] as string) : null,
    };
  },
};

/* ------------------------------------------------------------------ */
/* Stripe Connect — provider bank payouts                              */
/* ------------------------------------------------------------------ */

export type ConnectStatus = {
  country?: string;
  transfersActive?: boolean;
  configured: boolean;
  accountId: string | null;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
  requirementsDue: string[];
  error: string | null;
};

const EMPTY_CONNECT: ConnectStatus = {
  configured: false,
  accountId: null,
  detailsSubmitted: false,
  payoutsEnabled: false,
  requirementsDue: [],
  error: "STRIPE_NOT_CONFIGURED",
};

function readAccount(data: Record<string, unknown>): ConnectStatus {
  const requirements = (data["requirements"] as { currently_due?: string[] } | undefined) ?? {};
  return {
    configured: true,
    country: typeof data["country"] === "string" ? data["country"] : "",
    transfersActive: (data["capabilities"] as Record<string, unknown> | undefined)?.["transfers"] === "active",
    accountId: (data["id"] as string) ?? null,
    detailsSubmitted: data["details_submitted"] === true,
    payoutsEnabled: data["payouts_enabled"] === true,
    requirementsDue: requirements.currently_due ?? [],
    error: null,
  };
}

export const stripeConnect = {
  configured(): boolean {
    return key() !== null;
  },

  /** Creates an Express connected account. ASH never sees the bank details. */
  async createAccount(input: { email: string; country: string; userId: string }): Promise<ConnectStatus> {
    if (!LIVE_PROVIDER_ONBOARDING_ENABLED) return { ...EMPTY_CONNECT, error: "ONBOARDING_AWAITING_APPROVAL" };
    if (!key()) return EMPTY_CONNECT;
    const body = new URLSearchParams();
    body.set("type", "express");
    body.set("country", input.country.toUpperCase());
    body.set("email", input.email);
    body.set("capabilities[transfers][requested]", "true");
    body.set("business_type", "individual");

    const result = await stripeRequest("accounts", { method: "POST", body, idempotencyKey: `ash_provider_${input.userId}` });
    if (!result.ok) {
      const err = result.data["error"] as { message?: string } | undefined;
      return { ...EMPTY_CONNECT, configured: true, error: err?.message ?? "STRIPE_ERROR" };
    }
    return readAccount(result.data);
  },

  async getAccount(accountId: string): Promise<ConnectStatus> {
    if (!key()) return EMPTY_CONNECT;
    const result = await stripeRequest(`accounts/${encodeURIComponent(accountId)}`);
    if (!result.ok) {
      const err = result.data["error"] as { message?: string } | undefined;
      return { ...EMPTY_CONNECT, configured: true, error: err?.message ?? "STRIPE_ERROR" };
    }
    return readAccount(result.data);
  },

  /** Hosted onboarding link — the only place bank details are ever entered. */
  async onboardingLink(input: {
    accountId: string;
    refreshUrl: string;
    returnUrl: string;
  }): Promise<{ ok: boolean; url: string | null; error: string | null }> {
    if (!key()) return { ok: false, url: null, error: "STRIPE_NOT_CONFIGURED" };
    const body = new URLSearchParams();
    body.set("account", input.accountId);
    body.set("refresh_url", input.refreshUrl);
    body.set("return_url", input.returnUrl);
    body.set("type", "account_onboarding");

    const result = await stripeRequest("account_links", { method: "POST", body });
    if (!result.ok) {
      const err = result.data["error"] as { message?: string } | undefined;
      return { ok: false, url: null, error: err?.message ?? "STRIPE_ERROR" };
    }
    return { ok: true, url: (result.data["url"] as string) ?? null, error: null };
  },

  /** Express dashboard link for a provider who already finished onboarding. */
  async loginLink(accountId: string): Promise<{ ok: boolean; url: string | null; error: string | null }> {
    if (!key()) return { ok: false, url: null, error: "STRIPE_NOT_CONFIGURED" };
    const result = await stripeRequest(`accounts/${encodeURIComponent(accountId)}/login_links`, {
      method: "POST",
      body: new URLSearchParams(),
    });
    if (!result.ok) {
      const err = result.data["error"] as { message?: string } | undefined;
      return { ok: false, url: null, error: err?.message ?? "STRIPE_ERROR" };
    }
    return { ok: true, url: (result.data["url"] as string) ?? null, error: null };
  },

  /**
   * Moves money to a connected account. `idempotencyKey` is the withdrawal
   * reference, so a retried settlement can never pay twice.
   */
  async transfer(input: {
    accountId: string;
    amountCents: number;
    currency: string;
    idempotencyKey: string;
    description?: string;
    sourceTransaction?: string;
    /** Per-attempt request key; transfer_group stays the stable idempotencyKey. */
    requestKey?: string | undefined;
  }): Promise<{ ok: boolean; transferId: string | null; error: string | null; httpStatus?: number; errorCode?: string }> {
    if (!LIVE_PROVIDER_TRANSFERS_ENABLED) return { ok: false, transferId: null, error: "TRANSFERS_AWAITING_APPROVAL" };
    const secret = key();
    if (!secret) return { ok: false, transferId: null, error: "STRIPE_NOT_CONFIGURED" };

    const body = new URLSearchParams();
    body.set("amount", String(input.amountCents));
    body.set("currency", input.currency.toLowerCase());
    body.set("destination", input.accountId);
    body.set("transfer_group", input.idempotencyKey);
    if (input.sourceTransaction) body.set("source_transaction", input.sourceTransaction);
    if (input.description) body.set("description", input.description.slice(0, 200));

    const response = await fetch("https://api.stripe.com/v1/transfers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": `wd_${input.requestKey ?? input.idempotencyKey}`,
      },
      body,
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const err = data["error"] as { code?: string } | undefined;
      return { ok: false, transferId: null, error: "STRIPE_TRANSFER_REJECTED", httpStatus: response.status, errorCode: err?.code ?? "" };
    }
    const transferId = typeof data["id"] === "string" && data["id"].startsWith("tr_") ? data["id"] : null;
    return transferId ? { ok: true, transferId, error: null } : { ok: false, transferId: null, error: "TRANSFER_RESPONSE_INVALID" };
  },
};

/** Server-only read helper for reconciliation; never returns credentials. */
export async function stripeRead(path: string, connectedAccount?: string): Promise<Record<string, unknown>> {
  const result = await stripeRequest(path, connectedAccount ? { connectedAccount } : undefined);
  if (!result.ok) throw new Error("STRIPE_READ_FAILED");
  return result.data;
}

/* ------------------------------------------------------------------ */
/* Webhook signature verification (Stripe-Signature, v1 HMAC-SHA256)   */
/* ------------------------------------------------------------------ */

export async function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string,
  toleranceSeconds = 300,
): Promise<boolean> {
  if (!header || !secret) return false;
  const parts = header.split(",").map((p) => p.trim().split("=") as [string, string]);
  const timestamp = parts.find(([k]) => k === "t")?.[1];
  const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!timestamp || signatures.length === 0) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) return false;

  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(`${timestamp}.${payload}`));
  const expected = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return signatures.some((sig) => {
    if (sig.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
    return diff === 0;
  });
}

/** True only for a live-mode secret key (sk_live_ / rk_live_). */
export function stripeIsLive(): boolean {
  const value = process.env["STRIPE_SECRET_KEY"] ?? "";
  return value.startsWith("sk_live_") || value.startsWith("rk_live_");
}
