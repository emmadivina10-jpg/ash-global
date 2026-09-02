import { createFileRoute } from "@tanstack/react-router";

/**
 * TchokoPay webhook receiver (Merchant API / Connect).
 *
 * Deliveries are signed: HMAC-SHA256 over `${timestamp}.${rawBody}` in
 * X-TchokoPay-Signature, with a five-minute freshness window. When a signing
 * secret is configured an invalid signature is rejected outright. Until one is
 * configured the payload is treated as untrusted and the outcome is re-read from
 * GET /collect/{reference} before anything is credited.
 */
export const Route = createFileRoute("/api/public/webhooks/tchokopay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { tchokoPay } = await import("@/lib/tchokopay.server");
        const rawBody = await request.text();
        const result = await tchokoPay.handleWebhook(rawBody, request.headers);

        if (!result.valid) {
          return Response.json({ error: result.error ?? "INVALID" }, { status: 401 });
        }

        // Disbursement events are informational here: ASH payouts are settled in
        // the console, not by this endpoint. Acknowledge so they aren't retried.
        if (result.isDisbursement) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("payment_events").insert({
            source: "WEBHOOK",
            reference: result.merchantReference ?? result.providerReference ?? null,
            status: result.status ?? null,
            signature_verified: result.signatureVerified,
            outcome: `DISBURSE_${result.status ?? "UNKNOWN"}`,
            detail: { event: result.event ?? null, provider_reference: result.providerReference ?? null },
          });
          return Response.json({ received: true });
        }

        if (!result.providerReference && !result.merchantReference) {
          return Response.json({ error: "MISSING_REFERENCE" }, { status: 400 });
        }

        const { findMerchantReference, settleCollection } = await import("@/lib/payment-settlement.server");
        const merchantReference =
          result.merchantReference ??
          (result.providerReference ? await findMerchantReference(result.providerReference) : null);

        if (!merchantReference) {
          return Response.json({ error: "UNKNOWN_REFERENCE" }, { status: 404 });
        }

        let status = result.status ?? "PENDING";
        let providerReference = result.providerReference ?? null;

        // Unsigned deliveries prove nothing, so ask the API what really happened.
        if (!result.signatureVerified) {
          if (!providerReference) return Response.json({ error: "VERIFICATION_FAILED" }, { status: 502 });
          const collection = await tchokoPay.getCollection(providerReference);
          if (!collection.ok) return Response.json({ error: "VERIFICATION_FAILED" }, { status: 502 });
          status = collection.status;
          providerReference = collection.providerReference ?? providerReference;
        }

        const settled = await settleCollection({
          merchantReference,
          providerReference,
          status,
          source: "WEBHOOK",
          signatureVerified: result.signatureVerified,
          detail: {
            event: result.event ?? null,
            ...(result.failureReason ? { failure_reason: result.failureReason } : {}),
          },
        });

        if (!settled.ok) {
          return Response.json({ error: "PROCESSING_FAILED" }, { status: 500 });
        }

        return Response.json({ received: true });
      },
    },
  },
});
