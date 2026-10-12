import { Link, useRouterState } from "@tanstack/react-router";
import { Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { CompassSurface } from "./CompassSurface";
import { useActiveTrip } from "./ActiveTripOrb";
import { BookingTracking } from "./BookingTracking";

export function AshOrb() {
  const onTrack = useRouterState({
    select: (s) => /^\/booking\/[^/]+\/track\/?$/.test(s.location.pathname),
  });
  const trip = useActiveTrip();
  const { tx } = useI18n();
  if (onTrack) return null;
  return (
    <CompassSurface
      active={Boolean(trip)}
      map={trip ? <BookingTracking bookingId={trip.id} embedded /> : (
        <div className="space-y-4 p-5">
          <Map className="size-8 text-success" />
          <p className="text-sm font-medium">{tx("No active booking", "Aucune réservation en cours")}</p>
          <Button asChild variant="secondary" className="w-full">
            <Link to="/bookings">{tx("Bookings", "Réservations")}</Link>
          </Button>
        </div>
      )}
    />
  );
}
