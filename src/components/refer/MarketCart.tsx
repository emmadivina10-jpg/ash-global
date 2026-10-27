import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link, useNavigate } from "@tanstack/react-router";
import { Expand, Map, Minus, Package, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { cart, cartTotals, setCartUser, useCart, type CartItem } from "@/lib/cart";
import { useUser } from "@/lib/queries";
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
  const [tab, setTab] = useState<"cart" | "orders" | "map">("cart");
  const [checkout, setCheckout] = useState(false);
  const { user } = useUser();
  useEffect(() => setCartUser(user?.id), [user?.id]);
  const items = useCart();
  const totals = cartTotals(items);
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
        {totals.count > 0 ? (
          <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {totals.count}
          </span>
        ) : trip ? (
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
              aria-selected={tab === "cart"}
              variant={tab === "cart" ? "secondary" : "ghost"}
              className="flex-1"
              onClick={() => setTab("cart")}
            >
              <ShoppingCart className="size-4" />
              {tx("Items", "Articles")} {totals.count ? `(${totals.count})` : ""}
            </Button>
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
            {tab === "cart" ? (
              <CartPanel
                items={items}
                checkout={checkout}
                setCheckout={setCheckout}
                close={() => setOpen(false)}
              />
            ) : tab === "orders" ? (
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

function CartPanel({
  items,
  checkout,
  setCheckout,
  close,
}: {
  items: CartItem[];
  checkout: boolean;
  setCheckout: (v: boolean) => void;
  close: () => void;
}) {
  const { tx } = useI18n();
  const t = cartTotals(items);
  if (!items.length)
    return (
      <div className="space-y-2 p-6 text-center">
        <ShoppingCart className="mx-auto size-9 text-muted-foreground" />
        <p className="text-sm font-semibold">{tx("Your cart is empty", "Votre panier est vide")}</p>
        <p className="text-xs text-muted-foreground">
          {tx(
            "Tap the cart button on any item in the Market to save it here.",
            "Touchez le bouton panier sur un article du Market pour l’enregistrer ici.",
          )}
        </p>
      </div>
    );
  return (
    <div className="space-y-3 p-3">
      {checkout ? (
        <h3 className="px-1 text-sm font-bold">{tx("Order summary", "Récapitulatif")}</h3>
      ) : null}
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.serviceId} className="flex items-center gap-3 rounded-xl border border-border p-2.5">
            {i.image ? (
              <img src={i.image} alt="" className="size-14 shrink-0 object-cover" />
            ) : (
              <span className="grid size-14 shrink-0 place-items-center bg-muted">
                <Package className="size-5 text-muted-foreground" />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold">{i.title}</span>
              <span className="block truncate text-xs text-muted-foreground">{i.providerName}</span>
              <span className="tabular block text-xs font-semibold">
                {formatXAF(i.price)} × {i.qty}
              </span>
            </span>
            {checkout ? null : (
              <span className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="size-8" aria-label={tx("Less", "Moins")} onClick={() => void cart.setQty(i.serviceId, i.qty - 1)}>
                  <Minus className="size-4" />
                </Button>
                <Button size="icon" variant="ghost" className="size-8" aria-label={tx("More", "Plus")} onClick={() => void cart.setQty(i.serviceId, i.qty + 1)}>
                  <Plus className="size-4" />
                </Button>
                <Button size="icon" variant="ghost" className="size-8" aria-label={tx("Remove", "Retirer")} onClick={() => void cart.remove(i.serviceId)}>
                  <Trash2 className="size-4" />
                </Button>
              </span>
            )}
          </li>
        ))}
      </ul>
      <dl className="space-y-1.5 rounded-xl bg-muted p-3 text-sm">
        <div className="flex justify-between">
          <dt>{tx("Subtotal", "Sous-total")}</dt>
          <dd className="tabular">{formatXAF(t.subtotal)}</dd>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <dt>{tx("ASH platform fee", "Frais de plateforme ASH")}</dt>
          <dd className="tabular">{t.fee ? formatXAF(t.fee) : tx("Included", "Inclus")}</dd>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <dt>{tx("Tax", "Taxes")}</dt>
          <dd className="tabular">{formatXAF(t.tax)}</dd>
        </div>
        <div className="flex justify-between border-t border-border pt-1.5 text-base font-bold">
          <dt>{tx("Total", "Total")}</dt>
          <dd className="tabular">{formatXAF(t.total)}</dd>
        </div>
      </dl>
      {checkout ? (
        <CheckoutForm items={items} onBack={() => setCheckout(false)} close={close} />
      ) : (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void cart.clear()}>
            {tx("Clear cart", "Vider")}
          </Button>
          <Button className="flex-1" onClick={() => setCheckout(true)}>
            {tx("Checkout", "Commander")} · {formatXAF(t.total)}
          </Button>
        </div>
      )}
    </div>
  );
}

function CheckoutForm({
  items,
  onBack,
  close,
}: {
  items: CartItem[];
  onBack: () => void;
  close: () => void;
}) {
  const { tx } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [when, setWhen] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);

  async function submit() {
    if (sending.current) return;
    const at = new Date(when);
    if (!when || Number.isNaN(at.getTime()) || at.getTime() < Date.now()) {
      toast.error(tx("Choose a future date and time.", "Choisissez une date et une heure à venir."));
      return;
    }
    sending.current = true;
    setBusy(true);
    const done: string[] = [];
    let failed = 0;
    for (const i of items) {
      const { data, error } = await supabase.rpc("request_booking", {
        _provider_id: i.providerId,
        _service_id: i.serviceId,
        _scheduled_at: at.toISOString(),
        _notes: [i.qty > 1 ? `Qty: ${i.qty}` : "", notes.trim()].filter(Boolean).join(" — "),
        _address: address.trim(),
      } as never);
      const ok = !error && (data as { success?: boolean } | null)?.success !== false && data !== false;
      if (ok) done.push(i.serviceId);
      else failed++;
    }
    if (done.length) await cart.removeMany(done).catch(() => undefined);
    void queryClient.invalidateQueries({ queryKey: ["bookings"] });
    sending.current = false;
    setBusy(false);
    if (failed) {
      toast.error(
        tx(
          `${done.length} sent, ${failed} could not be sent and stay in your cart.`,
          `${done.length} envoyé(s), ${failed} non envoyé(s), restés dans votre panier.`,
        ),
      );
      return;
    }
    toast.success(
      tx(
        "All requests sent. Pay each one once the seller accepts.",
        "Toutes les demandes sont envoyées. Payez chacune après l’acceptation du vendeur.",
      ),
    );
    close();
    void navigate({ to: "/bookings" });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="cart-when">{tx("Date and time", "Date et heure")}</Label>
        <Input id="cart-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cart-addr">{tx("Address", "Adresse")}</Label>
        <Input id="cart-addr" value={address} maxLength={300} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cart-notes">{tx("Notes for sellers", "Notes pour les vendeurs")}</Label>
        <Textarea id="cart-notes" value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <p className="text-xs text-muted-foreground">
        {tx(
          "Each seller confirms first. You pay each accepted order in Bookings — nothing is charged now.",
          "Chaque vendeur confirme d’abord. Vous payez chaque commande acceptée dans Réservations — rien n’est débité maintenant.",
        )}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} disabled={busy}>
          {tx("Back", "Retour")}
        </Button>
        <Button className="flex-1" onClick={() => void submit()} disabled={busy}>
          {busy ? tx("Sending…", "Envoi…") : tx("Send all orders", "Envoyer toutes les commandes")}
        </Button>
      </div>
    </div>
  );
}
