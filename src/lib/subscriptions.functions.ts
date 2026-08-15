import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SUBSCRIPTION_AMOUNT = 2000;

function makeReference(): string {
  return `SUB-${crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;
}

/** Starts (or resumes) the 2,000 XAF monthly provider subscription checkout. */
export const startProviderSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { tchokoPay } = await import("./tchokopay.server");

    const { data: provider } = await supabase
      .from("provider_profiles")
      .select("id, business_name")
      .eq("user_id", userId)
      .maybeSingle();
    if (!provider) return { ok: false as const, error: "PROVIDER_NOT_FOUND", checkoutUrl: null, reference: null };

    const { data: pending } = await supabase
      .from("provider_subscriptions")
      .select("payment_reference")
      .eq("provider_id", provider.id)
      .eq("status", "PENDING")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pending?.payment_reference) {
      const current = await tchokoPay.verifyPayment(pending.payment_reference);
      if (current.ok && current.checkoutUrl && current.status !== "FAILED" && current.status !== "CANCELLED") {
        return {
          ok: true as const,
          reference: pending.payment_reference,
          checkoutUrl: current.checkoutUrl,
          error: null,
        };
      }
    }

    const merchantReference = makeReference();
    const result = await tchokoPay.createPayment({
      reference: merchantReference,
      amount: SUBSCRIPTION_AMOUNT,
      currency: "XAF",
      description: "Refer provider monthly subscription",
      customer: { name: provider.business_name, email: "", phone: "" },
      callbackUrl: "",
      returnUrl: "",
    });

    if (!result.ok) {
      return {
        ok: false as const,
        error: result.error ?? "PAYMENT_CREATE_FAILED",
        checkoutUrl: null,
        reference: merchantReference,
      };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("provider_subscriptions").insert({
      provider_id: provider.id,
      user_id: userId,
      amount: SUBSCRIPTION_AMOUNT,
      currency: "XAF",
      payment_provider: "TCHOKOPAY",
      payment_reference: result.reference,
      status: "PENDING",
    });
    if (error) {
      return { ok: false as const, error: "SUBSCRIPTION_CREATE_FAILED", checkoutUrl: null, reference: result.reference };
    }

    return {
      ok: true as const,
      reference: result.reference,
      checkoutUrl: result.checkoutUrl ?? null,
      error: null,
    };
  });

/** Confirms the subscription payment with the provider and activates 30 days of visibility. */
export const verifyProviderSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reference: string }) => {
    if (!input?.reference || typeof input.reference !== "string") throw new Error("reference is required");
    return { reference: input.reference.slice(0, 64) };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { tchokoPay } = await import("./tchokopay.server");

    const { data: sub } = await supabase
      .from("provider_subscriptions")
      .select("status")
      .eq("payment_reference", data.reference)
      .eq("user_id", userId)
      .maybeSingle();
    if (!sub) return { ok: false as const, status: "NOT_FOUND" as const };
    if (sub.status === "ACTIVE") return { ok: true as const, status: "PAID" as const };

    const verification = await tchokoPay.verifyPayment(data.reference);
    if (!verification.ok) return { ok: false as const, status: "UNVERIFIED" as const };
    if (verification.status !== "PAID") return { ok: false as const, status: verification.status };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("complete_provider_subscription", {
      _payment_reference: data.reference,
      _provider_transaction_id: (verification.providerTransactionId ?? null) as unknown as string,
    });
    if (error) return { ok: false as const, status: "ACTIVATION_FAILED" as const };

    return { ok: true as const, status: "PAID" as const };
  });
