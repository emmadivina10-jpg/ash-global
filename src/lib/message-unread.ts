import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export async function fetchUnreadMessageCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .neq("sender_id", userId)
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

/** RLS-scoped count only; navigation never downloads inbox bodies or photos. */
export function useUnreadMessageCount(userId: string | undefined) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["unread-messages", userId],
    enabled: Boolean(userId),
    queryFn: () => (userId ? fetchUnreadMessageCount(userId) : Promise.resolve(0)),
    refetchInterval: 30_000,
  });
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`nav-unread-${userId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["unread-messages", userId] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
  return query;
}
