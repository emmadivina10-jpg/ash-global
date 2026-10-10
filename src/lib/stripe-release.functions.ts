import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const verifyBookingService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => z.object({ bookingId: z.string().uuid(), code: z.string().trim().min(6).max(12) }).parse(value))
  .handler(async ({ data, context }) => {
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