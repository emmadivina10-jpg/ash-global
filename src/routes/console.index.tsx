import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, Banknote, Users2, Wallet } from "lucide-react";
import { getConsoleAnalytics, getConsoleOverview } from "@/lib/console.functions";
import { SectionCard, StatCard } from "@/components/refer/cards";
import { TransactionList } from "@/components/refer/TransactionList";
import { ErrorState, SkeletonRows } from "@/components/refer/states";
import { formatXAF } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/console/")({
  component: ConsoleOverview,
});

const RANGES = [7, 30, 90] as const;

function compact(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(Math.round(value));
}

function shortDay(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function chartTooltip() {
  return {
    contentStyle: {
      background: "var(--card)",
      border: "1px solid var(--border)",
      borderRadius: "0.75rem",
      color: "var(--card-foreground)",
      fontSize: "12px",
    },
    labelStyle: { color: "var(--muted-foreground)" },
  } as const;
}

function MoneyRow({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: number;
  hint: string;
  tone?: "revenue" | "liability" | "neutral";
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3.5 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <p
        className={cn(
          "tabular shrink-0 text-sm font-bold",
          tone === "revenue" && "text-success",
          tone === "liability" && "text-gold",
          tone === "neutral" && "text-foreground",
        )}
      >
        {formatXAF(value)}
      </p>
    </div>
  );
}

function HeroMetric({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  icon: typeof Wallet;
  tone: "brand" | "success" | "gold";
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl border p-5 shadow-card",
        tone === "brand" && "border-transparent bg-gradient-to-br from-primary to-gold text-on-dark",
        tone === "success" && "border-success/25 bg-success/10",
        tone === "gold" && "border-gold/25 bg-gold/10",
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn("size-4", tone === "brand" ? "text-on-dark" : "text-foreground")} aria-hidden />
        <p
          className={cn(
            "text-[11px] font-bold uppercase tracking-[0.12em]",
            tone === "brand" ? "text-on-dark/80" : "text-muted-foreground",
          )}
        >
          {label}
        </p>
      </div>
      <p
        className={cn(
          "tabular mt-3 font-display text-2xl font-extrabold sm:text-3xl",
          tone === "brand" ? "text-on-dark" : "text-foreground",
        )}
      >
        {formatXAF(value)}
      </p>
      <p className={cn("mt-1 text-xs", tone === "brand" ? "text-on-dark/80" : "text-muted-foreground")}>{hint}</p>
    </div>
  );
}

function ConsoleOverview() {
  const fetchOverview = useServerFn(getConsoleOverview);
  const fetchAnalytics = useServerFn(getConsoleAnalytics);
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["console", "overview"],
    queryFn: fetchOverview,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const analytics = useQuery({
    queryKey: ["console", "analytics", range],
    queryFn: () => fetchAnalytics({ data: { days: range } }),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  if (isLoading) return <SkeletonRows rows={5} />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  const f = data?.financials;
  const series = (analytics.data?.series ?? []).map((p) => ({ ...p, label: shortDay(p.day) }));
  const totals = analytics.data?.totals;

  return (
    <div className="space-y-6">
      {data?.financialsError ? (
        <p className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
          Financial figures could not be loaded: {data.financialsError}
        </p>
      ) : null}

      {/* The three numbers that must never be confused with each other. */}
      <div className="grid gap-4 lg:grid-cols-3">
        <HeroMetric
          label="Platform earnings"
          value={Number(f?.platform_revenue ?? 0)}
          hint="Everything ASH has earned: activations + subscriptions + 1% commission"
          icon={Banknote}
          tone="brand"
        />
        <HeroMetric
          label="Safe for you to withdraw"
          value={Number(f?.safe_to_withdraw ?? 0)}
          hint="Cash on hand minus every franc owed to members and providers"
          icon={Wallet}
          tone="success"
        />
        <HeroMetric
          label="Belongs to users"
          value={Number(f?.total_liabilities ?? 0)}
          hint="Member + provider wallets, pending payouts and disputes — never yours"
          icon={Users2}
          tone="gold"
        />
      </div>

      {/* Analytics */}
      <SectionCard
        title="Revenue analytics"
        description="Platform earnings per day, refreshed automatically."
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                range === r ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {r} days
            </button>
          ))}
          {totals ? (
            <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-success">
              <ArrowUpRight className="size-3.5" aria-hidden />
              {formatXAF(totals.revenue)} earned
            </span>
          ) : null}
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="gActivations" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="gCommission" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="gSubs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis tickFormatter={compact} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={48} />
              <Tooltip formatter={(v: number) => formatXAF(Number(v))} {...chartTooltip()} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="activations" name="Activations" stackId="1" stroke="var(--chart-1)" fill="url(#gActivations)" />
              <Area type="monotone" dataKey="commission" name="Commission" stackId="1" stroke="var(--chart-2)" fill="url(#gCommission)" />
              <Area type="monotone" dataKey="subscriptions" name="Subscriptions" stackId="1" stroke="var(--chart-3)" fill="url(#gSubs)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Booking volume vs payouts" description="Money flowing through the platform each day.">
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis tickFormatter={compact} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={48} />
                <Tooltip formatter={(v: number) => formatXAF(Number(v))} {...chartTooltip()} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="bookingVolume" name="Bookings paid" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="payouts" name="Payouts" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="New members" description="Sign-ups per day across the platform.">
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={36} />
                <Tooltip {...chartTooltip()} />
                <Line type="monotone" dataKey="signups" name="Sign-ups" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {analytics.data && analytics.data.channels.length > 0 ? (
        <SectionCard title="Where revenue comes from" description={`Last ${range} days.`}>
          <div className="grid gap-4 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-center">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={analytics.data.channels} dataKey="value" nameKey="name" innerRadius={44} outerRadius={70} paddingAngle={3}>
                    {analytics.data.channels.map((_, index) => (
                      <Cell key={index} fill={`var(--chart-${(index % 5) + 1})`} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatXAF(Number(v))} {...chartTooltip()} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div>
              {analytics.data.channels.map((c, index) => (
                <div key={c.name} className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-0">
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="size-2.5 rounded-full" style={{ background: `var(--chart-${(index % 5) + 1})` }} />
                    {c.name}
                  </span>
                  <span className="tabular text-sm font-bold text-foreground">{formatXAF(c.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      ) : null}

      {/* Full money breakdown */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="ASH money" description="Revenue the platform has actually earned.">
          <MoneyRow
            label="Activation fees"
            value={Number(f?.activation_revenue ?? 0)}
            hint="5,000 XAF member activations (paid)"
            tone="revenue"
          />
          <MoneyRow
            label="Provider subscriptions"
            value={Number(f?.subscription_revenue ?? 0)}
            hint="Legacy monthly provider subscriptions"
            tone="revenue"
          />
          <MoneyRow
            label="Booking commission (1%)"
            value={Number(f?.commission_revenue ?? 0)}
            hint="Net of reversed fees on refunds and disputes"
            tone="revenue"
          />
          <MoneyRow
            label="Total platform revenue"
            value={Number(f?.platform_revenue ?? 0)}
            hint="Activation + subscription + commission"
          />
        </SectionCard>

        <SectionCard title="Not ASH money" description="Funds held on behalf of members and providers.">
          <MoneyRow
            label="Provider funds owed"
            value={Number(f?.provider_owed ?? 0)}
            hint="Booking earnings sitting in provider wallets"
            tone="liability"
          />
          <MoneyRow
            label="Referral commissions owed"
            value={Number(f?.member_owed ?? 0)}
            hint="Member wallet balances from the referral engine"
            tone="liability"
          />
          <MoneyRow
            label="Pending withdrawals"
            value={Number(f?.pending_withdrawals ?? 0)}
            hint="Requested or processing mobile money payouts"
            tone="liability"
          />
          <MoneyRow
            label="Refund liability"
            value={Number(f?.refund_liability ?? 0)}
            hint="Booking value currently under dispute"
            tone="liability"
          />
        </SectionCard>
      </div>

      <SectionCard
        title="Safe to withdraw — how it is calculated"
        description="Cash the platform is holding, minus every franc that belongs to members and providers. Updates automatically every 15 seconds."
      >
        <p className="tabular font-display text-3xl font-extrabold text-success sm:text-4xl">
          {formatXAF(Number(f?.safe_to_withdraw ?? 0))}
        </p>
        <div className="mt-4">
          <MoneyRow
            label="Cash collected"
            value={Number(f?.cash_in ?? 0)}
            hint="Activations + subscriptions + booking payments"
            tone="revenue"
          />
          <MoneyRow
            label="Already paid out"
            value={-Number(f?.paid_out ?? 0)}
            hint="Completed mobile money withdrawals"
          />
          <MoneyRow
            label="Cash on hand"
            value={Number(f?.cash_on_hand ?? 0)}
            hint="What the platform is actually holding right now"
          />
          <MoneyRow
            label="Owed to users"
            value={-Number(f?.total_liabilities ?? 0)}
            hint="Member + provider wallet balances (incl. pending payouts) and disputes"
            tone="liability"
          />
          <MoneyRow
            label="Safe to withdraw"
            value={Number(f?.safe_to_withdraw ?? 0)}
            hint="Cash on hand minus what belongs to users"
            tone="revenue"
          />
        </div>
        {Number(f?.safe_to_withdraw ?? 0) <= 0 ? (
          <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
            <ArrowDownRight className="size-3.5 shrink-0" aria-hidden />
            Nothing is safely withdrawable right now — all cash on hand is owed to members and providers.
          </p>
        ) : null}
      </SectionCard>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total users" value={data?.totalUsers ?? 0} />
        <StatCard label="Active users" value={data?.activeUsers ?? 0} accent />
        <StatCard label="Pending activation" value={data?.pendingUsers ?? 0} />
        <StatCard label="Providers" value={data?.totalProviders ?? 0} />
        <StatCard label="Live providers" value={data?.liveProviders ?? 0} />
        <StatCard label="Listed services" value={data?.totalServices ?? 0} />
        <StatCard label="Bookings" value={data?.totalBookings ?? 0} />
        <StatCard label="Awaiting action" value={data?.pendingBookings ?? 0} />
        <StatCard label="Paid bookings" value={data?.paidBookings ?? 0} />
        <StatCard label="Completed bookings" value={data?.completedBookings ?? 0} />
        <StatCard label="Booking volume (paid)" value={formatXAF(data?.gmv ?? 0)} />
        <StatCard label="Completed volume" value={formatXAF(data?.completedGmv ?? 0)} />
      </div>

      <SectionCard title="Recent ledger activity">
        <TransactionList items={data?.recent ?? []} />
      </SectionCard>
    </div>
  );
}
