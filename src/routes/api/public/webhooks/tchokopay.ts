import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/webhooks/tchokopay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { tchokoPay } = await import("@/lib/tchokopay.server");

        const rawBody = await request.text();

        const result = await tchokoPay.handleWebhook(
          rawBody,
          request.headers,
        );

        /*
         * Reject invalid webhook signatures.
         *
         * Disbursement webhooks are financial instructions, so ASH must
         * never settle a withdrawal from an unsigned/unverified delivery.
         */
        if (!result.valid || !result.signatureVerified) {
          return Response.json(
            { error: result.error ?? "INVALID_SIGNATURE" },
            { status: 401 },
          );
        }

        /*
         * ---------------------------------------------------------------
         * TCHOKOPAY DISBURSEMENT WEBHOOK
         * ---------------------------------------------------------------
         *
         * This is the automatic withdrawal settlement path.
         *
         * TchokoPay first accepts the disbursement request. Later,
         * the signed webhook tells ASH whether the money is:
         *
         *   PENDING / PROCESSING
         *   PAID
         *   FAILED
         *   CANCELLED
         *
         * ASH converts those into its withdrawal states:
         *
         *   PROCESSING
         *   COMPLETED
         *   FAILED
         */
        if (result.isDisbursement) {
          const {
            supabaseAdmin,
          } = await import("@/integrations/supabase/client.server");

          const providerReference =
            result.providerReference ?? null;

          /*
           * A provider reference is required because the disbursement
           * request does not put our ASH withdrawal reference inside the
           * documented /disburse body.
           */
          if (!providerReference) {
            return Response.json(
              { error: "MISSING_PROVIDER_REFERENCE" },
              { status: 400 },
            );
          }

          /*
           * Find the ASH withdrawal previously linked to this
           * TchokoPay provider reference.
           */
          const { data: withdrawal, error: withdrawalLookupError } =
            await supabaseAdmin
              .from("withdrawals")
              .select(
                "id, reference, user_id, amount, currency, status, provider_reference",
              )
              .eq("provider_reference", providerReference)
              .maybeSingle();

          if (withdrawalLookupError) {
            return Response.json(
              { error: "WITHDRAWAL_LOOKUP_FAILED" },
              { status: 500 },
            );
          }

          if (!withdrawal) {
            return Response.json(
              { error: "UNKNOWN_WITHDRAWAL" },
              { status: 404 },
            );
          }

          /*
           * Map TchokoPay's payout result into ASH's withdrawal status.
           */
          const providerStatus = result.status ?? "PENDING";

          let withdrawalStatus:
            | "PROCESSING"
            | "COMPLETED"
            | "FAILED";

          switch (providerStatus) {
            case "PAID":
              withdrawalStatus = "COMPLETED";
              break;

            case "FAILED":
            case "CANCELLED":
              withdrawalStatus = "FAILED";
              break;

            case "PENDING":
            case "PROCESSING":
            default:
              withdrawalStatus = "PROCESSING";
              break;
          }

          /*
           * Use the service-role settlement RPC because this webhook is
           * a server-to-server provider callback, not a normal user action.
           */
          const { data: settled, error: settlementError } =
            await supabaseAdmin.rpc("console_settle_withdrawal", {
              _withdrawal_id: withdrawal.id,
              _status: withdrawalStatus,
              _provider_reference: providerReference,
              _note:
                result.failureReason ??
                `TchokoPay disbursement webhook: ${providerStatus}`,
            });

          /*
           * Duplicate webhook deliveries are safe.
           *
           * TchokoPay may retry a webhook. The database settlement
           * function rejects an already-final withdrawal with
           * ALREADY_SETTLED, which should still receive a 200 response.
           */
          const settlementResult = settled as
            | {
                ok?: boolean;
                error?: string;
              }
            | null;

          if (settlementError) {
            return Response.json(
              { error: "PROCESSING_FAILED" },
              { status: 500 },
            );
          }

          if (
            !settlementResult?.ok &&
            settlementResult?.error !== "ALREADY_SETTLED"
          ) {
            return Response.json(
              {
                error:
                  settlementResult?.error ??
                  "WITHDRAWAL_SETTLEMENT_FAILED",
              },
              { status: 500 },
            );
          }

          /*
           * Record the provider event for the ASH audit trail.
           */
          await supabaseAdmin.from("payment_events").insert({
            source: "WEBHOOK",
            reference:
              withdrawal.reference ??
              providerReference,
            status: providerStatus,
            signature_verified: true,
            outcome: `DISBURSE_${providerStatus}`,
            detail: {
              withdrawal_id: withdrawal.id,
              ash_reference: withdrawal.reference,
              provider_reference: providerReference,
              event: result.event ?? null,
              failure_reason: result.failureReason ?? null,
            },
          });

          /*
           * Always acknowledge successfully processed provider
           * callbacks so TchokoPay does not keep retrying them.
           */
          return Response.json({ received: true });
        }

        /*
         * ---------------------------------------------------------------
         * COLLECTION WEBHOOKS
         * ---------------------------------------------------------------
         *
         * Everything below preserves the existing collection-payment
         * behavior for bookings, activation payments, etc.
         */

        if (!result.providerReference && !result.merchantReference) {
          return Response.json(
            { error: "MISSING_REFERENCE" },
            { status: 400 },
          );
        }

        const {
          findMerchantReference,
          settleCollection,
        } = await import("@/lib/payment-settlement.server");

        const merchantReference =
          result.merchantReference ??
          (result.providerReference
            ? await findMerchantReference(result.providerReference)
            : null);

        if (!merchantReference) {
          return Response.json(
            { error: "UNKNOWN_REFERENCE" },
            { status: 404 },
          );
        }

        let status = result.status ?? "PENDING";

        let providerReference =
          result.providerReference ?? null;

        /*
         * For unsigned collection deliveries, ask TchokoPay's API
         * directly before changing payment state.
         */
        if (!result.signatureVerified) {
          if (!providerReference) {
            return Response.json(
              { error: "VERIFICATION_FAILED" },
              { status: 502 },
            );
          }

          const collection =
            await tchokoPay.getCollection(providerReference);

          if (!collection.ok) {
            return Response.json(
              { error: "VERIFICATION_FAILED" },
              { status: 502 },
            );
          }

          status = collection.status;

          providerReference =
            collection.providerReference ??
            providerReference;
        }

        const settled = await settleCollection({
          merchantReference,
          providerReference,
          status,
          source: "WEBHOOK",
          signatureVerified: result.signatureVerified,
          detail: {
            event: result.event ?? null,
            ...(result.failureReason
              ? {
                  failure_reason:
                    result.failureReason,
                }
              : {}),
          },
        });

        if (!settled.ok) {
          return Response.json(
            { error: "PROCESSING_FAILED" },
            { status: 500 },
          );
        }

        return Response.json({ received: true });
      },
    },
  },
});
