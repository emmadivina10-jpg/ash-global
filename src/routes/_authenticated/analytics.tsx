import { createFileRoute } from "@tanstack/react-router";
import { useMyClaims, useMyDeals, useMyProjects, useMyPromotions, useMyProposals, useMyTickets } from "@/lib/ash.queries";
import { formatXAF } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "My analytics — activity and spend on ASH" },
      { name: "description", content: "Track your deals, claimed offers, event tickets, freelance projects, proposals and promotion spend in one personal dashboard." },
      { property: "og:title", content: "My analytics — activity and spend on ASH" },
      { property: "og:description", content: "Deals, tickets, projects, proposals and promotion spend at a glance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const deals = useMyDeals();
  const claims = useMyClaims();
  const tickets = useMyTickets();
  const projects = useMyProjects();
  const proposals = useMyProposals();
  const promotions = useMyPromotions();

  const ticketRows = (tickets.data ?? []) as Array<{ status: string; amount: number }>;
  const promoRows = (promotions.data ?? []) as Array<{ status: string; amount: number }>;
  const dealRows = deals.data ?? [];

  const ticketSpend = ticketRows.filter((row) => row.status === "PAID").reduce((sum, row) => sum + row.amount, 0);
  const promoSpend = promoRows.filter((row) => row.status === "ACTIVE" || row.status === "PAID").reduce((sum, row) => sum + row.amount, 0);
  const claimsOnMyDeals = dealRows.reduce((sum, deal) => sum + deal.claimed_count, 0);

  const cards = [
    { label: fr ? "Offres publiées" : "Deals published", value: String(dealRows.length) },
    { label: fr ? "Réclamations reçues" : "Claims received", value: String(claimsOnMyDeals) },
    { label: fr ? "Codes réclamés" : "Codes claimed", value: String((claims.data ?? []).length) },
    { label: fr ? "Billets achetés" : "Tickets bought", value: String(ticketRows.filter((r) => r.status === "PAID").length) },
    { label: fr ? "Dépense billets" : "Ticket spend", value: formatXAF(ticketSpend) },
    { label: fr ? "Projets publiés" : "Projects posted", value: String((projects.data ?? []).length) },
    { label: fr ? "Propositions envoyées" : "Proposals sent", value: String((proposals.data ?? []).length) },
    { label: fr ? "Dépense promotion" : "Promotion spend", value: formatXAF(promoSpend) },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          {fr ? "Mes statistiques" : "My analytics"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {fr ? "Votre activité ASH, mise à jour en temps réel." : "Your ASH activity, updated in real time."}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="tile p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{card.label}</p>
            <p className="mt-1 font-display text-xl font-extrabold text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      <section className="tile space-y-3 p-5">
        <h2 className="font-display text-lg font-bold text-foreground">{fr ? "Promotions" : "Promotions"}</h2>
        {promoRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {fr ? "Aucune promotion achetée pour l'instant." : "You have not bought a promotion yet."}
          </p>
        ) : (
          <ul className="space-y-2">
            {(promotions.data ?? []).map((row: any) => (
              <li key={row.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3.5">
                <span className="min-w-0 truncate text-sm font-semibold text-foreground">{row.headline}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {row.plan} · {formatXAF(row.amount)} · {row.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
