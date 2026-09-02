import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Banknote, Landmark } from "lucide-react";
import { getConsolePayouts, requestConsolePayout } from "@/lib/console.functions";
import { SectionCard } from "@/components/refer/cards";
import { StatusBadge } from "@/components/refer/StatusBadge";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime, formatXAF } from "@/lib/format";

export const Route = createFileRoute("/console/payout")({
  component: ConsolePayout,
});

function ConsolePayout() {
  const queryClient = useQueryClient();
  const fetchPayouts = useServerFn(getConsolePayouts);
  const requestPayout = useServerFn(requestConsolePayout);
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["console", "payouts"],
    queryFn: fetchPayouts,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Math.round(Number(amount));
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setBusy(true);
    const result = await requestPayout({ data: { amount: value, destination, ...(note ? { note } : {}) } });
    setBusy(false);
    if (!result.ok) {
      toast.error(
        result.error === "EXCEEDS_AVAILABLE"
          ? `Amount exceeds available balance (${formatXAF(Number(result.available ?? 0))})`
          : `Payout failed: ${result.error}`,
      );
      return;
    }
    toast.success("Platform payout recorded");
    setAmount("");
    setDestination("");
    setNote("");
    await queryClient.invalidateQueries({ queryKey: ["console"] });
  }

  if (isLoading) return <SkeletonRows rows={5} />;
  if (isError || !data) return <ErrorState onRetry={() => void refetch()} />;

  const f = data.financials;
  const bookingRows = data.bookings;

  return (
    <div className="space-y-4">
      <SectionCard title="Platform payout" description="Withdraw the platform's own revenue: activation fees, subscriptions and the 1% booking commission.">
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border p-3">
            <p className="text-xs text-muted-foreground">Platform revenue</p>
            <p className="mt-1 font-display text-lg font-bold text-foreground">{formatXAF(Number(f?.platform_revenue ?? 0))}</p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-xs text-muted-foreground">1% booking commission</p>
            <p className="mt-1 font-display text-lg font-bold text-foreground">{formatXAF(Number(f?.commission_revenue ?? 0))}</p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-xs text-muted-foreground">Already paid out</p>
            <p className="mt-1 font-display text-lg font-bold text-foreground">{formatXAF(data.taken)}</p>
          </div>
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-3">
            <p className="text-xs text-muted-foreground">Available to withdraw</p>
            <p className="mt-1 font-display text-lg font-bold text-primary">{formatXAF(data.available)}</p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="payout-amount">Amount (XAF)</Label>
            <Input id="payout-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50000" required />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="payout-dest">Destination (MoMo number / bank)</Label>
            <Input id="payout-dest" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="MTN 6XX XXX XXX" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="payout-note">Note (optional)</Label>
            <Input id="payout-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy || data.available <= 0} className="sm:col-span-4">
            <Banknote className="size-4" /> {busy ? "Recording…" : "Record payout"}
          </Button>
        </form>
      </SectionCard>

      <SectionCard title="Payout history" description="Every platform payout ever recorded.">
        {data.payouts.length === 0 ? (
          <EmptyState title="No payouts yet" />
        ) : (
          <ul className="divide-y divide-border">
            {data.payouts.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex min-w-0 items-center gap-3">
                  <Landmark className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{p.destination}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(p.created_at)}{p.note ? ` — ${p.note}` : ""}
                    </p>
                  </div>
                </div>
                <p className="shrink-0 text-sm font-bold text-foreground">{formatXAF(Number(p.amount))}</p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Booking revenue" description="Each booking's status, price and the 1% platform fee it generated.">
        {bookingRows.length === 0 ? (
          <EmptyState title="No bookings yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Service</th>
                  <th className="py-2 pr-3 font-medium">Provider</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium text-right">Price</th>
                  <th className="py-2 pr-3 font-medium text-right">1% fee</th>
                  <th className="py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {bookingRows.map((b) => (
                  <tr key={b.id} className="border-b border-border/60 last:border-0">
                    <td className="max-w-40 truncate py-2 pr-3 font-medium text-foreground">{b.service_title}</td>
                    <td className="max-w-32 truncate py-2 pr-3 text-muted-foreground">{b.providerName}</td>
                    <td className="py-2 pr-3"><StatusBadge status={b.status} /></td>
                    <td className="py-2 pr-3 text-right text-foreground">{formatXAF(Number(b.price))}</td>
                    <td className="py-2 pr-3 text-right font-semibold text-primary">{formatXAF(b.fee)}</td>
                    <td className="py-2 text-xs text-muted-foreground">{formatDateTime(b.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
