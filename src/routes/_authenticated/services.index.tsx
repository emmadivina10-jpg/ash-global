import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import {
  Briefcase,
  Calendar,
  CreditCard,
  GraduationCap,
  Home,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tag,
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

/*
 * ============================================================
 * ASH MARKETPLACE QUICK NAVIGATION
 * ============================================================
 *
 * TchokoPay, Netflix and TikTok are external destinations,
 * but they intentionally open in the SAME browser tab/screen.
 *
 * Jobs, Deals, Events, Property and People remain internal
 * ASH Marketplace routes.
 */
const QUICK_LINKS = [
  {
    to: "/electricity",
    en: "Pay Eneo Bills",
    fr: "Payer facture Eneo",
    logo:
      "https://my.eneo.cm/favicon.ico",
    logoClassName:
      "h-8 w-8 object-contain",
    ring:
      "bg-white ring-emerald-500/60 shadow-emerald-500/20",
  },
  {
    href: "https://www.tchokopay.com/",
    en: "TchokoPay",
    fr: "TchokoPay",
    logo:
      "https://www.tchokopay.com/tchokopay-logo.png",
    logoClassName:
      "h-8 w-8 rounded-[11px] object-contain p-1.5",
    ring:
      "bg-white ring-sky-400/60 shadow-sky-500/20",
  },
  {
    href: "https://www.netflix.com/",
    en: "Netflix",
    fr: "Netflix",
    logo:
      "https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2023.ico",
    logoClassName:
      "h-8 w-8 object-contain",
    ring:
      "bg-white ring-red-500/60 shadow-red-500/20",
  },
  {
    href: "https://www.tiktok.com/",
    en: "TikTok",
    fr: "TikTok",
    logo:
      "https://sf16-sg.tiktokcdn.com/obj/eden-sg/uvkuhyieh7lpqpbj/logo_tiktok1.svg",
    logoClassName:
      "h-8 w-8 object-contain brightness-125 contrast-125",
    ring:
      "bg-white dark:bg-zinc-950 ring-black/30 dark:ring-white/30 shadow-black/20 dark:shadow-white/10",
  },
  {
    to: "/freelance",
    en: "Jobs",
    fr: "Missions",
    icon: Briefcase,
    tone: "text-red-500",
    ring:
      "bg-red-500/15 ring-red-400/50 shadow-red-500/20",
  },
  {
    to: "/deals",
    en: "Deals",
    fr: "Offres",
    icon: Tag,
    tone: "text-yellow-500",
    ring:
      "bg-yellow-500/15 ring-yellow-400/50 shadow-yellow-500/20",
  },
  {
    to: "/events",
    en: "Events",
    fr: "Événements",
    icon: Calendar,
    tone: "text-emerald-500",
    ring:
      "bg-emerald-500/15 ring-emerald-400/50 shadow-emerald-500/20",
  },
  {
    to: "/property",
    en: "Property",
    fr: "Immobilier",
    icon: Home,
    tone: "text-foreground",
    ring:
      "bg-foreground/10 ring-foreground/30 shadow-black/10",
  },
  {
    to: "/network",
    en: "People",
    fr: "Personnes",
    icon: Users,
    tone: "text-emerald-500",
    ring:
      "bg-emerald-500/15 ring-emerald-400/50 shadow-emerald-500/20",
  },
  {
    to: "/incubator",
    en: "ASH Incubator",
    fr: "ASH Incubateur",
    icon: GraduationCap,
    tone: "text-[#D4AF37]",
    ring:
      "bg-[#D4AF37]/15 ring-[#D4AF37]/60 shadow-[#D4AF37]/20",
  },
] as const;

/**
 * Opens third-party services without navigating ASH itself away.
 *
 * Native Capacitor app:
 *   Uses the OS in-app browser surface. We intentionally do not set a
 *   presentationStyle or manipulate scroll/viewport state; the native
 *   browser owns its own presentation and closing it returns to ASH.
 *
 * Normal web:
 *   Opens a new tab and leaves the ASH tab untouched.
 */
async function openExternalService(url: string) {
  try {
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url });
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  } catch (error) {
    console.error("Unable to open external service:", error);
  }
}

/**
 * Eneo logo with a reliable text fallback if the remote image is unavailable.
 */
function EneoLogo() {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className="select-none text-[18px] font-black tracking-[-0.08em] text-[#00A651]"
        aria-hidden
      >
        eneo
      </span>
    );
  }

  return (
    <img
      src="https://my.eneo.cm/favicon.ico"
      alt="Eneo"
      className="h-8 w-8 object-contain"
      loading="eager"
      onError={() => setFailed(true)}
    />
  );
}


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

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">

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
            ? "Sections ASH"
            : "ASH sections"
        }
        className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 pt-1 scrollbar-none"
      >
        {QUICK_LINKS.map((item) => {
          // Eneo is an internal ASH route and is always first.
          if ("to" in item && "logo" in item) {
            return (
              <Link
                key={item.en}
                to={item.to}
                className="group flex w-[72px] shrink-0 flex-col items-center gap-1.5"
              >
                <span
                  className={cn(
                    "grid size-14 place-items-center rounded-full p-[2px] shadow-lg ring-2 transition-all duration-300 group-hover:scale-105 group-active:scale-95",
                    item.ring,
                  )}
                >
                  <span className="grid size-full place-items-center rounded-full bg-white dark:bg-zinc-950 shadow-inner">
                    <EneoLogo />
                  </span>
                </span>

                <span className="w-full text-center text-xs font-semibold leading-tight text-muted-foreground group-hover:text-foreground">
                  {fr ? item.fr : item.en}
                </span>
              </Link>
            );
          }

          // Third-party services use the native in-app browser on mobile.
          if ("href" in item) {
            return (
              <button
                key={item.en}
                type="button"
                onClick={() => void openExternalService(item.href)}
                className="group flex w-[72px] shrink-0 flex-col items-center gap-1.5"
                aria-label={fr ? item.fr : item.en}
              >
                <span
                  className={cn(
                    "grid size-14 place-items-center rounded-full p-[2px] shadow-lg ring-2 transition-all duration-300 group-hover:scale-105 group-active:scale-95",
                    item.ring,
                  )}
                >
                  <span className="grid size-full place-items-center rounded-full bg-card shadow-inner">
                    <img
                      src={item.logo}
                      alt={item.en}
                      className={cn(item.logoClassName)}
                      loading="eager"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  </span>
                </span>

                <span className="w-full text-center text-xs font-semibold text-muted-foreground group-hover:text-foreground">
                  {fr ? item.fr : item.en}
                </span>
              </button>
            );
          }

          const Icon = item.icon;

          return (
            <Link
              key={item.to}
              to={item.to}
              className="group flex w-[72px] shrink-0 flex-col items-center gap-1.5"
            >
              <span
                className={cn(
                  "grid size-14 place-items-center rounded-full p-[2px] shadow-lg ring-2 transition-all duration-300 group-hover:scale-105 group-active:scale-95",
                  item.ring,
                )}
              >
                <span className="grid size-full place-items-center rounded-full bg-card shadow-inner">
                  <Icon
                    className={cn("size-6", item.tone)}
                    aria-hidden
                  />
                </span>
              </span>

              <span className="w-full text-center text-xs font-semibold text-muted-foreground group-hover:text-foreground">
                {fr ? item.fr : item.en}
              </span>
            </Link>
          );
        })}
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
