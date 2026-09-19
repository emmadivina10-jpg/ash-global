import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCachedCity } from "./location";

/**
 * Reusable recommendation layer (Phase 1.2).
 *
 * `recommend_content` returns ranked candidates together with every score
 * component (personal relevance, closeness, engagement, freshness, location,
 * quality, already-seen penalty, diversity penalty) plus a `cold_start` flag.
 * Phase 2 surfaces can consume these candidates directly; nothing here
 * replaces the existing Feed, Stories, Spotlight or Services ordering yet.
 */

export type RecommendationCandidate = {
  content_id: string;
  author_id: string | null;
  category: string | null;
  city: string | null;
  personal_score: number;
  closeness_score: number;
  engagement_score: number;
  freshness_score: number;
  location_score: number;
  quality_score: number;
  seen_penalty: number;
  diversity_penalty: number;
  total_score: number;
  cold_start: boolean;
};

export type RecommendableContent = "post" | "spotlight" | "provider";

/** Ranked candidates for a surface. Cached — never recomputed per render. */
export function useRecommendations(
  contentType: RecommendableContent,
  options: { limit?: number; offset?: number; category?: string | null; enabled?: boolean } = {},
) {
  const { limit = 30, offset = 0, category = null, enabled = true } = options;
  const city = getCachedCity();

  return useQuery({
    queryKey: ["recommendations", contentType, limit, offset, category, city],
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    queryFn: async (): Promise<RecommendationCandidate[]> => {
      const { data, error } = await supabase.rpc("recommend_content", {
        _content_type: contentType,
        _limit: limit,
        _offset: offset,
        _city: city,
        _category: category,
      });
      if (error) throw error;
      return (data ?? []) as RecommendationCandidate[];
    },
  });
}

export type InterestSignal = {
  signal_type: string;
  signal_key: string;
  score: number;
  event_count: number;
  last_event_at: string | null;
};

/** The member's own interest signals. Nobody can read anyone else's. */
export function useMyInterests(signalType?: string) {
  return useQuery({
    queryKey: ["my-interests", signalType ?? "all"],
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<InterestSignal[]> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      let query = supabase
        .from("user_interest_signals")
        .select("signal_type, signal_key, score, event_count, last_event_at")
        .eq("user_id", auth.user.id)
        .order("score", { ascending: false })
        .limit(50);
      if (signalType) query = query.eq("signal_type", signalType);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as InterestSignal[];
    },
  });
}

export type RecommendationPrefs = {
  personalization_enabled: boolean;
  use_location: boolean;
  use_activity_history: boolean;
  history_cleared_at: string | null;
};

const DEFAULT_PREFS: RecommendationPrefs = {
  personalization_enabled: true,
  use_location: false,
  use_activity_history: true,
  history_cleared_at: null,
};

/** The member's personalization switches (defaults apply until they change one). */
export function useRecommendationPrefs() {
  return useQuery({
    queryKey: ["recommendation-prefs"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<RecommendationPrefs> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return DEFAULT_PREFS;
      const { data, error } = await supabase
        .from("recommendation_prefs")
        .select("personalization_enabled, use_location, use_activity_history, history_cleared_at")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      return (data as RecommendationPrefs | null) ?? DEFAULT_PREFS;
    },
  });
}

export function useUpdateRecommendationPrefs() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<RecommendationPrefs>) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("recommendation_prefs")
        .upsert({ user_id: auth.user.id, ...patch }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["recommendation-prefs"] });
      void client.invalidateQueries({ queryKey: ["recommendations"] });
    },
  });
}

/** Deletes the member's own activity history and derived interests. */
export function useClearActivityHistory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("clear_my_activity_history");
      if (error) throw error;
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["my-interests"] });
      void client.invalidateQueries({ queryKey: ["recommendations"] });
      void client.invalidateQueries({ queryKey: ["recommendation-prefs"] });
    },
  });
}
