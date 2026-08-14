import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownToLine, Coins, TrendingUp, Users, Wallet as WalletIcon } from "lucide-react";
import { useNetwork, useProfile, useWallet } from "@/lib/queries";
import { BalanceCard, SectionCard, StatCard } from "@/components/refer/cards";
import { ReferralCard } from "@/components/refer/ReferralCard";
import { StatusBadge } from "@/components/refer/StatusBadge";
import { TransactionList } from "@/components/refer/TransactionList";
import { SkeletonRows } from "@/components/refer/states";
import { useTransactions } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { formatXAF } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Refer" },
      { name: "description", content: "Track your balance, referrals and earnings on Refer." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data: profile, isLoading } = useProfile();
  const { data: wallet } = useWallet();
  const { data: network } = useNetwork();
  const { data: transactions, isLoading: txLoading } = useTransactions(5);

  const active = profile?.account_status === "ACTIVE";
  const firstName = (profile?.full_name ?? "").split(" ")[0] || "there";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <h1 className="truncate text-2xl font-bold text-foreground sm:text-3xl">{firstName}</h1>
        </div>
        <StatusBadge
          status={profile?.account_status ?? "PENDING"}
          label={active ? "Active" : "Pending activation"}
        />
      </header>

      {isLoading ? (
        <SkeletonRows rows={2} />
      ) : (
        <>
          <BalanceCard
            label="Available Balance"
            amount={formatXAF(wallet?.available_balance ?? 0)}
            footer={
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide opacity-80">Total earned</p>
                  <p className="tabular text-base font-semibold">{formatXAF(wallet?.total_earned ?? 0)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide opacity-80">Total withdrawn</p>
                  <p className="tabular text-base font-semibold">{formatXAF(wallet?.total_withdrawn ?? 0)}</p>
                </div>
              </div>
            }
            action={
              active ? (
                <Button asChild variant="secondary" className="w-full sm:w-auto">
                  <Link to="/withdraw">
                    <ArrowDownToLine className="size-4" aria-hidden />
                    Withdraw funds
                  </Link>
                </Button>
              ) : null
            }
          />

          {!active ? (
            <SectionCard className="border-gold/40 bg-gold/10">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-foreground">Activate your account</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Pay the one-time 5,000 XAF activation fee to unlock referral earnings.
                  </p>
                </div>
                <Button asChild size="lg">
                  <Link to="/activate">Activate for 5,000 XAF</Link>
                </Button>
              </div>
            </SectionCard>
          ) : null}

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard
              label="Total Earned"
              value={formatXAF(wallet?.total_earned ?? 0)}
              icon={<Coins className="size-4" aria-hidden />}
              accent
            />
            <StatCard
              label="Total Withdrawn"
              value={formatXAF(wallet?.total_withdrawn ?? 0)}
              icon={<WalletIcon className="size-4" aria-hidden />}
            />
            <StatCard
              label="Direct Referrals"
              value={network?.direct ?? 0}
              icon={<Users className="size-4" aria-hidden />}
            />
            <StatCard
              label="Total Network"
              value={network?.total ?? 0}
              icon={<TrendingUp className="size-4" aria-hidden />}
            />
          </div>

          {profile?.referral_code ? (
            <ReferralCard code={profile.referral_code} active={active} />
          ) : null}

          <SectionCard
            title="Recent activity"
            action={
              <Button asChild variant="ghost" size="sm">
                <Link to="/transactions">View all</Link>
              </Button>
            }
          >
            {txLoading ? <SkeletonRows rows={3} /> : <TransactionList items={transactions ?? []} />}
          </SectionCard>
        </>
      )}
    </div>
  );
}
