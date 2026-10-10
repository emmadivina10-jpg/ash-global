import { Link, useRouterState } from "@tanstack/react-router";
import { Map, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { CompassSurface } from "./CompassSurface";
import { useActiveTrip } from "./ActiveTripOrb";

export function AshOrb() {
  const onTrack = useRouterState({
    select: (s) => /^\/booking\/[^/]+\/track\/?$/.test(s.location.pathname),
  });
  const trip = useActiveTrip();
  const { lang } = useI18n();
  const fr = lang === "fr";
  if (onTrack) return null;
  return (
    <CompassSurface
      active={Boolean(trip)}
      map={
        <div className="space-y-4 p-5">
          <Map className="size-8 text-success" />
          <p className="text-sm font-medium">
            {trip
              ? trip.status === "PAYMENT_PROCESSING"
                ? fr
                  ? "Vérification du paiement"
                  : "Verifying payment"
                : fr
                  ? "Réservation en cours"
                  : "Active booking"
              : fr
                ? "Aucune réservation en cours"
                : "No active booking"}
          </p>
          {trip ? (
            <Button asChild className="w-full">
              <Link to="/booking/$bookingId/track" params={{ bookingId: trip.id }}>
                {fr ? "Ouvrir le suivi" : "Open tracking"}
                <ArrowUpRight className="size-4" />
              </Link>
            </Button>
          ) : (
            <Button asChild variant="secondary" className="w-full">
              <Link to="/bookings">{fr ? "Réservations" : "Bookings"}</Link>
            </Button>
          )}
        </div>
      }
    />
  );
}
