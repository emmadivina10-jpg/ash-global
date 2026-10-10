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
  const { tx, lang } = useI18n();
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
                ? tx("Verifying payment", "Vérification du paiement")
                : tx("Active booking", "Réservation en cours")
              : tx("No active booking", "Aucune réservation en cours")}
          </p>
          {trip ? (
            <Button asChild className="w-full">
              <Link to="/booking/$bookingId/track" params={{ bookingId: trip.id }}>
                {tx("Open tracking", "Ouvrir le suivi")}
                <ArrowUpRight className="size-4" />
              </Link>
            </Button>
          ) : (
            <Button asChild variant="secondary" className="w-full">
              <Link to="/bookings">{tx("Bookings", "Réservations")}</Link>
            </Button>
          )}
        </div>
      }
    />
  );
}
