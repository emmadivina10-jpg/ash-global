import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { checkoutMatches } from "./stripe-release-policy";
import { stripeRead } from "./stripe.server";

const eventSchema = z.object({
  id: z.string().startsWith("evt_"),
  type: z.string().max(100),
  livemode: z.literal(true),
  account: z.string().optional(),
  data: z.object({ object: z.record(z.string(), z.unknown()) }),
});

/** Which endpoint secret authenticated the delivery (set only by the webhook route). */
export type WebhookSignedBy = "platform" | "connect";

/** Sanitized one-line log: event id/type, stage and Stripe error metadata only. */
function logWebhookFailure(
  event: { id: string; type: string },
  stage: string,
  err?: unknown,
): void {
  const e = (err ?? {}) as Record<string, unknown>;
  const isStripe = e["name"] === "StripeReadError";
  const message = err === undefined ? null : err instanceof Error && /^[A-Z_]{3,60}$/.test(err.message) ? err.message : "UNEXPECTED";
  console.error(
    JSON.stringify({
      scope: "stripe_webhook",
      event_id: event.id,
      event_type: event.type,
      stage,
      error: message,
      ...(isStripe
        ? {
            stripe_status: e["status"] ?? null,
            stripe_code: e["code"] ?? null,
            stripe_type: e["type"] ?? null,
            stripe_request_id: e["requestId"] ?? null,
          }
        : {}),
    }),
  );
}

/**
 * Resolves the platform account the event belongs to. A live account lookup is
 * preferred; if Stripe refuses it, the saved approved account is used only when
 * the delivery was signed by the matching endpoint secret (platform secret for
 * platform events, Connect secret for connected-account events). The account ID
 * is identity only — every payment still needs its own Stripe evidence below.
 */
async function resolvePlatformAccount(
  event: { id: string; type: string; account?: string | undefined },
  savedAccountId: string,
  signedBy: WebhookSignedBy | undefined,
): Promise<{ ok: true; id: string; source: "live" | "saved" } | { ok: false; response: Response }> {
  try {
    const platform = await stripeRead("account");
    return { ok: true, id: String(platform["id"] ?? ""), source: "live" };
  } catch (err) {
    logWebhookFailure(event, "account_lookup", err);
    const signerMatches =
      (signedBy === "platform" && !event.account) || (signedBy === "connect" && !!event.account);
    if (signerMatches && /^acct_[A-Za-z0-9]{8,}$/.test(savedAccountId))
      return { ok: true, id: savedAccountId, source: "saved" };
    return {
      ok: false,
      response: new Response("Stripe account identification failed", { status: 503 }),
    };
  }
}

export async function handleMarketplaceEvent(
  payload: unknown,
  context?: { signedBy?: WebhookSignedBy | undefined },
): Promise<Response> {
  const parsed = eventSchema.safeParse(payload);
  if (!parsed.success) return new Response("Invalid live event", { status: 400 });
  const event = parsed.data;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db: SupabaseClient = supabaseAdmin;
  const { data: control, error: controlError } = await db
    .from("stripe_marketplace_controls")
    .select("marketplace_account_id")
    .eq("id", true)
    .maybeSingle();
  if (controlError || !control?.marketplace_account_id) {
    logWebhookFailure(event, "safeguards_missing");
    return new Response("Payment safeguards awaiting approval", { status: 503 });
  }
  const resolved = await resolvePlatformAccount(
    event,
    String(control.marketplace_account_id),
    context?.signedBy,
  );
  if (!resolved.ok) return resolved.response;
  const platformId = resolved.id;
  if (control.marketplace_account_id !== platformId) {
    logWebhookFailure(event, "account_mismatch");
    return new Response("Marketplace account mismatch", { status: 409 });
  }

  const eventAccount = event.account ?? platformId;
  if (event.account) {
    const { data: provider, error } = await db
      .from("profiles")
      .select("user_id")
      .eq("stripe_account_id", event.account)
      .maybeSingle();
    if (error || !provider) return new Response("Unknown connected account", { status: 400 });
  }
  // The unique insert is a durable inbox, not a completed-event flag. Concurrent
  // retries may process the same payload, but settlement/release SQL locks dedupe.
  const { error: inboxError } = await db.from("stripe_webhook_inbox").upsert(
    {
      marketplace_account_id: platformId,
      event_account_id: eventAccount,
      event_id: event.id,
      event_type: event.type,
    },
    { onConflict: "event_account_id,event_id", ignoreDuplicates: true },
  );
  if (inboxError) return new Response("Event persistence failed", { status: 500 });
  const { data: inbox, error: readError } = await db
    .from("stripe_webhook_inbox")
    .select("status")
    .eq("event_account_id", eventAccount)
    .eq("event_id", event.id)
    .single();
  if (readError) return new Response("Event persistence failed", { status: 500 });
  if (inbox.status === "PROCESSED") return new Response("ok (duplicate)");
  let outcome = "IGNORED";
  try {
    const obj = event.data.object;
    if (event.type.startsWith("checkout.session.")) {
      if (event.account) throw new Error("CONNECTED_CHECKOUT_NOT_MARKETPLACE");
      const metadata = obj["metadata"] as Record<string, unknown> | undefined;
      const reference = String(metadata?.["reference"] ?? obj["client_reference_id"] ?? "");
      if (!reference || reference.startsWith("FLT-"))
        throw new Error("INVALID_MARKETPLACE_REFERENCE");
      const succeeded =
        event.type === "checkout.session.async_payment_succeeded" ||
        (event.type === "checkout.session.completed" && obj["payment_status"] === "paid");
      if (succeeded && reference.startsWith("BKG-")) {
        const sessionId = String(obj["id"] ?? "");
        const session = await stripeRead(
          `checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=payment_intent.latest_charge`,
        );
        const { data: booking, error } = await db
          .from("bookings")
          .select(
            "id, provider_transaction_id, payment_reference, payment_amount, payment_currency, payment_provider",
          )
          .eq("payment_reference", reference)
          .single();
        if (error || !booking || booking.payment_provider !== "STRIPE")
          throw new Error("BOOKING_NOT_FOUND");
        const actualMetadata = session["metadata"] as Record<string, unknown> | undefined;
        if (
          !checkoutMatches({
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
          source: "STRIPE_WEBHOOK",
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
        succeeded ||
        event.type === "checkout.session.async_payment_failed" ||
        event.type === "checkout.session.expired"
      ) {
        const { data: ledger, error } = await db
          .from("payment_transactions")
          .select("provider")
          .eq("reference", reference)
          .single();
        if (error || ledger.provider !== "STRIPE") throw new Error("UNKNOWN_STRIPE_PAYMENT");
        const { settleCollection } = await import("./payment-settlement.server");
        const r = await settleCollection({
          merchantReference: reference,
          providerReference:
            typeof obj["payment_intent"] === "string" ? obj["payment_intent"] : null,
          status: succeeded ? "PAID" : event.type.endsWith("expired") ? "CANCELLED" : "FAILED",
          source: "STRIPE_WEBHOOK",
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
      if (event.account) throw new Error("CONNECTED_CHARGE_NOT_MARKETPLACE");
      const chargeId = event.type === "charge.refunded" ? obj["id"] : obj["charge"];
      const partial =
        event.type === "charge.refunded" &&
        Number(obj["amount_refunded"] ?? 0) < Number(obj["amount"] ?? 0);
      const { error } = await db.rpc("hold_stripe_booking_charge", {
        _charge_id: chargeId,
        _reason: partial ? "charge.refunded.partial" : event.type,
      });
      if (error) throw new Error("HOLD_FAILED");
      if (event.type === "charge.refunded") {
        const { error: refundError } = await db
          .from("payment_transactions")
          .update({ status: "REFUNDED", reconciliation_status: "NEEDS_REVIEW" })
          .eq("provider", "STRIPE")
          .eq("provider_reference", obj["payment_intent"]);
        if (refundError) throw new Error("REFUND_FAILED");
      }
      outcome = "PAYMENT_HELD_FOR_REVIEW";
    } else if (
      event.type === "transfer.created" ||
      event.type === "transfer.reversed" ||
      event.type === "transfer.updated"
    ) {
      const id = String(obj["id"] ?? "");
      const transfer = await stripeRead(`transfers/${encodeURIComponent(id)}`);
      const { data: release, error } = await db
        .from("stripe_booking_releases")
        .select("booking_id")
        .eq("idempotency_key", transfer["transfer_group"])
        .maybeSingle();
      if (error) throw new Error("TRANSFER_READ_FAILED");
      if (release) {
        const { reconcileRelease } = await import("./stripe-booking-release.server");
        const result = await reconcileRelease(release.booking_id);
        if (!["TRANSFERRED", "REVERSED"].includes(result.status))
          throw new Error("TRANSFER_RECONCILIATION_REQUIRED");
        outcome = result.status;
      }
    } else if (event.type.startsWith("payout.") && event.account) {
      // A payout aggregates a connected account's funds, not necessarily one booking.
      // Read current Stripe state, so delayed events cannot overwrite paid/failed
      // payouts with an older pending state.
      const payout = await stripeRead(
        `payouts/${encodeURIComponent(String(obj["id"] ?? ""))}`,
        event.account,
      );
      if (payout["livemode"] !== true) throw new Error("INVALID_PAYOUT");
      const { error } = await db.from("stripe_connected_payouts").upsert(
        {
          account_id: event.account,
          payout_id: payout["id"],
          status: payout["status"],
          amount_minor: payout["amount"],
          currency: payout["currency"],
          failure_code: payout["failure_code"] ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "account_id,payout_id" },
      );
      if (error) throw new Error("PAYOUT_SAVE_FAILED");
      outcome = "CONNECTED_PAYOUT_RECORDED";
    } else if (event.type === "account.updated" && event.account) {
      const account = await stripeRead(`accounts/${encodeURIComponent(event.account)}`);
      const { error } = await db
        .from("profiles")
        .update({
          stripe_details_submitted: account["details_submitted"] === true,
          stripe_payouts_enabled: account["payouts_enabled"] === true,
        })
        .eq("stripe_account_id", event.account);
      if (error) throw new Error("ACCOUNT_UPDATE_FAILED");
      outcome = "ACCOUNT_UPDATED";
    }
    const { error } = await db
      .from("stripe_webhook_inbox")
      .update({ status: "PROCESSED", outcome, processed_at: new Date().toISOString() })
      .eq("event_account_id", eventAccount)
      .eq("event_id", event.id);
    if (error) throw new Error("EVENT_FINISH_FAILED");
    return new Response("ok");
  } catch {
    // Never log raw Stripe payloads, credentials, customer data or code values.
    return new Response("Event requires retry or review", { status: 500 });
  }
}
