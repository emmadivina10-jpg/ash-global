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
import { ACTIVATION_FEE, formatXAF } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — ASH Refer" },
      { name: "description", content: "Track your balance, referrals and earnings on ASH Refer." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data: profile, isLoading } = useProfile();
  const { data: wallet } = useWallet();
  const { data: network } = useNetwork();
  const { data: transactions, isLoading: txLoading } = useTransactions(5);
  const { t } = useI18n();
  const fee = formatXAF(ACTIVATION_FEE);

  const active = profile?.account_status === "ACTIVE";
  const firstName = (profile?.full_name ?? "").split(" ")[0] || t("common.there");

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{t("dash.welcome")}</p>
          <h1 className="truncate text-2xl font-bold text-foreground sm:text-3xl">{firstName}</h1>
        </div>
        <StatusBadge
          status={profile?.account_status ?? "PENDING"}
          label={active ? t("shell.active") : t("shell.pending")}
        />
      </header>

      {isLoading ? (
        <SkeletonRows rows={2} />
      ) : (
        <>
          <BalanceCard
            label={t("dash.availableBalance")}
            amount={formatXAF(wallet?.available_balance ?? 0)}
            footer={
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide opacity-80">{t("dash.totalEarned")}</p>
                  <p className="tabular text-base font-semibold">{formatXAF(wallet?.total_earned ?? 0)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide opacity-80">{t("dash.totalWithdrawn")}</p>
                  <p className="tabular text-base font-semibold">{formatXAF(wallet?.total_withdrawn ?? 0)}</p>
                </div>
              </div>
            }
            action={
              active ? (
                <Button asChild variant="secondary" className="w-full sm:w-auto">
                  <Link to="/withdraw">
                    <ArrowDownToLine className="size-4" aria-hidden />
                    {t("dash.withdrawFunds")}
                  </Link>
                </Button>
              ) : null
            }
          />

          {!active ? (
            <SectionCard className="border-gold/40 bg-gold/10">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-foreground">{t("dash.activateTitle")}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("dash.activateCopy", { fee })}
                  </p>
                </div>
                <Button asChild size="lg">
                  <Link to="/activate">{t("dash.activateCta", { fee })}</Link>
                </Button>
              </div>
            </SectionCard>
          ) : null}

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard
              label={t("dash.stat.earned")}
              value={formatXAF(wallet?.total_earned ?? 0)}
              icon={<Coins className="size-4" aria-hidden />}
              accent
            />
            <StatCard
              label={t("dash.stat.withdrawn")}
              value={formatXAF(wallet?.total_withdrawn ?? 0)}
              icon={<WalletIcon className="size-4" aria-hidden />}
            />
            <StatCard
              label={t("dash.stat.direct")}
              value={network?.direct ?? 0}
              icon={<Users className="size-4" aria-hidden />}
            />
            <StatCard
              label={t("dash.stat.network")}
              value={network?.total ?? 0}
              icon={<TrendingUp className="size-4" aria-hidden />}
            />
          </div>

          {profile?.referral_code ? (
            <ReferralCard code={profile.referral_code} active={active} />
          ) : null}

          <SectionCard
            title={t("dash.recent")}
            action={
              <Button asChild variant="ghost" size="sm">
                <Link to="/transactions">{t("common.viewAll")}</Link>
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
