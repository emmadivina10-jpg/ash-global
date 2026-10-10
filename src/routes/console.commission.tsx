import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getCommissionOverview, setCommissionRate } from "@/lib/commission.functions";
import { ALLOWED_COMMISSION_RATES } from "@/lib/commission";
import { SectionCard } from "@/components/refer/cards";
import { StatusBadge } from "@/components/refer/StatusBadge";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatXAF } from "@/lib/format";

export const Route = createFileRoute("/console/commission")({
  ssr: false,
  component: CommissionPage,
});

const pct = (r: number | null) => (r == null ? "—" : `${Math.round(r * 100)}%`);

function CommissionPage() {
  const qc = useQueryClient();
  const load = useServerFn(getCommissionOverview);
  const save = useServerFn(setCommissionRate);
  const [busy, setBusy] = useState(false);
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["console", "commission"], queryFn: () => load() });

  async function choose(rate: number) {
    setBusy(true);
    try {
      await save({ data: { rate } });
      toast.success(`Commission set to ${pct(rate)} for new payments`);
      await qc.invalidateQueries({ queryKey: ["console", "commission"] });
    } catch {
      toast.error("Only the CEO or Finance can change the commission");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Booking commission"
        description="ASH keeps this share of each paid service booking. A change applies to payments made from now on, including bookings that are requested or awaiting payment. Paid bookings keep the rate they were paid at."
      >
        {isLoading ? (
          <SkeletonRows rows={2} />
        ) : isError || !data ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {ALLOWED_COMMISSION_RATES.map((r) => (
                <Button
                  key={r}
                  size="lg"
                  variant={Math.abs(data.current - r) < 1e-9 ? "default" : "outline"}
                  className="rounded-full px-8"
                  disabled={busy || !data.canEdit || Math.abs(data.current - r) < 1e-9}
                  onClick={() => void choose(r)}
                >
                  {pct(r)}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Current rate {pct(data.current)}
              {data.updatedAt ? ` · changed ${formatDateTime(data.updatedAt)}${data.updatedBy ? ` by ${data.updatedBy}` : ""}` : ""}
              {!data.canEdit ? " · only the CEO or Finance can change it" : ""}
            </p>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Existing bookings" description="Latest 100 bookings and the commission each one uses.">
        {isLoading ? (
          <SkeletonRows rows={5} />
        ) : !data || data.bookings.length === 0 ? (
          <EmptyState title="No bookings yet" />
        ) : (
          <ul className="space-y-2">
            {data.bookings.map((b) => (
              <li key={b.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-2xl border border-border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{b.service}</p>
                  <p className="tabular truncate text-xs text-muted-foreground">
                    {formatXAF(b.price)} · {pct(b.rate)} {b.paid ? "(saved at payment)" : "(current rate, applies when paid)"}
                    {b.split ? ` · ASH ${formatXAF(b.split.commission)} · provider ${formatXAF(b.split.provider)}` : ""}
                  </p>
                </div>
                <StatusBadge status={b.status} />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
