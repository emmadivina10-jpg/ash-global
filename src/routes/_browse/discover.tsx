import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building2,
  CalendarDays,
  Car,
  GraduationCap,
  MapPin,
  Music2,
  AudioLines,
  ChevronRight,
  Drum,
  Guitar,
  Grid2X2,
  Headphones,
  MicVocal,
  Piano,
  Search,
  SlidersHorizontal,
  Star,
  Store,
  Tag,
  X,
} from "lucide-react";
import { MusicianCard, MusicianManager } from "@/components/refer/TalentHub";
import { NotificationBell } from "@/components/refer/NotificationBell";
import { Logo } from "@/components/refer/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { useLocation } from "@/lib/location";
import { useRegion } from "@/lib/region-context";
import type { TalentRole } from "@/lib/talent.queries";
import { useMusicianPreviewMedia, useMusicianStats, useMusicians } from "@/lib/musician.queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_browse/discover")({
  head: () => ({
    meta: [
      { title: "ASH Talent — Discover musicians" },
      { name: "description", content: "Discover music providers and explore ASH." },
    ],
  }),
  component: TalentPage,
});

function TalentPage() {
  const { tx } = useI18n();
  const region = useRegion();
  const { location, request, busy } = useLocation();
  const [city, setCity] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<TalentRole>("all");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [topRated, setTopRated] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [showIntroduction, setShowIntroduction] = useState(false);
  const introStarted = useRef(false);
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

  useEffect(() => {
    if (!introStarted.current) {
      try {
        if (sessionStorage.getItem("ash.talent.intro.seen")) return;
        sessionStorage.setItem("ash.talent.intro.seen", "1");
      } catch {
        // Session storage can be disabled; show the introduction for this visit.
      }
      introStarted.current = true;
    }
    setShowIntroduction(true);
    const timer = window.setTimeout(() => setShowIntroduction(false), 8000);
    return () => window.clearTimeout(timer);
  }, []);

  const nearMe = async () => {
    setLocationError(false);
    const result = location ?? (await request());
    if (result?.label) setCity(result.label);
    else setLocationError(true);
  };

  return (
    <main className="dark min-h-dvh w-full bg-[#08070b] text-white">
      <div className="talent-discover mx-auto w-full max-w-7xl space-y-5 px-3 pb-8 pt-2 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-3">
          <Link to="/feed" aria-label="ASH Glo home" className="inline-flex items-center gap-1">
            <Logo />
            <span className="font-display text-sm font-bold italic text-pink-400">Glo</span>
          </Link>
          <NotificationBell />
        </header>
        <section className="relative min-h-44 overflow-hidden rounded-3xl bg-gradient-to-br from-black via-[#15091a] to-[#210b32] px-4 py-4 sm:min-h-52 sm:px-6">
          <div className="relative z-10 max-w-[72%] sm:max-w-[58%]">
            <p className="text-[11px] font-semibold tracking-[0.32em] text-primary">
              {tx("DISCOVER", "DÉCOUVRIR")}
            </p>
            <h1 className="mt-1 font-display text-4xl font-black tracking-tight sm:text-5xl">
              {tx("Musicians", "Musiciens")}
            </h1>
            <p className="mt-2 text-sm leading-5 text-white/75">
              {tx(
                "Find, hire and book professional musicians for your events, projects and recordings.",
                "Trouvez et réservez des musiciens pour vos événements, projets et enregistrements.",
              )}
            </p>
          </div>
          <div className="absolute -right-2 bottom-1 top-2 flex w-[36%] items-center justify-center text-primary">
            <Headphones
              className="absolute size-28 opacity-70 drop-shadow-[0_0_24px_rgba(236,40,154,.8)] sm:size-36"
              strokeWidth={1.2}
              aria-hidden
            />
            <AudioLines
              className="absolute -left-2 size-20 text-violet-400 drop-shadow-[0_0_16px_rgba(162,49,255,.9)] sm:size-24"
              aria-hidden
            />
            <span className="absolute bottom-3 h-1 w-3/4 rounded-full bg-primary blur-md" />
          </div>
        </section>
        {showIntroduction ? (
          <section className="talent-hero relative overflow-hidden rounded-3xl p-5 text-white sm:p-8">
            <button
              type="button"
              onClick={() => setShowIntroduction(false)}
              aria-label={tx("Dismiss introduction", "Fermer la présentation")}
              className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-white/10 hover:bg-white/20"
            >
              <X className="size-4" aria-hidden />
            </button>
            <div className="grid size-10 place-items-center rounded-2xl bg-white/10">
              <Music2 className="size-5" aria-hidden />
            </div>
            <h2 className="mt-4 font-display text-2xl font-bold sm:text-3xl">
              {tx("Find musicians near you", "Trouvez des musiciens près de vous")}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-white/75">
              {tx(
                "Discover music providers and connect through their existing ASH profiles.",
                "Découvrez des prestataires musicaux et contactez-les sur ASH.",
              )}
            </p>
          </section>
        ) : null}
        <section aria-label={tx("Find musicians", "Trouver des musiciens")} className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={tx(
                  "Search musicians, instruments, genres…",
                  "Rechercher musiciens, instruments, genres…",
                )}
                aria-label={tx(
                  "Search musicians, instruments and genres",
                  "Rechercher des musiciens, instruments et genres",
                )}
                className="h-12 rounded-2xl border-primary/25 bg-card/80 pl-10"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              aria-label={tx("Open filters", "Ouvrir les filtres")}
              onClick={() => setFilterOpen(true)}
              className="size-12 shrink-0 rounded-2xl border-primary/30"
            >
              <SlidersHorizontal className="size-5" />
            </Button>
          </div>
          <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{tx("Filter musicians", "Filtrer les musiciens")}</DialogTitle>
              </DialogHeader>
              <label className="text-sm">
                {tx("City", "Ville")}
                <Input
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder={tx("Any city", "Toutes les villes")}
                />
              </label>
              <Button onClick={() => setFilterOpen(false)}>
                {tx("Show results", "Afficher les résultats")}
              </Button>
            </DialogContent>
          </Dialog>
          <MusicianManager />
          {locationError ? (
            <p role="alert" className="text-xs text-destructive">
              {tx(
                "Could not determine a nearby city. Enter a city below.",
                "Ville introuvable. Saisissez une ville ci-dessous.",
              )}
            </p>
          ) : null}
          <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              { id: "all" as TalentRole, label: tx("All", "Tout"), icon: Grid2X2 },
              { id: "drummer" as TalentRole, label: tx("Drummer", "Batteur"), icon: Drum },
              { id: "pianist" as TalentRole, label: tx("Pianist", "Pianiste"), icon: Piano },
              { id: "guitarist" as TalentRole, label: tx("Guitarist", "Guitariste"), icon: Guitar },
              { id: "vocalist" as TalentRole, label: tx("Vocalist", "Chanteur"), icon: MicVocal },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setRole(id)}
                aria-pressed={role === id}
                className={cn(
                  "flex min-w-[5.3rem] flex-col items-center gap-2 rounded-2xl border px-3 py-3 text-xs font-semibold transition",
                  role === id
                    ? "border-primary bg-gradient-to-br from-primary/30 to-violet-950 text-white shadow-[0_0_18px_rgba(228,34,142,.35)]"
                    : "border-white/10 bg-card/80 text-muted-foreground",
                )}
              >
                <Icon
                  className={cn("size-6", role === id ? "text-primary" : "text-violet-300")}
                  aria-hidden
                />
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Button
              type="button"
              variant={location?.label && city === location.label ? "default" : "outline"}
              disabled={busy}
              onClick={() => void nearMe()}
              className="shrink-0 rounded-full"
            >
              <MapPin className="mr-1 size-4" />
              {busy ? tx("Finding…", "Recherche…") : tx("Near Me", "Près de moi")}
              <ChevronRight className="ml-1 size-4" />
            </Button>
            <Button
              type="button"
              variant={availableOnly ? "default" : "outline"}
              aria-pressed={availableOnly}
              onClick={() => setAvailableOnly((value) => !value)}
              className="shrink-0 rounded-full"
            >
              <CalendarDays className="mr-1 size-4" />
              {tx("Available Now", "Disponible")}
            </Button>
            <Button
              type="button"
              variant={topRated ? "default" : "outline"}
              aria-pressed={topRated}
              onClick={() => setTopRated((value) => !value)}
              className="shrink-0 rounded-full"
            >
              <Star className="mr-1 size-4" />
              {tx("Top Rated", "Mieux notés")}
            </Button>
          </div>
          {musicians.isLoading ? (
            <p role="status" className="text-sm text-muted-foreground">
              {tx("Finding talent…", "Recherche de talents…")}
            </p>
          ) : musicians.isError ? (
            <div role="alert" className="text-sm text-destructive">
              {tx("Could not load talent.", "Impossible de charger les talents.")}{" "}
              <button type="button" className="underline" onClick={() => void musicians.refetch()}>
                {tx("Try again", "Réessayer")}
              </button>
            </div>
          ) : visibleMusicians.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
            <p className="text-sm text-muted-foreground">
              {tx(
                "No approved musicians match these filters yet. Register to join ASH Talent.",
                "Aucun musicien trouvé. Essayez une autre recherche ou devenez musicien.",
              )}
            </p>
          )}
        </section>
        <section aria-labelledby="explore-ash-heading" className="space-y-3">
          <h2 id="explore-ash-heading" className="font-display text-xl font-bold">
            {tx("Explore ASH", "Explorer ASH")}
          </h2>
          <nav
            aria-label={tx("Explore ASH", "Explorer ASH")}
            className="grid grid-cols-3 gap-2 sm:grid-cols-6"
          >
            {[
              { href: "/services", label: tx("Services", "Services"), icon: Store },
              {
                href: "/property",
                label: tx("Properties & Land", "Immobilier et terrains"),
                icon: Building2,
              },
              { href: "/search?q=vehicles", label: tx("Vehicles", "Véhicules"), icon: Car },
              { href: "/deals", label: tx("Deals", "Offres"), icon: Tag },
              { href: "/events", label: tx("Events", "Événements"), icon: CalendarDays },
              { href: "/campus", label: tx("Courses", "Cours"), icon: GraduationCap },
            ].map(({ href, label, icon: Icon }) => (
              <a
                key={href}
                href={href}
                className="discover-category flex min-h-24 flex-col justify-between rounded-2xl p-3 text-white"
              >
                <span className="grid size-9 place-items-center rounded-xl bg-white/10">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="text-xs font-bold leading-tight">{label}</span>
              </a>
            ))}
          </nav>
        </section>
      </div>
    </main>
  );
}
