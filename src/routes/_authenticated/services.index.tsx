import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import {
  Briefcase,
  Calendar,
  ArrowLeft,
  CreditCard,
  GraduationCap,
  Home,
  MessageCircle,
  Play,
  X,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Users,
} from "lucide-react";

import { ProviderCard } from "@/components/refer/ProviderCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { openMemberConversation } from "@/lib/contact-vendor";
import { openConversation } from "@/lib/marketplace.queries";
import { useSpotlightFeed } from "@/lib/spotlight.queries";
import { SpotlightComposer } from "@/components/refer/SpotlightComposer";
import { StoriesRail } from "@/components/refer/StoriesRail";
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
import { useI18n, baseLang } from "@/lib/i18n";
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



function normalizeMarketplaceText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value)
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  if (Array.isArray(value)) return value.map(normalizeMarketplaceText).filter(Boolean).join(" ");
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map(normalizeMarketplaceText)
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

/**
 * Filler words people type when searching in a natural phrase
 * ("plumber in Douala", "salon près de moi"). They never appear in provider
 * records, so they must not be treated as required search terms.
 */
const MARKETPLACE_STOP_WORDS = new Set([
  "in",
  "at",
  "on",
  "to",
  "of",
  "the",
  "for",
  "near",
  "me",
  "my",
  "a",
  "an",
  "and",
  "or",
  "with",
  "around",
  "close",
  "by",
  "any",
  "some",
  "best",
  "good",
  "looking",
  "need",
  "want",
  "find",
  "who",
  "can",
  "is",
  "are",
  "de",
  "du",
  "des",
  "la",
  "le",
  "les",
  "un",
  "une",
  "et",
  "ou",
  "pour",
  "dans",
  "chez",
  "pres",
  "proche",
  "moi",
  "mon",
  "ma",
  "je",
  "cherche",
  "besoin",
  "qui",
  "avec",
  "sur",
  "au",
  "aux",
]);

function marketplaceSearchTokens(query: string): string[] {
  const all = normalizeMarketplaceText(query)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
  const meaningful = all.filter((token) => !MARKETPLACE_STOP_WORDS.has(token));
  // If someone types only filler words, fall back to the raw tokens.
  return meaningful.length > 0 ? meaningful : all;
}

function marketplaceSearchScore(item: unknown, query: string): number {
  const haystack = normalizeMarketplaceText(item);
  const normalizedQuery = normalizeMarketplaceText(query);
  if (!haystack || !normalizedQuery) return 0;
  const tokens = marketplaceSearchTokens(query);
  if (tokens.length === 0) return 0;

  let score = 0;
  if (haystack.includes(normalizedQuery)) score += 120;

  const words = haystack.split(" ").filter(Boolean);
  const wordSet = new Set(words);
  const matches = tokens.reduce((count, token) => {
    const singular = token.endsWith("ies")
      ? `${token.slice(0, -3)}y`
      : token.endsWith("s") && token.length > 3
        ? token.slice(0, -1)
        : token;
    const plural = singular.endsWith("y")
      ? `${singular.slice(0, -1)}ies`
      : `${singular}s`;

    if (wordSet.has(token)) {
      score += 40;
      return count + 1;
    }
    if (wordSet.has(singular) || wordSet.has(plural)) {
      score += 32;
      return count + 1;
    }
    if (words.some((word) => word.startsWith(token) || token.startsWith(word))) {
      score += 20;
      return count + 1;
    }
    if (haystack.includes(token) || haystack.includes(singular)) {
      score += 10;
      return count + 1;
    }
    return count;
  }, 0);

  // Rank by how many terms matched, but never hide a result the server already
  // matched just because one term (a city, a surname) is missing.
  if (matches === tokens.length) score += 25;
  return matches > 0 ? score : 0;
}

function isVideoSource(url: string | null | undefined) {
  if (!url) return false;
  return /\.(mp4|webm|mov|m4v|ogg)(?:\?|#|$)/i.test(url);
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
  const navigate = useNavigate();

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
  const [spotlightFeedOpen, setSpotlightFeedOpen] = useState(false);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [spotlightSearch, setSpotlightSearch] = useState("");
  const [spotlightVendorInfoOpen, setSpotlightVendorInfoOpen] = useState(false);
  const spotlightContainerRef = useRef<HTMLDivElement>(null);

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

  const displayedProviders = useMemo(() => {
    const query = searchInput.trim();
    if (!query) return providers;

    const scored = [...providers]
      .map((provider) => ({
        provider,
        score: marketplaceSearchScore(provider, query),
      }))
      .sort((a, b) => b.score - a.score);

    const matching = scored.filter((entry) => entry.score > 0);
    // The server already matched these providers — ranking must never empty
    // the list, so fall back to the server order when nothing scores.
    return (matching.length > 0 ? matching : scored).map((entry) => entry.provider);
  }, [providers, searchInput]);

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

  const { data: community } = useSpotlightFeed();

  const spotlightPosts = useMemo(
    () => (community ?? []).slice(0, 18),
    [community],
  );

  const filteredSpotlightPosts = useMemo(() => {
    const query = spotlightSearch.trim() || searchInput.trim();
    if (!query) return spotlightPosts;

    return spotlightPosts
      .map((post) => {
        const provider = post.provider as typeof post.provider & {
          description?: string | null;
          bio?: string | null;
          categories?: unknown;
          service_categories?: unknown;
          category?: unknown;
          services?: unknown;
        };
        const discoveryProvider = providers.find((item) => item.id === post.provider.id);
        const searchableRecord = {
          provider,
          post,
          discoveryProvider,
        };
        return {
          post,
          score: marketplaceSearchScore(searchableRecord, query),
        };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.post);
  }, [providers, searchInput, spotlightPosts, spotlightSearch]);

  useEffect(() => {
    if (!spotlightFeedOpen && !spotlightOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSpotlightOpen(false);
        setSpotlightVendorInfoOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [spotlightFeedOpen, spotlightOpen]);

  useEffect(() => {
    if (!spotlightFeedOpen && !spotlightOpen) return;

    requestAnimationFrame(() => {
      const node = spotlightContainerRef.current;
      const target = node?.children[spotlightIndex] as HTMLElement | undefined;
      target?.scrollIntoView({ block: "start", behavior: "instant" });
    });
  }, [spotlightFeedOpen, spotlightOpen, spotlightIndex]);

  async function contactSpotlightVendor(
    providerId: string,
    context?: {
      businessName?: string | null;
      offerDescription?: string | null;
      searchedFor?: string;
      /** Author of a personal Spotlight, who has no storefront. */
      authorId?: string | null;
    },
  ) {
    // Personal spotlights have no storefront, so we message the member direct.
    const conversationId = providerId
      ? await openConversation(providerId)
      : await openMemberConversation(context?.authorId);
    if (!conversationId) {
      toast.error(fr ? "Impossible d'ouvrir la discussion." : "Could not open the chat.");
      return;
    }

    try {
      const { data: existingMessages, error: existingMessagesError } = await supabase
        .from("messages")
        .select("id")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(1);

      if (!existingMessagesError && (existingMessages ?? []).length === 0) {
        const { data: authData } = await supabase.auth.getUser();
        const senderId = authData.user?.id;
        if (senderId) {
          const businessName = context?.businessName?.trim() || "your business";
          const searchedFor = context?.searchedFor?.trim();
          const offer = context?.offerDescription?.trim();
          const subject = searchedFor || offer || "your service";
          const entranceMessage = fr
            ? `Bonjour ${businessName} ! J’ai trouvé votre offre « ${subject} » sur ASH Glo. Je suis intéressé(e) et j’aimerais connaître le prix, la disponibilité et la façon de procéder.`
            : `Hi ${businessName}! I found your ${subject} on ASH Glo. I’m interested and would like to know the price, availability, and how to proceed.`;

          await supabase.from("messages").insert({
            conversation_id: conversationId,
            sender_id: senderId,
            body: entranceMessage,
            metadata: {
              source: "ash_marketplace_contact",
              search_term: searchedFor ?? null,
              offer_description: offer ?? null,
            },
          });
        }
      }
    } catch {
      // Opening the conversation must remain successful even if the optional
      // entrance-message insert fails.
    }

    setSpotlightOpen(false);
    setSpotlightVendorInfoOpen(false);
    void navigate({
      to: "/messages",
      search: { c: conversationId },
    });
  }

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

      {/* =========================================================
          ASH SPOTLIGHT — VERTICAL BUSINESS STORIES
          ========================================================= */}
      <section
        aria-label={fr ? "ASH Spotlight" : "ASH Spotlight"}
        className="space-y-2.5"
      >
        <div className="flex items-end justify-between gap-3 px-0.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#D4AF37] via-[#9f7b18] to-[#4B0082] text-white shadow-md">
                <Play className="size-3.5 fill-current" aria-hidden />
              </span>
              <h2 className="font-display text-lg font-bold text-foreground">
                ASH Spotlight
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {fr
                ? "Découvrez les offres, produits et nouveautés des vendeurs près de vous."
                : "Discover products, offers and new drops from vendors around you."}
            </p>
          </div>

          {spotlightPosts.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setSpotlightIndex(0);
                setSpotlightSearch("");
                setSpotlightFeedOpen(true);
              }}
              className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/10"
            >
              {fr ? "Voir tout" : "View all"}
            </button>
          ) : null}
        </div>

        {/* One rail: 24-hour stories first, then lasting Spotlight highlights. */}
        <StoriesRail
          onOpenSpotlight={(index) => {
            setSpotlightIndex(index);
            setSpotlightSearch("");
            setSpotlightFeedOpen(true);
          }}
        />


        {spotlightPosts.length > 0 ? (
          <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 scrollbar-none">
            {filteredSpotlightPosts.map((post, index) => {
              const mediaIsVideo = post.media_type === "video" || isVideoSource(post.url);
              const businessName = post.provider.business_name;
              const city = post.provider.city;
              const providerMeta = post.provider as typeof post.provider & {
                description?: string | null;
                bio?: string | null;
              };
              const offerDescription =
                providerMeta.description ?? providerMeta.bio ?? post.caption ?? null;

              return (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => {
                    setSpotlightIndex(index);
                    setSpotlightSearch("");
                    setSpotlightFeedOpen(true);
                  }}
                  className="group relative h-48 w-[118px] shrink-0 snap-start overflow-hidden rounded-[22px] border border-border bg-slate-950 text-left shadow-[var(--shadow-card)] ring-1 ring-black/5 transition-transform duration-300 active:scale-[0.98] sm:h-56 sm:w-[138px]"
                >
                  <span className="absolute inset-0 z-10 bg-gradient-to-t from-black via-black/15 to-transparent" />

                  <span className="absolute left-2.5 top-2.5 z-20 flex max-w-[calc(100%-1.25rem)] items-center gap-1.5">
                    <span
                      className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full border border-white/60 bg-gradient-to-br from-[#D4AF37] to-[#4B0082] shadow-lg ring-1 ring-black/20"
                      aria-label={businessName}
                    >
                      {post.provider.avatar_url ? (
                        <img
                          src={post.provider.avatar_url}
                          alt=""
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-[9px] font-black text-white">
                          {businessName.trim().slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </span>

                    <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-2 py-1 text-[9px] font-bold text-white backdrop-blur-md">
                      <span className="size-1.5 shrink-0 rounded-full bg-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.85)]" />
                      <span className="truncate">ASH Spotlight</span>
                    </span>
                  </span>

                  {mediaIsVideo ? (
                    <video
                      src={post.url}
                      muted
                      loop
                      autoPlay
                      playsInline
                      preload="metadata"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <img
                      src={post.url}
                      alt={post.caption ?? businessName}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}

                  {mediaIsVideo ? (
                    <span className="absolute right-2.5 top-2.5 z-20 grid size-7 place-items-center rounded-full bg-white/15 text-white backdrop-blur-md">
                      <Play className="size-3.5 fill-current" aria-hidden />
                    </span>
                  ) : null}

                  <span className="absolute inset-x-0 bottom-0 z-20 p-2.5 text-white">
                    <span className="block truncate text-[12px] font-extrabold">
                      {businessName}
                    </span>
                    {city ? (
                      <span className="mt-0.5 flex items-center gap-1 text-[10px] text-white/75">
                        <MapPin className="size-2.5" aria-hidden />
                        {city}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/70 px-4 py-4 text-sm text-muted-foreground">
            {fr
              ? "Les vidéos des vendeurs apparaîtront ici."
              : "Vendor videos and offers will appear here."}
          </div>
        )}
      </section>

      {/* ASH SPOTLIGHT — SCROLLABLE FEED */}
      {spotlightFeedOpen && filteredSpotlightPosts.length > 0 ? (
        <div
          className="fixed inset-0 z-[110] bg-background/88 backdrop-blur-xl"
          role="dialog"
          aria-modal="true"
          aria-label={fr ? "Flux ASH Spotlight" : "ASH Spotlight feed"}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSpotlightFeedOpen(false);
            }
          }}
        >
          <div className="mx-auto flex h-full w-full max-w-5xl flex-col bg-background shadow-2xl sm:h-[92vh] sm:rounded-[28px] sm:border sm:border-border sm:mt-[4vh] overflow-hidden">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-xl sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#D4AF37] via-[#9f7b18] to-[#4B0082] text-white shadow-lg">
                  <Play className="size-4 fill-current" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold text-foreground">
                    ASH Spotlight
                  </p>
                  <p className="truncate text-[10px] font-semibold text-muted-foreground">
                    {fr
                      ? "Faites défiler pour découvrir les vendeurs. Touchez une vidéo pour l’ouvrir en plein écran."
                      : "Scroll to discover vendors. Tap a video to open it fullscreen."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSpotlightFeedOpen(false)}
                className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/80 active:scale-95"
                aria-label={fr ? "Fermer" : "Close"}
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <div
              ref={spotlightContainerRef}
              className="min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain bg-gradient-to-b from-background via-background to-muted/30 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {spotlightPosts.map((post, index) => {
                const mediaIsVideo = post.media_type === "video" || isVideoSource(post.url);
                const businessName = post.provider.business_name;

                return (
                  <article
                    key={post.id}
                    className="group flex min-h-[72vh] w-full snap-start items-center justify-center border-b border-border p-3 sm:min-h-[86vh] sm:p-6"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSpotlightIndex(index);
                        setSpotlightVendorInfoOpen(false);
                        setSpotlightFeedOpen(false);
                        setSpotlightOpen(true);
                      }}
                      className="relative h-[70vh] w-full max-w-md overflow-hidden rounded-[28px] border border-white/10 bg-black text-left shadow-2xl ring-1 ring-black/10 transition-transform duration-300 active:scale-[0.99] sm:h-[78vh]"
                      aria-label={
                        fr
                          ? `Ouvrir le Spotlight de ${businessName}`
                          : `Open ${businessName} Spotlight fullscreen`
                      }
                    >
                      {mediaIsVideo ? (
                        <video
                          src={post.url}
                          muted
                          loop
                          autoPlay
                          playsInline
                          preload="metadata"
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.015]"
                        />
                      ) : (
                        <img
                          src={post.url}
                          alt={post.caption ?? businessName}
                          loading="lazy"
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.015]"
                        />
                      )}

                      <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/20" />

                      <span className="absolute left-3 right-3 top-3 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/35 px-2.5 py-1.5 text-[9px] font-bold text-white backdrop-blur-md">
                          <span className="size-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.9)]" />
                          ASH Spotlight
                        </span>

                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/35 px-2.5 py-1.5 text-[9px] font-bold text-white backdrop-blur-md">
                          <Play className="size-3 fill-current" aria-hidden />
                          {fr ? "Plein écran" : "Fullscreen"}
                        </span>
                      </span>

                      <span className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
                        <span className="flex items-center gap-2.5">
                          <span className="grid size-11 place-items-center overflow-hidden rounded-full border border-white/25 bg-gradient-to-br from-[#D4AF37] to-[#4B0082] shadow-lg">
                            {post.provider.avatar_url ? (
                              <img
                                src={post.provider.avatar_url}
                                alt=""
                                className="size-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-black">
                                {businessName.trim().slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-extrabold">
                              {businessName}
                            </span>
                            {post.provider.city ? (
                              <span className="block text-[11px] text-white/65">
                                {post.provider.city}
                              </span>
                            ) : null}
                          </span>
                        </span>

                        {post.caption ? (
                          <span className="mt-3 block line-clamp-2 text-sm leading-relaxed text-white/90">
                            {post.caption}
                          </span>
                        ) : null}

                        <span className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-white/12 px-4 py-3 text-xs font-bold text-white backdrop-blur-md ring-1 ring-white/15">
                          <Play className="size-3.5 fill-current" aria-hidden />
                          {fr ? "Touchez pour ouvrir en plein écran" : "Tap to open fullscreen"}
                        </span>
                      </span>
                    </button>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* ASH SPOTLIGHT — TRUE FULLSCREEN REELS VIEWER */}
      {spotlightOpen && filteredSpotlightPosts.length > 0 && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[99999] h-[100dvh] min-h-[100svh] w-screen overflow-hidden bg-black"
              role="dialog"
              aria-modal="true"
              aria-label={
                fr
                  ? "ASH Spotlight plein écran"
                  : "ASH Spotlight fullscreen"
              }
            >
              {/* Portal-mounted overlay: deliberately rendered under document.body so
                  it sits above the authenticated shell, top header, bottom nav and orb. */}
              <div className="relative h-full w-full overflow-hidden bg-black">
                <div className="pointer-events-none absolute inset-x-0 top-0 z-40 h-40 bg-gradient-to-b from-black/90 via-black/45 to-transparent" />

                <div className="absolute inset-x-0 top-0 z-50 px-3 pb-2 pt-[calc(0.55rem+env(safe-area-inset-top))] sm:px-4">
                  <div className="mx-auto flex w-full max-w-3xl items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSpotlightOpen(false)}
                      className="grid size-11 shrink-0 place-items-center rounded-full border border-white/15 bg-black/45 text-white shadow-lg backdrop-blur-xl transition-all hover:bg-white/10 active:scale-95"
                      aria-label={fr ? "Retour aux vidéos" : "Back to videos"}
                    >
                      <ArrowLeft className="size-5" aria-hidden />
                    </button>

                    <div className="relative min-w-0 flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/60" aria-hidden />
                      <input
                        value={spotlightSearch}
                        onChange={(event) => {
                          setSpotlightSearch(event.target.value);
                          setSpotlightIndex(0);
                        }}
                        placeholder={fr ? "Rechercher un vendeur, une offre, une entreprise…" : "Search vendors, offers, businesses…"}
                        aria-label={fr ? "Rechercher dans ASH Spotlight" : "Search ASH Spotlight"}
                        className="h-11 w-full rounded-full border border-white/15 bg-black/45 pl-9 pr-4 text-sm font-medium text-white outline-none backdrop-blur-xl placeholder:text-white/45 focus:border-[#D4AF37]/55 focus:ring-2 focus:ring-[#D4AF37]/20"
                      />
                    </div>

                    <span className="hidden shrink-0 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-2.5 py-1 text-[9px] font-extrabold tracking-wide text-[#D4AF37] backdrop-blur-md sm:inline-flex">
                      ASH
                    </span>
                  </div>

                  {filteredSpotlightPosts.length === 0 && spotlightSearch.trim() ? (
                    <p className="mx-auto mt-2 max-w-3xl px-14 text-center text-[11px] font-semibold text-white/65">
                      {fr ? "Aucun Spotlight correspondant." : "No matching Spotlight found."}
                    </p>
                  ) : null}
                </div>

                <div
                  ref={spotlightContainerRef}
                  className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {filteredSpotlightPosts.map((post) => {
                    const mediaIsVideo = post.media_type === "video" || isVideoSource(post.url);
                    const businessName = post.provider.business_name;
                    const city = post.provider.city;
                    const providerMeta = post.provider as typeof post.provider & {
                      description?: string | null;
                      bio?: string | null;
                    };
                    const offerDescription =
                      providerMeta.description ?? providerMeta.bio ?? post.caption ?? null;

                    return (
                      <article
                        key={post.id}
                        className="relative h-[100dvh] min-h-[100svh] w-full snap-start overflow-hidden bg-black"
                      >
                        {mediaIsVideo ? (
                          <video
                            src={post.url}
                            muted
                            loop
                            autoPlay
                            playsInline
                            preload="metadata"
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : (
                          <img
                            src={post.url}
                            alt={post.caption ?? businessName}
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/15 to-black/10" />

                        {/* Compact vendor identity — tap to expand/collapse details. */}
                        <div className="absolute inset-x-0 top-[calc(4.3rem+env(safe-area-inset-top))] z-30 px-3 sm:px-4">
                          <div className="mx-auto w-full max-w-3xl">
                            <button
                              type="button"
                              onClick={() => setSpotlightVendorInfoOpen((open) => !open)}
                              className={cn(
                                "flex w-fit max-w-full items-center gap-2 rounded-full border border-white/15 bg-black/40 text-left text-white shadow-lg backdrop-blur-xl transition-all duration-300",
                                spotlightVendorInfoOpen ? "px-3 py-2.5" : "px-2 py-1.5",
                              )}
                              aria-expanded={spotlightVendorInfoOpen}
                            >
                              <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border border-white/30 bg-gradient-to-br from-[#D4AF37] to-[#4B0082] shadow-lg">
                                {post.provider.avatar_url ? (
                                  <img
                                    src={post.provider.avatar_url}
                                    alt=""
                                    className="size-full object-cover"
                                  />
                                ) : (
                                  <span className="text-[9px] font-black">
                                    {businessName.trim().slice(0, 2).toUpperCase()}
                                  </span>
                                )}
                              </span>

                              <span className="min-w-0 pr-1">
                                <span className="flex items-center gap-1.5">
                                  <span className="max-w-[15rem] truncate text-[12px] font-extrabold">
                                    {businessName}
                                  </span>
                                  {post.provider.is_verified ? (
                                    <span className="shrink-0 text-[8px] font-black uppercase tracking-wide text-[#D4AF37]">
                                      ✓
                                    </span>
                                  ) : null}
                                </span>

                                {spotlightVendorInfoOpen ? (
                                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-white/65">
                                    {city ? (
                                      <span className="inline-flex items-center gap-1">
                                        <MapPin className="size-2.5" aria-hidden />
                                        {city}
                                      </span>
                                    ) : null}
                                    <span>{fr ? "Vendeur ASH" : "ASH vendor"}</span>
                                  </span>
                                ) : null}
                              </span>

                              <span className="ml-0.5 shrink-0 text-white/55">
                                <span className={cn("text-xs transition-transform duration-300", spotlightVendorInfoOpen ? "rotate-180" : "")}>⌄</span>
                              </span>
                            </button>
                          </div>
                        </div>

                        {/* Bottom vendor message + CTA */}
                        <div className="absolute inset-x-0 bottom-0 z-30">
                          <div className="mx-auto w-full max-w-3xl px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-20 sm:px-5">
                            {offerDescription ? (
                              <div className="max-w-2xl rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5 backdrop-blur-md">
                                <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#D4AF37]">
                                  {fr ? "Ce que propose ce vendeur" : "What this vendor offers"}
                                </p>
                                <p className="mt-1 text-sm leading-relaxed text-white/95 sm:text-[15px]">
                                  {offerDescription}
                                </p>
                              </div>
                            ) : null}

                            <button
                              type="button"
                              onClick={() =>
                                void contactSpotlightVendor(
                                  post.provider.id,
                                  {
                                    businessName,
                                    offerDescription,
                                    searchedFor: spotlightSearch.trim() || searchInput.trim(),
                                    authorId: post.author_id,
                                  },
                                )
                              }
                              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#a77f1b] to-[#4B0082] px-4 py-3.5 text-sm font-extrabold text-white shadow-2xl shadow-black/35 transition-transform active:scale-[0.98]"
                            >
                              <MessageCircle className="size-4" aria-hidden />
                              {post.provider.id
                                ? fr
                                  ? "Contacter le vendeur"
                                  : "Contact Vendor"
                                : fr
                                  ? "Envoyer un message"
                                  : "Send a message"}
                            </button>

                            <p className="mt-2 text-center text-[10px] text-white/45">
                              {fr
                                ? "Découvrez · contactez · commandez"
                                : "Discover · contact · order"}
                            </p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

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
                )!.label[baseLang(lang)]}
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
      ) : displayedProviders.length ===
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
            {displayedProviders.map(
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
          displayedProviders.length >
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
