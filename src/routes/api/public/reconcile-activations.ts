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

  const [activations, bookings, links] = await Promise.all([
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
      results.push({ reference: row.merchantReference, status: `UNVERIFIED:${collection.error ?? ""}` });
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

  await supabaseAdmin.from("payment_events").insert({
    source: "RECONCILE",
    outcome: "RECONCILED",
    detail: { checked: pending.length, settled },
  });

  return { ok: true as const, checked: pending.length, settled, results };
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
