import { useEffect, useId } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

// Local display contract only: the connected database has not enabled Live Connect.
export type LiveConnectVendor = {
  provider_id: string;
  business_name: string;
  slug: string | null;
  city: string | null;
  avatar_url: string | null;
  bio: string | null;
  categories: Database["public"]["Enums"]["service_category"][];
  is_verified: boolean;
  rating_avg: number | null;
  rating_count: number;
  accepting_bookings: boolean;
  is_online: boolean;
  last_active_at: string | null;
  services: Json;
};

export type LiveConnectPreferences = {
  show_online: boolean;
  vendor_discovery_enabled: boolean;
};

const DEFAULT_PREFERENCES: LiveConnectPreferences = {
  show_online: true,
  vendor_discovery_enabled: false,
};

export function getPresenceSessionId(): string {
  if (typeof window === "undefined") return "00000000-0000-4000-8000-000000000000";
  const key = "ash.presence-session.v1";
  try {
    const stored = window.sessionStorage.getItem(key);
    if (stored) return stored;
    const sessionId =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
            const random = Math.floor(Math.random() * 16);
            return (char === "x" ? random : (random & 0x3) | 0x8).toString(16);
          });
    window.sessionStorage.setItem(key, sessionId);
    return sessionId;
  } catch {
    return "00000000-0000-4000-8000-000000000001";
  }
}

export function useLiveConnectVendors(country: string | null = null, limit = 100) {
  const queryClient = useQueryClient();
  const instanceId = useId().replace(/[^a-zA-Z0-9-]/g, "");
  const queryKey = ["live-connect", "vendors", country, limit] as const;
  const query = useQuery({
    queryKey,
    staleTime: 15_000,
    refetchInterval: 25_000,
    queryFn: async (): Promise<LiveConnectVendor[]> => [],
  });

  useEffect(() => {
    const channel = supabase
      .channel(`live-connect-presence:${country ?? "all"}:${limit}:${instanceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "member_presence" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["live-connect", "vendors"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [country, instanceId, limit, queryClient]);

  return query;
}

export function useOnlineFriendIds(friendIds: string[]) {
  const ids = [...new Set(friendIds)].sort();
  const instanceId = useId().replace(/[^a-zA-Z0-9-]/g, "");
  const queryClient = useQueryClient();
  const queryKey = ["live-connect", "friends", ids] as const;
  useEffect(() => {
    if (!ids.length) return;
    const channel = supabase
      .channel(`live-connect-friends:${instanceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "member_presence" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["live-connect", "friends"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [ids.length, instanceId, queryClient]);
  return useQuery({
    queryKey,
    enabled: ids.length > 0,
    staleTime: 10_000,
    refetchInterval: 20_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 2 * 60_000).toISOString();
      const { data, error } = await supabase
        .from("member_presence")
        .select("user_id")
        .in("user_id", ids)
        .gte("last_active_at", since);
      if (error) throw error;
      return new Set((data ?? []).map((row) => row.user_id));
    },
  });
}

export function useLiveConnectPreferences(userId: string | undefined) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["live-connect", "preferences", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<LiveConnectPreferences> => {
      return DEFAULT_PREFERENCES;
    },
  });
  const update = useMutation({
    mutationFn: async (_preferences: LiveConnectPreferences) => {
      throw new Error("Live Connect preferences are not available yet.");
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["live-connect", "preferences", userId] }),
        queryClient.invalidateQueries({ queryKey: ["live-connect", "vendors"] }),
      ]);
    },
  });
  return { ...query, update };
}
