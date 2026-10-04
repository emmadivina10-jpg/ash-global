import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getFinanceLedger, type LedgerEntry } from "@/lib/finance.functions";
import { SectionCard } from "@/components/refer/cards";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/refer/states";
import { StatusBadge } from "@/components/refer/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateTime, formatXAF } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/console/finance")({
  ssr: false,
  component: ConsoleFinance,
});

const TABS = ["Master ledger", "Owner withdrawals", "Wallet credits", "Reconciliation"] as const;
const CATEGORY_LABEL: Record<string, string> = {
  REVENUE: "Revenue",
  CUSTOMER_FUNDS: "Customer funds (held)",
  WALLET_CREDIT: "Wallet adjustment / credit",
  REWARD: "Referral reward",
  MEMBER_PAYOUT: "Member payout",
  OWNER_WITHDRAWAL: "Owner withdrawal",
};
const FILTERS = ["ALL", "REVENUE", "CUSTOMER_FUNDS", "WALLET_CREDIT", "REWARD", "MEMBER_PAYOUT", "OWNER_WITHDRAWAL"] as const;

function ConsoleFinance() {
  const load = useServerFn(getFinanceLedger);
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["console", "finance-ledger"], queryFn: load });
  const [tab, setTab] = useState<(typeof TABS)[number]>("Master ledger");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const [open, setOpen] = useState<LedgerEntry | null>(null);

  const entries = useMemo(
    () => (data?.entries ?? []).filter((e) => filter === "ALL" || e.category === filter),
    [data, filter],
  );

  if (isLoading) return <SkeletonRows rows={8} />;
  if (isError || !data) return <ErrorState onRetry={() => void refetch()} />;
  const s = data.summary;

  const cards = [
    { label: "Real revenue (ASH income)", value: s.revenue, hint: "Fees, subscriptions, commissions" },
    { label: "Customer funds held", value: s.customerFunds, hint: "Seller share — not income" },
    { label: "Member payouts", value: s.memberPayouts, hint: "Wallet withdrawals paid" },
    { label: "Owner withdrawals", value: s.ownerTaken, hint: "Completed + in progress" },
    { label: "Wallet credits (net)", value: s.walletCreditsNet, hint: "Admin adjustments — not income" },
    { label: "Owed to member wallets", value: s.walletLiability, hint: "Liability" },
    { label: "Cash on hand", value: s.cashOnHand, hint: "In − payouts − owner withdrawals" },
    { label: "Available platform funds", value: s.availablePlatformFunds, hint: "Current owner-withdrawal limit" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-extrabold text-foreground">Finance</h2>
        <p className="text-sm text-muted-foreground">
          Every figure comes from an existing payment, wallet or payout record. Nothing here is estimated.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.label}</p>
            <p className="tabular mt-1 font-display text-xl font-extrabold text-foreground">{formatXAF(c.value)}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{c.hint}</p>
          </div>
        ))}
      </div>

      <div
        className={cn(
          "rounded-2xl border p-3 text-sm",
          s.mismatchedWallets === 0 ? "border-primary/40 bg-primary/10 text-foreground" : "border-destructive/40 bg-destructive/10 text-foreground",
        )}
      >
        {s.mismatchedWallets === 0
          ? "Reconciled: every wallet balance matches its own transaction history."
          : `${s.mismatchedWallets} wallet(s) do not match their transaction history — see Reconciliation.`}
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button key={t} size="sm" variant={tab === t ? "default" : "outline"} className="rounded-full" onClick={() => setTab(t)}>
            {t}
          </Button>
        ))}
      </div>

      {tab === "Master ledger" ? (
        <SectionCard title="Master ledger" description="All money in, out and between wallets. Tap a row for full details.">
          <div className="mb-4 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <Button key={f} size="sm" variant={filter === f ? "secondary" : "ghost"} className="rounded-full" onClick={() => setFilter(f)}>
                {f === "ALL" ? "All" : CATEGORY_LABEL[f]}
              </Button>
            ))}
          </div>
          {entries.length === 0 ? (
            <EmptyState title="No entries" />
          ) : (
            <ul className="divide-y divide-border">
              {entries.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setOpen(e)}
                    className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 text-left hover:bg-muted/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{e.description}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {CATEGORY_LABEL[e.category]} · {e.source} → {e.destination}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {e.reference} · {formatDateTime(e.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn("tabular text-sm font-bold", e.amount < 0 ? "text-destructive" : "text-foreground")}>
                        {e.amount > 0 ? "+" : ""}
                        {formatXAF(e.amount)}
                      </p>
                      <StatusBadge status={e.status} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      ) : null}

      {tab === "Owner withdrawals" ? (
        <SectionCard title="Owner / platform withdrawals" description="Money taken out of the ASH platform account. Not an expense and not revenue.">
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Mini label="Cash on hand" value={s.cashOnHand} />
            <Mini label="Owner withdrawals (completed + in progress)" value={s.ownerTaken} />
            <Mini label="Remaining available platform funds" value={s.availablePlatformFunds} />
          </div>
          <div className="mb-3 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">How "Available to withdraw" is calculated</p>
            <p className="mt-1">= Real money received (activation fees, payments)</p>
            <p>− Completed member payouts</p>
            <p>− Owner withdrawals (completed + in progress), deducted once</p>
            <p>− Money owed to member and provider wallets</p>
            <p>− Disputed bookings held for refunds</p>
            <p className="mt-2">Admin wallet credits are never counted as income. New owner withdrawals are made from Console → Payout, which blocks any amount above this figure.</p>
          </div>
          {data.ownerWithdrawals.length === 0 ? (
            <EmptyState title="No owner withdrawals yet" />
          ) : (
            <ul className="divide-y divide-border">
              {data.ownerWithdrawals.map((p) => (
                <li key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                  <div className="min-w-0">
                    <p className="tabular text-sm font-bold text-foreground">{formatXAF(p.amount)}</p>
                    <p className="truncate text-xs text-muted-foreground">To {p.destination} · {p.reference}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDateTime(p.processed_at ?? p.created_at)}
                      {p.note ? ` · ${p.note}` : ""}
                      {p.failure_reason ? ` · ${p.failure_reason}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      ) : null}

      {tab === "Wallet credits" ? (
        <SectionCard
          title="Wallet adjustments / credits"
          description="Administrative credits to member wallets. These are NOT income — they are money ASH owes the member."
        >
          {data.walletCredits.length === 0 ? (
            <EmptyState title="No wallet credits" />
          ) : (
            <ul className="divide-y divide-border">
              {data.walletCredits.map((c) => (
                <li key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {c.recipient} · <span className="text-muted-foreground">{c.adjustmentType}</span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">Reason: {c.reason}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      By {c.admin} · {c.reference} · {formatDateTime(c.createdAt)}
                    </p>
                  </div>
                  <p className={cn("tabular text-sm font-bold", c.amount < 0 ? "text-destructive" : "text-foreground")}>
                    {c.amount > 0 ? "+" : ""}
                    {formatXAF(c.amount)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      ) : null}

      {tab === "Reconciliation" ? (
        <SectionCard title="Wallet reconciliation" description="Stored wallet balance compared with the sum of that wallet's own history.">
          <ul className="divide-y divide-border">
            {data.reconciliation.map((r) => (
              <li key={r.userId} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Stored {formatXAF(r.stored)} · From history {formatXAF(r.computed)} · {r.lines} entries
                  </p>
                </div>
                <StatusBadge status={Math.abs(r.difference) < 0.01 ? "COMPLETED" : "FAILED"} label={Math.abs(r.difference) < 0.01 ? "Matches" : `Off by ${formatXAF(r.difference)}`} />
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      <Dialog open={Boolean(open)} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transaction details</DialogTitle>
          </DialogHeader>
          {open ? (
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
              {[
                ["Amount", formatXAF(open.amount)],
                ["Date/time", formatDateTime(open.createdAt)],
                ["Category", CATEGORY_LABEL[open.category]],
                ["Type", open.type],
                ["Status", open.status],
                ["Source", open.source],
                ["Destination", open.destination],
                ["Recipient", open.recipient ?? "—"],
                ["Related member", open.recipient && open.userId ? open.recipient : "—"],
                ["Reference", open.reference],
                ["Provider reference", open.providerReference ?? "—"],
                ["Description", open.description],
                ["Record", open.record],
              ].map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="break-words font-medium text-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="tabular font-display text-lg font-extrabold text-foreground">{formatXAF(value)}</p>
    </div>
  );
}
