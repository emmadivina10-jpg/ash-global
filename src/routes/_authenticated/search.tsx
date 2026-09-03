import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search as SearchIcon } from "lucide-react";
import { useUniversalSearch } from "@/lib/ash.queries";
import { Input } from "@/components/ui/input";
import { EmptyState, LoadingState } from "@/components/refer/states";
import { formatXAF } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({
    meta: [
      { title: "Universal search — find anything on ASH" },
      { name: "description", content: "Search property, freelancers, projects, deals, events, businesses and services across the whole ASH ecosystem in one place." },
      { property: "og:title", content: "Universal search — find anything on ASH" },
      { property: "og:description", content: "One search box for property, talent, deals, events, businesses and services." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const [term, setTerm] = useState("");
  const { data, isFetching } = useUniversalSearch(term);

  const groups = data
    ? [
        {
          key: "providers",
          label: fr ? "Entreprises" : "Businesses",
          items: data.providers.map((row) => ({ id: row.id, title: row.business_name, meta: row.city ?? "", href: `/services/${row.id}` })),
        },
        {
          key: "services",
          label: fr ? "Services" : "Services",
          items: data.services.map((row) => ({ id: row.id, title: row.title, meta: formatXAF(row.price), href: `/services/${row.provider_id}` })),
        },
        {
          key: "freelancers",
          label: fr ? "Freelances" : "Freelancers",
          items: data.freelancers.map((row) => ({ id: row.id, title: row.headline, meta: row.city ?? row.country, href: "/freelance" })),
        },
        {
          key: "projects",
          label: fr ? "Projets" : "Projects",
          items: data.projects.map((row) => ({ id: row.id, title: row.title, meta: formatXAF(row.budget), href: `/freelance/${row.id}` })),
        },
        {
          key: "properties",
          label: fr ? "Immobilier" : "Property",
          items: data.properties.map((row) => ({
            id: row.id,
            title: row.title,
            meta: `${row.neighborhood ? row.neighborhood + ", " : ""}${row.city} · ${row.price.toLocaleString()} ${row.currency}${row.price_period ? "/" + row.price_period.toLowerCase() : ""}`,
            href: `/property/${row.id}`,
          })),
        },
        {
          key: "deals",
          label: fr ? "Bons plans" : "Deals",
          items: data.deals.map((row) => ({ id: row.id, title: row.title, meta: formatXAF(row.deal_price), href: "/deals" })),
        },
        {
          key: "events",
          label: fr ? "Événements" : "Events",
          items: data.events.map((row) => ({ id: row.id, title: row.title, meta: row.city ?? row.country, href: `/events/${row.id}` })),
        },
      ].filter((group) => group.items.length > 0)
    : [];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{fr ? "Recherche" : "Search"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {fr ? "Talents, immobilier, projets, bons plans, événements, entreprises et services." : "Talent, property, projects, deals, events, businesses and services."}
        </p>
      </header>

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          className="pl-9"
          placeholder={fr ? "Plombier à Douala, tech summit, 30% off…" : "Plumber in Douala, tech summit, 30% off…"}
          aria-label={fr ? "Rechercher sur ASH" : "Search ASH"}
        />
      </div>

      {term.trim().length < 2 ? (
        <EmptyState
          icon={<SearchIcon className="size-5" aria-hidden />}
          title={fr ? "Que cherchez-vous ?" : "What are you looking for?"}
          description={fr ? "Tapez au moins deux caractères pour lancer la recherche." : "Type at least two characters to start searching."}
        />
      ) : isFetching ? (
        <LoadingState label={fr ? "Recherche…" : "Searching…"} />
      ) : groups.length === 0 ? (
        <EmptyState title={fr ? "Aucun résultat" : "No results"} description={fr ? "Essayez un autre mot-clé." : "Try a different keyword."} />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.key} className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{group.label}</h2>
              <ul className="space-y-2">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <Link
                      to={item.href as never}
                      className="tile flex items-center justify-between gap-3 p-3.5 transition-colors hover:border-primary/40"
                    >
                      <span className="min-w-0 truncate font-semibold text-foreground">{item.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{item.meta}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        {fr ? "Vous ne trouvez pas ? Demandez à " : "Can't find it? Ask "}
        <Link to="/assistant" className="font-semibold text-primary">
          ASH AI
        </Link>
        .
      </p>
    </div>
  );
}
