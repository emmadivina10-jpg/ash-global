import { createFileRoute } from "@tanstack/react-router";
import {
  useMyClaims,
  useMyDeals,
  useMyProjects,
  useMyPromotions,
  useMyProposals,
  useMyTickets,
} from "@/lib/ash.queries";
import { formatXAF } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({
    meta: [
      { title: "My analytics — activity and spend on ASH" },
      {
        name: "description",
        content:
          "Track your deals, claimed offers, event tickets, freelance projects, proposals and promotion spend in one personal dashboard.",
      },
      { property: "og:title", content: "My analytics — activity and spend on ASH" },
      {
        property: "og:description",
        content: "Deals, tickets, projects, proposals and promotion spend at a glance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { tx, lang } = useI18n();
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

  const ticketSpend = ticketRows
    .filter((row) => row.status === "PAID")
    .reduce((sum, row) => sum + row.amount, 0);
  const promoSpend = promoRows
    .filter((row) => row.status === "ACTIVE" || row.status === "PAID")
    .reduce((sum, row) => sum + row.amount, 0);
  const claimsOnMyDeals = dealRows.reduce((sum, deal) => sum + deal.claimed_count, 0);

  const cards = [
    { label: tx("Deals published", "Offres publiées"), value: String(dealRows.length) },
    { label: tx("Claims received", "Réclamations reçues"), value: String(claimsOnMyDeals) },
    { label: tx("Codes claimed", "Codes réclamés"), value: String((claims.data ?? []).length) },
    {
      label: tx("Tickets bought", "Billets achetés"),
      value: String(ticketRows.filter((r) => r.status === "PAID").length),
    },
    { label: tx("Ticket spend", "Dépense billets"), value: formatXAF(ticketSpend) },
    {
      label: tx("Projects posted", "Projets publiés"),
      value: String((projects.data ?? []).length),
    },
    {
      label: tx("Proposals sent", "Propositions envoyées"),
      value: String((proposals.data ?? []).length),
    },
    { label: tx("Promotion spend", "Dépense promotion"), value: formatXAF(promoSpend) },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          {tx("My analytics", "Mes statistiques")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tx(
            "Your ASH activity, updated in real time.",
            "Votre activité ASH, mise à jour en temps réel.",
          )}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="tile p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {card.label}
            </p>
            <p className="mt-1 font-display text-xl font-extrabold text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      <section className="tile space-y-3 p-5">
        <h2 className="font-display text-lg font-bold text-foreground">
          {tx("Promotions", "Promotions")}
        </h2>
        {promoRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {tx("You have not bought a promotion yet.", "Aucune promotion achetée pour l'instant.")}
          </p>
        ) : (
          <ul className="space-y-2">
            {(promotions.data ?? []).map((row: any) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3.5"
              >
                <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                  {row.headline}
                </span>
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
