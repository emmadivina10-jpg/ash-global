import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDownToLine,
  Clock,
  Coins,
  Crown,
  Hourglass,
  Printer,
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
import { StatementDialog } from "@/components/refer/StatementDialog";
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
  const { data: statementRows } = useTransactions(500);
  const [statementOpen, setStatementOpen] = useState(false);
  const active = profile?.account_status === "ACTIVE";
  const { t, lang } = useI18n();

  const [walletTheme, setWalletTheme] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setWalletTheme((current) => (current + 1) % 3);
    }, 5000);

    return () => window.clearInterval(interval);
  }, []);

  const walletThemes = [
    {
      name: "white",
      glow:
        "from-white/70 via-slate-100/50 to-slate-200/30 dark:from-white/10 dark:via-slate-300/5 dark:to-transparent",
      border: "border-slate-200/80 dark:border-white/10",
      accent: "from-slate-100 via-white to-slate-300 dark:from-slate-700 dark:via-slate-500 dark:to-slate-800",
      dot: "bg-slate-400 dark:bg-slate-300",
      badge:
        "from-slate-100 via-white to-slate-300 text-slate-700 ring-slate-300/70 dark:from-slate-700 dark:via-slate-500 dark:to-slate-800 dark:text-white dark:ring-slate-400/30",
    },
    {
      name: "charcoal",
      glow:
        "from-slate-700/25 via-zinc-800/20 to-slate-950/10 dark:from-slate-400/10 dark:via-zinc-400/5 dark:to-transparent",
      border: "border-slate-500/30 dark:border-slate-300/15",
      accent: "from-slate-600 via-zinc-800 to-slate-950",
      dot: "bg-slate-500 dark:bg-slate-300",
      badge:
        "from-slate-500 via-zinc-800 to-slate-950 text-white ring-slate-400/40",
    },
    {
      name: "gold",
      glow:
        "from-amber-400/20 via-yellow-500/15 to-orange-400/10 dark:from-amber-300/10 dark:via-yellow-400/5 dark:to-transparent",
      border: "border-amber-400/30 dark:border-amber-300/20",
      accent: "from-amber-300 via-yellow-500 to-amber-700",
      dot: "bg-amber-400",
      badge:
        "from-amber-200 via-yellow-500 to-amber-700 text-white ring-amber-300/50",
    },
  ] as const;

  const theme = walletThemes[walletTheme] ?? walletThemes[0];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            {t("wallet.title")}
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            {t("wallet.subtitle")}
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => setStatementOpen(true)}>
          <Printer className="size-4" aria-hidden />
          {lang === "fr" ? "Relevé" : "Statement"}
        </Button>
      </header>

      <StatementDialog
        open={statementOpen}
        onClose={() => setStatementOpen(false)}
        holder={{
          name: profile?.full_name ?? "ASH member",
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
          {/* =========================================================
              PREMIUM ASH GLO WALLET
              ========================================================= */}
          <div className="relative">
            {/* Soft ambient light */}
            <div
              aria-hidden
              className={`pointer-events-none absolute -inset-2 -z-10 rounded-[2rem] bg-gradient-to-br ${theme.glow} opacity-90 blur-2xl transition-all duration-[1800ms] ease-in-out`}
            />

            {/* Animated premium top accent */}
            <div
              aria-hidden
              className={`pointer-events-none absolute left-8 right-8 top-0 z-20 h-[2px] overflow-hidden rounded-full bg-gradient-to-r ${theme.accent} opacity-80 transition-all duration-[1800ms] ease-in-out`}
            />

            {/* Small premium badge — deliberately kept away from the balance text */}
            <div
              aria-hidden
              className="pointer-events-none absolute right-3 top-3 z-20 sm:right-5 sm:top-4"
            >
              <div
                className={`relative grid size-9 place-items-center rounded-full bg-gradient-to-br ${theme.badge} p-[1.5px] shadow-md transition-all duration-[1800ms] ease-in-out`}
              >
                <div className="grid size-full place-items-center rounded-full bg-background/90 backdrop-blur-sm">
                  <Sparkles
                    className={`size-3.5 ${
                      walletTheme === 2
                        ? "text-amber-500"
                        : walletTheme === 1
                          ? "text-slate-500 dark:text-slate-200"
                          : "text-slate-500"
                    }`}
                    aria-hidden
                  />
                </div>

                {/* Tiny orbit dot */}
                <span
                  className={`absolute -right-0.5 -top-0.5 size-1.5 rounded-full ${theme.dot} shadow-sm transition-all duration-[1800ms]`}
                />
              </div>

              {/* Very small hanging accent */}
              <div className="absolute left-1/2 top-[34px] -translate-x-1/2">
                <div
                  className={`h-3 w-2 rounded-b-md bg-gradient-to-b ${theme.accent} opacity-80 shadow-sm transition-all duration-[1800ms] ease-in-out`}
                />
              </div>
            </div>

            {/* Existing balance card — functionality untouched */}
            <div
              className={`relative overflow-hidden rounded-[inherit] transition-all duration-[1800ms] ease-in-out`}
            >
              <BalanceCard
                label={t("dash.availableBalance")}
                amount={formatXAF(wallet?.available_balance ?? 0)}
                action={
                  active ? (
                    <Button asChild variant="secondary">
                      <Link to="/withdraw">
                        <ArrowDownToLine
                          className="size-4"
                          aria-hidden
                        />
                        {t("wallet.withdraw")}
                      </Link>
                    </Button>
                  ) : null
                }
              />

              {/* Decorative light reflection */}
              <div
                aria-hidden
                className={`pointer-events-none absolute -right-16 -top-20 size-40 rounded-full bg-gradient-to-br ${theme.glow} opacity-70 blur-3xl transition-all duration-[1800ms] ease-in-out`}
              />

              {/* Bottom premium line */}
              <div
                aria-hidden
                className={`pointer-events-none absolute bottom-0 left-1/2 h-[2px] w-24 -translate-x-1/2 rounded-full bg-gradient-to-r ${theme.accent} opacity-60 transition-all duration-[1800ms] ease-in-out`}
              />
            </div>

            {/* Tiny ASH GLO label */}
            <div
              aria-hidden
              className="pointer-events-none absolute bottom-3 left-4 z-10 flex items-center gap-1.5 rounded-full border border-white/10 bg-background/40 px-2 py-1 shadow-sm backdrop-blur-md"
            >
              <span
                className={`size-1.5 rounded-full ${theme.dot} shadow-sm transition-all duration-[1800ms]`}
              />

              <span className="text-[8px] font-bold tracking-[0.16em] text-muted-foreground">
                ASH GLO
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
