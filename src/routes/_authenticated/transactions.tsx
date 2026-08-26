import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTransactions } from "@/lib/queries";
import { SectionCard } from "@/components/refer/cards";
import { TransactionList } from "@/components/refer/TransactionList";
import { ErrorState, SkeletonRows } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n, type TKey } from "@/lib/i18n";

const FILTERS = [
  { key: "ALL", label: "tx.filter.all" as TKey },
  { key: "REFERRAL_COMMISSION", label: "tx.filter.commissions" as TKey },
  { key: "ACTIVATION_PAYMENT", label: "tx.filter.activation" as TKey },
  { key: "WITHDRAWAL", label: "tx.filter.withdrawals" as TKey },
] as const;

export const Route = createFileRoute("/_authenticated/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — ASH Glo" },
      { name: "description", content: "Full immutable ledger of your ASH Glo account activity." },
    ],
  }),
  component: TransactionsPage,
});

function TransactionsPage() {
  const { data, isLoading, isError, refetch } = useTransactions(200);
  const [filter, setFilter] = useState<string>("ALL");
  const { t } = useI18n();

  const items = (data ?? []).filter((tx) => filter === "ALL" || tx.type === filter);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{t("tx.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("tx.subtitle")}</p>
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
            {t(item.label)}
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
