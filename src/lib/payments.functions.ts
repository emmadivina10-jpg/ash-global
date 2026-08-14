import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ACTIVATION_AMOUNT = 5000;

function makeReference(): string {
  return `ACT-${crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;
}

/** Starts (or resumes) an activation payment for the signed-in user. */
export const startActivation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { tchokoPay } = await import("./tchokopay.server");

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone, account_status")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile) return { ok: false as const, error: "PROFILE_NOT_FOUND" };
    if (profile.account_status === "ACTIVE") {
      return { ok: false as const, error: "ALREADY_ACTIVE" };
    }

    const { data: existing } = await supabase
      .from("activations")
      .select("payment_reference, status")
      .eq("user_id", userId)
      .in("status", ["PENDING", "PROCESSING"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Resume an in-flight checkout when the provider still has a usable link.
    if (existing?.payment_reference) {
      const current = await tchokoPay.verifyPayment(existing.payment_reference);
      if (current.ok && current.checkoutUrl && current.status !== "FAILED" && current.status !== "CANCELLED") {
        return {
          ok: true as const,
          configured: true,
          reference: existing.payment_reference,
          checkoutUrl: current.checkoutUrl,
          error: null,
        };
      }
    }

    const merchantReference = makeReference();
    const result = await tchokoPay.createPayment({
      reference: merchantReference,
      amount: ACTIVATION_AMOUNT,
      currency: "XAF",
      description: "Refer account activation",
      customer: {
        name: profile.full_name ?? "",
        email: profile.email ?? "",
        phone: profile.phone ?? "",
      },
      callbackUrl: "",
      returnUrl: "",
    });

    if (!result.ok) {
      return {
        ok: false as const,
        configured: result.configured,
        reference: merchantReference,
        checkoutUrl: null,
        error: result.error ?? "PAYMENT_CREATE_FAILED",
      };
    }

    // The provider reference is what webhooks and status lookups use, so it is
    // what we store as the activation's payment reference.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("activations").insert({
      user_id: userId,
      amount: ACTIVATION_AMOUNT,
      currency: "XAF",
      payment_provider: "TCHOKOPAY",
      payment_reference: result.reference,
      status: "PENDING",
    });
    if (error) {
      return {
        ok: false as const,
        configured: true,
        reference: result.reference,
        checkoutUrl: null,
        error: "ACTIVATION_CREATE_FAILED",
      };
    }

    return {
      ok: true as const,
      configured: true,
      reference: result.reference,
      checkoutUrl: result.checkoutUrl ?? null,
      error: null,
    };
  });

/** Asks the provider for the real payment status and activates only when verified. */
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
      .select("payment_reference, status")
      .eq("payment_reference", data.reference)
      .eq("user_id", userId)
      .maybeSingle();

    if (!activation) return { ok: false as const, status: "NOT_FOUND" as const };
    if (activation.status === "PAID") return { ok: true as const, status: "PAID" as const };

    const verification = await tchokoPay.verifyPayment(data.reference);
    if (!verification.ok) {
      return {
        ok: false as const,
        status: "UNVERIFIED" as const,
        configured: verification.configured,
        error: verification.error ?? null,
      };
    }

    if (verification.status !== "PAID") {
      return { ok: false as const, status: verification.status, configured: true };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("complete_activation", {
      _payment_reference: data.reference,
      _provider_transaction_id: (verification.providerTransactionId ?? null) as unknown as string,
    });
    if (error) return { ok: false as const, status: "ACTIVATION_FAILED" as const };

    return { ok: true as const, status: "PAID" as const };
  });
