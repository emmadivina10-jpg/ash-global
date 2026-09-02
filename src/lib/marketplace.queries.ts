import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { signPortfolioPaths, type ServiceCategory } from "./marketplace";

export type ProviderProfile = {
  id: string;
  user_id: string;
  business_name: string;
  bio: string | null;
  city: string | null;
  phone: string | null;
  whatsapp: string | null;
  categories: ServiceCategory[];
  avatar_url: string | null;
  cover_url: string | null;
  is_live: boolean;
  billing_mode: "SUBSCRIPTION" | "COMMISSION";
  subscription_expires_at: string | null;
  rating_avg: number;
  rating_count: number;
  slug: string | null;
  country: string;
  created_at: string;
};

export function useMyProviderProfile() {
  return useQuery({
    queryKey: ["provider", "mine"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("provider_profiles")
        .select("*")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as ProviderProfile | null) ?? null;
    },
  });
}

export function useProviders() {
  return useQuery({
    queryKey: ["providers", "live"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_profiles")
        .select("*")
        .eq("is_live", true)
        .order("rating_avg", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProviderProfile[];
    },
  });
}

export function useProvider(providerId: string | undefined) {
  return useQuery({
    enabled: Boolean(providerId),
    queryKey: ["provider", providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_profiles")
        .select("*")
        .eq("id", providerId!)
        .maybeSingle();
      if (error) throw error;
      return (data as ProviderProfile | null) ?? null;
    },
  });
}

export function useProviderServices(providerId: string | undefined, onlyActive = true) {
  return useQuery({
    enabled: Boolean(providerId),
    queryKey: ["provider-services", providerId, onlyActive],
    queryFn: async () => {
      let query = supabase.from("provider_services").select("*").eq("provider_id", providerId!);
      if (onlyActive) query = query.eq("is_active", true);
      const { data, error } = await query.order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePortfolio(providerId: string | undefined) {
  return useQuery({
    enabled: Boolean(providerId),
    queryKey: ["portfolio", providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_items")
        .select("*")
        .eq("provider_id", providerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const items = data ?? [];
      const urls = await signPortfolioPaths(items.map((i) => i.image_path));
      return items.map((i) => ({ ...i, url: urls[i.image_path] ?? null }));
    },
  });
}

export function useMyBookings() {
  return useQuery({
    queryKey: ["bookings", "mine"],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "*, provider:provider_profiles(id, business_name, city, phone, whatsapp, avatar_url, is_verified)",
        )
        .eq("client_id", auth.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export type ProviderBookingRow = {
  id: string;
  client_id: string;
  provider_id: string;
  service_id: string | null;
  service_title: string;
  price: number;
  scheduled_at: string;
  notes: string | null;
  address: string | null;
  status: string;
  decline_reason: string | null;
  respond_by: string | null;
  pay_by: string | null;
  accepted_at: string | null;
  paid_at: string | null;
  completed_at: string | null;
  invoice_number: string | null;
  platform_fee: number | null;
  provider_amount: number | null;
  created_at: string;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
};

/** Bookings received by the signed-in provider, with the customer details they are allowed to see. */
export function useProviderBookings(providerId: string | undefined) {
  return useQuery({
    enabled: Boolean(providerId),
    queryKey: ["bookings", "provider", providerId],
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_provider_bookings");
      if (error) throw error;
      return (data ?? []) as ProviderBookingRow[];
    },
  });
}

/** Review rows written by the signed-in client, keyed by booking id. */
export function useMyReviews() {
  return useQuery({
    queryKey: ["reviews", "mine"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return {} as Record<string, { rating: number }>;
      const { data, error } = await supabase
        .from("reviews")
        .select("booking_id, rating")
        .eq("client_id", auth.user.id)
        .not("booking_id", "is", null);
      if (error) throw error;
      const map: Record<string, { rating: number }> = {};
      for (const row of data ?? []) if (row.booking_id) map[row.booking_id] = { rating: row.rating };
      return map;
    },
  });
}

/** Public reviews for one provider, newest first, with the author's name. */
export function useProviderReviews(providerId: string | undefined) {
  return useQuery({
    enabled: Boolean(providerId),
    queryKey: ["reviews", "provider", providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, comment, kind, created_at, client_id, booking_id")
        .eq("provider_id", providerId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const rows = data ?? [];
      const ids = [...new Set(rows.map((r) => r.client_id))];
      const names: Record<string, { name: string; avatar: string | null }> = {};
      if (ids.length > 0) {
        const { data: people } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", ids);
        for (const p of people ?? []) {
          names[p.user_id] = { name: p.full_name || "ASH member", avatar: p.avatar_url };
        }
      }
      return rows.map((r) => ({
        ...r,
        author: names[r.client_id]?.name ?? "ASH member",
        authorAvatar: names[r.client_id]?.avatar ?? null,
      }));
    },
  });
}

/** True when the signed-in user already left a community review for a provider. */
export function useMyCommunityReview(providerId: string | undefined) {
  return useQuery({
    enabled: Boolean(providerId),
    queryKey: ["reviews", "community", "mine", providerId],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("reviews")
        .select("id, rating, comment")
        .eq("provider_id", providerId!)
        .eq("client_id", auth.user.id)
        .eq("kind", "COMMUNITY")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useConversations() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["conversations"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select(
          "*, provider:provider_profiles(id, business_name, user_id, avatar_url, phone), booking:bookings(id, service_title, scheduled_at, status, address, price, invoice_number), listing:property_listings(id, title, city, price, currency, price_period)",
        )
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      const rows = data ?? [];

      // conversations.client_id points at auth.users, so the client profile is
      // fetched separately (PostgREST cannot embed across schemas).
      const clientIds = [...new Set(rows.map((r) => r.client_id))];
      const clients: Record<string, { full_name: string; avatar_url: string | null }> = {};
      if (clientIds.length > 0) {
        const { data: people } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", clientIds);
        for (const p of people ?? []) {
          clients[p.user_id] = { full_name: p.full_name || "ASH client", avatar_url: p.avatar_url };
        }
      }
      return rows.map((row) => ({
        ...row,
        client: clients[row.client_id] ?? { full_name: "ASH client", avatar_url: null },
      }));
    },
  });

  // Keep the inbox live even when no thread is open.
  useEffect(() => {
    const channel = supabase
      .channel("inbox:messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        void queryClient.invalidateQueries({ queryKey: ["conversations"] });
        const convId = (payload.new as { conversation_id?: string } | null)?.conversation_id;
        if (convId) void queryClient.invalidateQueries({ queryKey: ["messages", convId] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useMessages(conversationId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    enabled: Boolean(conversationId),
    queryKey: ["messages", conversationId],
    // Fallback poll so a dropped realtime socket never strands a conversation.
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
          void queryClient.invalidateQueries({ queryKey: ["conversations"] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  return query;
}

/**
 * Finds (or creates) the single conversation between the signed-in client and a
 * provider. There is one thread per pair; a booking id simply tags the thread
 * with the most recent order so the header can show it.
 */
export async function openConversation(providerId: string, bookingId?: string): Promise<string | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: existing } = await supabase
    .from("conversations")
    .select("id, booking_id")
    .eq("provider_id", providerId)
    .eq("client_id", auth.user.id)
    .order("last_message_at", { ascending: false })
    .limit(1);

  const found = existing?.[0];
  if (found) {
    if (bookingId && found.booking_id !== bookingId) {
      await supabase.from("conversations").update({ booking_id: bookingId }).eq("id", found.id);
    }
    return found.id;
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert({ provider_id: providerId, client_id: auth.user.id, booking_id: bookingId ?? null })
    .select("id")
    .single();

  if (error) {
    // Another tab may have created it a moment ago — reuse that row.
    const { data: raced } = await supabase
      .from("conversations")
      .select("id")
      .eq("provider_id", providerId)
      .eq("client_id", auth.user.id)
      .limit(1);
    if (raced?.[0]?.id) return raced[0].id;
    console.error("openConversation failed", error);
    return null;
  }
  return data.id;
}

/** Latest portfolio thumbnails for a set of providers, keyed by provider id. */
export function useProvidersPortfolio(providerIds: string[], perProvider = 3) {
  const key = [...providerIds].sort().join(",");
  return useQuery({
    enabled: providerIds.length > 0,
    queryKey: ["portfolio", "covers", key, perProvider],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_items")
        .select("id, provider_id, image_path, caption, created_at")
        .in("provider_id", providerIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = data ?? [];
      const byProvider: Record<string, typeof rows> = {};
      for (const row of rows) {
        const list = (byProvider[row.provider_id] ??= []);
        if (list.length < perProvider) list.push(row);
      }
      const picked = Object.values(byProvider).flat();
      const urls = await signPortfolioPaths(picked.map((i) => i.image_path));
      const result: Record<string, { id: string; url: string; caption: string | null }[]> = {};
      for (const [pid, list] of Object.entries(byProvider)) {
        result[pid] = list
          .map((i) => ({ id: i.id, url: urls[i.image_path] ?? "", caption: i.caption }))
          .filter((i) => i.url);
      }
      return result;
    },
  });
}
