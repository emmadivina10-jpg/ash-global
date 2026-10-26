import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { releaseBlocker, transferKey, transferFailure } from "./stripe-release-policy";
import { stripeTestRead, stripeTestTransfer } from "./stripe.server";

/**
 * Isolated TEST-ONLY settlement path. It exists so the full marketplace flow
 * (payment → booking → completion code → provider transfer → reconciliation)
 * can be exercised in Stripe test mode without ever touching live money.
 *
 * Four gates, all required:
 *   1. STRIPE_TEST_SETTLEMENT_ENABLED === "true" (explicit configuration).
 *   2. The Stripe event is livemode === false (webhook path).
 *   3. Test credentials are configured (sk_test_/rk_test_ only).
 *   4. The booking is a test-only record: payment_provider = "STRIPE_TEST"
 *      with a "BKG-TEST-" reference. The live path requires "STRIPE", so
 *      neither path can ever settle the other's records.
 *
 * Live connected-account IDs do not exist in Stripe test mode, so any live
 * destination fails closed at the account read. Until an isolated backend
 * holds test bookings, this path simply finds no test records in the shared
 * database and fails closed — it is exercised through fixture tests.
 */
export const TEST_PAYMENT_PROVIDER = "STRIPE_TEST";
export const TEST_REFERENCE_PREFIX = "BKG-TEST-";

export function testSettlementEnabled(): boolean {
  return process.env["STRIPE_TEST_SETTLEMENT_ENABLED"] === "true";
}

const testEventSchema = z.object({
  id: z.string().startsWith("evt_"),
  type: z.string().max(100),
  livemode: z.literal(false),
  data: z.object({ object: z.record(z.string(), z.unknown()) }),
});

async function database(): Promise<SupabaseClient> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Shared gates; a Response means stop, null means the test path may run. */
async function testGate(): Promise<Response | null> {
  if (!testSettlementEnabled())
    return new Response("Test settlement is not enabled", { status: 503 });
  const { stripeEnvironment } = await import("./stripe.server");
  if (!stripeEnvironment().test)
    return new Response("Test environment is not configured", { status: 503 });
  return null;
}

/** checkoutMatches for test mode: identical evidence checks, livemode inverted. */
function testCheckoutMatches(input: {
  expectedSession: string;
  actualSession: string;
  expectedReference: string;
  actualReference: string;
  expectedMinor: number;
  actualMinor: number;
  expectedCurrency: string;
  actualCurrency: string;
  live: boolean;
  paid: boolean;
}): boolean {
  return (
    input.live === false &&
    input.paid &&
    input.expectedReference.startsWith(TEST_REFERENCE_PREFIX) &&
    input.expectedSession === input.actualSession &&
    input.expectedReference === input.actualReference &&
    Number.isSafeInteger(input.expectedMinor) &&
    input.expectedMinor > 0 &&
    input.expectedMinor === input.actualMinor &&
    input.expectedCurrency.toLowerCase() === input.actualCurrency.toLowerCase()
  );
}

export async function handleTestMarketplaceEvent(payload: unknown): Promise<Response> {
  const gate = await testGate();
  if (gate) return gate;
  const parsed = testEventSchema.safeParse(payload);
  if (!parsed.success) return new Response("Invalid test event", { status: 400 });
  const event = parsed.data;
  const db = await database();
  const platform = await stripeTestRead("account");
  const platformId = String(platform["id"] ?? "");
  // The test platform account must never be the approved live marketplace account.
  const { data: control } = await db
    .from("stripe_marketplace_controls")
    .select("marketplace_account_id")
    .eq("id", true)
    .maybeSingle();
  if (control?.marketplace_account_id && control.marketplace_account_id === platformId)
    return new Response("Test platform matches live controls", { status: 409 });

  const { error: inboxError } = await db.from("stripe_webhook_inbox").upsert(
    {
      marketplace_account_id: platformId,
      event_account_id: platformId,
      event_id: event.id,
      event_type: event.type,
    },
    { onConflict: "event_account_id,event_id", ignoreDuplicates: true },
  );
  if (inboxError) return new Response("Event persistence failed", { status: 500 });
  const { data: inbox, error: readError } = await db
    .from("stripe_webhook_inbox")
    .select("status")
    .eq("event_account_id", platformId)
    .eq("event_id", event.id)
    .single();
  if (readError) return new Response("Event persistence failed", { status: 500 });
  if (inbox.status === "PROCESSED") return new Response("ok (duplicate)");

  let outcome = "IGNORED";
  try {
    const obj = event.data.object;
    if (event.type.startsWith("checkout.session.")) {
      const metadata = obj["metadata"] as Record<string, unknown> | undefined;
      const reference = String(metadata?.["reference"] ?? obj["client_reference_id"] ?? "");
      if (!reference.startsWith(TEST_REFERENCE_PREFIX)) throw new Error("NOT_A_TEST_BOOKING");
      const succeeded =
        event.type === "checkout.session.async_payment_succeeded" ||
        (event.type === "checkout.session.completed" && obj["payment_status"] === "paid");
      if (succeeded) {
        const sessionId = String(obj["id"] ?? "");
        const session = await stripeTestRead(
          `checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=payment_intent.latest_charge`,
        );
        const { data: booking, error } = await db
          .from("bookings")
          .select(
            "id, provider_transaction_id, payment_reference, payment_amount, payment_currency, payment_provider",
          )
          .eq("payment_reference", reference)
          .single();
        if (error || !booking || booking.payment_provider !== TEST_PAYMENT_PROVIDER)
          throw new Error("TEST_BOOKING_NOT_FOUND");
        const actualMetadata = session["metadata"] as Record<string, unknown> | undefined;
        if (
          !testCheckoutMatches({
            expectedSession: booking.provider_transaction_id,
            actualSession: String(session["id"] ?? ""),
            expectedReference: reference,
            actualReference: String(
              actualMetadata?.["reference"] ?? session["client_reference_id"] ?? "",
            ),
            expectedMinor: Math.round(Number(booking.payment_amount) * 100),
            actualMinor: Number(session["amount_total"]),
            expectedCurrency: booking.payment_currency,
            actualCurrency: String(session["currency"] ?? ""),
            live: session["livemode"] === true,
            paid: session["payment_status"] === "paid",
          })
        )
          throw new Error("PAYMENT_EVIDENCE_MISMATCH");
        const intent = session["payment_intent"] as Record<string, unknown> | undefined;
        const charge = intent?.["latest_charge"] as Record<string, unknown> | undefined;
        if (
          intent?.["status"] !== "succeeded" ||
          charge?.["paid"] !== true ||
          charge["refunded"] === true ||
          charge["disputed"] === true ||
          typeof charge["id"] !== "string" ||
          typeof intent["id"] !== "string"
        )
          throw new Error("CHARGE_NOT_PAYABLE");
        const { settleCollection } = await import("./payment-settlement.server");
        const r = await settleCollection({
          merchantReference: reference,
          providerReference: intent["id"],
          status: "PAID",
          source: "STRIPE_TEST_WEBHOOK",
          signatureVerified: true,
          detail: {
            marketplace_account_id: platformId,
            stripe_event_id: event.id,
            session_id: sessionId,
            charge_id: charge["id"],
            amount_minor: Number(session["amount_total"]),
            currency: String(session["currency"]),
          },
        });
        if (!r.ok) throw new Error("SETTLEMENT_FAILED");
        outcome = r.outcome;
      } else if (
        event.type === "checkout.session.async_payment_failed" ||
        event.type === "checkout.session.expired"
      ) {
        const { settleCollection } = await import("./payment-settlement.server");
        const r = await settleCollection({
          merchantReference: reference,
          providerReference:
            typeof obj["payment_intent"] === "string" ? obj["payment_intent"] : null,
          status: event.type.endsWith("expired") ? "CANCELLED" : "FAILED",
          source: "STRIPE_TEST_WEBHOOK",
          signatureVerified: true,
        });
        if (!r.ok) throw new Error("SETTLEMENT_FAILED");
        outcome = r.outcome;
      }
    } else if (
      [
        "charge.refunded",
        "charge.dispute.created",
        "charge.dispute.updated",
        "charge.dispute.closed",
      ].includes(event.type)
    ) {
      const chargeId = event.type === "charge.refunded" ? obj["id"] : obj["charge"];
      const partial =
        event.type === "charge.refunded" &&
        Number(obj["amount_refunded"] ?? 0) < Number(obj["amount"] ?? 0);
      const { error } = await db.rpc("hold_stripe_booking_charge", {
        _charge_id: chargeId,
        _reason: partial ? "charge.refunded.partial" : event.type,
      });
      if (error) throw new Error("HOLD_FAILED");
      outcome = "PAYMENT_HELD_FOR_REVIEW";
    } else if (
      event.type === "transfer.created" ||
      event.type === "transfer.reversed" ||
      event.type === "transfer.updated"
    ) {
      const id = String(obj["id"] ?? "");
      const transfer = await stripeTestRead(`transfers/${encodeURIComponent(id)}`);
      const { data: release, error } = await db
        .from("stripe_booking_releases")
        .select("booking_id")
        .eq("idempotency_key", transfer["transfer_group"])
        .maybeSingle();
      if (error) throw new Error("TRANSFER_READ_FAILED");
      if (release) {
        const result = await reconcileTestRelease(release.booking_id);
        if (!["TRANSFERRED", "REVERSED"].includes(result.status))
          throw new Error("TRANSFER_RECONCILIATION_REQUIRED");
        outcome = result.status;
      }
    }
    const { error } = await db
      .from("stripe_webhook_inbox")
      .update({ status: "PROCESSED", outcome, processed_at: new Date().toISOString() })
      .eq("event_account_id", platformId)
      .eq("event_id", event.id);
    if (error) throw new Error("EVENT_FINISH_FAILED");
    return new Response("ok");
  } catch {
    // Never log raw Stripe payloads, credentials, customer data or code values.
    return new Response("Test event requires retry or review", { status: 500 });
  }
}

/**
 * Test-only completion-code validation + release. Mirrors the live
 * verifyBookingService flow but is gated and accepts test records only.
 */
export async function verifyTestBookingService(input: {
  bookingId: string;
  code: string;
  userId: string;
}): Promise<{ ok: boolean; error?: string; releaseStatus?: string }> {
  const gate = await testGate();
  if (gate) return { ok: false, error: "TEST_SETTLEMENT_NOT_ENABLED" };
  const db = await database();
  const { data: booking, error: bookingError } = await db
    .from("bookings")
    .select("payment_provider, payment_reference, provider_id, provider_profiles(user_id)")
    .eq("id", input.bookingId)
    .single();
  const provider = booking?.provider_profiles;
  if (
    bookingError ||
    !provider ||
    Array.isArray(provider) ||
    provider.user_id !== input.userId
  ) {
    return { ok: false, error: "VERIFICATION_FAILED" };
  }
  // A production booking can never enter this path.
  if (
    booking.payment_provider !== TEST_PAYMENT_PROVIDER ||
    !String(booking.payment_reference ?? "").startsWith(TEST_REFERENCE_PREFIX)
  )
    return { ok: false, error: "NOT_A_TEST_BOOKING" };
  const { data: payable, error } = await db
    .from("stripe_booking_releases")
    .select("status")
    .eq("booking_id", input.bookingId)
    .maybeSingle();
  if (error || payable?.status !== "PENDING_VERIFICATION")
    return { ok: false, error: "STRIPE_RELEASE_AWAITING_APPROVAL" };
  const { data: result, error: rpcError } = await db.rpc("verify_booking_code", {
    _booking_id: input.bookingId,
    _code: input.code,
  });
  const outcome = result as { ok?: boolean; error?: string; attempts_left?: number } | null;
  if (rpcError) return { ok: false, error: "VERIFICATION_UNAVAILABLE" };
  if (!outcome?.ok)
    return { ...outcome, ok: false, error: outcome?.error ?? "VERIFICATION_FAILED" };
  const release = await releaseTestBookingTransfer(input.bookingId);
  return { ...outcome, ok: true, releaseStatus: release.status };
}

export async function releaseTestBookingTransfer(
  bookingId: string,
): Promise<{ status: string; transferId?: string }> {
  const gate = await testGate();
  if (gate) return { status: "TEST_SETTLEMENT_NOT_ENABLED" };
  const db = await database();
  const { data: job, error: jobError } = await db
    .from("stripe_booking_releases")
    .select("*")
    .eq("booking_id", bookingId)
    .maybeSingle();
  if (jobError || !job) return { status: "NO_VERIFIED_PAYABLE" };
  if (job.transfer_id) return { status: job.status, transferId: job.transfer_id };
  if (job.status === "SUBMITTING" || job.status === "UNKNOWN")
    return reconcileTestRelease(bookingId);

  const platform = await stripeTestRead("account");
  if (platform["id"] !== job.marketplace_account_id) return { status: "ACCOUNT_MISMATCH" };
  const { data: booking, error: bookingError } = await db
    .from("bookings")
    .select(
      "provider_id, paid_at, status, verification_status, payment_provider, payment_reference",
    )
    .eq("id", bookingId)
    .maybeSingle();
  if (bookingError || !booking) return { status: "BOOKING_READ_FAILED" };
  if (
    booking.payment_provider !== TEST_PAYMENT_PROVIDER ||
    !String(booking.payment_reference ?? "").startsWith(TEST_REFERENCE_PREFIX)
  )
    return { status: "NOT_A_TEST_BOOKING" };
  const { data: providerProfile, error: profileError } = await db
    .from("provider_profiles")
    .select("user_id")
    .eq("id", booking.provider_id)
    .single();
  if (profileError || !providerProfile) return { status: "PROVIDER_NOT_ONBOARDED" };
  const { data: mapping, error: mappingError } = await db
    .from("profiles")
    .select("stripe_account_id")
    .eq("user_id", providerProfile.user_id)
    .single();
  const destinationId = job.destination_account_id ?? mapping?.stripe_account_id;
  if (
    mappingError ||
    !destinationId ||
    (job.destination_account_id && job.destination_account_id !== mapping?.stripe_account_id)
  )
    return { status: "PROVIDER_NOT_ONBOARDED" };
  // Live account IDs do not exist in test mode: this read fails closed for them.
  const destination = await stripeTestRead(`accounts/${encodeURIComponent(destinationId)}`);
  if (destination["livemode"] !== false) return { status: "NOT_A_TEST_BOOKING" };
  const capabilities = destination["capabilities"] as Record<string, unknown> | undefined;
  const blocked = releaseBlocker({
    paid: Boolean(booking.paid_at),
    completed: booking.status === "COMPLETED",
    verified: booking.verification_status === "VERIFIED",
    held: job.status === "HELD",
    destinationCountry: String(destination["country"] ?? ""),
    transfersActive: capabilities?.["transfers"] === "active",
    payoutsEnabled: destination["payouts_enabled"] === true,
    currency: job.currency,
  });
  if (blocked) return { status: blocked };
  const charge = await stripeTestRead(`charges/${encodeURIComponent(job.source_charge_id)}`);
  if (
    charge["livemode"] !== false ||
    charge["paid"] !== true ||
    charge["refunded"] === true ||
    charge["disputed"] === true ||
    Number(charge["amount_refunded"] ?? 0) > 0 ||
    charge["payment_intent"] !== job.payment_intent_id ||
    charge["currency"] !== job.currency ||
    charge["amount"] !== Number(job.gross_minor)
  )
    return { status: "PAYMENT_HELD" };

  // The service-only SQL claim repeats eligibility checks and locks the booking
  // and payable. A competing worker cannot submit the same payable twice.
  const { data: claimed, error: claimError } = await db.rpc("claim_stripe_booking_release", {
    _booking_id: bookingId,
  });
  if (claimError || !claimed?.ok) return { status: "NOT_CLAIMED" };
  if (claimed.destination_account_id !== destinationId) return { status: "REQUIRES_REVIEW" };
  // Server-side amount safety: exactly the locked provider share, never above gross.
  if (
    Number(claimed.amount_minor) !== Number(job.amount_minor) ||
    Number(claimed.amount_minor) > Number(job.gross_minor)
  )
    return { status: "REQUIRES_REVIEW" };
  try {
    const result = await stripeTestTransfer({
      accountId: claimed.destination_account_id,
      amountCents: Number(claimed.amount_minor),
      currency: claimed.currency,
      sourceTransaction: claimed.source_charge_id,
      idempotencyKey: transferKey(bookingId),
      // A retry is only allowed after a definitive rejection, so a fresh request key cannot double-pay.
      requestKey:
        Number(claimed.attempt ?? 0) > 0
          ? `${transferKey(bookingId)}_a${Number(claimed.attempt)}`
          : undefined,
      description: `ASH TEST verified booking ${bookingId}`,
    });
    if (!result.ok || !result.transferId) {
      // Ambiguous responses must be reconciled, never sent under a fresh key.
      const status = transferFailure(result.httpStatus ?? 0, result.errorCode ?? "");
      const { error } = await db
        .from("stripe_booking_releases")
        .update({ status, last_error: status })
        .eq("booking_id", bookingId)
        .eq("status", "SUBMITTING");
      return { status: error ? "UNKNOWN" : status };
    }
    const { data: saved, error } = await db.rpc("finish_stripe_booking_release", {
      _booking_id: bookingId,
      _transfer_id: result.transferId,
      _reversed: false,
    });
    // Report the persisted state (a hold or reversal recorded meanwhile wins).
    return error || typeof saved?.status !== "string"
      ? { status: "UNKNOWN" }
      : { status: saved.status, transferId: result.transferId };
  } catch {
    await db
      .from("stripe_booking_releases")
      .update({ status: "UNKNOWN", last_error: "TRANSFER_REQUIRES_RECONCILIATION" })
      .eq("booking_id", bookingId)
      .eq("status", "SUBMITTING");
    return { status: "UNKNOWN" };
  }
}

export async function reconcileTestRelease(
  bookingId: string,
): Promise<{ status: string; transferId?: string }> {
  const db = await database();
  const { data: job, error } = await db
    .from("stripe_booking_releases")
    .select("*")
    .eq("booking_id", bookingId)
    .maybeSingle();
  if (error || !job) return { status: "NOT_FOUND" };
  const platform = await stripeTestRead("account");
  if (platform["id"] !== job.marketplace_account_id) return { status: "ACCOUNT_MISMATCH" };
  let transfer: Record<string, unknown> | undefined;
  if (job.transfer_id) {
    transfer = await stripeTestRead(`transfers/${encodeURIComponent(job.transfer_id)}`);
  } else {
    const result = await stripeTestRead(
      `transfers?transfer_group=${encodeURIComponent(transferKey(bookingId))}&limit=100`,
    );
    const rows = result["data"] as Record<string, unknown>[] | undefined;
    if (result["has_more"] === true || (rows?.length ?? 0) > 1)
      return { status: "REQUIRES_REVIEW" };
    transfer = rows?.[0];
  }
  if (!transfer) return { status: "UNKNOWN" };
  if (
    transfer["livemode"] !== false ||
    transfer["destination"] !== job.destination_account_id ||
    transfer["amount"] !== Number(job.amount_minor) ||
    transfer["currency"] !== job.currency ||
    transfer["source_transaction"] !== job.source_charge_id
  )
    return { status: "REQUIRES_REVIEW" };
  const id = transfer["id"];
  if (typeof id !== "string") return { status: "UNKNOWN" };
  const reversed = transfer["reversed"] === true || Number(transfer["amount_reversed"] ?? 0) > 0;
  const { data: saved, error: saveError } = await db.rpc("finish_stripe_booking_release", {
    _booking_id: bookingId,
    _transfer_id: id,
    _reversed: reversed,
  });
  return saveError || typeof saved?.status !== "string"
    ? { status: "UNKNOWN" }
    : { status: saved.status, transferId: id };
}
