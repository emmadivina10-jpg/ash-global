import { createFileRoute } from "@tanstack/react-router";

/**
 * Reconciliation endpoint (safe to call publicly and from a scheduler).
 *
 * It never trusts the caller: for every payment still awaiting an outcome it asks
 * TchokoPay for the authoritative status of that collection and only settles what
 * the provider itself reports. Settlement runs through idempotent database
 * functions, so replays cannot double-credit anything.
 */
async function reconcile(limit: number) {
  const { tchokoPay } = await import("@/lib/tchokopay.server");
  if (!tchokoPay.isConfigured()) {
    return { ok: false as const, error: "PAYMENT_PROVIDER_NOT_CONFIGURED", checked: 0, settled: 0 };
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { settleCollection } = await import("@/lib/payment-settlement.server");

  const [activations, bookings, links, cleans] = await Promise.all([
    supabaseAdmin
      .from("activations")
      .select("payment_reference, provider_transaction_id")
      .in("status", ["PENDING", "PROCESSING"])
      .order("created_at", { ascending: false })
      .limit(limit),
    supabaseAdmin
      .from("bookings")
      .select("payment_reference, provider_transaction_id")
      .eq("status", "PAYMENT_PROCESSING")
      .eq("payment_provider", "TCHOKOPAY")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabaseAdmin
      .from("payment_link_charges")
      .select("reference, provider_transaction_id")
      .in("status", ["PENDING", "PROCESSING"])
      .order("created_at", { ascending: false })
      .limit(limit),
    supabaseAdmin
      .from("clean_orders")
      .select("payment_reference, provider_transaction_id")
      .eq("payment_status", "PROCESSING")
      .limit(limit),
  ]);

  const pending: { merchantReference: string; providerReference: string | null }[] = [
    ...(activations.data ?? []).map((r) => ({
      merchantReference: r.payment_reference,
      providerReference: r.provider_transaction_id,
    })),
    ...(bookings.data ?? [])
      .filter((r) => Boolean(r.payment_reference))
      .map((r) => ({
        merchantReference: r.payment_reference as string,
        providerReference: r.provider_transaction_id,
      })),
    ...(cleans.data ?? [])
      .filter((r) => Boolean(r.payment_reference))
      .map((r) => ({
        merchantReference: r.payment_reference as string,
        providerReference: r.provider_transaction_id,
      })),
    ...(links.data ?? []).map((r) => ({
      merchantReference: r.reference,
      providerReference: r.provider_transaction_id,
    })),
  ];

  let settled = 0;
  const results: { reference: string; status: string }[] = [];

  for (const row of pending) {
    const providerRef = row.providerReference ?? "";
    const collection = providerRef.startsWith("REQ-")
      ? await tchokoPay.getCollection(providerRef)
      : await tchokoPay.verifyLegacyPayment(row.merchantReference);

    if (!collection.ok) {
      results.push({
        reference: row.merchantReference,
        status: `UNVERIFIED:${collection.error ?? ""}`,
      });
      continue;
    }

    const outcome = await settleCollection({
      merchantReference: row.merchantReference,
      providerReference: collection.providerReference ?? row.providerReference,
      status: collection.status,
      source: "RECONCILE",
    });
    if (collection.status === "PAID" && outcome.ok) settled += 1;
    results.push({ reference: row.merchantReference, status: outcome.outcome });
  }

  // Member withdrawals still waiting on TchokoPay: apply the provider's own final result.
  const { data: payouts } = await supabaseAdmin
    .from("withdrawals")
    .select("id, reference, provider_reference")
    .eq("status", "PROCESSING")
    .not("provider_reference", "is", null)
    .order("requested_at", { ascending: false })
    .limit(limit);

  let payoutsSettled = 0;
  for (const w of payouts ?? []) {
    const ref = w.provider_reference as string;
    const d = await tchokoPay.getDisbursement(ref);
    if (!d.ok) {
      results.push({ reference: w.reference, status: "PAYOUT_UNVERIFIED" });
      continue;
    }
    const target =
      d.status === "PAID"
        ? "COMPLETED"
        : d.status === "FAILED" || d.status === "CANCELLED"
          ? "FAILED"
          : null;
    if (!target) {
      results.push({ reference: w.reference, status: `PAYOUT_${d.status}` });
      continue;
    }
    const { data: out, error } = await supabaseAdmin.rpc("console_settle_withdrawal", {
      _withdrawal_id: w.id,
      _status: target,
      _provider_reference: ref,
    });
    const ok = !error && Boolean((out as { ok?: boolean } | null)?.ok);
    if (ok) payoutsSettled += 1;
    await supabaseAdmin.from("payment_events").insert({
      source: "RECONCILE",
      reference: w.reference,
      status: d.status,
      outcome: ok ? `WITHDRAWAL_${target}` : "WITHDRAWAL_SETTLE_ERROR",
      detail: { provider_reference: ref, reason: d.reason },
    });
    results.push({ reference: w.reference, status: `PAYOUT_${target}` });
  }

  await supabaseAdmin.from("payment_events").insert({
    source: "RECONCILE",
    outcome: "RECONCILED",
    detail: {
      checked: pending.length,
      settled,
      payoutsChecked: (payouts ?? []).length,
      payoutsSettled,
    },
  });

  // Finance reconciliation (logs discrepancies only; never changes balances). At most once per 30 min.
  const { data: recent } = await supabaseAdmin
    .from("reconciliation_runs")
    .select("id")
    .gte("started_at", new Date(Date.now() - 30 * 60_000).toISOString())
    .limit(1);
  if (!recent?.length) {
    const { runFinanceReconciliation } = await import("@/lib/finance-reconciliation.server");
    await runFinanceReconciliation("SCHEDULED", null).catch(() => null);
  }

  return { ok: true as const, checked: pending.length, settled, payoutsSettled, results };
}

export const Route = createFileRoute("/api/public/reconcile-activations")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const limit = Math.min(
          Number(new URL(request.url).searchParams.get("limit") ?? 50) || 50,
          100,
        );
        const result = await reconcile(limit);
        return Response.json(result, { headers: { "cache-control": "no-store" } });
      },
      POST: async () =>
        Response.json(await reconcile(50), { headers: { "cache-control": "no-store" } }),
    },
  },
});
