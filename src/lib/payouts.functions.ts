import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Stripe Connect onboarding for provider bank payouts. Bank details are only
 * ever entered on Stripe's hosted onboarding — ASH never stores them.
 */

export type PayoutAccountState = {
  configured: boolean;
  accountId: string | null;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
  requirementsDue: string[];
  error: string | null;
};

export const getPayoutAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PayoutAccountState> => {
    const { stripeConnect } = await import("@/lib/stripe.server");
    if (!stripeConnect.configured()) {
      return {
        configured: false,
        accountId: null,
        detailsSubmitted: false,
        payoutsEnabled: false,
        requirementsDue: [],
        error: null,
      };
    }

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("user_id", context.userId)
      .maybeSingle();

    const accountId = (profile as { stripe_account_id?: string | null } | null)?.stripe_account_id ?? null;
    if (!accountId) {
      return {
        configured: true,
        accountId: null,
        detailsSubmitted: false,
        payoutsEnabled: false,
        requirementsDue: [],
        error: null,
      };
    }

    const status = await stripeConnect.getAccount(accountId);
    // Keep our cached flags in step with Stripe, which is the source of truth.
    await context.supabase
      .from("profiles")
      .update({
        stripe_details_submitted: status.detailsSubmitted,
        stripe_payouts_enabled: status.payoutsEnabled,
      })
      .eq("user_id", context.userId);

    return status;
  });

export const startPayoutOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { returnUrl: string; country?: string }) => {
    if (!/^https?:\/\//.test(input.returnUrl)) throw new Error("INVALID_RETURN_URL");
    return input;
  })
  .handler(async ({ data, context }): Promise<{ ok: boolean; url: string | null; error: string | null }> => {
    const { stripeConnect } = await import("@/lib/stripe.server");
    if (!stripeConnect.configured()) return { ok: false, url: null, error: "STRIPE_NOT_CONFIGURED" };

    const { data: profile } = await context.supabase
      .from("profiles")
      .select("stripe_account_id, email")
      .eq("user_id", context.userId)
      .maybeSingle();

    const row = profile as { stripe_account_id?: string | null; email?: string | null } | null;
    let accountId = row?.stripe_account_id ?? null;

    if (!accountId) {
      const created = await stripeConnect.createAccount({
        email: row?.email ?? (context.claims["email"] as string | undefined) ?? "",
        country: (data.country ?? "US").toUpperCase(),
      });
      if (!created.accountId) return { ok: false, url: null, error: created.error ?? "STRIPE_ERROR" };
      accountId = created.accountId;
      await context.supabase
        .from("profiles")
        .update({ stripe_account_id: accountId })
        .eq("user_id", context.userId);
    }

    return stripeConnect.onboardingLink({
      accountId,
      refreshUrl: data.returnUrl,
      returnUrl: data.returnUrl,
    });
  });

export const getPayoutDashboardLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: boolean; url: string | null; error: string | null }> => {
    const { stripeConnect } = await import("@/lib/stripe.server");
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("user_id", context.userId)
      .maybeSingle();

    const accountId = (profile as { stripe_account_id?: string | null } | null)?.stripe_account_id ?? null;
    if (!accountId) return { ok: false, url: null, error: "NO_ACCOUNT" };
    return stripeConnect.loginLink(accountId);
  });
