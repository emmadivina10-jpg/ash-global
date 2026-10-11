/**
 * One place where a verified TchokoPay collection outcome becomes app state.
 *
 * Callers (webhook, reconciliation job, "I have paid" checks) must already have
 * confirmed the outcome with TchokoPay — this module only applies it. Every
 * completion runs through an idempotent database function, so replays are safe.
 */
import type { PaymentStatus } from "./tchokopay.server";

export type SettlementKind = "ACTIVATION" | "BOOKING" | "PAYMENT_LINK" | "EVENT_TICKET" | "PROMOTION" | "VERIFICATION" | "CLEAN" | "WALLET_TOPUP";

export function kindOf(merchantReference: string): SettlementKind {
  if (merchantReference.startsWith("BKG-")) return "BOOKING";
  if (merchantReference.startsWith("PLK-")) return "PAYMENT_LINK";
  if (merchantReference.startsWith("EVT-")) return "EVENT_TICKET";
  if (merchantReference.startsWith("PRM-")) return "PROMOTION";
  if (merchantReference.startsWith("VER-")) return "VERIFICATION";
  if (merchantReference.startsWith("CLN-")) return "CLEAN";
  if (merchantReference.startsWith("TOP-")) return "WALLET_TOPUP";
  return "ACTIVATION";
}

/**
 * Finds our merchant reference from TchokoPay's REQ- reference by looking at the
 * provider reference we stored when the charge was created.
 */
export async function findMerchantReference(providerReference: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [activation, booking, link, ticket, promotion, verification] = await Promise.all([
    supabaseAdmin
      .from("activations")
      .select("payment_reference")
      .eq("provider_transaction_id", providerReference)
      .maybeSingle(),
    supabaseAdmin
      .from("bookings")
      .select("payment_reference")
      .eq("provider_transaction_id", providerReference)
      .maybeSingle(),
    supabaseAdmin
      .from("payment_link_charges")
      .select("reference")
      .eq("provider_transaction_id", providerReference)
      .maybeSingle(),
    supabaseAdmin
      .from("event_tickets")
      .select("payment_reference")
      .eq("provider_transaction_id", providerReference)
      .maybeSingle(),
    supabaseAdmin
      .from("promotions")
      .select("payment_reference")
      .eq("provider_transaction_id", providerReference)
      .maybeSingle(),
    supabaseAdmin
      .from("verifications")
      .select("payment_reference")
      .eq("provider_transaction_id", providerReference)
      .maybeSingle(),
  ]);

  return (
    activation.data?.payment_reference ??
    booking.data?.payment_reference ??
    link.data?.reference ??
    ticket.data?.payment_reference ??
    promotion.data?.payment_reference ??
    verification.data?.payment_reference ??
    null
  );
}

export type SettleInput = {
  merchantReference: string;
  providerReference: string | null;
  status: PaymentStatus;
  source: string;
  signatureVerified?: boolean;
  detail?: Record<string, unknown>;
};

export type SettleOutcome = {
  ok: boolean;
  kind: SettlementKind;
  outcome: string;
  error?: string;
};

export async function settleCollection(input: SettleInput): Promise<SettleOutcome> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const kind = kindOf(input.merchantReference);
  const providerRef = (input.providerReference ?? null) as unknown as string;
  let outcome: string = input.status;
  let ok = true;
  let error: string | undefined;

  if (input.status === "PAID") {
    if (kind === "BOOKING" && input.source === "STRIPE_WEBHOOK") {
      if (!input.signatureVerified) return { ok: false, kind, outcome: "UNVERIFIED", error: "UNVERIFIED" };
      // Atomic verified-payment and payable registration; no wallet transfer proof.
      const db = supabaseAdmin as import("@supabase/supabase-js").SupabaseClient;
      const { data, error: verifiedError } = await db.rpc("register_verified_stripe_booking", {
        _reference: input.merchantReference, _intent: input.providerReference, _evidence: input.detail ?? {},
      });
      if (verifiedError || data?.ok !== true) return { ok: false, kind, outcome: "COMPLETE_FAILED", error: "VERIFIED_BOOKING_SETTLEMENT_FAILED" };
    }
    if (kind === "WALLET_TOPUP" && typeof input.providerReference === "string" && input.providerReference.startsWith("pi_")) {
      // Card money is held in the currency Stripe actually settled (e.g. CAD), never converted into XAF.
      const settled = await stripeSettledAmount(input.providerReference);
      if (!settled) return { ok: false, kind, outcome: "COMPLETE_FAILED", error: "STRIPE_SETTLEMENT_UNREADABLE" };
      const db = supabaseAdmin as import("@supabase/supabase-js").SupabaseClient;
      const { data, error: fxError } = await db.rpc("complete_wallet_topup_stripe", {
        _payment_reference: input.merchantReference, _provider_transaction_id: input.providerReference,
        _currency: settled.currency, _amount: settled.amount,
      });
      const res = data as { ok?: boolean; error?: string } | null;
      if (fxError || res?.ok !== true) return { ok: false, kind, outcome: "COMPLETE_FAILED", error: fxError?.message ?? res?.error ?? "SETTLEMENT_REJECTED" };
      await supabaseAdmin.from("payment_events").insert({
        source: input.source, reference: input.merchantReference, status: input.status,
        signature_verified: Boolean(input.signatureVerified), outcome: "PAID",
        detail: { kind, provider_reference: input.providerReference, settled_currency: settled.currency, settled_amount: settled.amount },
      });
      return { ok: true, kind, outcome: "PAID" };
    }
    const rpc =
      kind === "BOOKING"
        ? "complete_booking_payment"
        : kind === "PAYMENT_LINK"
          ? "complete_link_payment"
          : kind === "EVENT_TICKET"
            ? "complete_event_ticket"
            : kind === "PROMOTION"
              ? "complete_promotion"
              : kind === "VERIFICATION"
                ? "complete_verification"
                : kind === "CLEAN"
                  ? "complete_clean_payment"
                  : kind === "WALLET_TOPUP"
                    ? "complete_wallet_topup"
                    : "complete_activation";
    const { data: rpcData, error: rpcError } = kind === "BOOKING" && input.source === "STRIPE_WEBHOOK"
      ? { data: { ok: true }, error: null }
      : await supabaseAdmin.rpc(rpc, {
      _payment_reference: input.merchantReference,
      _provider_transaction_id: providerRef,
    });
    const result = rpcData as { ok?: boolean; error?: string } | null;
    if (rpcError || result?.ok === false) {
      ok = false;
      error = rpcError?.message ?? result?.error ?? "SETTLEMENT_REJECTED";
      outcome = "COMPLETE_FAILED";
    } else {
      outcome =
        kind === "BOOKING"
          ? "BOOKING_CONFIRMED"
          : kind === "PAYMENT_LINK"
            ? "LINK_PAID"
            : kind === "EVENT_TICKET"
              ? "TICKET_CONFIRMED"
              : kind === "PROMOTION"
                ? "PROMOTION_ACTIVE"
                : kind === "VERIFICATION"
                  ? "VERIFIED_ACTIVE"
                  : "PAID";
    }
  } else if (input.status === "FAILED" || input.status === "CANCELLED") {
    if (kind === "BOOKING") {
      await supabaseAdmin.rpc("fail_booking_payment", {
        _payment_reference: input.merchantReference,
        _status: input.status,
      });
    } else if (kind === "PAYMENT_LINK") {
      await supabaseAdmin.rpc("fail_link_payment", {
        _payment_reference: input.merchantReference,
        _status: input.status,
      });
    } else if (kind === "EVENT_TICKET") {
      await supabaseAdmin.rpc("fail_event_ticket", {
        _payment_reference: input.merchantReference,
        _status: input.status,
      });
    } else if (kind === "PROMOTION") {
      await supabaseAdmin.rpc("fail_promotion", {
        _payment_reference: input.merchantReference,
        _status: input.status,
      });
    } else if (kind === "CLEAN") {
      await supabaseAdmin.rpc("fail_clean_payment", {
        _payment_reference: input.merchantReference,
        _status: input.status,
      });
    } else if (kind === "WALLET_TOPUP") {
      // Ledger row below is the only record for a top-up.
    } else if (kind === "VERIFICATION") {
      await supabaseAdmin
        .from("verifications")
        .update({ status: input.status, updated_at: new Date().toISOString() })
        .eq("payment_reference", input.merchantReference)
        .neq("status", "PAID");
    } else {
      await supabaseAdmin
        .from("activations")
        .update({ status: input.status, updated_at: new Date().toISOString() })
        .eq("payment_reference", input.merchantReference)
        .neq("status", "PAID");
    }
  }

  // Mirror the verified outcome onto the central ledger (never downgrades a final row).
  const ledgerStatus =
    input.status === "PAID" && ok ? "SUCCESS" : input.status === "FAILED" || input.status === "CANCELLED" ? input.status : null;
  if (ledgerStatus) {
    const { error: ledgerError } = await supabaseAdmin
      .from("payment_transactions")
      .update({
        status: ledgerStatus,
        updated_at: new Date().toISOString(),
        ...(ledgerStatus === "SUCCESS" ? { completed_at: new Date().toISOString(), reconciliation_status: "RECONCILED" } : {}),
        ...(input.providerReference ? { provider_reference: input.providerReference } : {}),
      })
      .eq("reference", input.merchantReference)
      .not("status", "in", "(SUCCESS,REFUNDED)");
    if (ledgerError) return { ok: false, kind, outcome: "LEDGER_WRITE_FAILED", error: "LEDGER_WRITE_FAILED" };
  }

  const { error: eventError } = await supabaseAdmin.from("payment_events").insert({
    source: input.source,
    reference: input.merchantReference,
    status: input.status,
    signature_verified: Boolean(input.signatureVerified),
    outcome,
    detail: { kind, provider_reference: input.providerReference, ...(input.detail ?? {}) },
  });
  if (eventError) return { ok: false, kind, outcome: "EVENT_WRITE_FAILED", error: "EVENT_WRITE_FAILED" };

  return error ? { ok, kind, outcome, error } : { ok, kind, outcome };
}

const ZERO_DECIMAL = new Set(["BIF","CLP","DJF","GNF","JPY","KMF","KRW","MGA","PYG","RWF","UGX","VND","VUV","XAF","XOF","XPF"]);

/** Converts a Stripe minor-unit amount to major units. */
export function fromStripeMinor(amount: number, currency: string): number {
  const cur = currency.toUpperCase();
  return ZERO_DECIMAL.has(cur) ? amount : Math.round(amount) / 100;
}

/** Reads the gross amount and currency Stripe actually settled into the ASH balance. */
async function stripeSettledAmount(intentId: string): Promise<{ currency: string; amount: number } | null> {
  try {
    const { stripeRead } = await import("./stripe.server");
    const pi = await stripeRead(`payment_intents/${encodeURIComponent(intentId)}?expand[]=latest_charge.balance_transaction`);
    const charge = pi["latest_charge"] as Record<string, unknown> | null;
    const bt = charge?.["balance_transaction"] as Record<string, unknown> | null;
    const amount = typeof bt?.["amount"] === "number" ? (bt["amount"] as number) : null;
    const currency = typeof bt?.["currency"] === "string" ? (bt["currency"] as string).toUpperCase() : null;
    if (amount === null || !currency || amount <= 0) return null;
    return { currency, amount: fromStripeMinor(amount, currency) };
  } catch {
    return null;
  }
}
