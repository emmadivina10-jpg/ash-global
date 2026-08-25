import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getConsoleProviders } from "@/lib/console.functions";
import { SectionCard } from "@/components/refer/cards";
import { StatusBadge } from "@/components/refer/StatusBadge";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/refer/states";
import { formatXAF } from "@/lib/format";

export const Route = createFileRoute("/console/providers")({
  component: ConsoleProviders,
});

function ConsoleProviders() {
  const fetchProviders = useServerFn(getConsoleProviders);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["console", "providers"],
    queryFn: fetchProviders,
  });

  if (isLoading) return <SkeletonRows rows={5} />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;

  return (
    <SectionCard title="Providers" description="Studios and the revenue they generate (ASH takes 1% of every paid booking).">
      {(data ?? []).length === 0 ? (
        <EmptyState title="No providers yet" />
      ) : (
        <ul className="divide-y divide-border">
          {(data ?? []).map((p) => (
            <li key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 py-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{p.business_name}</p>
                <p className="truncate text-xs text-muted-foreground">{p.city || "—"} · 1% commission</p>
                <p className="truncate text-xs text-muted-foreground">
                  {p.completed}/{p.bookings} completed · ★ {Number(p.rating_avg).toFixed(1)} ({p.rating_count})
                </p>
              </div>

              <div className="text-right">
                <StatusBadge status={p.is_live ? "ACTIVE" : "PENDING"} label={p.is_live ? "Live" : "Offline"} />
                <p className="tabular mt-1.5 text-xs font-semibold text-foreground">{formatXAF(p.revenue)}</p>
                <p className="tabular text-[11px] text-muted-foreground">ASH fees {formatXAF(p.fees)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
