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