import { useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Navigation } from "lucide-react";
import { getCleanJobs, pushCleanLocation, updateCleanJob } from "@/lib/clean.functions";
import { cleanStatusLabel, methodLabel } from "@/lib/clean";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/clean/jobs")({
  head: () => ({
    meta: [
      { title: "ASH Clean jobs — Staff & Rider" },
      { name: "description", content: "Pickup and delivery jobs for ASH Clean staff and riders." },
      { property: "og:title", content: "ASH Clean jobs" },
      {
        property: "og:description",
        content: "Accept, navigate and complete laundry pickups and deliveries.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CleanJobs,
});

type Job = {
  id: string;
  direction: string;
  method: string;
  worker_id: string | null;
  status: string;
  clean_orders: {
    order_no: string;
    status: string;
    pickup_address: string;
    pickup_lat: number;
    pickup_lng: number;
    delivery_address: string;
    delivery_lat: number;
    delivery_lng: number;
    notes: string | null;
    contact_phone: string | null;
  };
};

const NEXT: Record<
  string,
  { to: "ACCEPTED" | "ON_THE_WAY" | "ARRIVED" | "DONE"; en: string; fr: string }
> = {
  OPEN: { to: "ACCEPTED", en: "Accept job", fr: "Accepter" },
  ACCEPTED: { to: "ON_THE_WAY", en: "I'm on the way", fr: "Je suis en route" },
  ON_THE_WAY: { to: "ARRIVED", en: "I've arrived", fr: "Je suis arrivé" },
  ARRIVED: { to: "DONE", en: "Collected / delivered", fr: "Collecté / livré" },
};

function CleanJobs() {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const jobsFn = useServerFn(getCleanJobs);
  const update = useServerFn(updateCleanJob);
  const push = useServerFn(pushCleanLocation);
  const {
    data: jobs,
    refetch,
    error,
  } = useQuery({
    queryKey: ["clean", "jobs"],
    queryFn: () => jobsFn() as Promise<Job[]>,
    refetchInterval: 15000,
  });

  // Share location ONLY while this worker has an active job; stop otherwise.
  const active = (jobs ?? []).filter(
    (j) => j.worker_id && ["ACCEPTED", "ON_THE_WAY", "ARRIVED"].includes(j.status),
  );
  const activeIds = active.map((j) => j.id).join(",");
  const watch = useRef<number | null>(null);
  useEffect(() => {
    if (!activeIds || !navigator.geolocation) return;
    let last = 0;
    watch.current = navigator.geolocation.watchPosition(
      (p) => {
        if (Date.now() - last < 8000) return;
        last = Date.now();
        for (const id of activeIds.split(","))
          void push({
            data: { assignmentId: id, lat: p.coords.latitude, lng: p.coords.longitude },
          });
      },
      () =>
        toast.error(
          tx(
            "Turn on location so customers can track you",
            "Activez la localisation pour le suivi",
          ),
        ),
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => {
      if (watch.current != null) navigator.geolocation.clearWatch(watch.current);
    };
  }, [activeIds, push, fr]);

  if (error)
    return (
      <p className="p-6 text-sm text-muted-foreground">
        {tx(
          "Only ASH Clean staff and riders can open this page.",
          "Réservé aux équipes ASH Clean.",
        )}
      </p>
    );

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 pb-12">
      <h1 className="font-display text-2xl font-extrabold text-foreground">
        {tx("My ASH Clean jobs", "Mes courses ASH Clean")}
      </h1>
      {active.length ? (
        <p className="rounded-2xl bg-primary/10 p-3 text-sm text-foreground">
          {tx(
            "Your location is shared only while a job is active.",
            "Votre position est partagée pendant la course.",
          )}
        </p>
      ) : null}
      {(jobs ?? []).length === 0 ? (
        <p className="rounded-2xl bg-card p-5 text-sm text-muted-foreground">
          {tx("No jobs right now.", "Aucune course pour le moment.")}
        </p>
      ) : null}
      {(jobs ?? []).map((j) => {
        const o = j.clean_orders;
        const pickup = j.direction === "PICKUP";
        const dest = pickup
          ? { lat: o.pickup_lat, lng: o.pickup_lng, address: o.pickup_address }
          : { lat: o.delivery_lat, lng: o.delivery_lng, address: o.delivery_address };
        const next = NEXT[j.status];
        return (
          <article
            key={j.id}
            className="space-y-2 rounded-3xl bg-card p-4 shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center justify-between">
              <p className="font-mono font-bold text-foreground">{o.order_no}</p>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-bold">
                {pickup ? tx("PICKUP", "COLLECTE") : tx("DELIVERY", "LIVRAISON")} ·{" "}
                {methodLabel(j.method)}
              </span>
            </div>
            <p className="text-sm text-foreground">{dest.address}</p>
            <p className="text-xs text-muted-foreground">
              {cleanStatusLabel(o.status, fr)}
              {o.contact_phone ? ` · ${o.contact_phone}` : ""}
              {o.notes ? ` · ${o.notes}` : ""}
            </p>
            <div className="flex gap-2">
              <Button asChild variant="outline" className="flex-1 rounded-full">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Navigation className="size-4" /> {tx("Navigate", "Itinéraire")}
                </a>
              </Button>
              {next ? (
                <Button
                  className="flex-1 rounded-full"
                  onClick={async () => {
                    const r = await update({ data: { assignmentId: j.id, status: next.to } }).catch(
                      () => ({ ok: false as const }),
                    );
                    if (!r.ok) toast.error(tx("Couldn't update this job", "Action impossible"));
                    void refetch();
                  }}
                >
                  {fr ? next.fr : next.en}
                </Button>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
