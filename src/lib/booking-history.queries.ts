import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "./queries";
import type { HistoryState } from "./booking-history";

export function useBookingHistory() {
  const { user } = useUser();
  const qc = useQueryClient();
  const key = ["bookings", "history", user?.id];
  const query = useQuery({ queryKey: key, enabled: !!user, queryFn: async () => {
    if (!user) return {} as Record<string, HistoryState>;
    const { data, error } = await supabase.from("booking_history_preferences").select("booking_id,state").eq("user_id", user.id);
    if (error) throw error;
    return Object.fromEntries((data ?? []).map(row => [row.booking_id, row.state as HistoryState]));
  }});
  async function change(bookingId: string, state: HistoryState | null) {
    if (!user) throw new Error("Sign in required");
    const result = state
      ? await supabase.from("booking_history_preferences").upsert({ user_id: user.id, booking_id: bookingId, state, updated_at: new Date().toISOString() })
      : await supabase.from("booking_history_preferences").delete().eq("user_id", user.id).eq("booking_id", bookingId);
    if (result.error) throw result.error;
    await qc.invalidateQueries({ queryKey: key });
  }
  return { ...query, change };
}