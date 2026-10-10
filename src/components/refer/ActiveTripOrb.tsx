import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { syncBookingPayment } from "@/lib/booking.functions";

const LIVE = ["PAYMENT_PROCESSING", "CONFIRMED", "IN_PROGRESS"] as const;

/** Shared current-booking read and payment recovery, without a second launcher. */
export function useActiveTrip() {
  const qc = useQueryClient();
  const sync = useServerFn(syncBookingPayment);

  const { data: trip } = useQuery({
    queryKey: ["bookings", "active-trip"],
    refetchInterval: 20000,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return null;
      const { data: provs } = await supabase.from("provider_profiles").select("id").eq("user_id", uid);
      const ids = (provs ?? []).map((p) => p.id);
      const filter = ids.length ? `client_id.eq.${uid},provider_id.in.(${ids.join(",")})` : `client_id.eq.${uid}`;
      const { data } = await supabase.from("bookings").select("id, status, client_id, created_at")
        .or(filter).in("status", LIVE).order("created_at", { ascending: false }).limit(1);
      const b = data?.[0];
      return b ? { id: b.id as string, status: b.status as string, mine: b.client_id === uid } : null;
    },
  });

  // A customer's card payment still waiting: ask the server to check Stripe's record of it.
  useEffect(() => {
    if (!trip || !trip.mine || trip.status !== "PAYMENT_PROCESSING") return;
    sync({ data: { bookingId: trip.id } })
      .then(() => void qc.invalidateQueries({ queryKey: ["bookings"] }))
      .catch(() => { /* retried on next refresh */ });
  }, [trip?.id, trip?.status, trip?.mine, sync, qc]);

  return trip;
}
