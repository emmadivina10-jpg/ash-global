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
        const valid = await verifyStripeSignature(
          body,
          request.headers.get("stripe-signature"),
          secret,
        );
        if (!valid) return new Response("Invalid signature", { status: 400 });

        let event: { id?: string; type?: string; data?: { object?: Record<string, unknown> } };
        try {
          event = JSON.parse(body);
        } catch {
          return new Response("Bad payload", { status: 400 });
        }
        const eventId = String(event.id ?? "");
        if (!eventId) return new Response("Bad payload", { status: 400 });

        // Durable booking releases need separately approved shared-db safeguards.
        // Until installed, fail closed after authenticating the signature.
        const { handleMarketplaceEvent } = await import("@/lib/stripe-marketplace-webhook.server");
        return handleMarketplaceEvent(event);
      },
    },
  },
});
