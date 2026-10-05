import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { signPortfolioPaths, type ServiceCategory } from "./marketplace";
import type { ProviderProfile } from "./marketplace.queries";
import { engagement, freshness, newSessionSeed, recordExposure, rotate } from "./rotation";

// One seed per page load: pages of the same scroll stay consistent; a reload or
// pull-to-refresh (which remounts/refetches from page 0) draws a new seed.
let providerSeed: string | null = null;
function providerSessionSeed() {
  if (!providerSeed) providerSeed = newSessionSeed(null);
  return providerSeed;
}
export function resetProviderRotation() {
  providerSeed = null;
}

export const PAGE_SIZE = 12;

export type DiscoverySort = "TOP_RATED" | "NEARBY" | "PRICE_LOW" | "PRICE_HIGH" | "NEWEST";

export type DiscoveryFilters = {
  search: string;
  categories: ServiceCategory[];
  city: string;
  minRating: number;
  maxPrice: number | null;
  verifiedOnly: boolean;
  availableOnly: boolean;
  sort: DiscoverySort;
  /** City detected from the member's coordinates — surfaced first in the feed. */
  nearCity: string | null;
  /** ISO country the viewer is browsing from. null = show every country (admin). */
  country: string | null;
};

export const DEFAULT_FILTERS: DiscoveryFilters = {
  search: "",
  categories: [],
  city: "",
  minRating: 0,
  maxPrice: null,
  verifiedOnly: false,
  availableOnly: false,
  sort: "NEARBY",
  nearCity: null,
  country: null,
};

export type DiscoveryProvider = ProviderProfile & {
  is_verified: boolean;
  accepting_bookings: boolean;
  service_areas: string[] | null;
  completed_bookings: number;
  services: { id: string; title: string; price: number; category: ServiceCategory; is_active: boolean }[];
  photos: { id: string; url: string; caption: string | null }[];
  fromPrice: number | null;
};

/** Paginated Discovery feed, filtered and sorted in the database. */
export function useDiscovery(filters: DiscoveryFilters) {
  return useInfiniteQuery({
    queryKey: ["discovery", filters],
    initialPageParam: 0,
    getNextPageParam: (last: DiscoveryProvider[], pages) =>
      last.length < PAGE_SIZE ? undefined : pages.length,
    queryFn: async ({ pageParam }) => {
      const page = pageParam as number;
      const from = page * PAGE_SIZE;
      const needsServiceJoin = filters.maxPrice !== null;

      // Keep live storefronts discoverable while their owner is still adding
      // the first service. A price filter is the exception: it must only return
      // storefronts with an active service in the requested price range.
      const servicesRelation = needsServiceJoin
        ? "services:provider_services!inner(id, title, price, category, is_active)"
        : "services:provider_services(id, title, price, category, is_active)";
      let query = supabase
        .from("provider_profiles")
        .select(`*, ${servicesRelation}`)
        .eq("is_live", true)
        .eq("services.is_active", true);

      // Storefronts are only visible to people browsing from the same country.
      if (filters.country) query = query.eq("country", filters.country);

      if (filters.categories.length > 0) query = query.overlaps("categories", filters.categories);
      if (filters.city.trim()) query = query.ilike("city", `%${filters.city.trim()}%`);
      if (filters.minRating > 0) query = query.gte("rating_avg", filters.minRating);
      if (filters.verifiedOnly) query = query.eq("is_verified", true);
      if (filters.availableOnly) query = query.eq("accepting_bookings", true);
      if (needsServiceJoin) query = query.lte("services.price", filters.maxPrice!);

      const term = filters.search.trim();
      if (term) {
        const safe = term.replace(/[,%]/g, " ");
        query = query.or(`business_name.ilike.%${safe}%,city.ilike.%${safe}%,bio.ilike.%${safe}%`);
      }

      if (filters.sort === "NEWEST") query = query.order("created_at", { ascending: false });
      else {
        query = query
          .order("rating_avg", { ascending: false })
          .order("completed_bookings", { ascending: false })
          .order("rating_count", { ascending: false });
      }

      const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
      if (error) throw error;

      const rows = (data ?? []) as unknown as DiscoveryProvider[];

      // Newest portfolio thumbnails for this page only (keeps Discovery fast).
      const ids = rows.map((r) => r.id);
      let photos: Record<string, { id: string; url: string; caption: string | null }[]> = {};
      if (ids.length > 0) {
        const { data: items } = await supabase
          .from("portfolio_items")
          .select("id, provider_id, image_path, caption, created_at")
          .in("provider_id", ids)
          .order("created_at", { ascending: false });
        const byProvider: Record<string, typeof items> = {};
        for (const item of items ?? []) {
          const list = (byProvider[item.provider_id] ??= []);
          if (list.length < 3) list.push(item);
        }
        const picked = Object.values(byProvider).flat().filter(Boolean);
        const urls = await signPortfolioPaths(picked.map((i) => i!.image_path));
        photos = Object.fromEntries(
          Object.entries(byProvider).map(([pid, list]) => [
            pid,
            (list ?? [])
              .map((i) => ({ id: i!.id, url: urls[i!.image_path] ?? "", caption: i!.caption }))
              .filter((p) => p.url),
          ]),
        );
      }

      const prepared = rows.map((row) => {
        const services = (row.services ?? []).filter((s) => s.is_active);
        const prices = services.map((s) => Number(s.price)).filter((n) => Number.isFinite(n));
        return {
          ...row,
          services,
          photos: photos[row.id] ?? [],
          fromPrice: prices.length > 0 ? Math.min(...prices) : null,
        };
      });

      if (filters.sort === "PRICE_LOW" || filters.sort === "PRICE_HIGH") {
        prepared.sort((a, b) => {
          const av = a.fromPrice ?? Number.MAX_SAFE_INTEGER;
          const bv = b.fromPrice ?? Number.MAX_SAFE_INTEGER;
          return filters.sort === "PRICE_LOW" ? av - bv : bv - av;
        });
      }

      // Personalised rotation for the default ("Nearby") sort: city, availability,
      // rating, completed bookings and freshness are signals, then a per-user +
      // per-session seed and recent-exposure cooldown reorder within the page so
      // two members in the same city don't all get the same first provider.
      // Explicit sorts (price, newest) keep their exact order.
      let ranked = prepared;
      if (filters.sort === "NEARBY") {
        const near = (filters.nearCity ?? "").trim().toLowerCase();
        const { data: who } = await supabase.auth.getUser();
        ranked = rotate(
          "provider",
          prepared.map((p) => ({
            item: p,
            id: p.id,
            creator: p.user_id,
            relevance:
              0.3 * (near && (p.city ?? "").trim().toLowerCase() === near ? 1 : 0) +
              0.2 * (p.accepting_bookings ? 1 : 0) +
              0.2 * (Number(p.rating_avg) / 5) +
              0.15 * Math.min(1, engagement(p.completed_bookings, 30)) +
              0.15 * freshness(p.created_at, 24 * 30),
            explorable: (p.completed_bookings ?? 0) < 3,
          })),
          // Stable within one scroll session so pagination doesn't reshuffle; new on refresh.
          `${who.user?.id ?? "anon"}:${providerSessionSeed()}`,
        );
        recordExposure("provider", ranked.slice(0, 6).map((p) => p.id));
      }
      prepared.splice(0, prepared.length, ...ranked);

      // A provider always sees their own storefront at the top of the first page.
      if (page === 0) {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (uid) {
          const mineIndex = prepared.findIndex((p) => p.user_id === uid);
          if (mineIndex > 0) {
            const [mine] = prepared.splice(mineIndex, 1);
            if (mine) prepared.unshift(mine);
          }
        }
      }

      return prepared;

    },
  });
}

/** Distinct cities of live providers, for the location filter. */
export function useProviderCities() {
  return useQuery({
    queryKey: ["discovery", "cities"],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_profiles")
        .select("city")
        .eq("is_live", true)
        .not("city", "is", null);
      if (error) throw error;
      const set = new Set<string>();
      for (const row of data ?? []) {
        const city = (row.city ?? "").trim();
        if (city) set.add(city);
      }
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    },
  });
}
