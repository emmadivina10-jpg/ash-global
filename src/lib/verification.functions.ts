/**
 * ASH Verified — paid blue badge.
 *
 * Tiers mirror the familiar structure: individual, business and business plus.
 * Payment runs on the existing TchokoPay mobile money collection path with a
 * new VER- reference prefix; nothing in the wallet, referral or payout logic is
 * touched. The badge only switches on from a verified PAID outcome.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const VERIFICATION_TIERS = {
  INDIVIDUAL: { amount: 3500, days: 30 },
  BUSINESS: { amount: 9000, days: 30 },
  BUSINESS_PLUS: { amount: 25000, days: 30 },
} as const;

export type VerificationTier = keyof typeof VERIFICATION_TIERS;

export type VerificationCharge = {
  ok: boolean;
  reference: string | null;
  providerReference: string | null;
  status: string;
  error: string | null;
  message: string | null;
};

function reference(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;
}

/** Starts a mobile money charge for one month of ASH Verified. */
export const startVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { tier: string; provider: string; phone: string; country?: string | undefined }) => ({
    tier: String(input?.tier ?? "INDIVIDUAL").toUpperCase().slice(0, 20),
    provider: String(input?.provider ?? "").trim().slice(0, 40),
    phone: String(input?.phone ?? "").trim().slice(0, 20),
    country: (String(input?.country ?? "CM").toUpperCase().slice(0, 2) || "CM"),
  }))
  .handler(async ({ data, context }): Promise<VerificationCharge> => {
    const { userId } = context;
    const base: VerificationCharge = { ok: false, reference: null, providerReference: null, status: "PENDING", error: null, message: null };

    const plan = VERIFICATION_TIERS[data.tier as VerificationTier];
    if (!plan) return { ...base, error: "INVALID_TIER" };
    if (!data.provider || !data.phone) return { ...base, error: "INVALID_REQUEST" };

    const { tchokoPay } = await import("./tchokopay.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const merchantReference = reference("VER");
    const { error: insertError } = await supabaseAdmin.from("verifications").insert({
      user_id: userId,
      tier: data.tier,
      amount: plan.amount,
      payment_reference: merchantReference,
      status: "PENDING",
    });
    if (insertError) return { ...base, error: "VERIFICATION_CREATE_FAILED" };

    const charge = await tchokoPay.createCharge({
      merchantReference,
      amount: plan.amount,
      currency: "XAF",
      country: data.country,
      provider: data.provider,
      phone: data.phone,
      description: "ASH Verified — monthly",
    });

    if (!charge.ok) {
      await supabaseAdmin.from("verifications").update({ status: "FAILED" }).eq("payment_reference", merchantReference);
      return { ...base, reference: merchantReference, error: charge.error ?? "PAYMENT_START_FAILED", message: charge.message ?? null, status: "FAILED" };
    }

    await supabaseAdmin
      .from("verifications")
      .update({ provider_transaction_id: charge.providerReference ?? null, status: "PROCESSING" })
      .eq("payment_reference", merchantReference);

    return { ok: true, reference: merchantReference, providerReference: charge.providerReference ?? null, status: charge.status, error: null, message: null };
  });

/** "I have paid" check — asks the provider for the real outcome and settles it. */
export const verifyVerificationCharge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reference: string }) => ({ reference: String(input?.reference ?? "").slice(0, 64) }))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { tchokoPay } = await import("./tchokopay.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("verifications")
      .select("payment_reference, provider_transaction_id, status")
      .eq("payment_reference", data.reference)
      .eq("user_id", userId)
      .maybeSingle();

    if (!row) return { ok: false as const, status: "NOT_FOUND" as const };
    if (row.status === "PAID") return { ok: true as const, status: "PAID" as const };

    const providerRef = row.provider_transaction_id ?? "";
    const outcome = providerRef.startsWith("REQ-")
      ? await tchokoPay.getCollection(providerRef)
      : await tchokoPay.verifyLegacyPayment(data.reference);

    if (!outcome.ok) return { ok: false as const, status: "UNVERIFIED" as const };

    const { settleCollection } = await import("./payment-settlement.server");
    const settled = await settleCollection({
      merchantReference: data.reference,
      providerReference: outcome.providerReference ?? providerRef ?? null,
      status: outcome.status,
      source: "VERIFICATION_VERIFY",
    });

    return { ok: settled.ok && outcome.status === "PAID", status: outcome.status };
  });

/** Admin: grants or revokes the badge by hand, with a reason. */
export const consoleSetVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; tier: string | null; days?: number | undefined; note?: string | undefined }) => ({
    userId: String(input?.userId ?? "").slice(0, 64),
    tier: input?.tier ? String(input.tier).toUpperCase().slice(0, 20) : null,
    days: Number(input?.days ?? 30),
    note: input?.note ? String(input.note).slice(0, 300) : undefined,
  }))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) return { ok: false as const, error: "FORBIDDEN" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("console_set_verification", {
      _user_id: data.userId,
      _tier: data.tier,
      _days: data.days,
      _note: data.note ?? null,
      _actor: context.userId,
    } as never);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, error: null };
  });

/** Admin: verified members, recent purchases and blocked impersonation attempts. */
export const consoleVerificationOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) return { ok: false as const, verified: [], purchases: [], attempts: [], revenue: 0 };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [verifiedRes, purchaseRes, attemptRes] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("user_id, full_name, email, avatar_url, verified_tier, verified_until")
        .not("verified_tier", "is", null)
        .order("verified_until", { ascending: false })
        .limit(200),
      supabaseAdmin
        .from("verifications")
        .select("id, user_id, tier, status, amount, created_at, expires_at, granted_by, note")
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseAdmin
        .from("impersonation_attempts")
        .select("id, actor_id, protected_user_id, kind, attempted_value, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    const purchases = purchaseRes.data ?? [];
    const revenue = purchases
      .filter((row) => row.status === "PAID")
      .reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

    return {
      ok: true as const,
      verified: verifiedRes.data ?? [],
      purchases,
      attempts: attemptRes.data ?? [],
      revenue,
    };
  });
