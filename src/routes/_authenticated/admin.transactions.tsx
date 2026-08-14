import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard } from "@/components/refer/cards";
import { StatusBadge } from "@/components/refer/StatusBadge";
import { TransactionList } from "@/components/refer/TransactionList";
import { EmptyState, SkeletonRows } from "@/components/refer/states";
import { formatDateTime, formatXAF } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/transactions")({
  component: AdminTransactions,
});

function AdminTransactions() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "transactions"],
    queryFn: async () => {
      const [transactions, activations] = await Promise.all([
        supabase
          .from("transactions")
          .select("id, type, amount, reference, description, status, created_at")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("activations")
          .select("id, amount, status, payment_reference, provider_transaction_id, created_at, paid_at")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);
      return { transactions: transactions.data ?? [], activations: activations.data ?? [] };
    },
  });

  if (isLoading) return <SkeletonRows rows={5} />;

  return (
    <div className="space-y-5">
      <SectionCard title="Activation payments" description="Payment status and provider references.">
        {(data?.activations ?? []).length === 0 ? (
          <EmptyState title="No activation payments yet" />
        ) : (
          <ul className="divide-y divide-border">
            {(data?.activations ?? []).map((row) => (
              <li key={row.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3.5">
                <div className="min-w-0">
                  <p className="tabular text-sm font-bold text-foreground">{formatXAF(row.amount)}</p>
                  <p className="truncate text-xs text-muted-foreground">{row.payment_reference}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.provider_transaction_id ? `Txn ${row.provider_transaction_id} · ` : ""}
                    {formatDateTime(row.paid_at ?? row.created_at)}
                  </p>
                </div>
                <StatusBadge status={row.status} />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Ledger" description="Most recent platform transactions.">
        <TransactionList items={data?.transactions ?? []} />
      </SectionCard>
    </div>
  );
}
