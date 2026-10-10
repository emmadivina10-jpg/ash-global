import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const verifyBookingService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ bookingId: z.string().uuid(), code: z.string().trim().min(6).max(12) }).parse(value))
  .handler(async ({ data, context }) => {
    const { data: booking, error: bookingError } = await context.supabase.from("bookings")
      .select("payment_provider, provider_id, provider_profiles(user_id)").eq("id", data.bookingId).single();
    const provider = booking?.provider_profiles;
    if (bookingError || !provider || Array.isArray(provider) || provider.user_id !== context.userId) {
      return { ok: false, error: "VERIFICATION_FAILED" };
    }
    if (booking.payment_provider === "STRIPE") {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const db = supabaseAdmin as import("@supabase/supabase-js").SupabaseClient;
      const { data: payable, error } = await db.from("stripe_booking_releases").select("status")
        .eq("booking_id", data.bookingId).maybeSingle();
      if (error || payable?.status !== "PENDING_VERIFICATION") return { ok: false, error: "STRIPE_RELEASE_AWAITING_APPROVAL" };
    }
    const { data: result, error } = await context.supabase.rpc("verify_booking_code", { _booking_id: data.bookingId, _code: data.code });
    const outcome = result as { ok?: boolean; error?: string; attempts_left?: number } | null;
    if (error || !outcome?.ok) return { ...outcome, ok: false, error: outcome?.error ?? "VERIFICATION_FAILED" };
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

/** Read-only booking-party view; payout records aggregate account funds. */
export const getBookingStripeStages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ bookingId: z.string().uuid() }).parse(value))
  .handler(async ({ data, context }) => {
    const { data: booking, error } = await context.supabase.from("bookings")
      .select("client_id,provider_id,paid_at,status,verification_status,commission_rate,platform_fee,provider_amount,payment_provider")
      .eq("id", data.bookingId).single();
    if (error || !booking) throw new Error("BOOKING_NOT_FOUND");
    const { data: provider } = await context.supabase.from("provider_profiles").select("user_id").eq("id", booking.provider_id).single();
    if (booking.client_id !== context.userId && provider?.user_id !== context.userId) throw new Error("FORBIDDEN");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as import("@supabase/supabase-js").SupabaseClient;
    const { data: release, error: releaseError } = await db.from("stripe_booking_releases")
      .select("status,transfer_id,gross_minor,amount_minor,currency,destination_account_id,last_error")
      .eq("booking_id", data.bookingId).maybeSingle();
    const { destination_account_id: destination, ...safeRelease } = release ?? {};
    let payouts: { payoutId: string; status: string; amountMinor: number; currency: string; failureCode: string | null; updatedAt: string }[] = [];
    let payoutReadStatus = "NO_RECORDED_PAYOUT";
    if (destination && provider?.user_id === context.userId) {
      const { data: rows, error: payoutError } = await db.from("stripe_connected_payouts")
        .select("payout_id,status,amount_minor,currency,failure_code,updated_at").eq("account_id", destination)
        .order("updated_at", { ascending: false }).limit(20);
      payoutReadStatus = payoutError ? "DATA_NOT_AVAILABLE" : "ACCOUNT_PAYOUTS_NOT_BOOKING_ALLOCATION";
      payouts = (rows ?? []).map(row => ({ payoutId: String(row.payout_id), status: String(row.status), amountMinor: Number(row.amount_minor), currency: String(row.currency), failureCode: row.failure_code ? String(row.failure_code) : null, updatedAt: String(row.updated_at) }));
    }
    return {
      paymentStatus: booking.paid_at ? "VERIFIED" : "AWAITING_PAYMENT",
      commissionRate: booking.commission_rate,
      commissionAmount: booking.platform_fee,
      providerPayableAmount: booking.provider_amount,
      verificationStatus: booking.verification_status,
      release: releaseError ? null : safeRelease,
      releaseReadStatus: releaseError ? "SCHEMA_AWAITING_APPROVAL" : release ? "RECORDED" : "NO_VERIFIED_PAYABLE",
      payouts, payoutReadStatus,
      liveTransfersEnabled: false,
    };
  });