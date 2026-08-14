import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/webhooks/tchokopay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { tchokoPay } = await import("@/lib/tchokopay.server");
        const rawBody = await request.text();
        const result = await tchokoPay.handleWebhook(rawBody, request.headers);

        if (!result.valid) {
          return new Response(JSON.stringify({ error: result.error ?? "INVALID" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }

        if (!result.reference) {
          return new Response(JSON.stringify({ error: "MISSING_REFERENCE" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (result.status === "PAID") {
          // Idempotent: the database function ignores already-paid activations.
          const { error } = await supabaseAdmin.rpc("complete_activation", {
            _payment_reference: result.reference,
            _provider_transaction_id: result.providerTransactionId ?? null,
          });
          if (error) {
            return new Response(JSON.stringify({ error: "PROCESSING_FAILED" }), {
              status: 500,
              headers: { "content-type": "application/json" },
            });
          }
        } else if (result.status === "FAILED" || result.status === "CANCELLED") {
          await supabaseAdmin
            .from("activations")
            .update({ status: result.status, updated_at: new Date().toISOString() })
            .eq("payment_reference", result.reference)
            .neq("status", "PAID");
        }

        return new Response(JSON.stringify({ received: true }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
