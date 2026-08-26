/**
 * Minimal Stripe REST client for the Worker runtime.
 * Card payments are the international rail: anyone with a card (including
 * Cameroonians) can pay this way, while mobile money stays Cameroon-only.
 */

/** XAF per 1 USD. Used to present a card price for a XAF-denominated booking. */
export const XAF_PER_USD = 620;

export function xafToUsdCents(xaf: number): number {
  // Round up to the nearest cent so the platform never under-collects.
  return Math.max(50, Math.ceil((xaf / XAF_PER_USD) * 100));
}

function key(): string | null {
  const value = process.env["STRIPE_SECRET_KEY"];
  return value && value.length > 10 ? value : null;
}

async function stripeRequest(
  path: string,
  init?: { method?: string; body?: URLSearchParams },
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const secret = key();
  if (!secret) return { ok: false, status: 0, data: { error: { message: "STRIPE_NOT_CONFIGURED" } } };

  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: init?.body,
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

    const result = await stripeRequest("checkout/sessions", { method: "POST", body });
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

    return { ok: true, configured: true, status, paymentIntentId, error: null };
  },
};
