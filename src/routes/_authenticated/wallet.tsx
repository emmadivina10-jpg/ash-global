import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownToLine, Clock, Coins, WalletMinimal } from "lucide-react";
import { useProfile, useTransactions, useWallet } from "@/lib/queries";
import { BalanceCard, SectionCard, StatCard } from "@/components/refer/cards";
import { TransactionList } from "@/components/refer/TransactionList";
import { SkeletonRows } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { formatXAF } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet — Refer" },
      { name: "description", content: "Your Refer wallet: balances, earnings and full transaction history." },
    ],
  }),
  component: WalletPage,
});

function WalletPage() {
  const { data: wallet, isLoading } = useWallet();
  const { data: profile } = useProfile();
  const { data: transactions, isLoading: txLoading } = useTransactions(20);
  const active = profile?.account_status === "ACTIVE";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Wallet</h1>
        <p className="mt-1 text-sm text-muted-foreground">Balances update from your transaction ledger.</p>
      </header>

      {isLoading ? (
        <SkeletonRows rows={2} />
      ) : (
        <>
          <BalanceCard
            label="Available Balance"
            amount={formatXAF(wallet?.available_balance ?? 0)}
            action={
              active ? (
                <Button asChild variant="secondary">
                  <Link to="/withdraw">
                    <ArrowDownToLine className="size-4" aria-hidden />
                    Withdraw
                  </Link>
                </Button>
              ) : null
            }
          />

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            <StatCard
              label="Pending Balance"
              value={formatXAF(wallet?.pending_balance ?? 0)}
              hint="Held while a withdrawal is processed"
              icon={<Clock className="size-4" aria-hidden />}
            />
            <StatCard
              label="Total Earned"
              value={formatXAF(wallet?.total_earned ?? 0)}
              accent
              icon={<Coins className="size-4" aria-hidden />}
            />
            <StatCard
              label="Total Withdrawn"
              value={formatXAF(wallet?.total_withdrawn ?? 0)}
              icon={<WalletMinimal className="size-4" aria-hidden />}
              className="col-span-2 lg:col-span-1"
            />
          </div>

          <SectionCard
            title="Transaction history"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link to="/transactions">View all</Link>
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
