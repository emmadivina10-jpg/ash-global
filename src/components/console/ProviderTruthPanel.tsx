import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getFinanceTruth, reconcileFinanceNow } from "@/lib/finance-reconciliation.functions";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatXAF } from "@/lib/format";

const KIND: Record<string, string> = {
  PROVIDER_BALANCE_UNAVAILABLE: "TchokoPay balance could not be read",
  PROVIDER_BALANCE_BELOW_LIABILITIES: "TchokoPay balance is below what ASH owes members",
  UNBACKED_ADMIN_CREDITS: "Wallet holds unbacked admin credits",
  NEGATIVE_WALLET: "Negative wallet balance",
  DUPLICATE_PROVIDER_REFERENCE: "Duplicate provider reference",
  PAYMENT_STATUS_MISMATCH: "Payment status differs from TchokoPay",
};

export function ProviderTruthPanel() {
  const load = useServerFn(getFinanceTruth);
  const run = useServerFn(reconcileFinanceNow);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["console", "finance-truth"], queryFn: load });
  const m = useMutation({ mutationFn: () => run(), onSuccess: () => qc.invalidateQueries({ queryKey: ["console"] }) });
  const latestFailed = data?.lastAttempt && !data.lastAttempt.ok;

  return (
    <div className="rounded-2xl border border-primary/30 bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">TchokoPay available balance</p>
          <p className="tabular mt-1 font-display text-2xl font-extrabold text-foreground">
            {data?.providerBalance ? formatXAF(data.providerBalance.amount) : "Balance not available from TchokoPay"}
          </p>
          <p className="text-xs text-muted-foreground">
            {data?.providerBalance ? `Last verified ${formatDateTime(data.providerBalance.verifiedAt)}` : "No verified reading yet"}
            {latestFailed ? " · latest check failed — showing last verified figure" : ""}
          </p>
        </div>
        <Button size="sm" onClick={() => m.mutate()} disabled={m.isPending}>
          {m.isPending ? "Reconciling…" : "Reconcile now"}
        </Button>
      </div>
      {data?.lastRun ? (
        <div className="mt-3 border-t border-border pt-3 text-sm">
          <p className="text-foreground">
            Reconciliation: <b>{data.lastRun.status}</b> · {formatDateTime(data.lastRun.started_at)} · Member wallet liabilities{" "}
            {formatXAF(Number(data.lastRun.wallet_liabilities ?? 0))}
          </p>
          <ul className="mt-2 space-y-1">
            {data.discrepancies.map((d, i) => (
              <li key={i} className="text-xs text-destructive">
                {KIND[d.kind] ?? d.kind}
                {d.reference ? ` · ${d.reference}` : ""}
                {d.expected != null ? ` · expected ${formatXAF(Number(d.expected))}` : ""}
                {d.actual != null ? ` · actual ${formatXAF(Number(d.actual))}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">No reconciliation has run yet.</p>
      )}
    </div>
  );
}
