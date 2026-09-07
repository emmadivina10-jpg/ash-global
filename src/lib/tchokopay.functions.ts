import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MomoProvider = {
  provider: string;
  name: string;
  method: string;
  country: string;
};

/**
 * The mobile money networks we may actually charge, straight from
 * GET /account/providers. The picker is built from this, never hardcoded.
 */
export const listPaymentProviders = createServerFn({ method: "GET" })
  .inputValidator((input: { country?: string } | undefined) => ({
    country: String(input?.country ?? "")
      .toUpperCase()
      .slice(0, 2),
  }))
  .handler(
    async ({
      data,
    }): Promise<{
      configured: boolean;
      providers: MomoProvider[];
    }> => {
      const { tchokoPay } = await import("./tchokopay.server");
      const result = await tchokoPay.listProviders(data.country || undefined);

      return {
        configured: result.configured,
        providers: result.providers,
      };
    },
  );

export type DisburseInput = {
  amount: number;
  method: "MTN_MOMO" | "ORANGE_MONEY";
  phone: string;
  reference: string;
};

export type DisburseResult = {
  ok: boolean;
  configured: boolean;
  status: "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "CANCELLED";
  providerReference?: string;
  error?: string;
  message?: string;
  param?: string;
};

/**
 * Starts or resumes a TchokoPay mobile-money disbursement
 * for an existing ASH withdrawal.
 *
 * Security:
 * - Requires an authenticated Supabase user.
 * - Looks up the withdrawal by ASH reference.
 * - Verifies the withdrawal belongs to the authenticated user.
 * - Uses the database amount/method/phone instead of trusting browser values.
 *
 * The ASH withdrawal reference is used as the TchokoPay idempotency key.
 * Final completion must come from the signed TchokoPay disbursement webhook.
 */
export const disburseWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: DisburseInput) => ({
    amount: Number(input.amount),
    method: input.method,
    phone: String(input.phone ?? ""),
    reference: String(input.reference ?? ""),
  }))
  .handler(async ({ data, context }): Promise<DisburseResult> => {
    const { userId } = context;

    if (!data.reference) {
      return {
        ok: false,
        configured: false,
        status: "FAILED",
        error: "INVALID_REFERENCE",
      };
    }

    const { supabaseAdmin } =
      await import("@/integrations/supabase/client.server");

    /*
     * Read the real withdrawal from the database.
     * Never trust amount/method/phone supplied by the browser.
     */
    const { data: withdrawal, error: withdrawalError } = await supabaseAdmin
      .from("withdrawals")
      .select(
        "id, user_id, amount, currency, payment_method, phone_number, status, provider_reference",
      )
      .eq("reference", data.reference)
      .maybeSingle();

    if (withdrawalError) {
      return {
        ok: false,
        configured: false,
        status: "FAILED",
        error: "WITHDRAWAL_LOOKUP_FAILED",
        message: withdrawalError.message,
      };
    }

    if (!withdrawal || withdrawal.user_id !== userId) {
      return {
        ok: false,
        configured: false,
        status: "FAILED",
        error: "WITHDRAWAL_NOT_FOUND",
      };
    }

    /*
     * A final withdrawal must never be sent again.
     */
    if (
      withdrawal.status === "COMPLETED" ||
      withdrawal.status === "FAILED" ||
      withdrawal.status === "REVERSED"
    ) {
      return {
        ok: false,
        configured: true,
        status:
          withdrawal.status === "COMPLETED" ? "PAID" : "FAILED",
        error: "WITHDRAWAL_ALREADY_SETTLED",
      };
    }

    /*
     * If we already have the provider reference, the payout has already
     * been accepted by TchokoPay. Do not start another request.
     */
    if (withdrawal.provider_reference) {
      return {
        ok: true,
        configured: true,
        status: "PROCESSING",
        providerReference: withdrawal.provider_reference,
      };
    }

    if (
      withdrawal.payment_method !== "MTN_MOMO" &&
      withdrawal.payment_method !== "ORANGE_MONEY"
    ) {
      return {
        ok: false,
        configured: true,
        status: "FAILED",
        error: "INVALID_PAYMENT_METHOD",
      };
    }

    const provider =
      withdrawal.payment_method === "MTN_MOMO"
        ? "mtn_cm"
        : "orange_cm";

    const { tchokoPay } = await import("./tchokopay.server");

    /*
     * Use the database values as the authoritative payout values.
     */
    const result = await tchokoPay.disburse({
      amount: Number(withdrawal.amount),
      currency: String(withdrawal.currency ?? "XAF").toUpperCase(),
      country: "CM",
      provider,
      phone: String(withdrawal.phone_number ?? ""),
      merchantReference: data.reference,
    });

    /*
     * TchokoPay accepted the disbursement.
     * Persist the provider reference so the webhook can match the
     * eventual disbursement result back to this ASH withdrawal.
     */
    if (result.ok) {
      const updatePayload: {
        status: "PROCESSING";
        provider_reference?: string;
      } = {
        status: "PROCESSING",
      };

      if (result.providerReference) {
        updatePayload.provider_reference = result.providerReference;
      }

      const { error: updateError } = await supabaseAdmin
        .from("withdrawals")
        .update(updatePayload)
        .eq("id", withdrawal.id)
        .eq("user_id", userId)
        .in("status", ["PENDING", "PROCESSING"]);

      if (updateError) {
        return {
          ok: false,
          configured: result.configured,
          status: "PROCESSING",
          providerReference: result.providerReference,
          error: "WITHDRAWAL_UPDATE_FAILED",
          message: updateError.message,
        };
      }
    }

    return {
      ok: result.ok,
      configured: result.configured,
      status: result.status,
      ...(result.providerReference
        ? { providerReference: result.providerReference }
        : {}),
      ...(result.error ? { error: result.error } : {}),
      ...(result.message ? { message: result.message } : {}),
      ...(result.param ? { param: result.param } : {}),
    };
  });
