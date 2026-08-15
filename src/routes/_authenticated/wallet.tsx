import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownToLine, Clock, Coins, WalletMinimal } from "lucide-react";
import { useProfile, useTransactions, useWallet } from "@/lib/queries";
import { BalanceCard, SectionCard, StatCard } from "@/components/refer/cards";
import { TransactionList } from "@/components/refer/TransactionList";
import { SkeletonRows } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { formatXAF } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet — ASH Refer" },
      { name: "description", content: "Your ASH Refer wallet: balances, earnings and full transaction history." },
    ],
  }),
  component: WalletPage,
});

function WalletPage() {
  const { data: wallet, isLoading } = useWallet();
  const { data: profile } = useProfile();
  const { data: transactions, isLoading: txLoading } = useTransactions(20);
  const active = profile?.account_status === "ACTIVE";
  const { t } = useI18n();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{t("wallet.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("wallet.subtitle")}</p>
      </header>

      {isLoading ? (
        <SkeletonRows rows={2} />
      ) : (
        <>
          <BalanceCard
            label={t("dash.availableBalance")}
            amount={formatXAF(wallet?.available_balance ?? 0)}
            action={
              active ? (
                <Button asChild variant="secondary">
                  <Link to="/withdraw">
                    <ArrowDownToLine className="size-4" aria-hidden />
                    {t("wallet.withdraw")}
                  </Link>
                </Button>
              ) : null
            }
          />

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            <StatCard
              label={t("wallet.pending")}
              value={formatXAF(wallet?.pending_balance ?? 0)}
              hint={t("wallet.pendingHint")}
              icon={<Clock className="size-4" aria-hidden />}
            />
            <StatCard
              label={t("dash.stat.earned")}
              value={formatXAF(wallet?.total_earned ?? 0)}
              accent
              icon={<Coins className="size-4" aria-hidden />}
            />
            <StatCard
              label={t("dash.stat.withdrawn")}
              value={formatXAF(wallet?.total_withdrawn ?? 0)}
              icon={<WalletMinimal className="size-4" aria-hidden />}
              className="col-span-2 lg:col-span-1"
            />
          </div>

          <SectionCard
            title={t("wallet.history")}
            action={
              <Button asChild variant="ghost" size="sm">
                <Link to="/transactions">{t("common.viewAll")}</Link>
              </Button>
            }
          >
            {txLoading ? <SkeletonRows /> : <TransactionList items={transactions ?? []} />}
          </SectionCard>
        </>
      )}
    </div>
  );
}
