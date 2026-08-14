import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTransactions } from "@/lib/queries";
import { SectionCard } from "@/components/refer/cards";
import { TransactionList } from "@/components/refer/TransactionList";
import { ErrorState, SkeletonRows } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "REFERRAL_COMMISSION", label: "Commissions" },
  { key: "ACTIVATION_PAYMENT", label: "Activation" },
  { key: "WITHDRAWAL", label: "Withdrawals" },
] as const;

export const Route = createFileRoute("/_authenticated/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — Refer" },
      { name: "description", content: "Full immutable ledger of your Refer account activity." },
    ],
  }),
  component: TransactionsPage,
});

function TransactionsPage() {
  const { data, isLoading, isError, refetch } = useTransactions(200);
  const [filter, setFilter] = useState<string>("ALL");

  const items = (data ?? []).filter((tx) => filter === "ALL" || tx.type === filter);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Transactions</h1>
        <p className="mt-1 text-sm text-muted-foreground">Every financial event on your account.</p>
      </header>

      <div className="flex flex-wrap gap-2">
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

      <SectionCard>
        {isLoading ? (
          <SkeletonRows rows={6} />
        ) : isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : (
          <TransactionList items={items} />
        )}
      </SectionCard>
    </div>
  );
}
