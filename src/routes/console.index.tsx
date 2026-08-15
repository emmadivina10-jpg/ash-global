import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getConsoleOverview } from "@/lib/console.functions";
import { SectionCard, StatCard } from "@/components/refer/cards";
import { TransactionList } from "@/components/refer/TransactionList";
import { ErrorState, SkeletonRows } from "@/components/refer/states";
import { formatXAF } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/console/")({
  component: ConsoleOverview,
});

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

function ConsoleOverview() {
  const fetchOverview = useServerFn(getConsoleOverview);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["console", "overview"],
    queryFn: fetchOverview,
  });

  if (isLoading) return <SkeletonRows rows={5} />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  const f = data?.financials;

  return (
    <div className="space-y-5">
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
            hint="2,000 XAF/month active subscriptions"
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
        title="Available to ASH"
        description="Platform revenue after pending payout and refund obligations. This is the only balance ASH can draw from."
      >
        <p className="tabular font-display text-3xl font-extrabold text-foreground sm:text-4xl">
          {formatXAF(Number(f?.available_to_platform ?? 0))}
        </p>
      </SectionCard>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total users" value={data?.totalUsers ?? 0} />
        <StatCard label="Active users" value={data?.activeUsers ?? 0} accent />
        <StatCard label="Providers" value={data?.totalProviders ?? 0} />
        <StatCard label="Live providers" value={data?.liveProviders ?? 0} />
        <StatCard label="Subscription mode" value={data?.subscriptionProviders ?? 0} />
        <StatCard label="Commission mode" value={data?.commissionProviders ?? 0} />
        <StatCard label="Completed bookings" value={data?.completedBookings ?? 0} />
        <StatCard label="Booking volume" value={formatXAF(data?.gmv ?? 0)} />
      </div>

      <SectionCard title="Recent ledger activity">
        <TransactionList items={data?.recent ?? []} />
      </SectionCard>
    </div>
  );
}
