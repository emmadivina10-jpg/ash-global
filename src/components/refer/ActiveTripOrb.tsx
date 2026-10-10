import { useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Map } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { syncBookingPayment } from "@/lib/booking.functions";
import { useI18n } from "@/lib/i18n";

const LIVE = ["PAYMENT_PROCESSING", "CONFIRMED", "IN_PROGRESS"];

/** Always-visible Map button for the viewer's current booking (customer or provider). */
export function ActiveTripOrb() {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const qc = useQueryClient();
  const onTrack = useRouterState({ select: (s) => /^\/booking\/[^/]+\/track\/?$/.test(s.location.pathname) });
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

  if (!trip || onTrack) return null;
  const paid = trip.status !== "PAYMENT_PROCESSING";
  return (
    <Link
      to="/booking/$bookingId/track"
      params={{ bookingId: trip.id }}
      aria-label={fr ? "Ouvrir le suivi" : "Open tracking map"}
      className="wallet-orb fixed bottom-44 right-4 z-40 flex size-16 flex-col items-center justify-center gap-0.5 rounded-full text-foreground lg:bottom-28 lg:right-8"
    >
      <Map className="size-6" />
      <span className="text-[10px] font-bold">{paid ? (fr ? "Carte" : "Map") : "…"}</span>
      {paid ? <span className="absolute right-1 top-1 size-3 animate-pulse rounded-full bg-primary" /> : null}
    </Link>
  );
}
