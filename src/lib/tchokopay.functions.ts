import { createServerFn } from "@tanstack/react-start";

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
 * Starts a TchokoPay mobile-money disbursement for an existing withdrawal.
 *
 * The withdrawal reference is used as the TchokoPay idempotency key.
 * Final completion must come from the signed TchokoPay disbursement webhook.
 */
export const disburseWithdrawal = createServerFn({ method: "POST" })
  .inputValidator((input: DisburseInput) => ({
    amount: Number(input.amount),
    method: input.method,
    phone: String(input.phone ?? ""),
    reference: String(input.reference ?? ""),
  }))
  .handler(async ({ data }): Promise<DisburseResult> => {
    const provider = data.method === "MTN_MOMO" ? "mtn_cm" : "orange_cm";

    const { tchokoPay } = await import("./tchokopay.server");

    const result = await tchokoPay.disburse({
      amount: data.amount,
      currency: "XAF",
      country: "CM",
      provider,
      phone: data.phone,
      merchantReference: data.reference,
    });

    return {
      ok: result.ok,
      configured: result.configured,
      status: result.status,
      ...(result.providerReference ? { providerReference: result.providerReference } : {}),
      ...(result.error ? { error: result.error } : {}),
      ...(result.message ? { message: result.message } : {}),
      ...(result.param ? { param: result.param } : {}),
    };
  });
