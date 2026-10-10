import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search as SearchIcon } from "lucide-react";
import { useUniversalSearch } from "@/lib/ash.queries";
import { Input } from "@/components/ui/input";
import { EmptyState, LoadingState } from "@/components/refer/states";
import { formatXAF } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { trackEvent } from "@/lib/activity";

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
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const [term, setTerm] = useState("");
  const { data, isFetching } = useUniversalSearch(term);

  useEffect(() => {
    const queryLength = term.trim().length;
    if (queryLength < 2) return;
    const timer = window.setTimeout(() => {
      trackEvent({
        event_type: "search",
        surface: "search",
        target_type: "universal_search",
        metadata: { query_length: queryLength },
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [term]);

  const groups = data
    ? [
        {
          key: "providers",
          label: tx("Businesses", "Entreprises"),
          items: data.providers.map((row) => ({ id: row.id, title: row.business_name, meta: row.city ?? "", href: `/services/${row.id}` })),
        },
        {
          key: "services",
          label: tx("Services", "Services"),
          items: data.services.map((row) => ({ id: row.id, title: row.title, meta: formatXAF(row.price), href: `/services/${row.provider_id}` })),
        },
        {
          key: "instructors",
          label: tx("Instructors", "Instructeurs"),
          items: data.instructors.map((row) => ({
            id: row.id,
            title: row.display_name,
            meta: [row.subjects[0], row.city].filter(Boolean).join(" · "),
            href: `/campus/instructors/${row.id}`,
          })),
        },
        {
          key: "freelancers",
          label: tx("Freelancers", "Freelances"),
          items: data.freelancers.map((row) => ({ id: row.id, title: row.headline, meta: row.city ?? row.country, href: "/freelance" })),
        },
        {
          key: "projects",
          label: tx("Projects", "Projets"),
          items: data.projects.map((row) => ({ id: row.id, title: row.title, meta: formatXAF(row.budget), href: `/freelance/${row.id}` })),
        },
        {
          key: "properties",
          label: tx("Property", "Immobilier"),
          items: data.properties.map((row) => ({
            id: row.id,
            title: row.title,
            meta: `${row.neighborhood ? row.neighborhood + ", " : ""}${row.city} · ${row.price.toLocaleString()} ${row.currency}${row.price_period ? "/" + row.price_period.toLowerCase() : ""}`,
            href: `/property/${row.id}`,
          })),
        },
        {
          key: "deals",
          label: tx("Deals", "Bons plans"),
          items: data.deals.map((row) => ({ id: row.id, title: row.title, meta: formatXAF(row.deal_price), href: "/deals" })),
        },
        {
          key: "events",
          label: tx("Events", "Événements"),
          items: data.events.map((row) => ({ id: row.id, title: row.title, meta: row.city ?? row.country, href: `/events/${row.id}` })),
        },
      ].filter((group) => group.items.length > 0)
    : [];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{tx("Search", "Recherche")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tx("Talent, property, projects, deals, events, businesses and services.", "Talents, immobilier, projets, bons plans, événements, entreprises et services.")}
        </p>
      </header>

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          className="pl-9"
          placeholder={tx("Plumber in Douala, tech summit, 30% off…", "Plombier à Douala, tech summit, 30% off…")}
          aria-label={tx("Search ASH", "Rechercher sur ASH")}
        />
      </div>

      {term.trim().length < 2 ? (
        <EmptyState
          icon={<SearchIcon className="size-5" aria-hidden />}
          title={tx("What are you looking for?", "Que cherchez-vous ?")}
          description={tx("Type at least two characters to start searching.", "Tapez au moins deux caractères pour lancer la recherche.")}
        />
      ) : isFetching ? (
        <LoadingState label={tx("Searching…", "Recherche…")} />
      ) : groups.length === 0 ? (
        <EmptyState title={tx("No results", "Aucun résultat")} description={tx("Try a different keyword.", "Essayez un autre mot-clé.")} />
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
        {tx("Can't find it? Ask ", "Vous ne trouvez pas ? Demandez à ")}
        <Link to="/assistant" className="font-semibold text-primary">
          ASH AI
        </Link>
        .
      </p>
    </div>
  );
}
