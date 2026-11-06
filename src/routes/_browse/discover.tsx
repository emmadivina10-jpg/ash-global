import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Search } from "lucide-react";
import { MusicianCard, MusicianManager } from "@/components/refer/TalentHub";
import { NotificationBell } from "@/components/refer/NotificationBell";
import { Logo } from "@/components/refer/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { useLocation } from "@/lib/location";
import { useRegion } from "@/lib/region-context";
import { TALENT_ROLES, type TalentRole } from "@/lib/talent.queries";
import { useMusicianPreviewMedia, useMusicianStats, useMusicians } from "@/lib/musician.queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_browse/discover")({
  head: () => ({
    meta: [
      { title: "ASH Talent - Discover musicians" },
      { name: "description", content: "Discover music providers and explore ASH." },
    ],
  }),
  component: TalentPage,
});

const chip = (on: boolean) =>
  cn(
    "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-colors",
    on
      ? "border-primary bg-primary/15 text-foreground"
      : "border-border text-muted-foreground hover:text-foreground",
  );

function TalentPage() {
  const { tx, lang } = useI18n();
  const region = useRegion();
  const { location, request, busy } = useLocation();
  const [city, setCity] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<TalentRole>("all");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [topRated, setTopRated] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const musicians = useMusicians(region.seesEverything ? null : region.country, city, role);
  const stats = useMusicianStats((musicians.data ?? []).map((item) => item.id));
  const media = useMusicianPreviewMedia((musicians.data ?? []).map((item) => item.id));
  const visibleMusicians = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const results = (musicians.data ?? []).filter((item) => {
      const matchesSearch =
        !query ||
        [item.display_name, ...item.instruments, ...item.genres, item.city, item.biography]
          .join(" ")
          .toLocaleLowerCase()
          .includes(query);
      return matchesSearch && (!availableOnly || (item.online && item.accepting_enquiries));
    });
    if (topRated)
      results.sort((a, b) => {
        const left = stats.data?.get(a.id);
        const right = stats.data?.get(b.id);
        return (
          Number(Boolean(right?.review_count)) - Number(Boolean(left?.review_count)) ||
          Number(right?.rating_average ?? 0) - Number(left?.rating_average ?? 0) ||
          Number(right?.review_count ?? 0) - Number(left?.review_count ?? 0)
        );
      });
    return results;
  }, [musicians.data, search, availableOnly, topRated, stats.data]);

  const filtersActive = Boolean(
    search.trim() || city.trim() || role !== "all" || availableOnly || topRated,
  );
  const resetFilters = () => {
    setSearch("");
    setCity("");
    setRole("all");
    setAvailableOnly(false);
    setTopRated(false);
    setLocationError(false);
  };

  const nearMe = async () => {
    setLocationError(false);
    const result = location ?? (await request());
    if (result?.label) setCity(result.label);
    else setLocationError(true);
  };

  return (
    <main className="min-h-dvh w-full bg-background text-foreground">
      <div className="talent-discover mx-auto w-full max-w-7xl px-3 pb-8 pt-1 sm:px-5 lg:px-8">
        <header className="-mx-3 flex items-center justify-between gap-3 border-b border-border px-3 py-2 sm:-mx-5 sm:px-5 lg:-mx-8 lg:px-8">
          <Link
            to="/feed"
            aria-label="ASH Glo home"
            className="flex shrink-0 items-center gap-1.5 whitespace-nowrap"
          >
            <Logo className="whitespace-nowrap" />
            <span className="font-display text-sm font-bold italic leading-none text-primary">
              Glo
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={tx("Search and filter musicians", "Rechercher et filtrer les musiciens")}
              onClick={() => setFilterOpen(true)}
              className="relative size-10 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground [&_svg]:size-5"
            >
              <Search aria-hidden />
              {filtersActive ? (
                <span className="absolute right-2 top-2 size-2 rounded-full bg-primary" />
              ) : null}
            </Button>
            <MusicianManager compact />
            <NotificationBell />
          </div>
        </header>

        <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{tx("Find musicians", "Trouver des musiciens")}</DialogTitle>
            </DialogHeader>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={tx(
                "Search musicians, instruments, genres...",
                "Rechercher musiciens, instruments, genres...",
              )}
              aria-label={tx(
                "Search musicians, instruments and genres",
                "Rechercher des musiciens, instruments et genres",
              )}
            />
            <label className="text-sm">
              {tx("City", "Ville")}
              <Input
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder={tx("Any city", "Toutes les villes")}
              />
            </label>
            <div className="flex flex-wrap gap-2" role="group" aria-label={tx("Instrument", "Instrument")}>
              <button
                type="button"
                aria-pressed={role === "all"}
                onClick={() => setRole("all")}
                className={chip(role === "all")}
              >
                {tx("All", "Tout")}
              </button>
              {TALENT_ROLES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={role === item.id}
                  onClick={() => setRole(item.id)}
                  className={chip(role === item.id)}
                >
                  {lang === "fr" ? item.fr : item.en}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void nearMe()}
                className={chip(Boolean(location?.label && city === location.label))}
              >
                <MapPin className="size-3.5" aria-hidden />
                {busy ? tx("Finding...", "Recherche...") : tx("Near me", "Près de moi")}
              </button>
              <button
                type="button"
                aria-pressed={availableOnly}
                onClick={() => setAvailableOnly((value) => !value)}
                className={chip(availableOnly)}
              >
                {tx("Available now", "Disponible")}
              </button>
              <button
                type="button"
                aria-pressed={topRated}
                onClick={() => setTopRated((value) => !value)}
                className={chip(topRated)}
              >
                {tx("Top rated", "Mieux notés")}
              </button>
            </div>
            {locationError ? (
              <p role="alert" className="text-xs text-destructive">
                {tx(
                  "Could not determine a nearby city. Enter a city above.",
                  "Ville introuvable. Saisissez une ville ci-dessus.",
                )}
              </p>
            ) : null}
            <div className="flex gap-2">
              {filtersActive ? (
                <Button type="button" variant="outline" onClick={resetFilters} className="flex-1">
                  {tx("Reset", "Réinitialiser")}
                </Button>
              ) : null}
              <Button type="button" onClick={() => setFilterOpen(false)} className="flex-1">
                {tx("Show results", "Afficher les résultats")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <section aria-label={tx("Musicians", "Musiciens")} className="pt-3">
          <div className="mb-3 flex items-baseline justify-between">
            <h1 className="font-display text-base font-semibold text-foreground">
              {tx("Musicians", "Musiciens")}
            </h1>
            {musicians.data ? (
              <span className="text-xs text-muted-foreground">{visibleMusicians.length}</span>
            ) : null}
          </div>
          {musicians.isLoading ? (
            <div
              role="status"
              aria-label={tx("Finding talent...", "Recherche de talents...")}
              className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-4 xl:grid-cols-5"
            >
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="aspect-square animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : musicians.isError ? (
            <div role="alert" className="text-sm text-destructive">
              {tx("Could not load talent.", "Impossible de charger les talents.")}{" "}
              <button type="button" className="underline" onClick={() => void musicians.refetch()}>
                {tx("Try again", "Réessayer")}
              </button>
            </div>
          ) : visibleMusicians.length ? (
            <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-4 xl:grid-cols-5">
              {visibleMusicians.map((musician) => (
                <MusicianCard
                  key={musician.id}
                  musician={musician}
                  {...(media.data
                    ? { media: media.data.filter((item) => item.musician_id === musician.id) }
                    : {})}
                  {...(stats.data?.get(musician.id) ? { stats: stats.data.get(musician.id)! } : {})}
                />
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              <p>
                {tx(
                  "No approved musicians match these filters yet.",
                  "Aucun musicien ne correspond à ces filtres.",
                )}
              </p>
              {filtersActive ? (
                <button type="button" onClick={resetFilters} className="mt-2 text-primary underline">
                  {tx("Clear filters", "Effacer les filtres")}
                </button>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
