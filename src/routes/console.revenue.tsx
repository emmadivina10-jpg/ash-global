import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getRevenueIntel } from "@/lib/workforce.functions";
import { LoadingState } from "@/components/refer/states";
import { formatXAF } from "@/lib/format";

export const Route = createFileRoute("/console/revenue")({
  ssr: false,
  component: RevenueIntel,
});

function RevenueIntel() {
  const load = useServerFn(getRevenueIntel);
  const { data, isLoading } = useQuery({ queryKey: ["console", "revenue-intel"], queryFn: load });

  if (isLoading) return <LoadingState label="Crunching revenue…" />;
  if (!data) return null;

  const cards = [
    { label: "GMV — all time", value: formatXAF(data.gmvAllTime) },
    { label: "GMV — last 30 days", value: formatXAF(data.gmv30d) },
    { label: "ASH commission — all time", value: formatXAF(data.commissionAllTime) },
    { label: "ASH commission — 30 days", value: formatXAF(data.commission30d) },
    { label: "Activation revenue", value: formatXAF(data.activationsRevenue) },
    { label: "Platform payouts taken", value: formatXAF(data.payoutsTaken) },
    { label: "Paid bookings", value: String(data.paidBookings) },
    { label: "Paid payment links", value: String(data.paidLinks) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-extrabold text-foreground">
          Revenue Intelligence
        </h2>
        <p className="text-sm text-muted-foreground">
          Where ASH money comes from and how fast it grows.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {card.label}
            </p>
            <p className="mt-1 font-display text-xl font-extrabold text-foreground">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
