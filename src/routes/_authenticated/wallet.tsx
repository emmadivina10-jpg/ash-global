import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDownToLine,
  Clock,
  Coins,
  Hourglass,
  Sparkles,
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
import { formatXAF } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet — ASH Glo" },
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
  const { data: wallet, isLoading } = useWallet();
  const { data: profile } = useProfile();
  const { data: transactions, isLoading: txLoading } = useTransactions(20);
  const { data: network } = useNetwork();
  const active = profile?.account_status === "ACTIVE";
  const { t } = useI18n();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          {t("wallet.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("wallet.subtitle")}
        </p>
      </header>

      {isLoading ? (
        <SkeletonRows rows={2} />
      ) : (
        <>
          {/* =========================================================
              PREMIUM ASH GLO WALLET CARD
              ========================================================= */}
          <div className="relative">
            {/* Soft branded glow behind the wallet */}
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-3 -z-10 rounded-[2rem] bg-gradient-to-r from-fuchsia-500/10 via-violet-500/15 to-sky-500/10 blur-2xl"
            />

            {/* Premium floating badge */}
            <div
              className="pointer-events-none absolute right-4 top-4 z-10 sm:right-6 sm:top-5"
              aria-hidden
            >
              {/* Small floating highlight */}
              <div className="absolute -right-1 -top-1 size-3 rounded-full bg-white/80 shadow-[0_0_14px_rgba(255,255,255,0.8)] dark:bg-white/70" />

              {/* Main badge */}
              <div className="relative grid size-[58px] place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 via-violet-600 to-sky-500 p-[2px] shadow-[0_10px_30px_rgba(124,58,237,0.35)] ring-2 ring-white/40 dark:ring-white/10">
                <div className="grid size-full place-items-center rounded-full bg-background/95 backdrop-blur">
                  <div className="relative grid size-9 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500/20 via-violet-500/20 to-sky-500/20">
                    <Sparkles
                      className="size-4.5 text-violet-500"
                      aria-hidden
                    />

                    {/* Tiny orbit dot */}
                    <span className="absolute -right-0.5 top-0.5 size-1.5 rounded-full bg-fuchsia-400 shadow-[0_0_8px_rgba(217,70,239,0.9)]" />
                  </div>
                </div>
              </div>

              {/* Hanging branded material */}
              <div className="absolute left-1/2 top-[53px] -z-10 -translate-x-1/2">
                <div className="relative h-10 w-9 overflow-hidden">
                  {/* Back layer */}
                  <div className="absolute left-1/2 top-0 h-9 w-7 -translate-x-1/2 rounded-b-xl bg-gradient-to-b from-violet-500/80 to-fuchsia-500/80 shadow-lg" />

                  {/* Front ribbon */}
                  <div
                    className="absolute left-1/2 top-0 h-10 w-5 -translate-x-1/2 bg-gradient-to-b from-fuchsia-500 via-violet-600 to-sky-500 shadow-md"
                    style={{
                      clipPath:
                        "polygon(0 0, 100% 0, 100% 78%, 50% 100%, 0 78%)",
                    }}
                  />

                  {/* Ribbon shine */}
                  <div className="absolute left-1/2 top-1 h-7 w-px -translate-x-1/2 bg-white/40" />
                </div>
              </div>

              {/* Bottom jewel */}
              <div className="absolute -bottom-2 left-1/2 grid size-3 -translate-x-1/2 place-items-center rounded-full bg-gradient-to-br from-fuchsia-400 to-violet-600 shadow-[0_0_12px_rgba(168,85,247,0.65)]">
                <span className="size-1 rounded-full bg-white/80" />
              </div>
            </div>

            {/* Wallet card */}
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

            {/* Tiny branded status strip */}
            <div className="pointer-events-none absolute bottom-3 left-5 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/10 px-2.5 py-1 backdrop-blur-sm sm:left-7">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[9px] font-semibold tracking-[0.12em] text-muted-foreground">
                ASH GLO WALLET
              </span>
            </div>
          </div>

          {/* =========================================================
              WALLET STATISTICS
              ========================================================= */}
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
                <Link to="/transactions">{t("common.viewAll")}</Link>
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
