import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, ReceiptText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { declineCleanQuote, payCleanOrder, syncCleanPayment } from "@/lib/clean.functions";
import { CLEAN_TIMELINE, cleanStatusLabel, cleanStepIndex, fcfa, methodLabel } from "@/lib/clean";
import { useI18n } from "@/lib/i18n";
import { CleanMap } from "@/components/clean/CleanMap";
import { MomoCharge } from "@/components/refer/MomoCharge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/clean/orders/$orderId")({
  head: () => ({
    meta: [
      { title: "Laundry order tracking — ASH Clean" },
      { name: "description", content: "Follow your ASH Clean order from pickup to delivery." },
      { property: "og:title", content: "Laundry order tracking — ASH Clean" },
      { property: "og:description", content: "Live pickup tracking, weighed price approval and receipt." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CleanOrder,
});

function CleanOrder() {
  const { orderId } = Route.useParams();
  const { lang } = useI18n();
  const fr = lang === "fr";
  const qc = useQueryClient();
  const pay = useServerFn(payCleanOrder);
  const sync = useServerFn(syncCleanPayment);
  const decline = useServerFn(declineCleanQuote);
  const [busy, setBusy] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ["clean", "order", orderId],
    queryFn: async () => {
      const [o, ev, q, jobs, loc] = await Promise.all([
        supabase.from("clean_orders").select("*").eq("id", orderId).maybeSingle(),
        supabase.from("clean_status_events").select("*").eq("order_id", orderId).order("created_at"),
        supabase.from("clean_price_quotes").select("*").eq("order_id", orderId).order("created_at", { ascending: false }).limit(1),
        supabase.from("clean_assignments").select("*").eq("order_id", orderId),
        supabase.from("clean_locations").select("*").eq("order_id", orderId),
      ]);
      return { order: o.data, events: ev.data ?? [], quote: q.data?.[0] ?? null, jobs: jobs.data ?? [], locations: loc.data ?? [] };
    },
    refetchInterval: (q) => (q.state.data?.order?.payment_status === "PROCESSING" ? 5000 : 20000),
  });

  // Live updates for status and worker position.
  useEffect(() => {
    const ch = supabase
      .channel(`clean-${orderId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "clean_locations", filter: `order_id=eq.${orderId}` }, () => void refetch())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "clean_orders", filter: `id=eq.${orderId}` }, () => void refetch())
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [orderId, refetch]);

  // While a Mobile Money prompt is pending, ask the provider for the result.
  const processing = data?.order?.payment_status === "PROCESSING";
  useEffect(() => {
    if (!processing) return;
    const t = setInterval(async () => {
      const r = await sync({ data: { orderId } }).catch(() => null);
      if (r?.status === "PAID") {
        toast.success(fr ? "Paiement reçu !" : "Payment received!");
        void refetch();
      } else if (r?.status === "FAILED") {
        toast.error(fr ? "Paiement refusé. Réessayez." : "Payment declined. Please try again.");
        void refetch();
      }
    }, 6000);
    return () => clearInterval(t);
  }, [processing, orderId, sync, refetch, fr]);

  const o = data?.order;
  if (!o) return <p className="p-6 text-sm text-muted-foreground">{fr ? "Chargement…" : "Loading…"}</p>;
  const idx = cleanStepIndex(o.status);
  const activeJob = data.jobs.find((j) => ["ACCEPTED", "ON_THE_WAY", "ARRIVED"].includes(j.status));
  const live = activeJob ? data.locations.find((l) => l.assignment_id === activeJob.id) : null;
  const target = activeJob?.direction === "DELIVERY" ? { lat: o.delivery_lat, lng: o.delivery_lng } : { lat: o.pickup_lat, lng: o.pickup_lng };
  const km = live ? haversine(live, target) : null;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 pb-12">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary">ASH Clean</p>
          <h1 className="font-mono text-2xl font-extrabold text-foreground">{o.order_no}</h1>
          <p className="text-sm font-semibold text-muted-foreground">{cleanStatusLabel(o.status, fr)}</p>
        </div>
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/clean/receipt/$orderId" params={{ orderId }}>
            <ReceiptText className="size-4" /> {fr ? "Reçu" : "Receipt"}
          </Link>
        </Button>
      </div>

      {activeJob ? (
        <section className="space-y-2 rounded-3xl bg-card p-4 shadow-[var(--shadow-card)]">
          <p className="font-bold text-foreground">
            {methodLabel(activeJob.method, fr)} ·{" "}
            {activeJob.direction === "PICKUP" ? (fr ? "collecte en route" : "pickup on the way") : fr ? "livraison en route" : "delivery on the way"}
          </p>
          <p className="text-sm text-muted-foreground">
            {km != null
              ? `${km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`} · ETA ~${Math.max(1, Math.round((km / (activeJob.method === "STAFF" ? 5 : 20)) * 60))} min`
              : fr ? "Position en attente…" : "Waiting for live position…"}
          </p>
          <CleanMap
            className="h-64 w-full"
            center={target}
            markers={[{ ...target, label: fr ? "V" : "Y", color: "#2563eb" }, ...(live ? [{ lat: live.lat, lng: live.lng, label: activeJob.method === "STAFF" ? "S" : "R" }] : [])]}
            route={live ? [{ lat: live.lat, lng: live.lng }, target] : null}
          />
        </section>
      ) : null}

      {o.status === "AWAITING_APPROVAL" && data.quote ? (
        <section className="space-y-3 rounded-3xl border-2 border-primary bg-card p-4 shadow-[var(--shadow-card)]">
          <h2 className="font-display text-lg font-extrabold text-foreground">{fr ? "Votre prix est prêt" : "Your price is ready"}</h2>
          <dl className="space-y-1 text-sm">
            <Row k={`${fr ? "Linge" : "Laundry"}: ${data.quote.weight_kg} kg × ${fcfa(data.quote.rate_per_kg)}`} v={fcfa(data.quote.laundry_amount)} />
            {((data.quote.special_items as { name: string; qty: number; amount: number }[]) ?? []).map((s) => (
              <Row key={s.name} k={`${s.name} × ${s.qty}`} v={fcfa(s.amount)} />
            ))}
            <Row k={`${fr ? "Collecte" : "Pickup"} (${methodLabel(o.pickup_method)})`} v={fcfa(data.quote.pickup_fee)} />
            <Row k={`${fr ? "Livraison" : "Delivery"} (${methodLabel(o.delivery_method)})`} v={fcfa(data.quote.delivery_fee)} />
            <div className="flex justify-between border-t border-border pt-2 text-base font-extrabold text-foreground">
              <span>Total</span><span>{fcfa(data.quote.total)}</span>
            </div>
          </dl>
          {processing ? (
            <p className="rounded-2xl bg-muted p-3 text-sm">{fr ? "Validez la demande sur votre téléphone…" : "Approve the prompt on your phone…"}</p>
          ) : (
            <MomoCharge
              fr={fr}
              busy={busy}
              submitLabel={`${fr ? "Confirmer et payer" : "Confirm & pay"} ${fcfa(data.quote.total)}`}
              onCharge={async (provider, phone) => {
                setBusy(true);
                const r = await pay({ data: { orderId, provider, phone } }).catch((e) => ({ ok: false as const, error: String(e) }));
                setBusy(false);
                if (!r.ok) return toast.error(("message" in r && r.message) || r.error);
                toast.info(fr ? "Validez la demande sur votre téléphone" : "Approve the prompt on your phone");
                void qc.invalidateQueries({ queryKey: ["clean", "order", orderId] });
              }}
            />
          )}
          {!processing ? (
            <Button
              variant="ghost"
              className="w-full text-destructive"
              onClick={async () => {
                if (!confirm(fr ? "Refuser le prix et demander le retour de votre linge ?" : "Decline the price and ask for your laundry back?")) return;
                await decline({ data: { orderId } });
                void refetch();
              }}
            >
              {fr ? "Refuser / demander le retour" : "Decline / request return"}
            </Button>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-3xl bg-card p-4 shadow-[var(--shadow-card)]">
        <h2 className="mb-3 font-bold text-foreground">{fr ? "Suivi" : "Progress"}</h2>
        <ol className="space-y-2">
          {CLEAN_TIMELINE.map((s, i) => {
            const done = idx >= i;
            const ev = data.events.filter((e) => e.status === s.key).at(-1);
            return (
              <li key={s.key} className="flex items-start gap-3">
                <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full", done ? "bg-primary text-primary-foreground" : "bg-muted")}>
                  {done ? <Check className="size-3" /> : null}
                </span>
                <span className={cn("text-sm", done ? "font-semibold text-foreground" : "text-muted-foreground")}>
                  {fr ? s.fr : s.en}
                  {ev ? <span className="block text-xs font-normal text-muted-foreground">{formatDateTime(ev.created_at)}{ev.note ? ` · ${ev.note}` : ""}</span> : null}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="grid gap-2 rounded-3xl bg-card p-4 text-sm shadow-[var(--shadow-card)]">
        <Row k={fr ? "Collecte" : "Pickup"} v={`${methodLabel(o.pickup_method)} · ${o.pickup_distance_km} km · ${Number(o.pickup_fee) ? fcfa(o.pickup_fee) : fr ? "gratuit" : "free"}`} />
        <p className="text-xs text-muted-foreground">{o.pickup_address}</p>
        <Row k={fr ? "Livraison" : "Delivery"} v={`${methodLabel(o.delivery_method)} · ${o.delivery_distance_km} km · ${Number(o.delivery_fee) ? fcfa(o.delivery_fee) : fr ? "gratuit" : "free"}`} />
        <p className="text-xs text-muted-foreground">{o.delivery_address}</p>
      </section>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-semibold text-foreground">{v}</span>
    </div>
  );
}

function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
