import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Search, SlidersHorizontal, Sparkle, Users } from "lucide-react";
import { CategoryHero } from "@/components/refer/CategoryHero";
import { ProviderCard } from "@/components/refer/ProviderCard";
import { EmptyState, SkeletonRows } from "@/components/refer/states";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type ServiceCategory } from "@/lib/marketplace";
import { CATEGORY_GROUPS, categoryLabel, type GroupId } from "@/lib/taxonomy";
import {
  DEFAULT_FILTERS,
  useDiscovery,
  useProviderCities,
  type DiscoveryFilters,
  type DiscoverySort,
} from "@/lib/discovery.queries";
import { useLocation } from "@/lib/location";
import { useRegion } from "@/lib/region-context";
import { useI18n } from "@/lib/i18n";
import { formatXAF } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/services/")({
  head: () => ({
    meta: [
      { title: "Discover beauty, tech, home & event pros — ASH Glo" },
      {
        name: "description",
        content:
          "Discover verified professionals on ASH Glo: braiders, barbers, nail and lash artists, developers, electricians, photographers and more. See their work, then book.",
      },
      { property: "og:title", content: "Discover beauty, tech, home & event pros — ASH Glo" },
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

const PRICE_STEPS = [5000, 10000, 25000, 50000, 100000];

function DiscoveryPage() {
  const { t, lang } = useI18n();
  const fr = lang === "fr";
  const { location, asked, request, dismiss } = useLocation();
  const { data: cities } = useProviderCities();

  const region = useRegion();
  const [group, setGroup] = useState<GroupId | "ALL">("ALL");
  const [category, setCategory] = useState<ServiceCategory | "ALL">("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<DiscoveryFilters>(DEFAULT_FILTERS);

  const groupCategories = useMemo(
    () => (group === "ALL" ? [] : (CATEGORY_GROUPS.find((g) => g.id === group)?.categories ?? [])),
    [group],
  );

  // Debounce the free-text search so typing does not hit the database per keystroke.
  useEffect(() => {
    const id = setTimeout(() => setFilters((f) => ({ ...f, search: searchInput })), 350);
    return () => clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    const cats: ServiceCategory[] =
      category !== "ALL" ? [category] : group !== "ALL" ? [...groupCategories] : [];
    setFilters((f) => ({ ...f, categories: cats }));
  }, [category, group, groupCategories]);

  // Location-first: once we know the member's city, it leads the feed.
  useEffect(() => {
    const city = location?.label ?? null;
    setFilters((f) => (f.nearCity === city ? f : { ...f, nearCity: city }));
  }, [location?.label]);

  // Country-scoped catalogue: you only see storefronts in your own country
  // (admins in "all regions" mode see everything).
  useEffect(() => {
    const scope = region.seesEverything ? null : region.country;
    setFilters((f) => (f.country === scope ? f : { ...f, country: scope }));
  }, [region.country, region.seesEverything]);


  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useDiscovery(filters);
  const providers = useMemo(() => (data?.pages ?? []).flat(), [data]);

  // Infinite scroll sentinel.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) void fetchNextPage();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  function selectGroup(next: GroupId | "ALL") {
    setGroup(next);
    setCategory("ALL");
  }

  function patch(next: Partial<DiscoveryFilters>) {
    setFilters((f) => ({ ...f, ...next }));
  }

  const activeFilterCount =
    (filters.city ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.maxPrice !== null ? 1 : 0) +
    (filters.verifiedOnly ? 1 : 0) +
    (filters.availableOnly ? 1 : 0);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header className="relative overflow-hidden rounded-[calc(var(--radius)+10px)] border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:p-6">
        <div
          className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-primary/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-10 size-52 rounded-full bg-gold/15 blur-3xl"
          aria-hidden
        />
        <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <span className="eyebrow inline-flex w-fit items-center gap-1.5 rounded-full border border-border bg-background/70 px-2.5 py-1 text-[10px] font-bold text-primary backdrop-blur">
              <Sparkle className="size-3" aria-hidden />
              {fr ? "Place de marché ASH" : "ASH Marketplace"}
            </span>
            <h1 className="mt-2 font-display text-2xl font-extrabold leading-tight text-foreground sm:text-4xl">
              {fr ? "Trouvez le bon pro," : "Find the right pro,"}{" "}
              <span className="brand-gradient bg-clip-text text-transparent">
                {fr ? "près de chez vous." : "right near you."}
              </span>
            </h1>
            <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground sm:text-base">
              {fr
                ? "Beauté, tech, maison, événements et santé — portfolios vérifiés, avis réels, réservation en quelques secondes."
                : "Beauty, tech, home, events and health — verified portfolios, real reviews, booking in seconds."}
            </p>
          </div>
          <Button asChild className="shrink-0">
            <Link to="/studio">
              <Sparkle className="size-4" aria-hidden />
              <span className="hidden sm:inline">{t("svc.becomePro")}</span>
              <span className="sm:hidden">Pro</span>
            </Link>
          </Button>
        </div>
      </header>


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

      <div className="sticky top-14 z-20 -mx-1 grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-2xl bg-background/85 px-1 py-2 backdrop-blur-xl lg:top-0">
        <div className="relative min-w-0">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={fr ? "Rechercher un pro, une ville…" : "Search a pro, a city…"}
            className="h-11 rounded-full pl-9 shadow-[var(--shadow-card)]"
            aria-label={t("svc.search")}
          />
        </div>
        <Button
          variant={showFilters || activeFilterCount > 0 ? "default" : "outline"}
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          className="h-11 rounded-full"
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          <span className="hidden sm:inline">{fr ? "Filtres" : "Filters"}</span>
          {activeFilterCount > 0 ? <span className="tabular text-xs">({activeFilterCount})</span> : null}
        </Button>
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

      {showFilters ? (
        <div className="grid gap-4 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>{fr ? "Ville" : "City"}</Label>
            <Select
              value={filters.city || "ALL"}
              onValueChange={(v) => patch({ city: v === "ALL" ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder={fr ? "Toutes" : "All"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{fr ? "Toutes les villes" : "All cities"}</SelectItem>
                {(cities ?? []).map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{fr ? "Note minimum" : "Minimum rating"}</Label>
            <Select value={String(filters.minRating)} onValueChange={(v) => patch({ minRating: Number(v) })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 3, 4, 4.5].map((r) => (
                  <SelectItem key={r} value={String(r)}>
                    {r === 0 ? (fr ? "Toutes" : "Any") : `${r}+ ★`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{fr ? "Prix max" : "Max price"}</Label>
            <Select
              value={filters.maxPrice === null ? "ALL" : String(filters.maxPrice)}
              onValueChange={(v) => patch({ maxPrice: v === "ALL" ? null : Number(v) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{fr ? "Tous les prix" : "Any price"}</SelectItem>
                {PRICE_STEPS.map((p) => (
                  <SelectItem key={p} value={String(p)}>
                    ≤ {formatXAF(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{fr ? "Trier par" : "Sort by"}</Label>
            <Select value={filters.sort} onValueChange={(v) => patch({ sort: v as DiscoverySort })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TOP_RATED">{fr ? "Mieux notés" : "Top rated"}</SelectItem>
                <SelectItem value="NEARBY">{fr ? "Près de moi" : "Near me"}</SelectItem>
                <SelectItem value="PRICE_LOW">{fr ? "Prix croissant" : "Price: low to high"}</SelectItem>
                <SelectItem value="PRICE_HIGH">{fr ? "Prix décroissant" : "Price: high to low"}</SelectItem>
                <SelectItem value="NEWEST">{fr ? "Nouveaux" : "Newest"}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
            <Label htmlFor="verified-only" className="text-sm">
              {fr ? "Pros vérifiés" : "Verified pros"}
            </Label>
            <Switch
              id="verified-only"
              checked={filters.verifiedOnly}
              onCheckedChange={(v) => patch({ verifiedOnly: v })}
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
            <Label htmlFor="available-only" className="text-sm">
              {fr ? "Disponibles" : "Available now"}
            </Label>
            <Switch
              id="available-only"
              checked={filters.availableOnly}
              onCheckedChange={(v) => patch({ availableOnly: v })}
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-2">
            <Button
              variant="ghost"
              onClick={() => {
                setFilters({ ...DEFAULT_FILTERS, search: searchInput, nearCity: location?.label ?? null });
                setCategory("ALL");
                setGroup("ALL");
              }}
            >
              {fr ? "Réinitialiser les filtres" : "Reset filters"}
            </Button>
          </div>
        </div>
      ) : null}

      {location ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="size-3.5" aria-hidden />
          {location.label
            ? fr
              ? `Pros à ${location.label} affichés en premier.`
              : `Showing pros in ${location.label} first.`
            : fr
              ? "Localisation activée."
              : "Location on."}
        </p>
      ) : null}

      {isLoading ? (
        <SkeletonRows rows={4} />
      ) : providers.length === 0 ? (
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
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {providers.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                photos={provider.photos}
                services={provider.services}
                fromPrice={provider.fromPrice}
                isVerified={provider.is_verified}
                acceptingBookings={provider.accepting_bookings}
                completedBookings={provider.completed_bookings}
                nearby={
                  Boolean(filters.nearCity) &&
                  (provider.city ?? "").trim().toLowerCase() === (filters.nearCity ?? "").trim().toLowerCase()
                }
              />
            ))}
          </div>


          <div ref={sentinel} className="h-10" aria-hidden />
          {isFetchingNextPage ? <SkeletonRows rows={1} /> : null}
          {!hasNextPage && providers.length > 0 ? (
            <p className="pb-2 text-center text-xs text-muted-foreground">
              {fr ? "Vous avez tout vu." : "You have seen everyone."}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
