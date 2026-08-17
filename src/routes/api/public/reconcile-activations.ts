import { createFileRoute } from "@tanstack/react-router";

/**
 * Reconciliation endpoint (safe to call publicly and from a scheduler).
 *
 * It never trusts the caller: for each activation still awaiting payment it asks
 * TchokoPay for the authoritative status and only completes the ones the provider
 * itself reports as PAID. Completion runs through complete_activation(), which is
 * idempotent, so replays cannot double-credit anything.
 */
async function reconcile(limit: number) {
  const { tchokoPay } = await import("@/lib/tchokopay.server");
  if (!tchokoPay.isConfigured()) {
    return { ok: false as const, error: "PAYMENT_PROVIDER_NOT_CONFIGURED", checked: 0, activated: 0 };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: pending } = await supabaseAdmin
    .from("activations")
    .select("payment_reference, status")
    .in("status", ["PENDING", "PROCESSING"])
    .order("created_at", { ascending: false })
    .limit(limit);

  let activated = 0;
  const results: { reference: string; status: string }[] = [];

  for (const row of pending ?? []) {
    const verification = await tchokoPay.verifyPayment(row.payment_reference);
    if (!verification.ok) {
      results.push({ reference: row.payment_reference, status: `UNVERIFIED:${verification.error ?? ""}` });
      continue;
    }

    if (verification.status === "PAID") {
      const { error } = await supabaseAdmin.rpc("complete_activation", {
        _payment_reference: row.payment_reference,
        _provider_transaction_id: (verification.providerTransactionId ?? null) as unknown as string,
      });
      if (!error) activated += 1;
      results.push({ reference: row.payment_reference, status: error ? "COMPLETE_FAILED" : "PAID" });
      continue;
    }

    if (verification.status === "FAILED" || verification.status === "CANCELLED") {
      await supabaseAdmin
        .from("activations")
        .update({ status: verification.status, updated_at: new Date().toISOString() })
        .eq("payment_reference", row.payment_reference)
        .neq("status", "PAID");
    }
    results.push({ reference: row.payment_reference, status: verification.status });
  }

  return { ok: true as const, checked: pending?.length ?? 0, activated, results };
}

export const Route = createFileRoute("/api/public/reconcile-activations")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const limit = Math.min(Number(new URL(request.url).searchParams.get("limit") ?? 50) || 50, 100);
        const result = await reconcile(limit);
        return Response.json(result, { headers: { "cache-control": "no-store" } });
      },
      POST: async () => Response.json(await reconcile(50), { headers: { "cache-control": "no-store" } }),
    },
  },
});
