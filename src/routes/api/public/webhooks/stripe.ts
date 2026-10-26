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
        // Platform events and Connect (connected-account) events arrive at this
        // one URL but are signed with different endpoint secrets; accept either.
        const secrets = [
          process.env["STRIPE_WEBHOOK_SECRET"] ?? "",
          process.env["STRIPE_WEBHOOK_CONNECT_SECRET"] ?? "",
        ].filter(Boolean);
        if (secrets.length === 0)
          return new Response("Webhook not configured", { status: 503 });

        const body = await request.text();
        const { verifyStripeSignature } = await import("@/lib/stripe.server");
        const header = request.headers.get("stripe-signature");
        let valid = false;
        for (const secret of secrets) {
          if (await verifyStripeSignature(body, header, secret)) {
            valid = true;
            break;
          }
        }
        if (!valid) {
          // Test-mode events are signed with the test endpoint's own secret.
          // With test settlement disabled (the default) they are acknowledged
          // but never settled; when explicitly enabled they go through the
          // gated test-only path, which can never touch live records.
          const testSecret = process.env["STRIPE_TEST_WEBHOOK_SECRET"] ?? "";
          if (testSecret && (await verifyStripeSignature(body, header, testSecret))) {
            const { testSettlementEnabled, handleTestMarketplaceEvent } = await import(
              "@/lib/stripe-test-settlement.server"
            );
            if (!testSettlementEnabled())
              return new Response("ok (test event acknowledged, not settled)");
            let testEvent: unknown;
            try {
              testEvent = JSON.parse(body);
            } catch {
              return new Response("Bad payload", { status: 400 });
            }
            return handleTestMarketplaceEvent(testEvent);
          }
          return new Response("Invalid signature", { status: 400 });
        }

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
