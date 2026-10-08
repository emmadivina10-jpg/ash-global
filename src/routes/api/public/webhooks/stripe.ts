import { createFileRoute } from "@tanstack/react-router";

/**
 * Stripe Live webhook. Signature is verified before anything is read; each
 * event id is recorded once so replays never settle twice (the settlement
 * RPCs are idempotent as a second guard).
 */
export const Route = createFileRoute("/api/public/webhooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["STRIPE_WEBHOOK_SECRET"] ?? "";
        if (!secret) return new Response("Webhook not configured", { status: 503 });

        const body = await request.text();
        const { verifyStripeSignature } = await import("@/lib/stripe.server");
        const valid = await verifyStripeSignature(body, request.headers.get("stripe-signature"), secret);
        if (!valid) return new Response("Invalid signature", { status: 400 });

        let event: { id?: string; type?: string; data?: { object?: Record<string, unknown> } };
        try {
          event = JSON.parse(body);
        } catch {
          return new Response("Bad payload", { status: 400 });
        }
        const eventId = String(event.id ?? "");
        const type = String(event.type ?? "");
        const obj = event.data?.object ?? {};
        if (!eventId) return new Response("Bad payload", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: seen } = await supabaseAdmin
          .from("payment_events")
          .select("id")
          .eq("source", "STRIPE_EVENT")
          .eq("reference", eventId)
          .maybeSingle();
        if (seen) return new Response("ok (duplicate)");

        const metadata = (obj["metadata"] ?? {}) as Record<string, string>;
        const reference = metadata["reference"] || String(obj["client_reference_id"] ?? "");
        const intent = typeof obj["payment_intent"] === "string" ? (obj["payment_intent"] as string) : null;
        let outcome = "IGNORED";

        const { settleCollection } = await import("@/lib/payment-settlement.server");

        if (
          (type === "checkout.session.completed" && obj["payment_status"] === "paid") ||
          type === "checkout.session.async_payment_succeeded"
        ) {
          if (reference) {
            const r = await settleCollection({
              merchantReference: reference,
              providerReference: intent,
              status: "PAID",
              source: "STRIPE_WEBHOOK",
              signatureVerified: true,
              detail: { event_id: eventId, session_id: obj["id"] },
            });
            outcome = r.outcome;
            if (!r.ok) {
              // Let Stripe retry; do not record the event as processed.
              return new Response("Settlement failed", { status: 500 });
            }
          }
        } else if (type === "checkout.session.async_payment_failed" || type === "checkout.session.expired") {
          if (reference) {
            const r = await settleCollection({
              merchantReference: reference,
              providerReference: intent,
              status: type.endsWith("expired") ? "CANCELLED" : "FAILED",
              source: "STRIPE_WEBHOOK",
              signatureVerified: true,
              detail: { event_id: eventId },
            });
            outcome = r.outcome;
            if (type.endsWith("expired")) {
              await supabaseAdmin
                .from("payment_transactions")
                .update({ status: "EXPIRED", updated_at: new Date().toISOString() })
                .eq("reference", reference)
                .in("status", ["PENDING", "PROCESSING", "CANCELLED"]);
            }
          }
        } else if (type === "charge.refunded" && intent) {
          // Refunds are recorded and flagged; any wallet reversal is a Finance decision.
          await supabaseAdmin
            .from("payment_transactions")
            .update({ status: "REFUNDED", reconciliation_status: "NEEDS_REVIEW", updated_at: new Date().toISOString() })
            .eq("provider", "STRIPE")
            .eq("provider_reference", intent);
          outcome = "REFUND_RECORDED";
        }

        await supabaseAdmin.from("payment_events").insert({
          source: "STRIPE_EVENT",
          reference: eventId,
          status: type,
          signature_verified: true,
          outcome,
          detail: { merchant_reference: reference || null, payment_intent: intent },
        });
        return new Response("ok");
      },
    },
  },
});
