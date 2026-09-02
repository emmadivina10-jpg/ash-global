import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ACTIVATION_AMOUNT = 5000;

function makeReference(): string {
  return `ACT-${crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;
}

export type StartChargeResult = {
  ok: boolean;
  configured: boolean;
  /** Our merchant reference (ACT-…). */
  reference: string | null;
  /** TchokoPay's REQ- reference for this collection. */
  providerReference: string | null;
  status: string;
  error: string | null;
  message: string | null;
};

/**
 * Starts a direct mobile money collection for the signed-in user's activation.
 *
 * The customer never leaves ASH: TchokoPay pushes a prompt to their phone and we
 * poll /collect/{reference} (or receive the webhook) for the real outcome.
 */
export const startActivation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { provider: string; phone: string; country?: string }) => ({
    provider: String(input?.provider ?? "").trim().slice(0, 40),
    phone: String(input?.phone ?? "").trim().slice(0, 20),
    country: String(input?.country ?? "CM").toUpperCase().slice(0, 2) || "CM",
  }))
  .handler(async ({ data, context }): Promise<StartChargeResult> => {
    const { supabase, userId } = context;
    const { tchokoPay } = await import("./tchokopay.server");

    const base: StartChargeResult = {
      ok: false,
      configured: tchokoPay.isConfigured(),
      reference: null,
      providerReference: null,
      status: "PENDING",
      error: null,
      message: null,
    };

    if (!data.provider || !data.phone) return { ...base, error: "INVALID_REQUEST" };

    const { data: profile } = await supabase
      .from("profiles")
      .select("account_status")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile) return { ...base, error: "PROFILE_NOT_FOUND" };
    if (profile.account_status === "ACTIVE") return { ...base, error: "ALREADY_ACTIVE" };

    // A prompt already in flight for this user is resumed rather than re-sent.
    const { data: existing } = await supabase
      .from("activations")
      .select("payment_reference, provider_transaction_id, status")
      .eq("user_id", userId)
      .in("status", ["PENDING", "PROCESSING"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.provider_transaction_id?.startsWith("REQ-")) {
      const current = await tchokoPay.getCollection(existing.provider_transaction_id);
      if (current.ok && (current.status === "PENDING" || current.status === "PROCESSING")) {
        return {
          ok: true,
          configured: true,
          reference: existing.payment_reference,
          providerReference: existing.provider_transaction_id,
          status: current.status,
          error: null,
          message: null,
        };
      }
    }

    const merchantReference = makeReference();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: insertError } = await supabaseAdmin.from("activations").insert({
      user_id: userId,
      amount: ACTIVATION_AMOUNT,
      currency: "XAF",
      payment_provider: "TCHOKOPAY",
      payment_reference: merchantReference,
      status: "PENDING",
    });
    if (insertError) return { ...base, reference: merchantReference, error: "ACTIVATION_CREATE_FAILED" };

    const charge = await tchokoPay.createCharge({
      merchantReference,
      amount: ACTIVATION_AMOUNT,
      currency: "XAF",
      country: data.country,
      provider: data.provider,
      phone: data.phone,
      description: "ASH Glo account activation",
    });

    if (!charge.ok) {
      await supabaseAdmin
        .from("activations")
        .update({ status: "FAILED", updated_at: new Date().toISOString() })
        .eq("payment_reference", merchantReference);
      return {
        ok: false,
        configured: charge.configured,
        reference: merchantReference,
        providerReference: null,
        status: "FAILED",
        error: charge.error ?? "PAYMENT_START_FAILED",
        message: charge.message ?? null,
      };
    }

    await supabaseAdmin
      .from("activations")
      .update({
        provider_transaction_id: charge.providerReference ?? null,
        status: "PROCESSING",
        updated_at: new Date().toISOString(),
      })
      .eq("payment_reference", merchantReference);

    return {
      ok: true,
      configured: true,
      reference: merchantReference,
      providerReference: charge.providerReference ?? null,
      status: charge.status,
      error: null,
      message: null,
    };
  });

/** Asks TchokoPay for the real status of an activation and activates only when it says PAID. */
export const verifyActivation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reference: string }) => {
    if (!input?.reference || typeof input.reference !== "string") {
      throw new Error("reference is required");
    }
    return { reference: input.reference.slice(0, 64) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { tchokoPay } = await import("./tchokopay.server");

    const { data: activation } = await supabase
      .from("activations")
      .select("payment_reference, provider_transaction_id, status")
      .eq("payment_reference", data.reference)
      .eq("user_id", userId)
      .maybeSingle();

    if (!activation) return { ok: false as const, status: "NOT_FOUND" as const };
    if (activation.status === "PAID") return { ok: true as const, status: "PAID" as const };

    const providerRef = activation.provider_transaction_id ?? "";
    const verification = providerRef.startsWith("REQ-")
      ? await tchokoPay.getCollection(providerRef)
      : await tchokoPay.verifyLegacyPayment(activation.payment_reference);

    if (!verification.ok) {
      return {
        ok: false as const,
        status: "UNVERIFIED" as const,
        configured: verification.configured,
        error: verification.error ?? null,
      };
    }

    const { settleCollection } = await import("./payment-settlement.server");
    const settled = await settleCollection({
      merchantReference: activation.payment_reference,
      providerReference: verification.providerReference ?? providerRef ?? null,
      status: verification.status,
      source: "ACTIVATION_VERIFY",
    });

    if (verification.status !== "PAID") {
      return { ok: false as const, status: verification.status, configured: true };
    }
    if (!settled.ok) return { ok: false as const, status: "ACTIVATION_FAILED" as const };
    return { ok: true as const, status: "PAID" as const };
  });
