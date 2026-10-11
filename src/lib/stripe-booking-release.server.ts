import type { SupabaseClient } from "@supabase/supabase-js";
import { releaseBlocker, transferKey, transferFailure, onboardingAllowed, LIVE_PROVIDER_TRANSFERS_ENABLED, LIVE_PROVIDER_ONBOARDING_ENABLED } from "./stripe-release-policy";
import { stripeConnect, stripeRead } from "./stripe.server";

// Pending schema is intentionally not applied to the shared production database.
// Keep these helpers isolated until that separately authorized migration is applied.
async function database(): Promise<SupabaseClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function providerOnboardingEnabled(userId: string): Promise<boolean> {
  if (!LIVE_PROVIDER_ONBOARDING_ENABLED) return false;
  const db = await database();
  const { data, error } = await db.from("stripe_marketplace_controls")
    .select("onboarding_enabled, onboarding_allowed_user_ids").eq("id", true).maybeSingle();
  return !error && onboardingAllowed(data, userId);
}

export async function releaseBookingTransfer(bookingId: string): Promise<{ status: string; transferId?: string }> {
  if (!LIVE_PROVIDER_TRANSFERS_ENABLED) return { status: "AWAITING_APPROVAL" };
  const db = await database();
  const { data: controls, error: controlsError } = await db.from("stripe_marketplace_controls")
    .select("transfers_enabled, marketplace_account_id").eq("id", true).maybeSingle();
  if (controlsError || !controls?.transfers_enabled || !controls.marketplace_account_id) return { status: "AWAITING_APPROVAL" };

  const { data: job, error: jobError } = await db.from("stripe_booking_releases").select("*").eq("booking_id", bookingId).maybeSingle();
  if (jobError || !job) return { status: "NO_VERIFIED_PAYABLE" };
  if (job.transfer_id) return { status: job.status, transferId: job.transfer_id };
  if (job.status === "SUBMITTING" || job.status === "UNKNOWN") return reconcileRelease(bookingId);

  const account = await stripeRead("account");
  if (account["id"] !== controls.marketplace_account_id || job.marketplace_account_id !== account["id"]) return { status: "ACCOUNT_MISMATCH" };
  const { data: providerBooking, error: providerError } = await db.from("bookings")
    .select("provider_id").eq("id", bookingId).single();
  if (providerError || !providerBooking) return { status: "PROVIDER_NOT_ONBOARDED" };
  const { data: providerProfile, error: profileError } = await db.from("provider_profiles")
    .select("user_id").eq("id", providerBooking.provider_id).single();
  if (profileError || !providerProfile) return { status: "PROVIDER_NOT_ONBOARDED" };
  const { data: mapping, error: mappingError } = await db.from("profiles").select("stripe_account_id")
    .eq("user_id", providerProfile.user_id).single();
  const destinationId = job.destination_account_id ?? mapping?.stripe_account_id;
  if (mappingError || !destinationId || (job.destination_account_id && job.destination_account_id !== mapping?.stripe_account_id)) return { status: "PROVIDER_NOT_ONBOARDED" };
  const destination = await stripeRead(`accounts/${encodeURIComponent(destinationId)}`);
  const capabilities = destination["capabilities"] as Record<string, unknown> | undefined;
  const { data: booking, error: bookingError } = await db.from("bookings")
    .select("paid_at, status, verification_status").eq("id", bookingId).maybeSingle();
  if (bookingError || !booking) return { status: "BOOKING_READ_FAILED" };
  const blocked = releaseBlocker({
    paid: Boolean(booking.paid_at), completed: booking.status === "COMPLETED", verified: booking.verification_status === "VERIFIED",
    held: job.status === "HELD", destinationCountry: String(destination["country"] ?? ""),
    transfersActive: capabilities?.["transfers"] === "active", payoutsEnabled: destination["payouts_enabled"] === true,
    currency: job.currency,
  });
  if (blocked) return { status: blocked };
  const charge = await stripeRead(`charges/${encodeURIComponent(job.source_charge_id)}`);
  if (charge["paid"] !== true || charge["refunded"] === true || charge["disputed"] === true ||
    Number(charge["amount_refunded"] ?? 0) > 0 || charge["payment_intent"] !== job.payment_intent_id ||
    charge["currency"] !== job.currency || charge["amount"] !== Number(job.gross_minor)) return { status: "PAYMENT_HELD" };

  // The service-only SQL claim repeats eligibility checks and locks the booking
  // and payable. A competing worker cannot submit the same payable twice.
  const { data: claimed, error: claimError } = await db.rpc("claim_stripe_booking_release", { _booking_id: bookingId });
  if (claimError || !claimed?.ok) return { status: "NOT_CLAIMED" };
  if (claimed.destination_account_id !== destinationId) return { status: "REQUIRES_REVIEW" };
  try {
    const result = await stripeConnect.transfer({
      accountId: claimed.destination_account_id,
      amountCents: Number(claimed.amount_minor), currency: claimed.currency,
      sourceTransaction: claimed.source_charge_id, idempotencyKey: transferKey(bookingId),
      // A retry is only allowed after a definitive rejection, so a fresh request key cannot double-pay.
      requestKey: Number(claimed.attempt ?? 0) > 0 ? `${transferKey(bookingId)}_a${Number(claimed.attempt)}` : undefined,
      description: `ASH verified booking ${bookingId}`,
    });
    if (!result.ok || !result.transferId) {
      // Ambiguous responses must be reconciled, never sent under a fresh key.
      const status = transferFailure(result.httpStatus ?? 0, result.errorCode ?? "");
      const { error } = await db.from("stripe_booking_releases").update({ status, last_error: status }).eq("booking_id", bookingId).eq("status", "SUBMITTING");
      return { status: error ? "UNKNOWN" : status };
    }
    const { data: saved, error } = await db.rpc("finish_stripe_booking_release", { _booking_id: bookingId, _transfer_id: result.transferId, _reversed: false });
    // Report the persisted state (a hold or reversal recorded meanwhile wins).
    return error || typeof saved?.status !== "string" ? { status: "UNKNOWN" } : { status: saved.status, transferId: result.transferId };
  } catch {
    await db.from("stripe_booking_releases").update({ status: "UNKNOWN", last_error: "TRANSFER_REQUIRES_RECONCILIATION" }).eq("booking_id", bookingId).eq("status", "SUBMITTING");
    return { status: "UNKNOWN" };
  }
}

export async function reconcileRelease(bookingId: string): Promise<{ status: string; transferId?: string }> {
  const db = await database();
  const { data: job, error } = await db.from("stripe_booking_releases").select("*").eq("booking_id", bookingId).maybeSingle();
  if (error || !job) return { status: "NOT_FOUND" };
  const account = await stripeRead("account");
  if (account["id"] !== job.marketplace_account_id) return { status: "ACCOUNT_MISMATCH" };
  let transfer: Record<string, unknown> | undefined;
  if (job.transfer_id) {
    transfer = await stripeRead(`transfers/${encodeURIComponent(job.transfer_id)}`);
  } else {
    const result = await stripeRead(`transfers?transfer_group=${encodeURIComponent(transferKey(bookingId))}&limit=100`);
    const rows = result["data"] as Record<string, unknown>[] | undefined;
    if (result["has_more"] === true || (rows?.length ?? 0) > 1) return { status: "REQUIRES_REVIEW" };
    transfer = rows?.[0];
  }
  if (!transfer) return { status: "UNKNOWN" };
  if (transfer["destination"] !== job.destination_account_id || transfer["amount"] !== Number(job.amount_minor) ||
    transfer["currency"] !== job.currency || transfer["source_transaction"] !== job.source_charge_id) return { status: "REQUIRES_REVIEW" };
  const id = transfer["id"];
  if (typeof id !== "string") return { status: "UNKNOWN" };
  const reversed = transfer["reversed"] === true || Number(transfer["amount_reversed"] ?? 0) > 0;
  const { data: saved, error: saveError } = await db.rpc("finish_stripe_booking_release", { _booking_id: bookingId, _transfer_id: id, _reversed: reversed });
  return saveError || typeof saved?.status !== "string" ? { status: "UNKNOWN" } : { status: saved.status, transferId: id };
}

/** Batch dispatcher for the existing authorized Finance session; controls default off. */
export async function dispatchEligibleReleases() {
  const db = await database();
  const { data, error } = await db.from("stripe_booking_releases").select("booking_id,status").in("status", ["ELIGIBLE", "SUBMITTING", "UNKNOWN"])
    .order("created_at", { ascending: true }).limit(10);
  if (error) return { status: "SCHEMA_AWAITING_APPROVAL", results: [] };
  const results = [];
  for (const row of data ?? []) results.push({ bookingId: row.booking_id, ...(row.status === "ELIGIBLE" ? await releaseBookingTransfer(row.booking_id) : await reconcileRelease(row.booking_id)) });
  return { status: "CHECKED", results };
}