import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/webhooks/tchokopay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { tchokoPay } = await import("@/lib/tchokopay.server");
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        const rawBody = await request.text();

        const result = await tchokoPay.handleWebhook(
          rawBody,
          request.headers,
        );

        /*
         * Webhooks are financial events.
         *
         * If the signature is not cryptographically verified,
         * do not allow the callback to change financial state.
         */
        if (!result.valid || !result.signatureVerified) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: result.error ?? "INVALID_SIGNATURE",
            }),
            {
              status: 401,
              headers: {
                "content-type": "application/json",
              },
            },
          );
        }

        if (!result.isDisbursement) {
          /*
           * Existing collection webhook flow.
           *
           * Collections use:
           *   ACT-...
           *   BKG-...
           *   PLK-...
           */
          if (!result.merchantReference) {
            return new Response(
              JSON.stringify({
                ok: false,
                error: "MISSING_REFERENCE",
              }),
              {
                status: 400,
                headers: {
                  "content-type": "application/json",
                },
              },
            );
          }

          const merchantReference = result.merchantReference;
          const status = result.status ?? "PENDING";

          const isBooking =
            merchantReference.startsWith("BKG-");

          const isLink =
            merchantReference.startsWith("PLK-");

          let settlementError: string | null = null;

          if (status === "PAID") {
            const { error } = isBooking
              ? await supabaseAdmin.rpc(
                  "complete_booking_payment",
                  {
                    _payment_reference:
                      merchantReference,
                    ...(result.providerReference
                      ? { _provider_transaction_id: result.providerReference }
                      : {}),
                  },
                )
              : isLink
                ? await supabaseAdmin.rpc(
                    "complete_link_payment",
                    {
                      _payment_reference:
                        merchantReference,
                      ...(result.providerReference
                        ? { _provider_transaction_id: result.providerReference }
                        : {}),
                    },
                  )
                : await supabaseAdmin.rpc(
                    "complete_activation",
                    {
                      _payment_reference:
                        merchantReference,
                      ...(result.providerReference
                        ? { _provider_transaction_id: result.providerReference }
                        : {}),
                    },
                  );

            settlementError =
              error?.message ?? null;
          }

          if (
            status === "FAILED" ||
            status === "CANCELLED"
          ) {
            if (isBooking) {
              const { error } =
                await supabaseAdmin.rpc(
                  "fail_booking_payment",
                  {
                    _payment_reference:
                      merchantReference,
                    _status: status,
                  },
                );

              settlementError =
                error?.message ?? null;
            } else if (isLink) {
              const { error } =
                await supabaseAdmin.rpc(
                  "fail_link_payment",
                  {
                    _payment_reference:
                      merchantReference,
                    _status: status,
                  },
                );

              settlementError =
                error?.message ?? null;
            } else {
              await supabaseAdmin
                .from("activations")
                .update({
                  status,
                  updated_at:
                    new Date().toISOString(),
                })
                .eq(
                  "payment_reference",
                  merchantReference,
                )
                .neq("status", "PAID");
            }
          }

          await supabaseAdmin
            .from("payment_events")
            .insert({
              source: "WEBHOOK",
              reference: merchantReference,
              status,
              signature_verified: true,
              outcome:
                settlementError
                  ? "SETTLEMENT_FAILED"
                  : "PROCESSED",
              detail: {
                event: result.event ?? null,
                provider_reference:
                  result.providerReference ?? null,
                error: settlementError,
                failure_reason:
                  result.failureReason ?? null,
              },
            });

          if (settlementError) {
            return new Response(
              JSON.stringify({
                ok: false,
                error: "SETTLEMENT_FAILED",
              }),
              {
                status: 500,
                headers: {
                  "content-type":
                    "application/json",
                },
              },
            );
          }

          return new Response(
            JSON.stringify({
              ok: true,
              type: "collection",
              reference: merchantReference,
              status,
            }),
            {
              status: 200,
              headers: {
                "content-type":
                  "application/json",
              },
            },
          );
        }

        /*
         * ---------------------------------------------------------
         * DISBURSEMENT WEBHOOK
         * ---------------------------------------------------------
         *
         * These events are used by:
         *
         * 1. Member withdrawals
         * 2. Platform/admin payouts
         *
         * TchokoPay's provider reference is typically PO-...
         * and our ASH merchant reference is PLAT-... or the
         * member withdrawal reference.
         */
        const providerReference =
          result.providerReference ?? null;

        const merchantReference =
          result.merchantReference ?? null;

        const providerStatus =
          result.status ?? "PENDING";

        if (
          !providerReference &&
          !merchantReference
        ) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: "MISSING_DISBURSEMENT_REFERENCE",
            }),
            {
              status: 400,
              headers: {
                "content-type":
                  "application/json",
              },
            },
          );
        }

        /*
         * ---------------------------------------------------------
         * 1. MEMBER WITHDRAWAL
         * ---------------------------------------------------------
         *
         * First locate it using the provider reference.
         * If the webhook arrives before ASH has stored the
         * provider reference, fall back to our ASH reference.
         */
        let withdrawal: {
          id: string;
          reference: string;
          amount: number;
          status: string;
          provider_reference: string | null;
        } | null = null;

        if (providerReference) {
          const { data } =
            await supabaseAdmin
              .from("withdrawals")
              .select(
                "id, reference, amount, status, provider_reference",
              )
              .eq(
                "provider_reference",
                providerReference,
              )
              .maybeSingle();

          withdrawal = data ?? null;
        }

        if (!withdrawal && merchantReference) {
          const { data } =
            await supabaseAdmin
              .from("withdrawals")
              .select(
                "id, reference, amount, status, provider_reference",
              )
              .eq(
                "reference",
                merchantReference,
              )
              .maybeSingle();

          withdrawal = data ?? null;
        }

        if (withdrawal) {
          let settlementStatus:
            | "PROCESSING"
            | "COMPLETED"
            | "FAILED";

          if (providerStatus === "PAID") {
            settlementStatus = "COMPLETED";
          } else if (
            providerStatus === "FAILED" ||
            providerStatus === "CANCELLED"
          ) {
            settlementStatus = "FAILED";
          } else {
            settlementStatus = "PROCESSING";
          }

          const { data: settled, error } =
            await supabaseAdmin.rpc(
              "console_settle_withdrawal",
              {
                _withdrawal_id:
                  withdrawal.id,
                _status:
                  settlementStatus,
                ...(providerReference ?? withdrawal.provider_reference
                  ? {
                      _provider_reference: (providerReference ??
                        withdrawal.provider_reference) as string,
                    }
                  : {}),
              },
            );

          await supabaseAdmin
            .from("payment_events")
            .insert({
              source: "WEBHOOK",
              reference:
                merchantReference ??
                withdrawal.reference,
              status: providerStatus,
              signature_verified: true,
              outcome:
                error || !(settled as { ok?: boolean } | null)?.ok
                  ? "WITHDRAWAL_SETTLEMENT_FAILED"
                  : "WITHDRAWAL_SETTLED",
              detail: {
                event: result.event ?? null,
                provider_reference:
                  providerReference,
                withdrawal_id:
                  withdrawal.id,
                mapped_status:
                  settlementStatus,
                failure_reason:
                  result.failureReason ?? null,
                error:
                  error?.message ?? null,
              },
            });

          if (
            error ||
            !(settled as { ok?: boolean } | null)?.ok
          ) {
            return new Response(
              JSON.stringify({
                ok: false,
                error:
                  error?.message ??
                  "WITHDRAWAL_SETTLEMENT_FAILED",
              }),
              {
                status: 500,
                headers: {
                  "content-type":
                    "application/json",
                },
              },
            );
          }

          return new Response(
            JSON.stringify({
              ok: true,
              type: "withdrawal",
              reference:
                withdrawal.reference,
              providerReference,
              providerStatus,
              status:
                settlementStatus,
            }),
            {
              status: 200,
              headers: {
                "content-type":
                  "application/json",
              },
            },
          );
        }

        /*
         * ---------------------------------------------------------
         * 2. PLATFORM PAYOUT
         * ---------------------------------------------------------
         *
         * This is the admin's own platform-revenue withdrawal.
         *
         * We identify it using either:
         *   provider_reference = PO-...
         * or
         *   reference = PLAT-...
         */
        let platformPayout: {
          id: string;
          reference: string;
          amount: number;
          status: string;
          provider_reference: string | null;
          provider: string | null;
        } | null = null;

        if (providerReference) {
          const { data } =
            await supabaseAdmin
              .from("platform_payouts")
              .select(
                "id, reference, amount, status, provider_reference, provider",
              )
              .eq(
                "provider_reference",
                providerReference,
              )
              .maybeSingle();

          platformPayout = data ?? null;
        }

        if (!platformPayout && merchantReference) {
          const { data } =
            await supabaseAdmin
              .from("platform_payouts")
              .select(
                "id, reference, amount, status, provider_reference, provider",
              )
              .eq(
                "reference",
                merchantReference,
              )
              .maybeSingle();

          platformPayout = data ?? null;
        }

        if (!platformPayout) {
          await supabaseAdmin
            .from("payment_events")
            .insert({
              source: "WEBHOOK",
              reference:
                merchantReference ??
                providerReference ??
                "UNKNOWN",
              status: providerStatus,
              signature_verified: true,
              outcome:
                "UNKNOWN_DISBURSEMENT",
              detail: {
                event:
                  result.event ?? null,
                provider_reference:
                  providerReference,
                merchant_reference:
                  merchantReference,
              },
            });

          return new Response(
            JSON.stringify({
              ok: false,
              error: "UNKNOWN_DISBURSEMENT",
            }),
            {
              status: 404,
              headers: {
                "content-type":
                  "application/json",
              },
            },
          );
        }

        /*
         * TchokoPay -> ASH state mapping
         *
         * PAID        -> COMPLETED
         * FAILED      -> FAILED
         * CANCELLED   -> FAILED
         * anything else -> PROCESSING
         */
        let platformStatus:
          | "PROCESSING"
          | "COMPLETED"
          | "FAILED";

        if (providerStatus === "PAID") {
          platformStatus = "COMPLETED";
        } else if (
          providerStatus === "FAILED" ||
          providerStatus === "CANCELLED"
        ) {
          platformStatus = "FAILED";
        } else {
          platformStatus = "PROCESSING";
        }

        const updatePayload: Record<
          string,
          unknown
        > = {
          status: platformStatus,
          provider_reference:
            providerReference ??
            platformPayout.provider_reference,
          processed_at:
            platformStatus === "COMPLETED" ||
            platformStatus === "FAILED"
              ? new Date().toISOString()
              : null,
          failure_reason:
            platformStatus === "FAILED"
              ? result.failureReason ??
                providerStatus
              : null,
        };

        /*
         * Don't move an already completed payout backwards.
         */
        if (
          platformPayout.status ===
            "COMPLETED" &&
          platformStatus !== "COMPLETED"
        ) {
          await supabaseAdmin
            .from("payment_events")
            .insert({
              source: "WEBHOOK",
              reference:
                platformPayout.reference,
              status: providerStatus,
              signature_verified: true,
              outcome:
                "DUPLICATE_OR_LATE_WEBHOOK",
              detail: {
                event:
                  result.event ?? null,
                provider_reference:
                  providerReference,
                existing_status:
                  platformPayout.status,
                ignored_status:
                  platformStatus,
              },
            });

          return new Response(
            JSON.stringify({
              ok: true,
              type: "platform_payout",
              reference:
                platformPayout.reference,
              status: "COMPLETED",
            }),
            {
              status: 200,
              headers: {
                "content-type":
                  "application/json",
              },
            },
          );
        }

        const { error: updateError } =
          await supabaseAdmin
            .from("platform_payouts")
            .update(updatePayload as never)
            .eq("id", platformPayout.id);

        await supabaseAdmin
          .from("payment_events")
          .insert({
            source: "WEBHOOK",
            reference:
              platformPayout.reference,
            status: providerStatus,
            signature_verified: true,
            outcome: updateError
              ? "PLATFORM_PAYOUT_UPDATE_FAILED"
              : "PLATFORM_PAYOUT_UPDATED",
            detail: {
              event:
                result.event ?? null,
              provider_reference:
                providerReference,
              mapped_status:
                platformStatus,
              amount:
                platformPayout.amount,
              error:
                updateError?.message ?? null,
              failure_reason:
                result.failureReason ?? null,
            },
          });

        if (updateError) {
          return new Response(
            JSON.stringify({
              ok: false,
              error:
                "PLATFORM_PAYOUT_UPDATE_FAILED",
            }),
            {
              status: 500,
              headers: {
                "content-type":
                  "application/json",
              },
            },
          );
        }

        return new Response(
          JSON.stringify({
            ok: true,
            type: "platform_payout",
            reference:
              platformPayout.reference,
            providerReference,
            providerStatus,
            status: platformStatus,
          }),
          {
            status: 200,
            headers: {
              "content-type":
                "application/json",
            },
          },
        );
      },
    },
  },
});
