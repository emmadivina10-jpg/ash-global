import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMarketplaceHealth } from "@/lib/workforce.functions";
import { LoadingState } from "@/components/refer/states";

export const Route = createFileRoute("/console/marketplace")({
  ssr: false,
  component: MarketplaceOps,
});

function MarketplaceOps() {
  const load = useServerFn(getMarketplaceHealth);
  const { data, isLoading } = useQuery({
    queryKey: ["console", "marketplace-health"],
    queryFn: load,
  });

  if (isLoading) return <LoadingState label="Scanning the marketplace…" />;
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-extrabold text-foreground">
          Marketplace Operations
        </h2>
        <p className="text-sm text-muted-foreground">
          Keep storefronts complete, verified and converting.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="New providers (7d)" value={data.newProviders7d} />
        <Stat label="Bookings (7d)" value={data.bookings7d} />
        <Stat label="Failed / cancelled (7d)" value={data.failed7d} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <List
          title="Unverified providers"
          rows={data.unverified.map((p) => ({
            id: p.id,
            main: p.business_name,
            sub: p.city ?? "—",
          }))}
        />
        <List
          title="Storefronts with no service"
          rows={data.emptyStorefronts.map((p) => ({
            id: p.id,
            main: p.business_name,
            sub: p.city ?? "—",
          }))}
        />
        <List
          title="Zero completed bookings"
          rows={data.zeroBookings.map((p) => ({
            id: p.id,
            main: p.business_name,
            sub: p.city ?? "—",
          }))}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold text-foreground">{value}</p>
    </div>
  );
}

function List({
  title,
  rows,
}: {
  title: string;
  rows: { id: string; main: string; sub: string }[];
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm font-bold text-foreground">{title}</p>
      <ul className="mt-3 space-y-2">
        {rows.length === 0 ? (
          <li className="text-xs text-muted-foreground">Nothing to action. </li>
        ) : (
          rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate text-foreground">{row.main}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{row.sub}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
