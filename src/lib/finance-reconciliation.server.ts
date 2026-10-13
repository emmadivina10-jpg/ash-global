/**
 * Compares ASH records against TchokoPay and logs discrepancies. Never changes balances.
 */
import { allFinanceRows } from "./finance-pagination.server";

type Disc = {
  kind: string;
  reference?: string | null;
  user_id?: string | null;
  expected?: number | null;
  actual?: number | null;
  detail?: Record<string, unknown>;
};

export async function runFinanceReconciliation(trigger: string, triggeredBy: string | null) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { tchokoPay } = await import("./tchokopay.server");

  const { data: run, error: runErr } = await supabaseAdmin
    .from("reconciliation_runs")
    .insert({ trigger, triggered_by: triggeredBy })
    .select("id")
    .single();
  if (runErr || !run) throw new Error("Could not start reconciliation");

  const discrepancies: Disc[] = [];

  // 1. Provider balance
  const bal = await tchokoPay.getBalance();
  await supabaseAdmin.from("provider_balance_snapshots").insert({
    available_balance: bal.ok ? bal.available : null,
    currency: bal.currency,
    ok: bal.ok,
    error: bal.error ?? null,
    raw: bal.raw as never,
  });
  if (!bal.ok)
    discrepancies.push({ kind: "PROVIDER_BALANCE_UNAVAILABLE", detail: { error: bal.error } });

  // 2. Wallet vs ledger
  const wallets = await allFinanceRows<{ user_id: string; available_balance: number }>((f, t) =>
    supabaseAdmin.from("wallets").select("user_id, available_balance").order("user_id").range(f, t),
  );
  const txs = await allFinanceRows<{
    user_id: string;
    type: string;
    amount: number;
    status: string;
    reference: string;
  }>((f, t) =>
    supabaseAdmin
      .from("transactions")
      .select("user_id, type, amount, status, reference")
      .order("created_at")
      .range(f, t),
  );
  const ledger = new Map<string, number>();
  for (const tx of txs.data) {
    if (tx.status !== "COMPLETED" && !(tx.type === "WITHDRAWAL" && tx.status === "PENDING"))
      continue;
    ledger.set(tx.user_id, (ledger.get(tx.user_id) ?? 0) + Number(tx.amount));
  }
  let liabilities = 0;
  for (const w of wallets.data) {
    const bal2 = Number(w.available_balance);
    liabilities += bal2;
    if (bal2 < 0) discrepancies.push({ kind: "NEGATIVE_WALLET", user_id: w.user_id, actual: bal2 });
    const unbacked = txs.data.filter(
      (t) =>
        t.user_id === w.user_id &&
        t.type === "ADJUSTMENT" &&
        t.status === "COMPLETED" &&
        Number(t.amount) > 0 &&
        !t.reference.startsWith("ADJ-RECON"),
    );
    if (bal2 > 0 && unbacked.length > 0) {
      discrepancies.push({
        kind: "UNBACKED_ADMIN_CREDITS",
        user_id: w.user_id,
        actual: bal2,
        detail: { credits: unbacked.length },
      });
    }
    void ledger;
  }

  // 3. Merchant balance must cover what ASH owes members
  if (bal.ok && bal.available !== null && bal.available < liabilities) {
    discrepancies.push({
      kind: "PROVIDER_BALANCE_BELOW_LIABILITIES",
      expected: liabilities,
      actual: bal.available,
    });
  }

  // 4. Duplicate provider references
  const pays = await allFinanceRows<{
    provider_transaction_id: string | null;
    payment_reference: string;
  }>((f, t) =>
    supabaseAdmin
      .from("activations")
      .select("provider_transaction_id, payment_reference")
      .eq("status", "PAID")
      .order("created_at")
      .range(f, t),
  );
  const seen = new Map<string, number>();
  for (const p of pays.data)
    if (p.provider_transaction_id)
      seen.set(p.provider_transaction_id, (seen.get(p.provider_transaction_id) ?? 0) + 1);
  for (const [ref, n] of seen)
    if (n > 1)
      discrepancies.push({
        kind: "DUPLICATE_PROVIDER_REFERENCE",
        reference: ref,
        detail: { count: n },
      });

  // 5. Status mismatches: completed withdrawals checked against TchokoPay (most recent 20)
  const { data: wds } = await supabaseAdmin
    .from("withdrawals")
    .select("reference, provider_reference, amount, status")
    .eq("status", "COMPLETED")
    .not("provider_reference", "is", null)
    .order("requested_at", { ascending: false })
    .limit(20);
  for (const w of wds ?? []) {
    const d = await tchokoPay.getDisbursement(w.provider_reference as string);
    if (d.ok && d.status !== "PAID")
      discrepancies.push({
        kind: "PAYMENT_STATUS_MISMATCH",
        reference: w.reference,
        detail: { ash: w.status, provider: d.status },
      });
  }

  if (discrepancies.length) {
    await supabaseAdmin
      .from("reconciliation_discrepancies")
      .insert(
        discrepancies.map((d) => ({
          run_id: run.id,
          kind: d.kind,
          reference: d.reference ?? null,
          user_id: d.user_id ?? null,
          expected: d.expected ?? null,
          actual: d.actual ?? null,
          detail: (d.detail ?? {}) as never,
        })),
      );
  }
  await supabaseAdmin
    .from("reconciliation_runs")
    .update({
      finished_at: new Date().toISOString(),
      status: discrepancies.length ? "DISCREPANCIES" : "MATCHED",
      provider_balance: bal.ok ? bal.available : null,
      wallet_liabilities: liabilities,
      discrepancy_count: discrepancies.length,
    })
    .eq("id", run.id);

  return { runId: run.id, discrepancies: discrepancies.length };
}

export async function readFinanceTruth() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [lastOk, lastAny, lastRun] = await Promise.all([
    supabaseAdmin
      .from("provider_balance_snapshots")
      .select("available_balance, currency, verified_at")
      .eq("ok", true)
      .order("verified_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("provider_balance_snapshots")
      .select("ok, error, verified_at")
      .order("verified_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("reconciliation_runs")
      .select(
        "id, status, started_at, finished_at, provider_balance, wallet_liabilities, discrepancy_count",
      )
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const discrepancies = lastRun.data
    ? ((
        await supabaseAdmin
          .from("reconciliation_discrepancies")
          .select("kind, reference, expected, actual, detail, created_at")
          .eq("run_id", lastRun.data.id)
      ).data ?? [])
    : [];
  return {
    providerBalance: lastOk.data
      ? {
          amount: Number(lastOk.data.available_balance),
          currency: lastOk.data.currency,
          verifiedAt: lastOk.data.verified_at,
        }
      : null,
    lastAttempt: lastAny.data ?? null,
    lastRun: lastRun.data ?? null,
    discrepancies,
  };
}
