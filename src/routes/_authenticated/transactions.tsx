import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTransactions } from "@/lib/queries";
import { SectionCard } from "@/components/refer/cards";
import { TransactionList } from "@/components/refer/TransactionList";
import { ErrorState, SkeletonRows } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { StatementDialog } from "@/components/refer/StatementDialog";
import { useProfile } from "@/lib/queries";
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
  const [statementOpen, setStatementOpen] = useState(false);
  const { data: profile } = useProfile();
  const { t, lang } = useI18n();

  const items = (data ?? []).filter((tx) => filter === "ALL" || tx.type === filter);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{t("tx.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("tx.subtitle")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setStatementOpen(true)}>
          <Printer className="size-4" aria-hidden />
          {lang === "fr" ? "Relevé" : "Statement"}
        </Button>
      </header>

      <StatementDialog
        open={statementOpen}
        onClose={() => setStatementOpen(false)}
        fr={lang === "fr"}
        holder={{
          name: profile?.full_name ?? "ASH member",
          email: profile?.email,
          phone: profile?.phone,
          reference: profile?.referral_code,
        }}
        transactions={data ?? []}
      />

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
