import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getConsoleProviders, setProviderVerification } from "@/lib/console.functions";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/refer/cards";
import { StatusBadge } from "@/components/refer/StatusBadge";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/refer/states";
import { formatXAF } from "@/lib/format";

export const Route = createFileRoute("/console/providers")({
  component: ConsoleProviders,
});

function ConsoleProviders() {
  const fetchProviders = useServerFn(getConsoleProviders);
  const decideVerification = useServerFn(setProviderVerification);
  const queryClient = useQueryClient();

  async function decide(providerId: string, approve: boolean) {
    const result = await decideVerification({ data: { providerId, approve } });
    if (!result.ok) {
      toast.error(result.error ?? "Could not update verification");
      return;
    }
    toast.success(approve ? "Provider verified" : "Verification rejected");
    await queryClient.invalidateQueries({ queryKey: ["console", "providers"] });
  }

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
                {p.slug ? (
                  <a
                    href={`/s/${p.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-xs font-semibold text-primary"
                  >
                    /s/{p.slug}
                  </a>
                ) : null}
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    {p.is_verified ? "ASH Verified" : `Verification: ${p.verification_status}`}
                  </span>
                  {!p.is_verified ? (
                    <Button size="sm" variant="outline" onClick={() => void decide(p.id, true)}>
                      Verify
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => void decide(p.id, false)}>
                      Remove badge
                    </Button>
                  )}
                  {p.verification_status === "PENDING" && !p.is_verified ? (
                    <Button size="sm" variant="ghost" onClick={() => void decide(p.id, false)}>
                      Reject
                    </Button>
                  ) : null}
                </div>
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
