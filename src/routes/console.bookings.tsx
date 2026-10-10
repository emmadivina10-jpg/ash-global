import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getConsoleBookings, setBookingStatus } from "@/lib/console.functions";
import { SectionCard } from "@/components/refer/cards";
import { StatusBadge } from "@/components/refer/StatusBadge";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime, formatXAF } from "@/lib/format";
import { cn } from "@/lib/utils";

const LIFECYCLE = [
  "PENDING",
  "ACCEPTED",
  "PAYMENT_PROCESSING",
  "PAYMENT_FAILED",
  "PAYMENT_EXPIRED",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "SETTLED",
  "CANCELLED",
  "DECLINED",
  "NO_SHOW",
  "REFUNDED",
  "DISPUTED",
] as const;

export const Route = createFileRoute("/console/bookings")({
  component: ConsoleBookings,
});

function ConsoleBookings() {
  const queryClient = useQueryClient();
  const fetchBookings = useServerFn(getConsoleBookings);
  const updateStatus = useServerFn(setBookingStatus);
  const [filter, setFilter] = useState<string>("ALL");
  const [busy, setBusy] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["console", "bookings"],
    queryFn: fetchBookings,
  });

  const rows = (data ?? []).filter((b) => filter === "ALL" || b.status === filter);
  const disputes = (data ?? []).filter((b) => b.status === "DISPUTED").length;

  async function change(id: string, status: string) {
    setBusy(id);
    const result = await updateStatus({ data: { id, status } });
    setBusy(null);
    if (!result.ok) {
      toast.error("Could not update this booking");
      return;
    }
    toast.success(`Booking marked ${status.replace(/_/g, " ").toLowerCase()}`);
    await queryClient.invalidateQueries({ queryKey: ["console"] });
  }

  return (
    <SectionCard
      title="Bookings"
      description="Lifecycle: pending → confirmed → in progress → completed → settled. ASH keeps a 12% or 15% commission (set under Commission), saved on each booking at payment; the provider share is released when the customer's verification code is entered."
    >
      {disputes > 0 ? (
        <p className="mb-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
          {disputes} booking(s) in dispute need a decision.
        </p>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2">
        {["ALL", ...LIFECYCLE].map((key) => (
          <Button
            key={key}
            size="sm"
            variant={filter === key ? "default" : "outline"}
            className={cn("rounded-full")}
            onClick={() => setFilter(key)}
          >
            {key === "ALL" ? "All" : key.replace(/_/g, " ")}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <SkeletonRows rows={6} />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="No bookings in this state" />
      ) : (
        <ul className="space-y-3">
          {rows.map((b) => (
            <li key={b.id} className="rounded-2xl border border-border p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{b.service_title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {b.providerName} · {formatDateTime(b.scheduled_at)}
                  </p>
                  <p className="tabular truncate text-xs text-muted-foreground">
                    {formatXAF(b.price)}
                    {b.billingMode === "COMMISSION"
                      ? ` · ASH ${formatXAF(b.fee)} · provider ${formatXAF(Number(b.price) - b.fee)}`
                      : " · subscription provider (0% fee)"}
                  </p>
                </div>
                <StatusBadge status={b.status} />
              </div>

              <div className="mt-3 max-w-[240px]">
                <Select value={b.status} onValueChange={(value) => void change(b.id, value)} disabled={busy === b.id}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LIFECYCLE.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
