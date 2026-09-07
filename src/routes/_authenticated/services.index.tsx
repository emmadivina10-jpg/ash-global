import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Browser } from "@capacitor/browser";
import {
  Calendar,
  Home,
  MapPin,
  Search,
  SlidersHorizontal,
  Users,
} from "lucide-react";

import { ProviderCard } from "@/components/refer/ProviderCard";
import { useCommunityFeed } from "@/lib/marketplace.queries";
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
import {
  CATEGORY_GROUPS,
  categoryLabel,
  type GroupId,
} from "@/lib/taxonomy";
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
      {
        title: "Discover beauty, tech, home & event pros — ASH Glo",
      },
      {
        name: "description",
        content:
          "Discover verified professionals on ASH Glo: braiders, barbers, nail and lash artists, developers, electricians, photographers and more. See their work, then book.",
      },
      {
        property: "og:title",
        content:
          "Discover beauty, tech, home & event pros — ASH Glo",
      },
      {
        property: "og:description",
        content:
          "Browse verified ASH Glo providers by category, view portfolios and book in a few taps.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        name: "twitter:card",
        content: "summary_large_image",
      },
    ],
  }),
  component: DiscoveryPage,
});

const PRICE_STEPS = [
  5000,
  10000,
  25000,
  50000,
  100000,
];

function DiscoveryPage() {
  const { t, lang } = useI18n();
  const fr = lang === "fr";

  const {
    location,
    asked,
    request,
    dismiss,
  } = useLocation();

  const { data: cities } = useProviderCities();

  const region = useRegion();

  const [group, setGroup] =
    useState<GroupId | "ALL">("ALL");

  const [category, setCategory] =
    useState<ServiceCategory | "ALL">("ALL");

  const [searchInput, setSearchInput] =
    useState("");

  const [showFilters, setShowFilters] =
    useState(false);

  const [filters, setFilters] =
    useState<DiscoveryFilters>(
      DEFAULT_FILTERS,
    );

  const groupCategories = useMemo(
    () =>
      group === "ALL"
        ? []
        : (
            CATEGORY_GROUPS.find(
              (g) => g.id === group,
            )?.categories ?? []
          ),
    [group],
  );

  // Debounce the free-text search so typing does not hit
  // the database per keystroke.
  useEffect(() => {
    const id = setTimeout(
      () =>
        setFilters((f) => ({
          ...f,
          search: searchInput,
        })),
      350,
    );

    return () => clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    const cats: ServiceCategory[] =
      category !== "ALL"
        ? [category]
        : group !== "ALL"
          ? [...groupCategories]
          : [];

    setFilters((f) => ({
      ...f,
      categories: cats,
    }));
  }, [
    category,
    group,
    groupCategories,
  ]);

  // Location-first: once we know the member's city,
  // it leads the feed.
  useEffect(() => {
    const city = location?.label ?? null;

    setFilters((f) =>
      f.nearCity === city
        ? f
        : {
            ...f,
            nearCity: city,
          },
    );
  }, [location?.label]);

  // Country-scoped catalogue.
  useEffect(() => {
    const scope = region.seesEverything
      ? null
      : region.country;

    setFilters((f) =>
      f.country === scope
        ? f
        : {
            ...f,
            country: scope,
          },
    );
  }, [
    region.country,
    region.seesEverything,
  ]);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useDiscovery(filters);

  const providers = useMemo(
    () =>
      (data?.pages ?? []).flat(),
    [data],
  );

  const browsing =
    !searchInput.trim() &&
    category === "ALL" &&
    group === "ALL";

  const recommended = useMemo(
    () =>
      [...providers]
        .sort(
          (a, b) =>
            b.rating_avg -
            a.rating_avg,
        )
        .slice(0, 8),
    [providers],
  );

  const { data: community } =
    useCommunityFeed();

  // Infinite scroll sentinel.
  const sentinel =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = sentinel.current;

    if (!node) return;

    const observer =
      new IntersectionObserver(
        (entries) => {
          if (
            entries[0]?.isIntersecting &&
            hasNextPage &&
            !isFetchingNextPage
          ) {
            void fetchNextPage();
          }
        },
      );

    observer.observe(node);

    return () =>
      observer.disconnect();
  }, [
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);

  function selectGroup(
    next: GroupId | "ALL",
  ) {
    setGroup(next);
    setCategory("ALL");
  }

  function patch(
    next: Partial<DiscoveryFilters>,
  ) {
    setFilters((f) => ({
      ...f,
      ...next,
    }));
  }

  const activeFilterCount =
    (filters.city ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.maxPrice !== null
      ? 1
      : 0) +
    (filters.verifiedOnly ? 1 : 0) +
    (filters.availableOnly ? 1 : 0);

  /**
   * Opens an external service using the native Capacitor
   * in-app browser experience.
   *
   * On native iOS/Android, Browser.open() handles the
   * experience without sending the user directly into
   * the device's normal browser app.
   *
   * On web, fall back to a normal new tab.
   */
  async function openExternal(url: string) {
    try {
      await Browser.open({
        url,
        presentationStyle: "popover",
      });
    } catch {
      window.open(
        url,
        "_blank",
        "noopener,noreferrer",
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header className="pt-1 sm:pt-2">
        <p className="text-sm font-semibold text-primary">
          {fr
            ? "Place de marché ASH"
            : "ASH Marketplace"}
        </p>

        <h1 className="mt-1 font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl">
          {fr
            ? "Trouvez des services près de vous"
            : "Find services near you"}
        </h1>

        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {fr
            ? "Parcourez les professionnels vérifiés, comparez leur travail et réservez en toute confiance."
            : "Browse verified providers, compare their work, and book with confidence."}
        </p>
      </header>

      {!asked && !location ? (
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-2xl border border-border bg-card p-4 sm:flex sm:justify-between">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <MapPin
              className="size-5"
              aria-hidden
            />
          </span>

          <p className="min-w-0 text-sm text-muted-foreground">
            {fr
              ? "Activez la localisation pour voir les pros près de vous."
              : "Enable location to see pros near you."}
          </p>

          <div className="col-span-2 flex gap-2 sm:col-span-1">
            <Button
              size="sm"
              onClick={() =>
                void request()
              }
            >
              {fr
                ? "Activer"
                : "Enable"}
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={dismiss}
            >
              {fr
                ? "Plus tard"
                : "Later"}
            </Button>
          </div>
        </div>
      ) : null}

      {/* SEARCH */}
      <div className="-mx-1 grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-2xl bg-background/85 px-1 py-2 backdrop-blur-xl lg:top-0">
        <div className="relative min-w-0">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />

          <Input
            value={searchInput}
            onChange={(e) =>
              setSearchInput(
                e.target.value,
              )
            }
            placeholder={
              fr
                ? "Rechercher un pro, une ville…"
                : "Search a pro, a city…"
            }
            className="h-11 rounded-full pl-9 shadow-[var(--shadow-card)]"
            aria-label={t(
              "svc.search",
            )}
          />
        </div>

        <Button
          variant={
            showFilters ||
            activeFilterCount > 0
              ? "default"
              : "outline"
          }
          onClick={() =>
            setShowFilters(
              (v) => !v,
            )
          }
          aria-expanded={
            showFilters
          }
          className="h-11 rounded-full"
        >
          <SlidersHorizontal
            className="size-4"
            aria-hidden
          />

          <span className="hidden sm:inline">
            {fr
              ? "Filtres"
              : "Filters"}
          </span>

          {activeFilterCount >
          0 ? (
            <span className="tabular text-xs">
              ({activeFilterCount})
            </span>
          ) : null}
        </Button>
      </div>

      {/* =========================================================
          ASH MARKETPLACE QUICK NAVIGATION
          ========================================================= */}
      <nav
        aria-label={
          fr
            ? "Services numériques et sections ASH"
            : "Digital services and ASH sections"
        }
        className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 pt-1 scrollbar-none"
      >
        {/* =======================================================
            LINKEDIN — BLUE / INDIGO HALO
            ======================================================= */}
        <button
          type="button"
          onClick={() =>
            void openExternal(
              "https://www.linkedin.com/",
            )
          }
          className="group flex w-[72px] shrink-0 flex-col items-center gap-1.5"
          aria-label="Open LinkedIn"
        >
          <span className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-sky-300 via-blue-600 to-indigo-900 p-[2px] shadow-lg shadow-blue-500/20 ring-2 ring-blue-400/40 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl group-active:scale-95">
            <span className="grid size-full place-items-center rounded-full bg-[#0A66C2] shadow-inner">
              <span className="text-lg font-black tracking-tight text-white">
                in
              </span>
            </span>
          </span>

          <span className="text-center text-xs font-semibold text-muted-foreground group-hover:text-foreground">
            LinkedIn
          </span>
        </button>

        {/* =======================================================
            YOUTUBE — RED / CRIMSON HALO
            ======================================================= */}
        <button
          type="button"
          onClick={() =>
            void openExternal(
              "https://www.youtube.com/",
            )
          }
          className="group flex w-[72px] shrink-0 flex-col items-center gap-1.5"
          aria-label="Open YouTube"
        >
          <span className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-red-300 via-red-600 to-rose-900 p-[2px] shadow-lg shadow-red-500/20 ring-2 ring-red-400/40 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl group-active:scale-95">
            <span className="grid size-full place-items-center rounded-full bg-white shadow-inner">
              <img
                src="https://cdn.simpleicons.org/youtube/FF0000"
                alt="YouTube"
                className="size-8 object-contain"
                loading="lazy"
              />
            </span>
          </span>

          <span className="text-center text-xs font-semibold text-muted-foreground group-hover:text-foreground">
            YouTube
          </span>
        </button>

        {/* =======================================================
            NETFLIX — RED / BLACK HALO
            ======================================================= */}
        <button
          type="button"
          onClick={() =>
            void openExternal(
              "https://www.netflix.com/",
            )
          }
          className="group flex w-[72px] shrink-0 flex-col items-center gap-1.5"
          aria-label="Open Netflix"
        >
          <span className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-red-300 via-red-700 to-zinc-950 p-[2px] shadow-lg shadow-red-500/20 ring-2 ring-red-500/35 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl group-active:scale-95">
            <span className="grid size-full place-items-center overflow-hidden rounded-full bg-black shadow-inner">
              <img
                src="https://www.netflix.com/favicon.ico"
                alt="Netflix"
                className="size-8 object-contain"
                loading="lazy"
              />
            </span>
          </span>

          <span className="text-center text-xs font-semibold text-muted-foreground group-hover:text-foreground">
            Netflix
          </span>
        </button>

        {/* =======================================================
            TCHOKOPAY — EMERALD / TEAL HALO
            ======================================================= */}
        <button
          type="button"
          onClick={() =>
            void openExternal(
              "https://www.tchokopay.com/",
            )
          }
          className="group flex w-[72px] shrink-0 flex-col items-center gap-1.5"
          aria-label="Open TchokoPay"
        >
          <span className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-emerald-200 via-emerald-500 to-teal-800 p-[2px] shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400/35 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl group-active:scale-95">
            <span className="grid size-full place-items-center overflow-hidden rounded-full bg-card shadow-inner">
              <img
                src="https://www.tchokopay.com/favicon.ico"
                alt="TchokoPay"
                className="size-7 object-contain"
                loading="lazy"
              />
            </span>
          </span>

          <span className="text-center text-xs font-semibold text-muted-foreground group-hover:text-foreground">
            TchokoPay
          </span>
        </button>

        {/* =======================================================
            STRIPE — VIOLET / INDIGO HALO
            ======================================================= */}
        <button
          type="button"
          onClick={() =>
            void openExternal(
              "https://stripe.com/",
            )
          }
          className="group flex w-[72px] shrink-0 flex-col items-center gap-1.5"
          aria-label="Open Stripe"
        >
          <span className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-violet-300 via-violet-600 to-indigo-900 p-[2px] shadow-lg shadow-violet-500/20 ring-2 ring-violet-400/35 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl group-active:scale-95">
            <span className="grid size-full place-items-center overflow-hidden rounded-full bg-white shadow-inner dark:bg-zinc-950">
              <img
                src="https://cdn.simpleicons.org/stripe"
                alt="Stripe"
                className="size-7 object-contain"
                loading="lazy"
              />
            </span>
          </span>

          <span className="text-center text-xs font-semibold text-muted-foreground group-hover:text-foreground">
            Stripe
          </span>
        </button>

        {/* =======================================================
            INSTAGRAM — ORANGE / PINK / PURPLE HALO
            ======================================================= */}
        <button
          type="button"
          onClick={() =>
            void openExternal(
              "https://www.instagram.com/",
            )
          }
          className="group flex w-[72px] shrink-0 flex-col items-center gap-1.5"
          aria-label="Open Instagram"
        >
          <span className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-orange-300 via-fuchsia-600 to-purple-800 p-[2px] shadow-lg shadow-fuchsia-500/20 ring-2 ring-pink-400/35 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl group-active:scale-95">
            <span className="grid size-full place-items-center overflow-hidden rounded-full bg-white shadow-inner">
              <img
                src="https://cdn.simpleicons.org/instagram/E4405F"
                alt="Instagram"
                className="size-8 object-contain"
                loading="lazy"
              />
            </span>
          </span>

          <span className="text-center text-xs font-semibold text-muted-foreground group-hover:text-foreground">
            Instagram
          </span>
        </button>

        {/* =======================================================
            PROPERTY — PREMIUM GOLD / VIOLET HALO
            INTERNAL ASH ROUTE
            ======================================================= */}
        <Link
          to="/property"
          className="group flex w-[72px] shrink-0 flex-col items-center gap-1.5"
        >
          <span className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-amber-200 via-yellow-500 to-violet-800 p-[2px] shadow-[0_8px_28px_rgba(234,179,8,0.28)] ring-2 ring-amber-400/45 transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_12px_35px_rgba(234,179,8,0.4)] group-active:scale-95">
            <span className="grid size-full place-items-center rounded-full bg-gradient-to-br from-zinc-950 via-slate-900 to-violet-950 text-white shadow-inner">
              <Home
                className="size-6 text-yellow-100 drop-shadow-[0_0_8px_rgba(254,240,138,0.75)]"
                aria-hidden
              />
            </span>
          </span>

          <span className="text-center text-xs font-semibold text-muted-foreground group-hover:text-foreground">
            {fr
              ? "Immobilier"
              : "Property"}
          </span>
        </Link>

        {/* =======================================================
            TELEGRAM — CYAN / BLUE HALO
            ======================================================= */}
        <button
          type="button"
          onClick={() =>
            void openExternal(
              "https://telegram.org/",
            )
          }
          className="group flex w-[72px] shrink-0 flex-col items-center gap-1.5"
          aria-label="Open Telegram"
        >
          <span className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-cyan-200 via-sky-500 to-blue-800 p-[2px] shadow-lg shadow-sky-500/20 ring-2 ring-sky-400/35 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl group-active:scale-95">
            <span className="grid size-full place-items-center overflow-hidden rounded-full bg-white shadow-inner">
              <img
                src="https://cdn.simpleicons.org/telegram/229ED9"
                alt="Telegram"
                className="size-8 object-contain"
                loading="lazy"
              />
            </span>
          </span>

          <span className="text-center text-xs font-semibold text-muted-foreground group-hover:text-foreground">
            Telegram
          </span>
        </button>

        {/* =======================================================
            LINKEDIN — SECOND INSTANCE, GOLD / BLUE HALO
            ======================================================= */}
        <button
          type="button"
          onClick={() =>
            void openExternal(
              "https://www.linkedin.com/",
            )
          }
          className="group flex w-[72px] shrink-0 flex-col items-center gap-1.5"
          aria-label="Open LinkedIn"
        >
          <span className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-amber-300 via-blue-600 to-indigo-900 p-[2px] shadow-lg shadow-blue-500/20 ring-2 ring-blue-400/30 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl group-active:scale-95">
            <span className="grid size-full place-items-center rounded-full bg-[#0A66C2] shadow-inner">
              <span className="text-lg font-black tracking-tight text-white">
                in
              </span>
            </span>
          </span>

          <span className="text-center text-xs font-semibold text-muted-foreground group-hover:text-foreground">
            LinkedIn
          </span>
        </button>

        {/* =======================================================
            SNAPCHAT — YELLOW / GOLD HALO
            ======================================================= */}
        <button
          type="button"
          onClick={() =>
            void openExternal(
              "https://www.snapchat.com/",
            )
          }
          className="group flex w-[72px] shrink-0 flex-col items-center gap-1.5"
          aria-label="Open Snapchat"
        >
          <span className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-yellow-100 via-yellow-400 to-amber-700 p-[2px] shadow-lg shadow-yellow-500/20 ring-2 ring-yellow-400/40 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl group-active:scale-95">
            <span className="grid size-full place-items-center rounded-full bg-yellow-400 shadow-inner">
              <img
                src="https://cdn.simpleicons.org/snapchat/FFFC00"
                alt="Snapchat"
                className="size-8 object-contain"
                loading="lazy"
              />
            </span>
          </span>

          <span className="text-center text-xs font-semibold text-muted-foreground group-hover:text-foreground">
            Snapchat
          </span>
        </button>

        {/* =======================================================
            X — BLACK / SILVER HALO
            ======================================================= */}
        <button
          type="button"
          onClick={() =>
            void openExternal(
              "https://x.com/",
            )
          }
          className="group flex w-[72px] shrink-0 flex-col items-center gap-1.5"
          aria-label="Open X"
        >
          <span className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-zinc-100 via-zinc-500 to-zinc-950 p-[2px] shadow-lg shadow-zinc-500/20 ring-2 ring-zinc-400/35 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl group-active:scale-95">
            <span className="grid size-full place-items-center rounded-full bg-black shadow-inner">
              <span className="text-xl font-bold text-white">
                𝕏
              </span>
            </span>
          </span>

          <span className="text-center text-xs font-semibold text-muted-foreground group-hover:text-foreground">
            X
          </span>
        </button>

        {/* =======================================================
            MT5 — GREEN / EMERALD HALO
            ======================================================= */}
        <button
          type="button"
          onClick={() =>
            void openExternal(
              "https://www.metatrader5.com/",
            )
          }
          className="group flex w-[72px] shrink-0 flex-col items-center gap-1.5"
          aria-label="Open MetaTrader 5"
        >
          <span className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-emerald-200 via-green-500 to-emerald-900 p-[2px] shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400/35 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl group-active:scale-95">
            <span className="grid size-full place-items-center overflow-hidden rounded-full bg-white shadow-inner">
              <img
                src="https://www.metatrader5.com/favicon.ico"
                alt="MetaTrader 5"
                className="size-8 object-contain"
                loading="lazy"
              />
            </span>
          </span>

          <span className="text-center text-xs font-semibold text-muted-foreground group-hover:text-foreground">
            MT5
          </span>
        </button>

        {/* =======================================================
            EVENTS — LUXURY GOLD PREMIUM HALO
            INTERNAL ASH ROUTE
            ======================================================= */}
        <Link
          to="/events"
          className="group flex w-[72px] shrink-0 flex-col items-center gap-1.5"
        >
          <span className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-yellow-100 via-amber-400 to-orange-800 p-[2px] shadow-[0_8px_28px_rgba(245,158,11,0.3)] ring-2 ring-amber-400/50 transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_12px_35px_rgba(245,158,11,0.42)] group-active:scale-95">
            <span className="grid size-full place-items-center rounded-full bg-gradient-to-br from-amber-950 via-yellow-700 to-amber-950 shadow-inner">
              <Calendar
                className="size-6 text-yellow-100 drop-shadow-[0_0_8px_rgba(254,240,138,0.75)]"
                aria-hidden
              />
            </span>
          </span>

          <span className="text-center text-xs font-semibold text-muted-foreground group-hover:text-foreground">
            {fr
              ? "Événements"
              : "Events"}
          </span>
        </Link>
      </nav>

      {/* CATEGORY FILTERS */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {(
          [
            "ALL",
            ...CATEGORY_GROUPS.map(
              (g) => g.id,
            ),
          ] as const
        ).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() =>
              selectGroup(
                id as
                  | GroupId
                  | "ALL",
              )
            }
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-all",
              group === id
                ? "brand-gradient text-on-dark shadow-[var(--shadow-brand)]"
                : "border border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {id === "ALL"
              ? t("svc.all")
              : CATEGORY_GROUPS.find(
                  (g) =>
                    g.id === id,
                )!.label[lang]}
          </button>
        ))}
      </div>

      {groupCategories.length >
      0 ? (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {(
            [
              "ALL",
              ...groupCategories,
            ] as const
          ).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() =>
                setCategory(
                  c as
                    | ServiceCategory
                    | "ALL",
                )
              }
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                category === c
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {c === "ALL"
                ? t("svc.all")
                : categoryLabel(
                    c,
                    lang,
                  )}
            </button>
          ))}
        </div>
      ) : null}

      {/* FILTER PANEL */}
      {showFilters ? (
        <div className="grid gap-4 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>
              {fr
                ? "Ville"
                : "City"}
            </Label>

            <Select
              value={
                filters.city ||
                "ALL"
              }
              onValueChange={(v) =>
                patch({
                  city:
                    v === "ALL"
                      ? ""
                      : v,
                })
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    fr
                      ? "Toutes"
                      : "All"
                  }
                />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="ALL">
                  {fr
                    ? "Toutes les villes"
                    : "All cities"}
                </SelectItem>

                {(cities ??
                  []
                ).map((c) => (
                  <SelectItem
                    key={c}
                    value={c}
                  >
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>
              {fr
                ? "Note minimum"
                : "Minimum rating"}
            </Label>

            <Select
              value={String(
                filters.minRating,
              )}
              onValueChange={(v) =>
                patch({
                  minRating:
                    Number(v),
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {[0, 3, 4, 4.5].map(
                  (r) => (
                    <SelectItem
                      key={r}
                      value={String(
                        r,
                      )}
                    >
                      {r === 0
                        ? fr
                          ? "Toutes"
                          : "Any"
                        : `${r}+ ★`}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>
              {fr
                ? "Prix max"
                : "Max price"}
            </Label>

            <Select
              value={
                filters.maxPrice ===
                null
                  ? "ALL"
                  : String(
                      filters.maxPrice,
                    )
              }
              onValueChange={(v) =>
                patch({
                  maxPrice:
                    v === "ALL"
                      ? null
                      : Number(v),
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="ALL">
                  {fr
                    ? "Tous les prix"
                    : "Any price"}
                </SelectItem>

                {PRICE_STEPS.map(
                  (p) => (
                    <SelectItem
                      key={p}
                      value={String(
                        p,
                      )}
                    >
                      ≤{" "}
                      {formatXAF(
                        p,
                      )}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>
              {fr
                ? "Trier par"
                : "Sort by"}
            </Label>

            <Select
              value={
                filters.sort
              }
              onValueChange={(v) =>
                patch({
                  sort: v as DiscoverySort,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="TOP_RATED">
                  {fr
                    ? "Mieux notés"
                    : "Top rated"}
                </SelectItem>

                <SelectItem value="NEARBY">
                  {fr
                    ? "Près de moi"
                    : "Near me"}
                </SelectItem>

                <SelectItem value="PRICE_LOW">
                  {fr
                    ? "Prix croissant"
                    : "Price: low to high"}
                </SelectItem>

                <SelectItem value="PRICE_HIGH">
                  {fr
                    ? "Prix décroissant"
                    : "Price: high to low"}
                </SelectItem>

                <SelectItem value="NEWEST">
                  {fr
                    ? "Nouveaux"
                    : "Newest"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
            <Label
              htmlFor="verified-only"
              className="text-sm"
            >
              {fr
                ? "Pros vérifiés"
                : "Verified pros"}
            </Label>

            <Switch
              id="verified-only"
              checked={
                filters.verifiedOnly
              }
              onCheckedChange={(v) =>
                patch({
                  verifiedOnly: v,
                })
              }
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
            <Label
              htmlFor="available-only"
              className="text-sm"
            >
              {fr
                ? "Disponibles"
                : "Available now"}
            </Label>

            <Switch
              id="available-only"
              checked={
                filters.availableOnly
              }
              onCheckedChange={(v) =>
                patch({
                  availableOnly: v,
                })
              }
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-2">
            <Button
              variant="ghost"
              onClick={() => {
                setFilters({
                  ...DEFAULT_FILTERS,
                  search:
                    searchInput,
                  nearCity:
                    location?.label ??
                    null,
                });

                setCategory(
                  "ALL",
                );

                setGroup("ALL");
              }}
            >
              {fr
                ? "Réinitialiser les filtres"
                : "Reset filters"}
            </Button>
          </div>
        </div>
      ) : null}

      {/* LOCATION */}
      {location ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin
            className="size-3.5"
            aria-hidden
          />

          {location.label
            ? fr
              ? `Pros à ${location.label} affichés en premier.`
              : `Showing pros in ${location.label} first.`
            : fr
              ? "Localisation activée."
              : "Location on."}
        </p>
      ) : null}

      {/* RECOMMENDED */}
      {browsing &&
      recommended.length >
        0 ? (
        <section
          aria-label={
            fr
              ? "Recommandé pour vous"
              : "Recommended for you"
          }
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-foreground">
              {fr
                ? "Recommandé pour vous"
                : "Recommended for you"}
            </h2>
          </div>

          <div className="-mx-1 flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto px-1 pb-1">
            {recommended.map(
              (provider) => (
                <div
                  key={
                    provider.id
                  }
                  className="w-64 shrink-0 snap-start sm:w-72"
                >
                  <ProviderCard
                    provider={
                      provider
                    }
                    photos={
                      provider.photos
                    }
                    services={
                      provider.services
                    }
                    fromPrice={
                      provider.fromPrice
                    }
                    isVerified={
                      provider.is_verified
                    }
                    acceptingBookings={
                      provider.accepting_bookings
                    }
                    completedBookings={
                      provider.completed_bookings
                    }
                    nearby={
                      Boolean(
                        filters.nearCity,
                      ) &&
                      (
                        provider.city ??
                        ""
                      )
                        .trim()
                        .toLowerCase() ===
                        (
                          filters.nearCity ??
                          ""
                        )
                          .trim()
                          .toLowerCase()
                    }
                  />
                </div>
              ),
            )}
          </div>
        </section>
      ) : null}

      {/* COMMUNITY */}
      {browsing &&
      (community ?? [])
        .length > 0 ? (
        <section
          aria-label={
            fr
              ? "Dernières nouvelles de la communauté"
              : "Latest from the community"
          }
          className="space-y-3"
        >
          <h2 className="font-display text-lg font-bold text-foreground">
            {fr
              ? "Dernières nouvelles de la communauté"
              : "Latest from the community"}
          </h2>

          <div className="-mx-1 flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto px-1 pb-1">
            {(community ??
              []
            ).map((post) => (
              <Link
                key={post.id}
                to="/services/$providerId"
                params={{
                  providerId:
                    post.provider.id,
                }}
                className="group w-56 shrink-0 snap-start overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]"
              >
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  <img
                    src={post.url}
                    alt={
                      post.caption ??
                      post.provider
                        .business_name
                    }
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>

                <div className="space-y-0.5 p-3">
                  <p className="truncate text-sm font-bold text-foreground">
                    {
                      post.provider
                        .business_name
                    }
                  </p>

                  {post.caption ? (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {
                        post.caption
                      }
                    </p>
                  ) : null}

                  {post.provider
                    .city ? (
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin
                        className="size-3"
                        aria-hidden
                      />

                      {
                        post
                          .provider
                          .city
                      }
                    </p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* PROVIDERS */}
      {isLoading ? (
        <SkeletonRows rows={4} />
      ) : providers.length ===
        0 ? (
        <EmptyState
          title={t(
            "svc.empty",
          )}
          description={t(
            "svc.emptyCopy",
          )}
          icon={
            <Users
              className="size-5"
              aria-hidden
            />
          }
          action={
            <Button asChild>
              <Link to="/studio">
                {t(
                  "svc.becomePro",
                )}
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {providers.map(
              (provider) => (
                <ProviderCard
                  key={
                    provider.id
                  }
                  provider={
                    provider
                  }
                  photos={
                    provider.photos
                  }
                  services={
                    provider.services
                  }
                  fromPrice={
                    provider.fromPrice
                  }
                  isVerified={
                    provider.is_verified
                  }
                  acceptingBookings={
                    provider.accepting_bookings
                  }
                  completedBookings={
                    provider.completed_bookings
                  }
                  nearby={
                    Boolean(
                      filters.nearCity,
                    ) &&
                    (
                      provider.city ??
                      ""
                    )
                      .trim()
                      .toLowerCase() ===
                      (
                        filters.nearCity ??
                        ""
                      )
                        .trim()
                        .toLowerCase()
                  }
                />
              ),
            )}
          </div>

          <div
            ref={sentinel}
            className="h-10"
            aria-hidden
          />

          {isFetchingNextPage ? (
            <SkeletonRows rows={1} />
          ) : null}

          {!hasNextPage &&
          providers.length >
            0 ? (
            <p className="pb-2 text-center text-xs text-muted-foreground">
              {fr
                ? "Vous avez tout vu."
                : "You have seen everyone."}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
