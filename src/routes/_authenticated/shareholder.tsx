import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyShareholding } from "@/lib/shareholders.functions";
import { LoadingState } from "@/components/refer/states";
import { HistoryCard, InvestmentCard, NotYetCard, OwnershipPlan, PerformanceCard } from "@/components/shareholders/ShareholderViews";

export const Route = createFileRoute("/_authenticated/shareholder")({
  head: () => ({
    meta: [
      { title: "ASH Shareholder Center — your ownership and investment" },
      { name: "description", content: "Private shareholder dashboard for ASH shareholders: ownership, investment status and company performance." },
      { property: "og:title", content: "ASH Shareholder Center" },
      { property: "og:description", content: "Private shareholder dashboard for ASH shareholders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ShareholderPage,
});

function ShareholderPage() {
  const fn = useServerFn(getMyShareholding);
  const { data, isLoading } = useQuery({ queryKey: ["shareholder", "me"], queryFn: fn });
  if (isLoading) return <LoadingState label="Loading your shareholder center…" />;
  if (!data?.shareholder) {
    return <p className="p-6 text-sm text-muted-foreground">This area is only for registered ASH shareholders.</p>;
  }
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-gold">ASH GLO</p>
        <h1 className="font-display text-2xl font-extrabold text-foreground">Shareholder Center</h1>
        <p className="text-sm text-muted-foreground">Welcome, {data.shareholder.display_name}. You hold {Number(data.shareholder.ownership_pct)}% of ASH.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <InvestmentCard s={data.shareholder} />
        {data.cap ? <OwnershipPlan cap={data.cap} /> : null}
      </div>
      {data.performance ? <PerformanceCard p={data.performance} /> : null}
      <div className="grid gap-4 md:grid-cols-3">
        <NotYetCard title="Dividends & distributions" />
        <NotYetCard title="Documents & reports" />
        <NotYetCard title="Meetings & resolutions" />
      </div>
      <HistoryCard items={data.history ?? []} />
    </div>
  );
}
