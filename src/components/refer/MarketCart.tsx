import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Expand, Map, Package, ShoppingCart } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { formatXAF } from "@/lib/format";
import { useMyBookings } from "@/lib/marketplace.queries";
import { StatusBadge } from "./StatusBadge";
import { useActiveTrip } from "./ActiveTripOrb";
import { BookingTracking } from "./BookingTracking";

/** Market "Cart": the member's orders plus the live map, replacing the floating Compass. */
export function MarketCart() {
  const { tx } = useI18n();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"orders" | "map">("orders");
  const trip = useActiveTrip();
  const { data: orders, isLoading } = useMyBookings();

  return (
    <>
      <Button
        variant="secondary"
        className="relative h-10 gap-1.5 rounded-full px-3"
        onClick={() => setOpen(true)}
        aria-label={tx("Open cart", "Ouvrir le panier")}
      >
        <ShoppingCart className="size-5" aria-hidden />
        <span className="text-xs font-bold">{tx("Cart", "Panier")}</span>
        {trip ? (
          <span className="absolute right-0.5 top-0.5 size-2.5 rounded-full border-2 border-card bg-success" />
        ) : null}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[85dvh] max-w-md flex-col gap-0 overflow-hidden p-0">
          <header className="flex shrink-0 items-center border-b border-border px-4 py-4 pr-12">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <ShoppingCart className="size-5 text-success" />
              {tx("Cart", "Panier")}
            </DialogTitle>
          </header>
          <div role="tablist" className="flex shrink-0 gap-2 border-b border-border p-3">
            <Button
              role="tab"
              aria-selected={tab === "orders"}
              variant={tab === "orders" ? "secondary" : "ghost"}
              className="flex-1"
              onClick={() => setTab("orders")}
            >
              <Package className="size-4" />
              {tx("Orders", "Commandes")}
            </Button>
            <Button
              role="tab"
              aria-selected={tab === "map"}
              variant={tab === "map" ? "secondary" : "ghost"}
              className="flex-1"
              onClick={() => setTab("map")}
            >
              <Map className="size-4 text-success" />
              {tx("Map", "Carte")}
            </Button>
          </div>
          <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto">
            {tab === "orders" ? (
              <div className="space-y-2 p-3">
                {isLoading ? (
                  <p className="p-4 text-sm text-muted-foreground">{tx("Loading…", "Chargement…")}</p>
                ) : !orders?.length ? (
                  <p className="p-4 text-sm text-muted-foreground">
                    {tx("No orders yet.", "Aucune commande pour le moment.")}
                  </p>
                ) : (
                  orders.slice(0, 15).map((o) => (
                    <Link
                      key={o.id}
                      to="/bookings"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-xl border border-border p-3 hover:bg-muted"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-foreground">
                          {o.service_title}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {o.provider?.business_name} · {formatXAF(o.price)}
                        </span>
                      </span>
                      <StatusBadge status={o.status} />
                    </Link>
                  ))
                )}
                <Button asChild variant="outline" className="w-full">
                  <Link to="/bookings" onClick={() => setOpen(false)}>
                    {tx("All bookings", "Toutes les réservations")}
                  </Link>
                </Button>
              </div>
            ) : trip ? (
              <>
                <div className="px-3 pt-3">
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/booking/$bookingId/track" params={{ bookingId: trip.id }}>
                      <Expand className="size-4" />
                      {tx("Open booking tracking", "Ouvrir le suivi de réservation")}
                    </Link>
                  </Button>
                </div>
                <BookingTracking bookingId={trip.id} embedded />
              </>
            ) : (
              <div className="space-y-3 p-5">
                <Map className="size-8 text-success" />
                <p className="text-sm font-medium">
                  {tx("No active booking", "Aucune réservation en cours")}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
