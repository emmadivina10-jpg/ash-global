/**
 * One place where a verified TchokoPay collection outcome becomes app state.
 *
 * Callers (webhook, reconciliation job, "I have paid" checks) must already have
 * confirmed the outcome with TchokoPay — this module only applies it. Every
 * completion runs through an idempotent database function, so replays are safe.
 */
import type { PaymentStatus } from "./tchokopay.server";

export type SettlementKind = "ACTIVATION" | "BOOKING" | "PAYMENT_LINK" | "EVENT_TICKET" | "PROMOTION" | "VERIFICATION";

export function kindOf(merchantReference: string): SettlementKind {
  if (merchantReference.startsWith("BKG-")) return "BOOKING";
  if (merchantReference.startsWith("PLK-")) return "PAYMENT_LINK";
  if (merchantReference.startsWith("EVT-")) return "EVENT_TICKET";
  if (merchantReference.startsWith("PRM-")) return "PROMOTION";
  if (merchantReference.startsWith("VER-")) return "VERIFICATION";
  return "ACTIVATION";
}

/**
 * Finds our merchant reference from TchokoPay's REQ- reference by looking at the
 * provider reference we stored when the charge was created.
 */
export async function findMerchantReference(providerReference: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const [activation, booking, link, ticket, promotion] = await Promise.all([
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
  ]);

  return (
    activation.data?.payment_reference ??
    booking.data?.payment_reference ??
    link.data?.reference ??
    ticket.data?.payment_reference ??
    promotion.data?.payment_reference ??
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
                : "complete_activation";
    const { error: rpcError } = await supabaseAdmin.rpc(rpc, {
      _payment_reference: input.merchantReference,
      _provider_transaction_id: providerRef,
    });
    if (rpcError) {
      ok = false;
      error = rpcError.message;
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

  await supabaseAdmin.from("payment_events").insert({
    source: input.source,
    reference: input.merchantReference,
    status: input.status,
    signature_verified: Boolean(input.signatureVerified),
    outcome,
    detail: { kind, provider_reference: input.providerReference, ...(input.detail ?? {}) },
  });

  return error ? { ok, kind, outcome, error } : { ok, kind, outcome };
}
