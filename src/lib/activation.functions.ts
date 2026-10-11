import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type WalletActivationResult =
  | { ok: true; reference: string; balance: number }
  | { ok: false; error: string; balance?: number };

/**
 * Pay the one-time activation fee from the user's wallet balance. The wallet
 * itself is only funded through verified top-ups, so a successful call means
 * real money already cleared. Everything (debit, activation, commissions)
 * happens atomically inside activate_with_wallet().
 */
export const activateWithWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WalletActivationResult> => {
    const { supabase } = context;
    const { data, error } = await supabase.rpc("activate_with_wallet");
    if (error) return { ok: false, error: "ACTIVATION_FAILED" };
    const result = data as { ok?: boolean; error?: string; reference?: string; balance?: number } | null;
    if (!result?.ok) return { ok: false, error: result?.error ?? "ACTIVATION_FAILED", balance: result?.balance };
    return { ok: true, reference: result.reference!, balance: result.balance ?? 0 };
  });

export type ActivationState = {
  accountStatus: string;
  /** Our merchant reference (ACT-…). */
  reference: string | null;
  /** TchokoPay's REQ- reference for the collection in flight. */
  providerReference: string | null;
  status: string | null;
  configured: boolean;
};

/**
 * Server-side source of truth for "did my activation payment land?".
 *
 * The browser never decides this: we look up the user's most recent activation,
 * ask TchokoPay for the authoritative status of that collection, and complete the
 * activation through the idempotent complete_activation() function when — and only
 * when — the provider reports the money cleared.
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
      .select("payment_reference, provider_transaction_id, status")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!activation) {
      return {
        accountStatus,
        reference: null,
        providerReference: null,
        status: null,
        configured: tchokoPay.isConfigured(),
      };
    }

    const providerRef = activation.provider_transaction_id ?? null;

    if (activation.status === "PAID" || accountStatus === "ACTIVE") {
      return {
        accountStatus,
        reference: activation.payment_reference,
        providerReference: providerRef,
        status: activation.status,
        configured: true,
      };
    }

    const verification = providerRef?.startsWith("REQ-")
      ? await tchokoPay.getCollection(providerRef)
      : await tchokoPay.verifyLegacyPayment(activation.payment_reference);

    if (!verification.ok) {
      return {
        accountStatus,
        reference: activation.payment_reference,
        providerReference: providerRef,
        status: activation.status,
        configured: verification.configured,
      };
    }

    const { settleCollection } = await import("./payment-settlement.server");
    const settled = await settleCollection({
      merchantReference: activation.payment_reference,
      providerReference: verification.providerReference ?? providerRef,
      status: verification.status,
      source: "ACTIVATION_SYNC",
    });

    return {
      accountStatus: verification.status === "PAID" && settled.ok ? "ACTIVE" : accountStatus,
      reference: activation.payment_reference,
      providerReference: verification.providerReference ?? providerRef,
      status: verification.status,
      configured: true,
    };
  });
