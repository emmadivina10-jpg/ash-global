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
  subscription_expires_at: string | null;
  rating_avg: number;
  rating_count: number;
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

export function useProviderReviews(providerId: string | undefined) {
  return useQuery({
    enabled: Boolean(providerId),
    queryKey: ["reviews", providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("provider_id", providerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMyBookings() {
  return useQuery({
    queryKey: ["bookings", "mine"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select("*, provider:provider_profiles(id, business_name, city)")
        .eq("client_id", auth.user.id)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useProviderBookings(providerId: string | undefined) {
  return useQuery({
    enabled: Boolean(providerId),
    queryKey: ["bookings", "provider", providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("provider_id", providerId!)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*, provider:provider_profiles(id, business_name, user_id)")
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMessages(conversationId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    enabled: Boolean(conversationId),
    queryKey: ["messages", conversationId],
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

/** Finds (or creates) the conversation between the signed-in client and a provider. */
export async function openConversation(providerId: string): Promise<string | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("provider_id", providerId)
    .eq("client_id", auth.user.id)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from("conversations")
    .insert({ provider_id: providerId, client_id: auth.user.id })
    .select("id")
    .single();
  if (error) return null;
  return data.id;
}
