import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { directory } from "@/lib/public-profiles";

export type AppNotification = {
  id: string;
  category: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
  actor_id: string | null;
  actor: { id: string; name: string; avatar_url: string | null; verified_tier: string | null; verified_until: string | null; online: boolean } | null;
};

/** Backend-generated notifications for the signed-in user, kept live over realtime. */
export function useNotifications(limit = 30) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", limit],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [] as AppNotification[];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;

      const rows = (data ?? []) as unknown as AppNotification[];
      // Attach the person behind each notification so the screen can show their
      // photo and name (a like, comment, friend request or group invite).
      const actorIds = Array.from(
        new Set(rows.map((row) => row.actor_id).filter((id): id is string => Boolean(id))),
      );
      if (actorIds.length === 0) return rows.map((row) => ({ ...row, actor: null }));

      const since = new Date(Date.now() - 5 * 60_000).toISOString();
      const [{ data: profiles }, { data: presence }] = await Promise.all([
        directory().select("user_id, full_name, avatar_url, verified_tier, verified_until").in("user_id", actorIds),
        supabase.from("member_presence").select("user_id").in("user_id", actorIds).gte("last_active_at", since),
      ]);
      const onlineIds = new Set((presence ?? []).map((row) => row.user_id));
      const map = new Map(
        ((profiles ?? []) as { user_id: string; full_name: string | null; avatar_url: string | null; verified_tier: string | null; verified_until: string | null }[]).map(
          (row) => [row.user_id, row],
        ),
      );
      return rows.map((row) => {
        const profile = row.actor_id ? map.get(row.actor_id) : undefined;
        return {
          ...row,
          actor: profile
            ? { id: profile.user_id, name: profile.full_name ?? "Profile", avatar_url: profile.avatar_url, verified_tier: profile.verified_tier, verified_until: profile.verified_until, online: onlineIds.has(profile.user_id) }
            : null,
        };
      });
    },
  });

  useEffect(() => {
    // Unique topic per mount: the shell can render more than one consumer
    // (sidebar + mobile header), and reusing one topic makes supabase-js throw
    // "cannot add postgres_changes callbacks after subscribe()".
    const topic = `notifications-feed-${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(topic)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["notifications"] });
        void queryClient.invalidateQueries({ queryKey: ["wallet"] });
        void queryClient.invalidateQueries({ queryKey: ["profile"] });
        void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .in("id", ids)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useDeleteNotifications() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase.from("notifications").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
