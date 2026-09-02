import { createServerFn } from "@tanstack/react-start";

export type MomoProvider = { provider: string; name: string; method: string; country: string };

/**
 * The mobile money networks we may actually charge, straight from
 * GET /account/providers. The picker is built from this, never hardcoded.
 */
export const listPaymentProviders = createServerFn({ method: "GET" })
  .inputValidator((input: { country?: string } | undefined) => ({
    country: String(input?.country ?? "").toUpperCase().slice(0, 2),
  }))
  .handler(async ({ data }): Promise<{ configured: boolean; providers: MomoProvider[] }> => {
    const { tchokoPay } = await import("./tchokopay.server");
    const result = await tchokoPay.listProviders(data.country || undefined);
    return { configured: result.configured, providers: result.providers };
  });
