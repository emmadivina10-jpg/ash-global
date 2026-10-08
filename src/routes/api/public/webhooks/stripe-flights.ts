import { createFileRoute } from "@tanstack/react-router";

/**
 * Stripe webhook for the dedicated ASH Flights Stripe account (CIBC-linked).
 * Uses its own signing secret; only FLT- references are accepted so a
 * Marketplace payment can never be processed here.
 */
export const Route = createFileRoute("/api/public/webhooks/stripe-flights")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["STRIPE_FLIGHTS_WEBHOOK_SECRET"] ?? "";
        if (!secret) return new Response("Flights webhook not configured", { status: 503 });

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
          .eq("source", "STRIPE_FLIGHTS_EVENT")
          .eq("reference", eventId)
          .maybeSingle();
        if (seen) return new Response("ok (duplicate)");

        const metadata = (obj["metadata"] ?? {}) as Record<string, string>;
        const reference = metadata["reference"] || String(obj["client_reference_id"] ?? "");
        const intent = typeof obj["payment_intent"] === "string" ? (obj["payment_intent"] as string) : null;

        // Flight payments are not live yet (no flight supplier connected), so
        // verified events are recorded for audit only. Non-flight references
        // are flagged as crossover and never settled.
        const outcome = reference && !reference.startsWith("FLT-")
          ? "REJECTED_NOT_FLIGHT"
          : "RECORDED_FLIGHTS_NOT_LIVE";

        await supabaseAdmin.from("payment_events").insert({
          source: "STRIPE_FLIGHTS_EVENT",
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
