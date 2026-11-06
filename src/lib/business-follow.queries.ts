import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

/** Shape of the business_follows table (migration 20261106120000). */
type FollowDatabase = {
  public: {
    Tables: {
      business_follows: {
        Row: { follower_id: string; business_user_id: string; created_at: string };
        Insert: { follower_id: string; business_user_id: string };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// The table is newer than the generated types, so the client is typed locally.
const followDb = supabase as unknown as SupabaseClient<
  FollowDatabase & Pick<Database, "__InternalSupabase">
>;

/** Business user ids the signed-in member follows. */
export function useFollowedBusinessIds(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["followed-businesses", userId ?? null],
    enabled: Boolean(userId),
    staleTime: 60_000,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await followDb
        .from("business_follows")
        .select("business_user_id")
        .eq("follower_id", userId!);
      if (error) throw error;
      return data.map((row) => row.business_user_id);
    },
  });
}

export function useToggleBusinessFollow(userId: string | null | undefined) {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: async ({ targetId, follow }: { targetId: string; follow: boolean }) => {
      if (!userId) throw new Error("Sign in to follow businesses.");
      const request = follow
        ? followDb
            .from("business_follows")
            .insert({ follower_id: userId, business_user_id: targetId })
        : followDb
            .from("business_follows")
            .delete()
            .eq("follower_id", userId)
            .eq("business_user_id", targetId);
      const { error } = await request;
      if (error) throw error;
    },
    onSuccess: () => cache.invalidateQueries({ queryKey: ["followed-businesses", userId ?? null] }),
  });
}
