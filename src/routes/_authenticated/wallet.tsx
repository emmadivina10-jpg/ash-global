import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDownToLine,
  Clock,
  Coins,
  Crown,
  Hourglass,
  Printer,
  WalletMinimal,
} from "lucide-react";
import {
  useNetwork,
  useProfile,
  useTransactions,
  useWallet,
} from "@/lib/queries";
import {
  BalanceCard,
  SectionCard,
  StatCard,
} from "@/components/refer/cards";
import { TransactionList } from "@/components/refer/TransactionList";
import { SkeletonRows } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { StatementDialog } from "@/components/refer/StatementDialog";
import { WalletTopupDialog } from "@/components/refer/WalletTopupDialog";
import { formatXAF } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useRegion } from "@/lib/region-context";
import { WalletPayoutSetup } from "@/components/refer/WalletPayoutSetup";
import { CurrencySwitcher, MoneyFlowChart } from "@/components/refer/WalletCurrency";
import { balanceFor, currencyOptions, formatMoney, useWalletBalances, useWalletCurrency } from "@/lib/wallet-currency";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet — ASH Glo" },
      { property: "og:title", content: "Wallet — ASH Glo" },
      { property: "og:description", content: "ASH wallet balances, transaction history and payout account setup." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      {
        name: "description",
        content:
          "Your ASH Glo wallet: balances, earnings and full transaction history.",
      },
    ],
  }),
  component: WalletPage,
});

function WalletPage() {
  const { country } = useRegion();
  const { data: wallet, isLoading } = useWallet();
  const { data: profile } = useProfile();
  const { data: transactions, isLoading: txLoading } = useTransactions(20);
  const { data: network } = useNetwork();
  const { data: statementRows } = useTransactions(500);
  const [statementOpen, setStatementOpen] = useState(false);
  const [topupOpen, setTopupOpen] = useState(false);
  const { t, lang } = useI18n();
  const { data: balances } = useWalletBalances();
  const [currency, setCurrency] = useWalletCurrency();
  const current = balanceFor(balances ?? [], currency);

  const GOLD_KEY = "ash.wallet.gold";
  const [goldMode, setGoldMode] = useState(() => {
    try {
      return window.localStorage.getItem(GOLD_KEY) === "1";
    } catch {
      return false;
    }
  });
  const toggleGold = () => {
    setGoldMode((current) => {
      try {
        window.localStorage.setItem(GOLD_KEY, current ? "0" : "1");
      } catch {
        /* private mode */
      }
      return !current;
    });
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header className="flex flex-wrap items-center justify-end gap-2">
        <Button size="sm" onClick={() => setTopupOpen(true)}>
          <ArrowDownToLine className="size-4" aria-hidden />
          {lang === "fr" ? "Ajouter" : "Add money"}
        </Button>
        <Button
          variant={goldMode ? "default" : "outline"}
          size="sm"
          onClick={toggleGold}
          aria-pressed={goldMode}
        >
          <Crown className="size-4" aria-hidden />
          {lang === "fr" ? "Or" : "Gold"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setStatementOpen(true)}>
          <Printer className="size-4" aria-hidden />
          {lang === "fr" ? "Relevé" : "Statement"}
        </Button>
      </header>

      <div className="flex justify-center">
        <CurrencySwitcher options={currencyOptions(balances ?? [])} value={currency} onChange={setCurrency} fr={lang === "fr"} />
      </div>

      <WalletPayoutSetup country={country} />

      <WalletTopupDialog open={topupOpen} onOpenChange={setTopupOpen} fr={lang === "fr"} />
      <StatementDialog
        open={statementOpen}
        onClose={() => setStatementOpen(false)}
        holder={{
          name: profile?.full_name ?? (lang === "fr" ? "Profil" : "Profile"),
          email: profile?.email,
          phone: profile?.phone,
          reference: profile?.referral_code,
        }}
        fr={lang === "fr"}
        transactions={statementRows ?? []}
      />

      {isLoading ? (
        <SkeletonRows rows={2} />
      ) : (
        <>
          <div className="mx-auto w-full max-w-xl">
            <BalanceCard
              gold={goldMode}
              holder={profile?.full_name ?? undefined}
              label={t("dash.availableBalance")}
              amount={formatMoney(current.available, currency)}
              action={
                <Button asChild variant="secondary" className="w-full">
                  <Link to="/withdraw">
                    <ArrowDownToLine className="size-4" aria-hidden />
                    {t("wallet.withdraw")}
                  </Link>
                </Button>
              }
            />
          </div>

          {/* =========================================================
              WALLET STATISTICS
              ========================================================= */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            <StatCard
              label={t("wallet.pending")}
              value={formatMoney(current.pending, currency)}
              hint={t("wallet.pendingHint")}
              icon={<Clock className="size-4" aria-hidden />}
            />

            <StatCard
              label={t("dash.stat.earned")}
              value={formatMoney(currency === "XAF" ? Number(wallet?.total_earned ?? 0) : current.totalIn, currency)}
              accent
              icon={<Coins className="size-4" aria-hidden />}
            />

            <StatCard
              label={t("dash.stat.withdrawn")}
              value={formatMoney(current.totalOut, currency)}
              icon={<WalletMinimal className="size-4" aria-hidden />}
              className="col-span-2 lg:col-span-1"
            />
          </div>

          <MoneyFlowChart rows={statementRows ?? []} currency={currency} fr={lang === "fr"} />

          {/* =========================================================
              NETWORK PENDING NOTICE
              ========================================================= */}
          {(network?.pendingTotal ?? 0) > 0 ? (
            <div className="flex items-start gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 p-4">
              <Hourglass
                className="mt-0.5 size-5 shrink-0 text-destructive"
                aria-hidden
              />

              <div>
                <p className="text-sm font-semibold text-foreground">
                  {t("wallet.pendingTitle", {
                    amount: formatXAF(network?.pendingTotal ?? 0),
                  })}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {t("wallet.pendingBody")}
                </p>
              </div>
            </div>
          ) : null}

          {/* =========================================================
              TRANSACTION HISTORY
              ========================================================= */}
          <SectionCard
            title={t("wallet.history")}
            action={
              <Button asChild variant="ghost" size="sm">
                <Link to="/transactions">
                  {t("common.viewAll")}
                </Link>
              </Button>
            }
          >
            {txLoading ? (
              <SkeletonRows />
            ) : (
              <TransactionList items={transactions ?? []} />
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}
