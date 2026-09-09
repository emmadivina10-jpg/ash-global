/**
 * ASH Property reads. Everything goes through the browser Supabase client so
 * row level security decides what is visible: the public only ever sees
 * ACTIVE, unexpired listings.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PROPERTY_BUCKET } from "@/lib/property";

export type PropertyListing = {
  id: string;
  owner_id: string;
  owner_kind: string;
  listing_kind: string;
  category: string;
  title: string;
  description: string | null;
  country: string;
  region: string | null;
  city: string;
  neighborhood: string | null;
  university: string | null;
  distance_km: number | null;
  price: number;
  currency: string;
  price_period: string;
  bedrooms: number;
  bathrooms: number;
  size_value: number | null;
  size_unit: string | null;
  land_use: string | null;
  amenities: string[];
  is_furnished: boolean;
  available_from: string | null;
  status: string;
  verification_status: string;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  view_count: number;
  inquiry_count: number;
  expires_at: string;
  created_at: string;
};

export type PropertyImage = {
  id: string;
  listing_id: string;
  image_path: string;
  caption: string | null;
  sort_order: number;
};

export type PropertyFilters = {
  kind?: string;
  category?: string;
  city?: string;
  country?: string;
  university?: string;
  term?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  furnished?: boolean;
  amenities?: string[];
  verifiedOnly?: boolean;
  sort?: "recent" | "price_asc" | "price_desc";
};

/**
 * Property reads need a live authenticated session. When the stored session
 * is expired and cannot be refreshed, the route guard's cached session can
 * still let the page render and then fail on protected property_images
 * requests. Detect that here and send the member back to login instead of
 * leaving them on a broken page.
 */
export function isExpiredSessionError(error: unknown): boolean {
  const status = (error as { status?: number } | null)?.status;
  const message = String((error as { message?: string } | null)?.message ?? "").toLowerCase();
  return (
    status === 401 ||
    status === 403 ||
    message.includes("refresh_token_not_found") ||
    message.includes("refresh token not found") ||
    message.includes("session_not_found") ||
    message.includes("session from session_id claim in jwt does not exist") ||
    message.includes("jwt expired") ||
    message.includes("permission denied for table")
  );
}

async function signOutToLogin(): Promise<never> {
  await supabase.auth.signOut().catch(() => undefined);
  if (typeof window !== "undefined") window.location.replace("/login");
  throw new Error("SESSION_EXPIRED");
}

async function assertFreshSession(): Promise<void> {
  const { data, error } = await supabase.auth.getUser();
  if (data.user) return;
  // Only bounce members out when the session itself is invalid — a network
  // hiccup must not sign anyone out.
  if (!error || isExpiredSessionError(error)) await signOutToLogin();
}

/** Signed URLs for the private property bucket, keyed by storage path. */
export async function signPropertyPaths(paths: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (unique.length === 0) return {};
  const { data, error } = await supabase.storage.from(PROPERTY_BUCKET).createSignedUrls(unique, 60 * 60);
  if (error || !data) return {};
  const map: Record<string, string> = {};
  for (const item of data) if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
  return map;
}

export type ListingWithCover = PropertyListing & { cover: string | null; imageCount: number };

async function attachCovers(rows: PropertyListing[]): Promise<ListingWithCover[]> {
  if (rows.length === 0) return [];
  const { data: images } = await supabase
    .from("property_images")
    .select("listing_id, image_path, sort_order")
    .in("listing_id", rows.map((row) => row.id))
    .order("sort_order", { ascending: true });

  const byListing = new Map<string, string[]>();
  for (const image of images ?? []) {
    const list = byListing.get(image.listing_id) ?? [];
    list.push(image.image_path);
    byListing.set(image.listing_id, list);
  }
  const signed = await signPropertyPaths((images ?? []).map((image) => image.image_path));

  return rows.map((row) => {
    const paths = byListing.get(row.id) ?? [];
    return {
      ...row,
      cover: paths[0] ? (signed[paths[0]] ?? null) : null,
      imageCount: paths.length,
    };
  });
}

export function usePropertyListings(filters: PropertyFilters) {
  return useQuery({
    queryKey: ["property", "list", filters],
    queryFn: async (): Promise<ListingWithCover[]> => {
      await assertFreshSession();
      let query = supabase
        .from("property_listings")
        .select("*")
        .eq("status", "ACTIVE")
        .gt("expires_at", new Date().toISOString());

      if (filters.kind) query = query.eq("listing_kind", filters.kind);
      if (filters.category) query = query.eq("category", filters.category);
      if (filters.country) query = query.eq("country", filters.country);
      if (filters.city) query = query.ilike("city", filters.city);
      if (filters.university) query = query.ilike("university", `%${filters.university}%`);
      if (typeof filters.minPrice === "number") query = query.gte("price", filters.minPrice);
      if (typeof filters.maxPrice === "number") query = query.lte("price", filters.maxPrice);
      if (typeof filters.bedrooms === "number" && filters.bedrooms > 0)
        query = query.gte("bedrooms", filters.bedrooms);
      if (filters.furnished) query = query.eq("is_furnished", true);
      if (filters.verifiedOnly) query = query.neq("verification_status", "BASIC");
      if (filters.amenities && filters.amenities.length > 0) query = query.contains("amenities", filters.amenities);
      if (filters.term && filters.term.trim().length > 1) {
        const like = `%${filters.term.trim()}%`;
        query = query.or(
          `title.ilike.${like},description.ilike.${like},city.ilike.${like},neighborhood.ilike.${like},university.ilike.${like}`,
        );
      }

      if (filters.sort === "price_asc") query = query.order("price", { ascending: true });
      else if (filters.sort === "price_desc") query = query.order("price", { ascending: false });
      else query = query.order("created_at", { ascending: false });

      const { data, error } = await query.limit(60);
      if (error) throw error;
      return attachCovers((data ?? []) as unknown as PropertyListing[]);
    },
  });
}

export function useProperty(listingId: string) {
  return useQuery({
    queryKey: ["property", "detail", listingId],
    enabled: Boolean(listingId),
    queryFn: async () => {
      await assertFreshSession();
      const [{ data: listing, error }, { data: images }] = await Promise.all([
        supabase.from("property_listings").select("*").eq("id", listingId).maybeSingle(),
        supabase
          .from("property_images")
          .select("*")
          .eq("listing_id", listingId)
          .order("sort_order", { ascending: true }),
      ]);
      if (error) throw error;
      if (!listing) return null;
      const signed = await signPropertyPaths((images ?? []).map((image) => image.image_path));
      const owner = await supabase
        .from("profiles")
        .select("full_name, avatar_url, created_at")
        .eq("user_id", (listing as unknown as PropertyListing).owner_id)
        .maybeSingle();

      return {
        listing: listing as unknown as PropertyListing,
        images: ((images ?? []) as unknown as PropertyImage[]).map((image) => ({
          ...image,
          url: signed[image.image_path] ?? null,
        })),
        owner: owner.data ?? null,
      };
    },
  });
}

export function useSimilarProperties(listing: PropertyListing | null | undefined) {
  return useQuery({
    queryKey: ["property", "similar", listing?.id],
    enabled: Boolean(listing),
    queryFn: async (): Promise<ListingWithCover[]> => {
      if (!listing) return [];
      const { data } = await supabase
        .from("property_listings")
        .select("*")
        .eq("status", "ACTIVE")
        .eq("city", listing.city)
        .eq("listing_kind", listing.listing_kind)
        .neq("id", listing.id)
        .limit(4);
      return attachCovers((data ?? []) as unknown as PropertyListing[]);
    },
  });
}

export function useMyProperties() {
  return useQuery({
    queryKey: ["property", "mine"],
    queryFn: async (): Promise<ListingWithCover[]> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from("property_listings")
        .select("*")
        .eq("owner_id", auth.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return attachCovers((data ?? []) as unknown as PropertyListing[]);
    },
  });
}

export function useSavedProperties() {
  return useQuery({
    queryKey: ["property", "saved"],
    queryFn: async (): Promise<ListingWithCover[]> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data: saves } = await supabase
        .from("property_saves")
        .select("listing_id")
        .eq("user_id", auth.user.id);
      const ids = (saves ?? []).map((row) => row.listing_id);
      if (ids.length === 0) return [];
      const { data } = await supabase.from("property_listings").select("*").in("id", ids);
      return attachCovers((data ?? []) as unknown as PropertyListing[]);
    },
  });
}

export function useSavedIds() {
  return useQuery({
    queryKey: ["property", "saved-ids"],
    queryFn: async (): Promise<string[]> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data } = await supabase.from("property_saves").select("listing_id").eq("user_id", auth.user.id);
      return (data ?? []).map((row) => row.listing_id);
    },
  });
}

export type ViewingRequest = {
  id: string;
  listing_id: string;
  requester_id: string;
  owner_id: string;
  requested_at: string;
  message: string | null;
  status: string;
  response_note: string | null;
  proposed_at: string | null;
  created_at: string;
};

export function useViewingRequests(role: "owner" | "requester") {
  return useQuery({
    queryKey: ["property", "viewings", role],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const column = role === "owner" ? "owner_id" : "requester_id";
      const { data } = await supabase
        .from("property_viewing_requests")
        .select("*")
        .eq(column, auth.user.id)
        .order("requested_at", { ascending: false });
      const rows = (data ?? []) as unknown as ViewingRequest[];
      if (rows.length === 0) return [];
      const { data: listings } = await supabase
        .from("property_listings")
        .select("id, title, city, category")
        .in("id", rows.map((row) => row.listing_id));
      const byId = new Map((listings ?? []).map((row) => [row.id, row]));
      return rows.map((row) => ({ ...row, listing: byId.get(row.listing_id) ?? null }));
    },
  });
}

/**
 * Opens (or reuses) the ASH chat thread between the signed-in user and the
 * owner of a listing. Reuses the existing conversations/messages system, so
 * property chats land in the same inbox and notification stream.
 */
export async function openPropertyConversation(listingId: string): Promise<string> {
  const { data, error } = await supabase.rpc("open_property_conversation", { _listing_id: listingId });
  const payload = data as { ok?: boolean; id?: string; error?: string } | null;
  if (error || !payload?.ok || !payload.id) throw new Error(payload?.error ?? error?.message ?? "CHAT_FAILED");
  return payload.id;
}
