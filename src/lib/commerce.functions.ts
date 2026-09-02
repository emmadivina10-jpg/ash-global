/**
 * Money movements for the new ASH pillars: deal claims, event tickets and
 * paid promotions. Charges are direct mobile money collections through
 * TchokoPay; nothing is ever marked paid without a verified outcome.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PLATFORM_COMMISSION_RATE } from "./marketplace";

export const PROMOTION_PLANS = {
  DAY_1: { days: 1, amount: 1000 },
  DAY_7: { days: 7, amount: 5000 },
  DAY_30: { days: 30, amount: 15000 },
} as const;

export type PromotionPlan = keyof typeof PROMOTION_PLANS;

function reference(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;
}

function ticketCode(): string {
  return `TKT-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export type ChargeResult = {
  ok: boolean;
  reference: string | null;
  providerReference: string | null;
  status: string;
  error: string | null;
  message: string | null;
};

/** Claims a deal for the signed-in member and returns the redemption code. */
export const claimDeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { dealId: string }) => ({ dealId: String(input?.dealId ?? "").slice(0, 64) }))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("claim_deal", {
      _deal_id: data.dealId,
      _user_id: userId,
    });
    if (error) return { ok: false as const, error: "CLAIM_FAILED", code: null };
    const payload = (result ?? {}) as { ok?: boolean; code?: string; error?: string; already?: boolean };
    return {
      ok: Boolean(payload.ok),
      error: payload.error ?? null,
      code: payload.code ?? null,
      already: Boolean(payload.already),
    };
  });

/** Reserves tickets and pushes a mobile money prompt for the total. */
export const startTicketPurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { eventId: string; quantity: number; provider: string; phone: string; country?: string | undefined }) => ({
    eventId: String(input?.eventId ?? "").slice(0, 64),
    quantity: Math.min(10, Math.max(1, Number(input?.quantity ?? 1))),
    provider: String(input?.provider ?? "").trim().slice(0, 40),
    phone: String(input?.phone ?? "").trim().slice(0, 20),
    country: String(input?.country ?? "CM").toUpperCase().slice(0, 2) || "CM",
  }))
  .handler(async ({ data, context }): Promise<ChargeResult> => {
    const { supabase, userId } = context;
    const { tchokoPay } = await import("./tchokopay.server");
    const base: ChargeResult = { ok: false, reference: null, providerReference: null, status: "PENDING", error: null, message: null };

    const { data: event } = await supabase
      .from("events")
      .select("id, title, is_free, ticket_price, ticket_capacity, tickets_sold, is_published")
      .eq("id", data.eventId)
      .maybeSingle();

    if (!event || !event.is_published) return { ...base, error: "EVENT_NOT_FOUND" };
    if (event.is_free) return { ...base, error: "EVENT_IS_FREE" };
    if (event.tickets_sold + data.quantity > event.ticket_capacity) return { ...base, error: "SOLD_OUT" };
    if (!data.provider || !data.phone) return { ...base, error: "INVALID_REQUEST" };

    const amount = event.ticket_price * data.quantity;
    const fee = Math.max(0, Math.round(amount * PLATFORM_COMMISSION_RATE));
    const merchantReference = reference("EVT");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: insertError } = await supabaseAdmin.from("event_tickets").insert({
      event_id: event.id,
      user_id: userId,
      quantity: data.quantity,
      amount,
      platform_fee: fee,
      code: ticketCode(),
      payment_reference: merchantReference,
      status: "PENDING",
    });
    if (insertError) return { ...base, error: "TICKET_CREATE_FAILED" };

    const charge = await tchokoPay.createCharge({
      merchantReference,
      amount,
      currency: "XAF",
      country: data.country,
      provider: data.provider,
      phone: data.phone,
      description: `ASH ticket — ${event.title}`,
    });

    if (!charge.ok) {
      await supabaseAdmin.from("event_tickets").update({ status: "FAILED" }).eq("payment_reference", merchantReference);
      return { ...base, reference: merchantReference, error: charge.error ?? "PAYMENT_START_FAILED", message: charge.message ?? null, status: "FAILED" };
    }

    await supabaseAdmin
      .from("event_tickets")
      .update({ provider_transaction_id: charge.providerReference ?? null, status: "PROCESSING" })
      .eq("payment_reference", merchantReference);

    return { ok: true, reference: merchantReference, providerReference: charge.providerReference ?? null, status: charge.status, error: null, message: null };
  });

/** Buys a visibility slot for a provider, deal, event or project. */
export const startPromotion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    targetType: string;
    targetId: string;
    headline: string;
    plan: string;
    city?: string | undefined;
    category?: string | undefined;
    provider: string;
    phone: string;
    country?: string | undefined;
  }) => ({
    targetType: String(input?.targetType ?? "PROVIDER").toUpperCase().slice(0, 20),
    targetId: String(input?.targetId ?? "").slice(0, 64),
    headline: String(input?.headline ?? "").trim().slice(0, 120),
    plan: String(input?.plan ?? "DAY_7").toUpperCase().slice(0, 10),
    city: input?.city ? String(input.city).slice(0, 80) : undefined,
    category: input?.category ? String(input.category).slice(0, 40) : undefined,
    provider: String(input?.provider ?? "").trim().slice(0, 40),
    phone: String(input?.phone ?? "").trim().slice(0, 20),
    country: String(input?.country ?? "CM").toUpperCase().slice(0, 2) || "CM",
  }))
  .handler(async ({ data, context }): Promise<ChargeResult> => {
    const { userId } = context;
    const { tchokoPay } = await import("./tchokopay.server");
    const base: ChargeResult = { ok: false, reference: null, providerReference: null, status: "PENDING", error: null, message: null };

    const plan = PROMOTION_PLANS[data.plan as PromotionPlan];
    if (!plan) return { ...base, error: "INVALID_PLAN" };
    if (!data.targetId || !data.headline) return { ...base, error: "INVALID_REQUEST" };
    if (!data.provider || !data.phone) return { ...base, error: "INVALID_REQUEST" };

    const merchantReference = reference("PRM");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: insertError } = await supabaseAdmin.from("promotions").insert({
      owner_id: userId,
      target_type: data.targetType,
      target_id: data.targetId,
      headline: data.headline,
      plan: data.plan,
      amount: plan.amount,
      city: data.city ?? null,
      category: data.category ?? null,
      payment_reference: merchantReference,
      status: "PENDING",
    });
    if (insertError) return { ...base, error: "PROMOTION_CREATE_FAILED" };

    const charge = await tchokoPay.createCharge({
      merchantReference,
      amount: plan.amount,
      currency: "XAF",
      country: data.country,
      provider: data.provider,
      phone: data.phone,
      description: `ASH Promote — ${data.headline}`,
    });

    if (!charge.ok) {
      await supabaseAdmin.from("promotions").update({ status: "FAILED" }).eq("payment_reference", merchantReference);
      return { ...base, reference: merchantReference, error: charge.error ?? "PAYMENT_START_FAILED", message: charge.message ?? null, status: "FAILED" };
    }

    await supabaseAdmin
      .from("promotions")
      .update({ provider_transaction_id: charge.providerReference ?? null, status: "PROCESSING" })
      .eq("payment_reference", merchantReference);

    return { ok: true, reference: merchantReference, providerReference: charge.providerReference ?? null, status: charge.status, error: null, message: null };
  });

/** Asks TchokoPay for the real outcome of a ticket or promotion charge. */
export const verifyCommerceCharge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reference: string }) => ({ reference: String(input?.reference ?? "").slice(0, 64) }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { tchokoPay } = await import("./tchokopay.server");
    const isTicket = data.reference.startsWith("EVT-");

    const row = isTicket
      ? await supabase.from("event_tickets").select("payment_reference, provider_transaction_id, status").eq("payment_reference", data.reference).maybeSingle()
      : await supabase.from("promotions").select("payment_reference, provider_transaction_id, status").eq("payment_reference", data.reference).maybeSingle();

    const record = row.data as { provider_transaction_id: string | null; status: string } | null;
    if (!record) return { ok: false as const, status: "NOT_FOUND" as const };
    if (record.status === "PAID" || record.status === "ACTIVE") return { ok: true as const, status: "PAID" as const };

    const providerRef = record.provider_transaction_id ?? "";
    const verification = providerRef.startsWith("REQ-")
      ? await tchokoPay.getCollection(providerRef)
      : await tchokoPay.verifyLegacyPayment(data.reference);

    if (!verification.ok) return { ok: false as const, status: "UNVERIFIED" as const };

    const { settleCollection } = await import("./payment-settlement.server");
    const settled = await settleCollection({
      merchantReference: data.reference,
      providerReference: verification.providerReference ?? providerRef ?? null,
      status: verification.status,
      source: isTicket ? "TICKET_VERIFY" : "PROMOTION_VERIFY",
    });

    if (verification.status !== "PAID") return { ok: false as const, status: verification.status };
    if (!settled.ok) return { ok: false as const, status: "SETTLE_FAILED" as const };
    return { ok: true as const, status: "PAID" as const };
  });
