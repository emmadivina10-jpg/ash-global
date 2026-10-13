import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getConsoleLedger } from "@/lib/console.functions";
import { SectionCard } from "@/components/refer/cards";
import { TransactionList } from "@/components/refer/TransactionList";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/refer/states";
import { StatusBadge } from "@/components/refer/StatusBadge";
import { formatDateTime, formatXAF } from "@/lib/format";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "PLATFORM_FEE", label: "Platform fees" },
  { key: "BOOKING_EARNING", label: "Provider earnings" },
  { key: "REFERRAL_COMMISSION", label: "Referral commissions" },
  { key: "ACTIVATION_PAYMENT", label: "Activations" },
  { key: "WITHDRAWAL", label: "Withdrawals" },
] as const;

export const Route = createFileRoute("/console/ledger")({
  component: ConsoleLedger,
});

function ConsoleLedger() {
  const fetchLedger = useServerFn(getConsoleLedger);
  const [filter, setFilter] = useState<string>("ALL");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["console", "ledger"],
    queryFn: fetchLedger,
  });

  const items = (data?.transactions ?? []).filter(
    (tx) => filter === "ALL" || tx.type.startsWith(filter),
  );

  if (isLoading) return <SkeletonRows rows={8} />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <div className="space-y-5">
      <SectionCard
        title="Ledger"
        description="Immutable record of every money movement on the platform."
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {FILTERS.map((item) => (
            <Button
              key={item.key}
              size="sm"
              variant={filter === item.key ? "default" : "outline"}
              className={cn("rounded-full")}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <TransactionList items={items} />
      </SectionCard>

      <SectionCard
        title="Activation payments"
        description="5,000 XAF member activations collected via TchokoPay."
      >
        {(data?.activations ?? []).length === 0 ? (
          <EmptyState title="No activation payments yet" />
        ) : (
          <ul className="divide-y divide-border">
            {(data?.activations ?? []).map((row) => (
              <li
                key={row.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3.5"
              >
                <div className="min-w-0">
                  <p className="tabular text-sm font-bold text-foreground">
                    {formatXAF(row.amount)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{row.payment_reference}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.provider_transaction_id ? `Txn ${row.provider_transaction_id} · ` : ""}
                    {formatDateTime(row.paid_at ?? row.created_at)}
                  </p>
                </div>
                <StatusBadge status={row.status} />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title="Provider subscriptions"
        description="2,000 XAF monthly studio subscriptions."
      >
        {(data?.subscriptions ?? []).length === 0 ? (
          <EmptyState title="No subscription payments yet" />
        ) : (
          <ul className="divide-y divide-border">
            {(data?.subscriptions ?? []).map((row) => (
              <li
                key={row.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3.5"
              >
                <div className="min-w-0">
                  <p className="tabular text-sm font-bold text-foreground">
                    {formatXAF(row.amount)}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.payment_reference ?? "—"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.period_end
                      ? `Until ${formatDateTime(row.period_end)}`
                      : formatDateTime(row.created_at)}
                  </p>
                </div>
                <StatusBadge status={row.status} />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
