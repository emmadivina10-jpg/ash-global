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

        // Without a shared signing secret the payload is untrusted: confirm the
        // real status directly with the provider API before crediting anything.
        let status = result.status;
        let providerTransactionId = result.providerTransactionId;
        if (!result.signatureVerified) {
          const verification = await tchokoPay.verifyPayment(result.reference);
          if (!verification.ok) {
            return new Response(JSON.stringify({ error: "VERIFICATION_FAILED" }), {
              status: 502,
              headers: { "content-type": "application/json" },
            });
          }
          status = verification.status;
          providerTransactionId = verification.providerTransactionId;
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        let outcome: string = status ?? "PENDING";
        // References are namespaced: BKG- belongs to a marketplace booking,
        // anything else is an account activation.
        const isBooking = result.reference.startsWith("BKG-");

        if (status === "PAID") {
          // Idempotent: both database functions ignore already-paid records.
          const { error } = isBooking
            ? await supabaseAdmin.rpc("complete_booking_payment", {
                _payment_reference: result.reference,
                _provider_transaction_id: (providerTransactionId ?? null) as unknown as string,
              })
            : await supabaseAdmin.rpc("complete_activation", {
                _payment_reference: result.reference,
                _provider_transaction_id: (providerTransactionId ?? null) as unknown as string,
              });
          if (error) {
            await supabaseAdmin.from("payment_events").insert({
              source: "WEBHOOK",
              reference: result.reference,
              status: status ?? null,
              signature_verified: result.signatureVerified,
              outcome: "COMPLETE_FAILED",
              detail: { error: error.message, kind: isBooking ? "BOOKING" : "ACTIVATION" },
            });
            return new Response(JSON.stringify({ error: "PROCESSING_FAILED" }), {
              status: 500,
              headers: { "content-type": "application/json" },
            });
          }
          outcome = isBooking ? "BOOKING_CONFIRMED" : outcome;
        } else if (status === "FAILED" || status === "CANCELLED") {
          if (isBooking) {
            await supabaseAdmin.rpc("fail_booking_payment", {
              _payment_reference: result.reference,
              _status: status,
            });
          } else {
            await supabaseAdmin
              .from("activations")
              .update({ status, updated_at: new Date().toISOString() })
              .eq("payment_reference", result.reference)
              .neq("status", "PAID");
          }
        }

        await supabaseAdmin.from("payment_events").insert({
          source: "WEBHOOK",
          reference: result.reference,
          status: status ?? null,
          signature_verified: result.signatureVerified,
          outcome,
          detail: { provider_transaction_id: providerTransactionId ?? null },
        });

        return new Response(JSON.stringify({ received: true }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
