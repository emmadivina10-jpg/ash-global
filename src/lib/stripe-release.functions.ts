import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LIVE_PROVIDER_TRANSFERS_ENABLED } from "./stripe-release-policy";

export const verifyBookingService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) =>
    z.object({ bookingId: z.string().uuid(), code: z.string().trim().min(6).max(12) }).parse(value),
  )
  .handler(async ({ data, context }) => {
    const { data: booking, error: bookingError } = await context.supabase
      .from("bookings")
      .select("payment_provider, provider_id, provider_profiles(user_id)")
      .eq("id", data.bookingId)
      .single();
    const provider = booking?.provider_profiles;
    if (
      bookingError ||
      !provider ||
      Array.isArray(provider) ||
      provider.user_id !== context.userId
    ) {
      return { ok: false, error: "VERIFICATION_FAILED" };
    }
    // Service verification is independent of optional Connect transfers. The
    // existing RPC authorizes the provider, validates payment and consumes the
    // code atomically. Do not require uninstalled transfer tables when off.
    if (booking.payment_provider === "STRIPE" && LIVE_PROVIDER_TRANSFERS_ENABLED) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const db = supabaseAdmin as import("@supabase/supabase-js").SupabaseClient;
      const { data: payable, error } = await db
        .from("stripe_booking_releases")
        .select("status")
        .eq("booking_id", data.bookingId)
        .maybeSingle();
      if (error || payable?.status !== "PENDING_VERIFICATION")
        return { ok: false, error: "STRIPE_RELEASE_AWAITING_APPROVAL" };
    }
    const { data: result, error } = await context.supabase.rpc("verify_booking_code", {
      _booking_id: data.bookingId,
      _code: data.code,
    });
    const outcome = result as { ok?: boolean; error?: string; attempts_left?: number } | null;
    if (error) {
      console.error("Service verification RPC failed", { code: error.code });
      return { ok: false, error: "VERIFICATION_UNAVAILABLE" };
    }
    if (!outcome?.ok)
      return { ...outcome, ok: false, error: outcome?.error ?? "VERIFICATION_FAILED" };
    if (!LIVE_PROVIDER_TRANSFERS_ENABLED)
      return { ...outcome, ok: true, releaseStatus: "AVAILABLE_IN_WALLET" };
    const { releaseBookingTransfer } = await import("./stripe-booking-release.server");
    const release = await releaseBookingTransfer(data.bookingId);
    return { ...outcome, ok: true, releaseStatus: release.status };
  });

export const dispatchProviderReleases = createServerFn({ method: "POST" }).handler(async () => {
  const { requireDepartment } = await import("./console.server");
  await requireDepartment("REVENUE");
  const { dispatchEligibleReleases } = await import("./stripe-booking-release.server");
  return dispatchEligibleReleases();
});

/** Console indicator: which Stripe environments hold credentials. */
export const getStripeEnvironment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { stripeEnvironment } = await import("./stripe.server");
    const env = stripeEnvironment();
    return {
      mode: env.live ? ("LIVE" as const) : env.test ? ("TEST" as const) : ("UNCONFIGURED" as const),
      testAvailable: env.test,
    };
  });

export type TestReadinessCheck = {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
};

/**
 * Revenue-console checklist that must pass before test settlements are enabled.
 * Read-only: verifies configuration and Stripe test-mode state, never settles,
 * never returns secret values.
 */
export const getTestSettlementReadiness = createServerFn({ method: "POST" }).handler(
  async () => {
    const { requireDepartment } = await import("./console.server");
    await requireDepartment("REVENUE");
    const { stripeEnvironment, stripeTestRead } = await import("./stripe.server");
    const { testSettlementEnabled } = await import("./stripe-test-settlement.server");

    const checks: TestReadinessCheck[] = [];
    const env = stripeEnvironment();
    checks.push({
      key: "test_credentials",
      label: "Test API credentials",
      ok: env.test,
      detail: env.test
        ? "A test secret key (sk_test_/rk_test_) is configured and isolated from live keys."
        : "No test secret key is configured.",
    });

    let endpointOk = false;
    let endpointDetail = "Skipped until test credentials are configured.";
    if (env.test) {
      try {
        const endpoints = await stripeTestRead("webhook_endpoints?limit=100");
        const rows =
          (endpoints["data"] as Array<{ url?: string; status?: string }> | undefined) ?? [];
        const match = rows.find(
          (e) =>
            e.status === "enabled" &&
            typeof e.url === "string" &&
            e.url.includes("/api/public/webhooks/stripe"),
        );
        endpointOk = Boolean(match);
        endpointDetail = match
          ? `Enabled test endpoint points to ${match.url}.`
          : rows.length > 0
            ? `${rows.length} test endpoint(s) exist, but none enabled for this app's webhook URL (${rows
                .map((e) => e.url)
                .filter(Boolean)
                .join(", ")}).`
            : "No test-mode webhook endpoint exists yet.";
      } catch {
        endpointDetail = "Test webhook endpoints could not be read from Stripe.";
      }
    }
    checks.push({
      key: "test_webhook_endpoint",
      label: "Test webhook endpoint",
      ok: endpointOk,
      detail: endpointDetail,
    });

    const whsec = process.env["STRIPE_TEST_WEBHOOK_SECRET"] ?? "";
    checks.push({
      key: "test_signing_secret",
      label: "Test signing secret",
      ok: whsec.startsWith("whsec_"),
      detail: whsec.startsWith("whsec_")
        ? "Saved. It is proven against the endpoint when the first signed test event arrives."
        : "No test webhook signing secret is saved.",
    });

    let mappingOk = false;
    let mappingDetail = "Skipped until test credentials are configured.";
    if (env.test) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: mappings, error } = await supabaseAdmin
        .from("profiles")
        .select("stripe_account_id")
        .not("stripe_account_id", "is", null)
        .limit(10);
      if (error) {
        mappingDetail = "Provider account mappings could not be read.";
      } else {
        let testMapped = 0;
        let liveOnly = 0;
        for (const row of mappings ?? []) {
          const id = String(row.stripe_account_id ?? "");
          if (!id) continue;
          try {
            const account = await stripeTestRead(`accounts/${encodeURIComponent(id)}`);
            if (account["livemode"] === false) testMapped += 1;
            else liveOnly += 1;
          } catch {
            // Live account IDs do not exist in test mode.
            liveOnly += 1;
          }
        }
        mappingOk = testMapped > 0;
        mappingDetail =
          testMapped > 0
            ? `${testMapped} provider mapping(s) point to test-mode connected account(s).`
            : liveOnly > 0
              ? `${liveOnly} provider mapping(s) point to live accounts only — no test provider account is mapped yet.`
              : "No provider has a connected-account mapping yet.";
      }
    }
    checks.push({
      key: "test_provider_mapping",
      label: "Test provider account mapping",
      ok: mappingOk,
      detail: mappingDetail,
    });

    const enabled = testSettlementEnabled();
    checks.push({
      key: "test_settlement_flag",
      label: "Test settlement flag",
      ok: enabled,
      detail: enabled
        ? "STRIPE_TEST_SETTLEMENT_ENABLED is on."
        : "Off. Enable it only after every check above passes, and only on an isolated backend.",
    });

    const ready = checks
      .filter((c) => c.key !== "test_settlement_flag")
      .every((c) => c.ok);
    return { checks, ready };
  },
);

/** Read-only booking-party view; payout records aggregate account funds. */
export const getBookingStripeStages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ bookingId: z.string().uuid() }).parse(value))
  .handler(async ({ data, context }) => {
    const { data: booking, error } = await context.supabase
      .from("bookings")
      .select(
        "client_id,provider_id,paid_at,status,verification_status,commission_rate,platform_fee,provider_amount,payment_provider",
      )
      .eq("id", data.bookingId)
      .single();
    if (error || !booking) throw new Error("BOOKING_NOT_FOUND");
    const { data: provider } = await context.supabase
      .from("provider_profiles")
      .select("user_id")
      .eq("id", booking.provider_id)
      .single();
    if (booking.client_id !== context.userId && provider?.user_id !== context.userId)
      throw new Error("FORBIDDEN");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as import("@supabase/supabase-js").SupabaseClient;
    const { data: release, error: releaseError } = await db
      .from("stripe_booking_releases")
      .select(
        "status,transfer_id,gross_minor,amount_minor,currency,destination_account_id,last_error",
      )
      .eq("booking_id", data.bookingId)
      .maybeSingle();
    const { destination_account_id: destination, ...safeRelease } = release ?? {};
    let payouts: {
      payoutId: string;
      status: string;
      amountMinor: number;
      currency: string;
      failureCode: string | null;
      updatedAt: string;
    }[] = [];
    let payoutReadStatus = "NO_RECORDED_PAYOUT";
    if (destination && provider?.user_id === context.userId) {
      const { data: rows, error: payoutError } = await db
        .from("stripe_connected_payouts")
        .select("payout_id,status,amount_minor,currency,failure_code,updated_at")
        .eq("account_id", destination)
        .order("updated_at", { ascending: false })
        .limit(20);
      payoutReadStatus = payoutError
        ? "DATA_NOT_AVAILABLE"
        : "ACCOUNT_PAYOUTS_NOT_BOOKING_ALLOCATION";
      payouts = (rows ?? []).map((row) => ({
        payoutId: String(row.payout_id),
        status: String(row.status),
        amountMinor: Number(row.amount_minor),
        currency: String(row.currency),
        failureCode: row.failure_code ? String(row.failure_code) : null,
        updatedAt: String(row.updated_at),
      }));
    }
    return {
      paymentStatus: booking.paid_at ? "VERIFIED" : "AWAITING_PAYMENT",
      commissionRate: booking.commission_rate,
      commissionAmount: booking.platform_fee,
      providerPayableAmount: booking.provider_amount,
      verificationStatus: booking.verification_status,
      release: releaseError ? null : safeRelease,
      releaseReadStatus: releaseError
        ? "SCHEMA_AWAITING_APPROVAL"
        : release
          ? "RECORDED"
          : "NO_VERIFIED_PAYABLE",
      payouts,
      payoutReadStatus,
      liveTransfersEnabled: LIVE_PROVIDER_TRANSFERS_ENABLED,
    };
  });
