import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard, StatCard } from "@/components/refer/cards";
import { TransactionList } from "@/components/refer/TransactionList";
import { SkeletonRows } from "@/components/refer/states";
import { formatXAF } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminOverview,
});

function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: async () => {
      const [profiles, activations, transactions, withdrawals] = await Promise.all([
        supabase.from("profiles").select("account_status"),
        supabase.from("activations").select("amount, status"),
        supabase.from("transactions").select("id, type, amount, reference, description, status, created_at").order("created_at", { ascending: false }).limit(10),
        supabase.from("withdrawals").select("amount, status"),
      ]);

      const users = profiles.data ?? [];
      const acts = activations.data ?? [];
      const wds = withdrawals.data ?? [];

      const commissionTotal = 0;

      return {
        totalUsers: users.length,
        activeUsers: users.filter((u) => u.account_status === "ACTIVE").length,
        pendingUsers: users.filter((u) => u.account_status === "PENDING").length,
        activationTotal: acts
          .filter((a) => a.status === "PAID")
          .reduce((sum, a) => sum + Number(a.amount), 0),
        commissionTotal,
        withdrawalTotal: wds
          .filter((w) => w.status === "COMPLETED")
          .reduce((sum, w) => sum + Number(w.amount), 0),
        pendingWithdrawals: wds.filter((w) => w.status === "PENDING" || w.status === "PROCESSING").length,
        completedWithdrawals: wds.filter((w) => w.status === "COMPLETED").length,
        recent: transactions.data ?? [],
      };
    },
  });
}

function AdminOverview() {
  const { data, isLoading } = useAdminStats();

  const commissions =
    (data?.recent ?? []).length >= 0
      ? (data?.recent ?? [])
          .filter((tx) => tx.type === "REFERRAL_COMMISSION")
          .reduce((sum, tx) => sum + Number(tx.amount), 0)
      : 0;

  if (isLoading) return <SkeletonRows rows={4} />;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total users" value={data?.totalUsers ?? 0} />
        <StatCard label="Active users" value={data?.activeUsers ?? 0} accent />
        <StatCard label="Pending users" value={data?.pendingUsers ?? 0} />
        <StatCard label="Pending withdrawals" value={data?.pendingWithdrawals ?? 0} />
        <StatCard label="Activation payments" value={formatXAF(data?.activationTotal ?? 0)} />
        <StatCard label="Recent commissions" value={formatXAF(commissions)} />
        <StatCard label="Total withdrawn" value={formatXAF(data?.withdrawalTotal ?? 0)} />
        <StatCard label="Completed withdrawals" value={data?.completedWithdrawals ?? 0} />
      </div>

      <SectionCard title="Recent transactions">
        <TransactionList items={data?.recent ?? []} />
      </SectionCard>
    </div>
  );
}
