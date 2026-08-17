import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Search, Sparkle, Users } from "lucide-react";
import { useProviders, useProvidersPortfolio } from "@/lib/marketplace.queries";
import { ProviderCard } from "@/components/refer/ProviderCard";
import { CategoryHero } from "@/components/refer/CategoryHero";
import { EmptyState, SkeletonRows } from "@/components/refer/states";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { type ServiceCategory } from "@/lib/marketplace";
import { CATEGORY_GROUPS, categoryLabel, type GroupId } from "@/lib/taxonomy";
import { useLocation } from "@/lib/location";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/services/")({
  head: () => ({
    meta: [
      { title: "Discover beauty, tech, home & event pros — ASH Glo REFER" },
      {
        name: "description",
        content:
          "Discover verified professionals on ASH Glo: braiders, barbers, nail and lash artists, developers, electricians, photographers and more. See their work, then book.",
      },
      { property: "og:title", content: "Discover beauty, tech, home & event pros — ASH Glo REFER" },
      {
        property: "og:description",
        content: "Browse verified ASH Glo providers by category, view portfolios and book in a few taps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiscoveryPage,
});

function DiscoveryPage() {
  const { t, lang } = useI18n();
  const fr = lang === "fr";
  const { data: providers, isLoading } = useProviders();
  const { location, asked, request, dismiss } = useLocation();
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<GroupId | "ALL">("ALL");
  const [category, setCategory] = useState<ServiceCategory | "ALL">("ALL");

  const groupCategories = useMemo(
    () => (group === "ALL" ? [] : (CATEGORY_GROUPS.find((g) => g.id === group)?.categories ?? [])),
    [group],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (providers ?? []).filter((p) => {
      const cats = (p.categories ?? []) as ServiceCategory[];
      const inGroup = group === "ALL" || cats.some((c) => groupCategories.includes(c));
      const inCategory = category === "ALL" || cats.includes(category);
      const matchesTerm =
        term.length === 0 ||
        p.business_name.toLowerCase().includes(term) ||
        (p.city ?? "").toLowerCase().includes(term) ||
        (p.bio ?? "").toLowerCase().includes(term);
      return inGroup && inCategory && matchesTerm;
    });
  }, [providers, search, group, groupCategories, category]);

  const { data: photosByProvider } = useProvidersPortfolio(filtered.map((p) => p.id));

  function selectGroup(next: GroupId | "ALL") {
    setGroup(next);
    setCategory("ALL");
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-extrabold text-foreground sm:text-3xl">
            {fr ? "Découvrir" : "Discover"}
          </h1>
          <p className="truncate text-sm text-muted-foreground">
            {fr ? "Des pros vérifiés, près de chez vous." : "Verified pros, close to you."}
          </p>
        </div>
        <Button asChild variant="outline" className="shrink-0">
          <Link to="/studio">
            <Sparkle className="size-4" aria-hidden />
            <span className="hidden sm:inline">{t("svc.becomePro")}</span>
            <span className="sm:hidden">{fr ? "Pro" : "Pro"}</span>
          </Link>
        </Button>
      </header>

      <CategoryHero onSelect={(id) => selectGroup(id)} />

      {!asked && !location ? (
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-2xl border border-border bg-card p-4 sm:flex sm:justify-between">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <MapPin className="size-5" aria-hidden />
          </span>
          <p className="min-w-0 text-sm text-muted-foreground">
            {fr ? "Activez la localisation pour voir les pros près de vous." : "Enable location to see pros near you."}
          </p>
          <div className="col-span-2 flex gap-2 sm:col-span-1">
            <Button size="sm" onClick={() => void request()}>
              {fr ? "Activer" : "Enable"}
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>
              {fr ? "Plus tard" : "Later"}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={fr ? "Rechercher un pro, une ville…" : "Search a pro, a city…"}
          className="pl-9"
          aria-label={t("svc.search")}
        />
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {(["ALL", ...CATEGORY_GROUPS.map((g) => g.id)] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => selectGroup(id as GroupId | "ALL")}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-all",
              group === id
                ? "brand-gradient text-on-dark shadow-[var(--shadow-brand)]"
                : "border border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {id === "ALL" ? t("svc.all") : CATEGORY_GROUPS.find((g) => g.id === id)!.label[lang]}
          </button>
        ))}
      </div>

      {groupCategories.length > 0 ? (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {(["ALL", ...groupCategories] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c as ServiceCategory | "ALL")}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                category === c
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {c === "ALL" ? t("svc.all") : categoryLabel(c, lang)}
            </button>
          ))}
        </div>
      ) : null}

      {isLoading ? (
        <SkeletonRows rows={3} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t("svc.empty")}
          description={t("svc.emptyCopy")}
          icon={<Users className="size-5" aria-hidden />}
          action={
            <Button asChild>
              <Link to="/studio">{t("svc.becomePro")}</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((provider) => (
            <ProviderCard key={provider.id} provider={provider} photos={photosByProvider?.[provider.id] ?? []} />
          ))}
        </div>
      )}
    </div>
  );
}
