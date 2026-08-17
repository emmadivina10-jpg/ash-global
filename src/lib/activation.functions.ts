import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ActivationState = {
  accountStatus: string;
  reference: string | null;
  status: string | null;
  checkoutUrl: string | null;
  configured: boolean;
};

/**
 * Server-side source of truth for "did my activation payment land?".
 *
 * The browser never decides this: we look up the user's most recent activation
 * record, ask TchokoPay for the authoritative status, and complete the activation
 * through the idempotent complete_activation() database function when — and only
 * when — the provider reports PAID.
 */
export const syncMyActivation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ActivationState> => {
    const { supabase, userId } = context;
    const { tchokoPay } = await import("./tchokopay.server");

    const { data: profile } = await supabase
      .from("profiles")
      .select("account_status")
      .eq("user_id", userId)
      .maybeSingle();

    const accountStatus = profile?.account_status ?? "PENDING";

    const { data: activation } = await supabase
      .from("activations")
      .select("payment_reference, status")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!activation) {
      return {
        accountStatus,
        reference: null,
        status: null,
        checkoutUrl: null,
        configured: tchokoPay.isConfigured(),
      };
    }

    if (activation.status === "PAID" || accountStatus === "ACTIVE") {
      return {
        accountStatus,
        reference: activation.payment_reference,
        status: activation.status,
        checkoutUrl: null,
        configured: true,
      };
    }

    const verification = await tchokoPay.verifyPayment(activation.payment_reference);
    if (!verification.ok) {
      return {
        accountStatus,
        reference: activation.payment_reference,
        status: activation.status,
        checkoutUrl: null,
        configured: verification.configured,
      };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (verification.status === "PAID") {
      const { error } = await supabaseAdmin.rpc("complete_activation", {
        _payment_reference: activation.payment_reference,
        _provider_transaction_id: (verification.providerTransactionId ?? null) as unknown as string,
      });
      return {
        accountStatus: error ? accountStatus : "ACTIVE",
        reference: activation.payment_reference,
        status: error ? activation.status : "PAID",
        checkoutUrl: null,
        configured: true,
      };
    }

    if (verification.status === "FAILED" || verification.status === "CANCELLED") {
      await supabaseAdmin
        .from("activations")
        .update({ status: verification.status, updated_at: new Date().toISOString() })
        .eq("payment_reference", activation.payment_reference)
        .neq("status", "PAID");
    }

    return {
      accountStatus,
      reference: activation.payment_reference,
      status: verification.status,
      checkoutUrl: verification.checkoutUrl ?? null,
      configured: true,
    };
  });
