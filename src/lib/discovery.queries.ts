import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { signPortfolioPaths, type ServiceCategory } from "./marketplace";
import type { ProviderProfile } from "./marketplace.queries";

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

      let query = supabase
        .from("provider_profiles")
        .select(
          needsServiceJoin
            ? "*, services:provider_services!inner(id, title, price, category, is_active)"
            : "*, services:provider_services(id, title, price, category, is_active)",
        )
        .eq("is_live", true);

      if (filters.categories.length > 0) query = query.overlaps("categories", filters.categories);
      if (filters.city.trim()) query = query.ilike("city", `%${filters.city.trim()}%`);
      if (filters.minRating > 0) query = query.gte("rating_avg", filters.minRating);
      if (filters.verifiedOnly) query = query.eq("is_verified", true);
      if (filters.availableOnly) query = query.eq("accepting_bookings", true);
      if (needsServiceJoin) {
        query = query.eq("services.is_active", true).lte("services.price", filters.maxPrice!);
      }

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

      // Location-first discovery: active pros in the member's own city lead the feed.
      const near = (filters.nearCity ?? "").trim().toLowerCase();
      if (filters.sort === "NEARBY" && near) {
        const score = (p: (typeof prepared)[number]) => {
          const sameCity = (p.city ?? "").trim().toLowerCase() === near ? 0 : 2;
          const active = p.accepting_bookings ? 0 : 1;
          return sameCity + active;
        };
        prepared.sort((a, b) => {
          const diff = score(a) - score(b);
          if (diff !== 0) return diff;
          return Number(b.rating_avg) - Number(a.rating_avg);
        });
      }

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
