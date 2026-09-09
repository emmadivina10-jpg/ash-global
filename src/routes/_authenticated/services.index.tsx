import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Briefcase,
  Calendar,
  CreditCard,
  Droplets,
  GraduationCap,
  Home,
  MapPin,
  Smartphone,
  Tv,
  Wifi,
  Zap,
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
    href: "https://www.tchokopay.com/",
    en: "TchokoPay",
    fr: "TchokoPay",
    logo: "https://www.tchokopay.com/tchokopay-logo.png",
    logoClassName:
      "h-8 w-8 rounded-[11px] object-contain p-1.5 brightness-0 saturate-100 invert-[35%] sepia-[88%] saturate-[1200%] hue-rotate-[174deg] brightness-[88%] contrast-[102%]",
    ring:
      "bg-white ring-sky-400/60 shadow-sky-500/20",
  },
  {
    href: "https://www.netflix.com/",
    en: "Netflix",
    fr: "Netflix",
    logo:
      "https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2023.ico",
    logoClassName: "h-8 w-8 object-contain",
    ring:
      "bg-white ring-red-500/60 shadow-red-500/20",
  },
  {
    href: "https://www.tiktok.com/",
    en: "TikTok",
    fr: "TikTok",
    logo: "https://cdn.simpleicons.org/tiktok",
    logoClassName: "h-8 w-8 object-contain",
    ring:
      "bg-white ring-black/30 shadow-black/20",
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
] as const;

/*
 * ============================================================
 * ASH BILLS & UTILITIES
 * ============================================================
 *
 * Frontend-first utility hub.
 * Payment processing is intentionally not connected yet.
 * These cards provide the premium UI/UX foundation for the
 * future electricity, water, airtime, internet and TV flows.
 */
const UTILITY_SERVICES = [
  {
    id: "electricity",
    en: "Electricity",
    fr: "Électricité",
    descriptionEn: "Pay your electricity bill",
    descriptionFr: "Payez votre facture d'électricité",
    icon: Zap,
    tone: "text-amber-500",
    iconBg: "bg-amber-500/12",
    ring: "ring-amber-400/30",
    glow: "shadow-amber-500/10",
  },
  {
    id: "water",
    en: "Water",
    fr: "Eau",
    descriptionEn: "Settle your water bill",
    descriptionFr: "Réglez votre facture d'eau",
    icon: Droplets,
    tone: "text-sky-500",
    iconBg: "bg-sky-500/12",
    ring: "ring-sky-400/30",
    glow: "shadow-sky-500/10",
  },
  {
    id: "airtime",
    en: "Airtime",
    fr: "Crédit",
    descriptionEn: "Top up your mobile line",
    descriptionFr: "Rechargez votre ligne mobile",
    icon: Smartphone,
    tone: "text-violet-500",
    iconBg: "bg-violet-500/12",
    ring: "ring-violet-400/30",
    glow: "shadow-violet-500/10",
  },
  {
    id: "internet",
    en: "Internet",
    fr: "Internet",
    descriptionEn: "Renew your internet plan",
    descriptionFr: "Renouvelez votre forfait internet",
    icon: Wifi,
    tone: "text-emerald-500",
    iconBg: "bg-emerald-500/12",
    ring: "ring-emerald-400/30",
    glow: "shadow-emerald-500/10",
  },
  {
    id: "tv",
    en: "TV",
    fr: "TV",
    descriptionEn: "Renew your TV subscription",
    descriptionFr: "Renouvelez votre abonnement TV",
    icon: Tv,
    tone: "text-rose-500",
    iconBg: "bg-rose-500/12",
    ring: "ring-rose-400/30",
    glow: "shadow-rose-500/10",
  },
  {
    id: "school",
    en: "School fees",
    fr: "Frais scolaires",
    descriptionEn: "Pay school and tuition fees",
    descriptionFr: "Payez les frais scolaires",
    icon: GraduationCap,
    tone: "text-indigo-500",
    iconBg: "bg-indigo-500/12",
    ring: "ring-indigo-400/30",
    glow: "shadow-indigo-500/10",
  },
] as const;

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

  const [selectedUtility, setSelectedUtility] =
    useState<string | null>(null);

  const [utilityAccount, setUtilityAccount] =
    useState("");

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
            ? "Sections ASH"
            : "ASH sections"
        }
        className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 pt-1 scrollbar-none"
      >
        {QUICK_LINKS.map((item) => {
          /*
           * External items:
           *
           * IMPORTANT:
           * No target="_blank".
           * They open in the CURRENT browser tab/screen.
           */
          if ("href" in item) {
            return (
              <a
                key={item.en}
                href={item.href}
                className="group flex w-[72px] shrink-0 flex-col items-center gap-1.5"
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
                      className={cn(
                        item.logoClassName,
                      )}
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.style.display =
                          "none";
                      }}
                    />
                  </span>
                </span>

                <span className="text-center text-xs font-semibold text-muted-foreground group-hover:text-foreground">
                  {fr
                    ? item.fr
                    : item.en}
                </span>
              </a>
            );
          }

          /*
           * Internal ASH Marketplace sections.
           */
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
                    className={cn(
                      "size-6",
                      item.tone,
                    )}
                    aria-hidden
                  />
                </span>
              </span>

              <span className="text-center text-xs font-semibold text-muted-foreground group-hover:text-foreground">
                {fr
                  ? item.fr
                  : item.en}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* =========================================================
          ASH PAY / BILLS & UTILITIES
          ========================================================= */}
      <section
        aria-labelledby="ash-bills-utilities"
        className="relative overflow-hidden rounded-[30px] border border-border/70 bg-card shadow-[var(--shadow-card)]"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-24 size-72 rounded-full bg-amber-400/10 blur-3xl"
        />

        <div className="relative p-4 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                <CreditCard className="size-3.5" aria-hidden />
                {fr ? "ASH Pay" : "ASH Pay"}
              </div>

              <h2
                id="ash-bills-utilities"
                className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
              >
                {fr ? "Payez simplement. Vivez plus facilement." : "Pay simply. Live easier."}
              </h2>

              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {fr
                  ? "Réglez vos factures, rechargez vos services essentiels et gardez vos paiements quotidiens au même endroit."
                  : "Pay bills, recharge essential services, and keep your everyday payments in one place."}
              </p>
            </div>

            <div className="shrink-0 rounded-2xl border border-border/70 bg-background/70 px-4 py-3 backdrop-blur-xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {fr ? "Paiements du quotidien" : "Everyday payments"}
              </p>
              <p className="mt-0.5 text-sm font-bold text-foreground">
                {fr ? "Rapide • Simple • Sécurisé" : "Fast • Simple • Secure"}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            {UTILITY_SERVICES.map((utility) => {
              const Icon = utility.icon;
              const selected = selectedUtility === utility.id;

              return (
                <button
                  key={utility.id}
                  type="button"
                  onClick={() => {
                    setSelectedUtility(selected ? null : utility.id);
                    setUtilityAccount("");
                  }}
                  aria-pressed={selected}
                  className={cn(
                    "group relative overflow-hidden rounded-[22px] border p-3.5 text-left transition-all duration-300",
                    "hover:-translate-y-1 hover:shadow-xl active:scale-[0.98]",
                    selected
                      ? "border-primary/50 bg-primary/[0.07] shadow-[0_14px_38px_-20px_hsl(var(--primary))]"
                      : "border-border/70 bg-background/60 hover:border-primary/25 hover:bg-background",
                  )}
                >
                  <div
                    className={cn(
                      "mb-3 grid size-11 place-items-center rounded-2xl ring-1 transition-transform duration-300 group-hover:scale-105",
                      utility.iconBg,
                      utility.ring,
                    )}
                  >
                    <Icon className={cn("size-5", utility.tone)} aria-hidden />
                  </div>

                  <p className="text-sm font-bold text-foreground">
                    {fr ? utility.fr : utility.en}
                  </p>

                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                    {fr ? utility.descriptionFr : utility.descriptionEn}
                  </p>

                  <span
                    className={cn(
                      "absolute right-3.5 top-3.5 size-1.5 rounded-full transition-opacity",
                      selected
                        ? "bg-primary opacity-100"
                        : "bg-muted-foreground/30 opacity-0 group-hover:opacity-100",
                    )}
                  />
                </button>
              );
            })}
          </div>

          {selectedUtility ? (
            <div className="mt-4 overflow-hidden rounded-[24px] border border-primary/15 bg-background/80 p-4 shadow-inner backdrop-blur-xl sm:p-5">
              {(() => {
                const utility = UTILITY_SERVICES.find(
                  (item) => item.id === selectedUtility,
                );

                if (!utility) return null;

                const Icon = utility.icon;

                return (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "grid size-12 shrink-0 place-items-center rounded-2xl ring-1",
                            utility.iconBg,
                            utility.ring,
                          )}
                        >
                          <Icon className={cn("size-6", utility.tone)} aria-hidden />
                        </div>

                        <div>
                          <p className="text-sm font-bold text-foreground">
                            {fr ? utility.fr : utility.en}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {fr
                              ? "Commencez votre paiement"
                              : "Start your payment"}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUtility(null);
                          setUtilityAccount("");
                        }}
                        className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        {fr ? "Fermer" : "Close"}
                      </button>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(180px,220px)_auto] lg:items-end">
                      <div className="space-y-1.5">
                        <Label htmlFor={`utility-account-${utility.id}`}>
                          {utility.id === "electricity"
                            ? fr
                              ? "Numéro de compteur / client"
                              : "Meter / customer number"
                            : fr
                              ? "Numéro de compte / client"
                              : "Account / customer number"}
                        </Label>

                        <Input
                          id={`utility-account-${utility.id}`}
                          value={utilityAccount}
                          onChange={(event) =>
                            setUtilityAccount(event.target.value)
                          }
                          placeholder={
                            utility.id === "electricity"
                              ? fr
                                ? "Ex. numéro de compteur"
                                : "e.g. meter number"
                              : fr
                                ? "Entrez votre numéro"
                                : "Enter your number"
                          }
                          className="h-11 rounded-xl bg-card"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label>
                          {fr ? "Montant" : "Amount"}
                        </Label>

                        <Select defaultValue="5000">
                          <SelectTrigger className="h-11 rounded-xl bg-card">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRICE_STEPS.map((amount) => (
                              <SelectItem
                                key={amount}
                                value={String(amount)}
                              >
                                {formatXAF(amount)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        type="button"
                        disabled={!utilityAccount.trim()}
                        className="h-11 rounded-xl px-6 font-bold"
                        onClick={() => {
                          // Frontend-only flow for now.
                          // Connect provider lookup and payment processing here later.
                        }}
                      >
                        {fr ? "Continuer" : "Continue"}
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                      <span className="rounded-full border border-border bg-card px-3 py-1.5">
                        {fr ? "1. Vérifier" : "1. Verify"}
                      </span>
                      <span className="rounded-full border border-border bg-card px-3 py-1.5">
                        {fr ? "2. Choisir le paiement" : "2. Choose payment"}
                      </span>
                      <span className="rounded-full border border-border bg-card px-3 py-1.5">
                        {fr ? "3. Confirmer" : "3. Confirm"}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="mt-4 grid gap-3 rounded-[22px] border border-dashed border-border/80 bg-background/45 p-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
              <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <CreditCard className="size-5" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {fr ? "Tout commence ici." : "It starts here."}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {fr
                    ? "Choisissez une facture ou une recharge pour ouvrir son parcours de paiement."
                    : "Choose a bill or recharge to open its payment journey."}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

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
