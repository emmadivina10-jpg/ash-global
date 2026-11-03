import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LocateFixed, MapPinOff, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { dispatchError, rpc, type DispatchJob } from "@/lib/dispatch.queries";

const LiveTripMap = lazy(() => import("@/components/refer/LiveTripMap"));

export const LIVE_STATUSES = ["ACCEPTED", "PICKUP_CONFIRMED", "IN_TRANSIT"] as const;
export const isLiveDelivery = (j: Pick<DispatchJob, "status" | "fulfillment_mode">) =>
  j.fulfillment_mode !== "SELF_PICKUP" && j.fulfillment_mode !== "EXTERNAL_RIDER" && (LIVE_STATUSES as readonly string[]).includes(j.status);

type RiderLoc = { rider_name: string | null; vehicle: string | null; plate: string | null; latitude: number; longitude: number; accuracy_m: number | null; updated_at: string };

/** Customer / shop / staff view: rider position for one active delivery (server checks who may see it). */
export function DeliveryLiveMap({ job }: { job: DispatchJob }) {
  const { tx } = useI18n();
  const live = isLiveDelivery(job);
  const q = useQuery({
    queryKey: ["dispatch", "rider-location", job.id],
    enabled: live,
    refetchInterval: 10_000,
    queryFn: async () => (await rpc<RiderLoc[]>("dispatch_job_rider_location", { _job: job.id }))[0] ?? null,
  });
  if (!live) return null;
  const loc = q.data;
  const ageMin = loc ? Math.floor((Date.now() - new Date(loc.updated_at).getTime()) / 60000) : null;
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      {loc ? (
        <ClientOnly fallback={<div className="h-56 animate-pulse bg-muted" />}>
          <Suspense fallback={<div className="h-56 animate-pulse bg-muted" />}>
            <LiveTripMap points={[{ lat: loc.latitude, lng: loc.longitude, label: loc.rider_name || tx("Rider", "Livreur"), kind: "other" }]} />
          </Suspense>
        </ClientOnly>
      ) : (
        <div className="flex h-32 flex-col items-center justify-center gap-1 bg-muted px-4 text-center text-xs text-muted-foreground">
          <MapPinOff className="h-5 w-5" />
          {tx("The rider's position appears here while they have the delivery screen open.", "La position du livreur apparaît ici tant qu'il garde l'écran de livraison ouvert.")}
        </div>
      )}
      {loc ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">
          {[loc.rider_name, loc.vehicle, loc.plate].filter(Boolean).join(" · ")} ·{" "}
          {ageMin !== null && ageMin < 1 ? tx("updated just now", "mis à jour à l'instant") : tx(`updated ${ageMin} min ago`, `mis à jour il y a ${ageMin} min`)}
          {ageMin !== null && ageMin >= 3 ? ` — ${tx("the rider may have closed the app", "le livreur a peut-être fermé l'application")}` : ""}
        </p>
      ) : null}
    </div>
  );
}

/** Rider side: shares the phone's position for one active delivery while this screen stays open. */
export function RiderLocationSharer({ job }: { job: DispatchJob }) {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const live = isLiveDelivery(job);
  const [on, setOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const watch = useRef<number | null>(null);
  const last = useRef(0);

  useEffect(() => {
    if (!on || !live) return;
    if (!("geolocation" in navigator)) { setError(tx("This browser cannot share location.", "Ce navigateur ne peut pas partager la position.")); setOn(false); return; }
    watch.current = navigator.geolocation.watchPosition(
      (p) => {
        if (Date.now() - last.current < 8000) return;
        last.current = Date.now();
        rpc("dispatch_rider_update_location", { _job: job.id, _lat: p.coords.latitude, _lng: p.coords.longitude, _accuracy: p.coords.accuracy })
          .then(() => setError(null))
          .catch((e) => setError(dispatchError(e, fr)));
      },
      (e) => { setError(e.code === 1 ? tx("Location permission was refused.", "L'autorisation de localisation a été refusée.") : tx("Location unavailable right now.", "Position indisponible pour le moment.")); },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    return () => { if (watch.current !== null) navigator.geolocation.clearWatch(watch.current); watch.current = null; };
  }, [on, live, job.id, fr, tx]);

  if (!live) return null;
  async function stop() {
    setOn(false);
    try { await rpc("dispatch_rider_stop_location", { _job: job.id }); } catch { /* cleared on completion anyway */ }
  }
  return (
    <div className="space-y-2 rounded-xl bg-muted p-3 text-xs">
      <p className="text-muted-foreground">
        {tx(
          "Your position is shared only with this customer, the shop and ASH operations, only for this delivery, and only while this screen is open on your phone. It stops if you lock the phone, leave the app or switch screens, and is erased when the delivery ends.",
          "Votre position est partagée uniquement avec ce client, la boutique et les opérations ASH, pour cette livraison seulement, et seulement tant que cet écran reste ouvert. Elle s'arrête si vous verrouillez le téléphone, quittez l'application ou changez d'écran, et est effacée à la fin de la livraison.",
        )}
      </p>
      {on ? (
        <Button variant="outline" size="sm" className="w-full" onClick={stop}><MapPinOff className="mr-2 h-4 w-4" />{tx("Stop sharing my location", "Arrêter le partage")}</Button>
      ) : (
        <Button size="sm" className="w-full" onClick={() => { setError(null); setOn(true); }}><LocateFixed className="mr-2 h-4 w-4" />{tx("Share my live location", "Partager ma position en direct")}</Button>
      )}
      {on && !error ? <p className="flex items-center gap-1 font-medium text-primary"><Navigation className="h-3.5 w-3.5" />{tx("Sharing — keep this screen open", "Partage actif — gardez cet écran ouvert")}</p> : null}
      {error ? <p className="text-destructive">{error}</p> : null}
    </div>
  );
}
