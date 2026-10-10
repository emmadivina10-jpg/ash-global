import { lazy, Suspense, useEffect, useRef, useState } from "react";
const LiveTripMap = lazy(() => import("@/components/refer/LiveTripMap"));
function km(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, d = Math.PI / 180, x = (b.lat - a.lat) * d, y = (b.lng - a.lng) * d;
  const h = Math.sin(x / 2) ** 2 + Math.cos(a.lat * d) * Math.cos(b.lat * d) * Math.sin(y / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Circle, MapPin, MessageCircle, Navigation, Phone, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getBookingReceipt } from "@/lib/booking-receipt.functions";
import { getTripEta } from "@/lib/trip-eta.functions";
import { syncBookingPayment } from "@/lib/booking.functions";
import { TrackingDock } from "@/components/refer/TrackingDock";
import { CustomerVerificationCode } from "@/components/refer/CustomerVerificationCode";
import { openConversation } from "@/lib/marketplace.queries";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/booking/$bookingId/track")({
  head: () => ({
    meta: [
      { title: "Track booking — ASH Glo" },
      { name: "description", content: "Follow your ASH provider's trip to your booking location." },
      { property: "og:title", content: "Track booking — ASH Glo" },
      { property: "og:description", content: "Live trip status for an active ASH booking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TrackPage,
});

type Loc = { lat: number; lng: number; accuracy_m: number | null; updated_at: string };
const ACTIVE = ["CONFIRMED", "IN_PROGRESS"];

function TrackPage() {
  const { bookingId } = Route.useParams();
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const qc = useQueryClient();
  const navigate = useNavigate();
  const fetchReceipt = useServerFn(getBookingReceipt);
  const key = ["bookings", "receipt", bookingId];
  const { data: r, error } = useQuery({ queryKey: key, queryFn: () => fetchReceipt({ data: { bookingId } }), refetchInterval: 15000 });

  const syncPayment = useServerFn(syncBookingPayment);
  const waitingForPayment = r?.viewer === "CUSTOMER" && !r.paid && r.status === "PAYMENT_PROCESSING";
  useEffect(() => {
    if (!waitingForPayment) return;
    let stopped = false;
    const check = async () => {
      try {
        await syncPayment({ data: { bookingId } });
        if (!stopped) void qc.invalidateQueries({ queryKey: ["bookings", "receipt", bookingId] });
      } catch { /* Keep waiting: returning from checkout is not proof of payment. */ }
    };
    void check();
    const timer = setInterval(() => void check(), 4000);
    return () => { stopped = true; clearInterval(timer); };
  }, [waitingForPayment, bookingId, syncPayment, qc]);

  const active = !!r && r.paid && ACTIVE.includes(r.status);
  const sharing = active && r.tripStatus === "ON_THE_WAY";

  // Latest provider point (no history is stored). Readable only during an active trip.
  const { data: loc } = useQuery({
    queryKey: ["bookings", "location", bookingId],
    enabled: sharing,
    refetchInterval: 10000,
    queryFn: async () => {
      const { data } = await supabase.from("booking_live_locations").select("lat, lng, accuracy_m, updated_at").eq("booking_id", bookingId).maybeSingle();
      return (data as Loc | null) ?? null;
    },
  });

  // Arrival time from Google Maps, from the provider's real latest position. Bounded to once a minute.
  const fetchEta = useServerFn(getTripEta);
  const { data: eta } = useQuery({
    queryKey: ["bookings", "eta", bookingId],
    enabled: sharing && !!loc && !!r?.location,
    refetchInterval: 60000,
    queryFn: () => fetchEta({ data: { bookingId } }),
  });

  // Provider device: share position only while this page is open and the trip is "on the way".
  const [gpsError, setGpsError] = useState<string | null>(null);
  const lastSent = useRef(0);
  useEffect(() => {
    if (!sharing || r?.viewer !== "PROVIDER" || !("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      async (p) => {
        if (Date.now() - lastSent.current < 8000) return;
        lastSent.current = Date.now();
        setGpsError(null);
        await supabase.rpc("share_booking_location", { _booking_id: bookingId, _lat: p.coords.latitude, _lng: p.coords.longitude, _accuracy: p.coords.accuracy });
      },
      () => setGpsError(tx("Allow location access to share your trip.", "Autorisez la localisation pour partager votre trajet.")),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [sharing, r?.viewer, bookingId, fr]);

  // Both parties: share your own position while this active booking is open (opt-in).
  const [shareOn, setShareOn] = useState(false);
  const [mine, setMine] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const lastParty = useRef(0);
  useEffect(() => {
    if (!shareOn || !active || !("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      async (p) => {
        setMine({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocError(null);
        if (Date.now() - lastParty.current < 8000) return;
        lastParty.current = Date.now();
        await supabase.rpc("share_booking_party_location", { _booking_id: bookingId, _lat: p.coords.latitude, _lng: p.coords.longitude, _accuracy: p.coords.accuracy });
      },
      () => { setLocError(tx("Location was blocked. Allow it in your browser settings.", "Localisation refusée. Autorisez-la dans les réglages du navigateur.")); setShareOn(false); },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [shareOn, active, bookingId, fr]);
  const { data: parties } = useQuery({
    queryKey: ["bookings", "parties", bookingId],
    enabled: active,
    refetchInterval: 8000,
    queryFn: async () => {
      const { data } = await supabase.from("booking_party_locations").select("party, lat, lng, updated_at").eq("booking_id", bookingId);
      return (data ?? []) as { party: "CUSTOMER" | "PROVIDER"; lat: number; lng: number; updated_at: string }[];
    },
  });

  const [busy, setBusy] = useState(false);
  async function setTrip(status: "ON_THE_WAY" | "ARRIVED") {
    setBusy(true);
    const { data, error: e } = await supabase.rpc("update_trip_status", { _booking_id: bookingId, _status: status });
    setBusy(false);
    const res = data as { ok?: boolean; error?: string } | null;
    if (e || !res?.ok) { toast.error(res?.error === "BOOKING_NOT_ACTIVE" ? (tx("This booking isn't active.", "Réservation non active.")) : tx("Couldn't update the trip.", "Action impossible.")); return; }
    void qc.invalidateQueries({ queryKey: ["bookings"] });
  }

  async function chat() {
    if (!r) return;
    const id = await openConversation(r.provider.profileId, r.bookingId);
    if (id) void navigate({ to: "/messages", search: { c: id } });
  }

  if (error) return <p className="p-6 text-sm text-muted-foreground">{tx("Booking not found.", "Réservation introuvable.")}</p>;
  if (!r) return <p className="p-6 text-sm text-muted-foreground">…</p>;

  const isProvider = r.viewer === "PROVIDER";
  const ts = r.tripStatus;
  const done = r.status === "COMPLETED" || r.status === "SETTLED";
  const message = done
    ? tx("Your booking has been completed.", "Votre réservation est terminée.")
    : waitingForPayment
      ? tx("Confirming your payment…", "Confirmation du paiement…")
    : !active && r.status === "PAYMENT_PROCESSING"
      ? tx("Waiting for the customer's payment to be confirmed. Tracking starts automatically.", "En attente de la confirmation du paiement du client. Le suivi démarre automatiquement.")
    : !active
      ? tx("Tracking isn't available for this booking.", "Le suivi n'est pas disponible pour cette réservation.")
      : ts === "ARRIVED"
        ? isProvider
          ? tx("Ask the customer for their verification code.", "Demandez au client son code de vérification.")
          : tx("Your provider has arrived. Please provide your verification code to the provider to complete the service.", "Votre prestataire est arrivé. Donnez-lui votre code de vérification pour terminer le service.")
        : ts === "ON_THE_WAY"
          ? isProvider ? (tx("You're on the way. Keep this page open to share your position.", "Vous êtes en route. Gardez cette page ouverte.")) : tx("Your provider is on the way.", "Votre prestataire est en route.")
          : isProvider ? (tx("Booking paid. Start the trip when you leave.", "Réservation payée. Démarrez le trajet quand vous partez.")) : tx("Your booking is confirmed.", "Votre réservation est confirmée.");

  const steps = [
    [tx("Paid", "Payée"), r.paid],
    [tx("On the way", "En route"), ["ON_THE_WAY", "ARRIVED"].includes(ts) || done],
    [tx("Arrived", "Arrivé"), ts === "ARRIVED" || done],
    [tx("Verified", "Vérifiée"), done],
  ] as const;

  const dest = r.location ? encodeURIComponent(r.location) : null;
  const directionsUrl = dest
    ? `https://www.google.com/maps/dir/?api=1&destination=${dest}${loc && !isProvider ? `&origin=${loc.lat},${loc.lng}` : ""}`
    : null;
  const etaOk = eta && "durationSeconds" in eta ? (eta as { durationSeconds: number; distanceMeters: number }) : null;
  const etaText = !sharing
    ? ts === "ARRIVED" ? (tx("Provider has arrived", "Prestataire arrivé")) : tx("Arrival time: shown once the trip starts", "Heure d'arrivée : dès que le trajet démarre")
    : etaOk
      ? `${tx("Arrives in about", "Arrivée estimée dans")} ${Math.max(1, Math.round(etaOk.durationSeconds / 60))} min · ${(etaOk.distanceMeters / 1000).toFixed(1)} km`
      : !r.location
        ? tx("Arrival time: no address given", "Heure d'arrivée : adresse manquante")
        : eta && "error" in eta
          ? tx("Arrival time unavailable for this address", "Heure d'arrivée indisponible pour cette adresse")
          : tx("Working out arrival time…", "Calcul de l'heure d'arrivée…");
  const other = isProvider ? { name: r.customer.name, avatar: r.customer.avatar, verified: false, phone: r.customer.phone } : r.provider;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 pb-12">
      <section className="flex items-center gap-3 rounded-3xl border border-border bg-card p-4">
        {other.avatar ? <img src={other.avatar} alt="" className="size-14 rounded-full object-cover" /> : <div className="size-14 rounded-full bg-muted" />}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 truncate font-display text-lg font-bold">
            {other.name ?? "—"} {other.verified ? <ShieldCheck className="size-4 text-primary" aria-label="Verified" /> : null}
          </p>
          <p className="truncate text-sm text-muted-foreground">{r.service} · #{r.bookingId.slice(0, 8).toUpperCase()}</p>
          <p className="text-xs text-muted-foreground">{r.scheduledAt ? formatDateTime(r.scheduledAt) : "—"}</p>
        </div>
      </section>

      <div className="rounded-2xl bg-primary/10 p-4 text-sm font-semibold text-foreground">{message}</div>

      {!isProvider && active ? <CustomerVerificationCode bookingId={bookingId} className="mt-0" /> : null}

      <ol className="grid grid-cols-4 gap-1 text-center text-[11px] font-semibold">
        {steps.map(([label, ok]) => (
          <li key={label} className="flex flex-col items-center gap-1">
            {ok ? <CheckCircle2 className="size-5 text-primary" /> : <Circle className="size-5 text-muted-foreground" />}
            {label}
          </li>
        ))}
      </ol>

      <TrackingDock>
        {(() => {
          const myParty = isProvider ? "PROVIDER" : "CUSTOMER";
          const me = mine ?? parties?.find((p) => p.party === myParty) ?? null;
          const them = parties?.find((p) => p.party !== myParty) ?? (isProvider ? null : loc ? { lat: loc.lat, lng: loc.lng } : null);
          const otherLabel = isProvider ? (tx("Customer", "Client")) : tx("Provider", "Prestataire");
          const pts = [
            ...(me ? [{ lat: me.lat, lng: me.lng, label: tx("You", "Vous"), kind: "me" as const }] : []),
            ...(them ? [{ lat: them.lat, lng: them.lng, label: otherLabel, kind: "other" as const }] : []),
          ];
          return <>
            {typeof window !== "undefined" ? <Suspense fallback={<div className="h-56 animate-pulse bg-muted" />}><LiveTripMap points={pts} /></Suspense> : <div className="h-56 bg-muted" />}
            <div className="space-y-2 border-b border-border p-4 text-sm">
              {me && them ? <p className="font-bold text-foreground">{tx("Distance", "Distance")}: {km(me, them) < 1 ? `${Math.round(km(me, them) * 1000)} m` : `${km(me, them).toFixed(1)} km`}</p> : null}
              {!active ? <p className="text-muted-foreground">{waitingForPayment ? (tx("Tracking starts as soon as payment is confirmed.", "Le suivi démarre dès que le paiement est confirmé.")) : tx("Tracking isn't active for this booking.", "Le suivi n'est pas actif.")}</p>
                : !shareOn ? <Button onClick={() => setShareOn(true)} className="w-full rounded-full"><MapPin className="size-4" />{tx("Enable my location", "Activer ma localisation")}</Button>
                : <p className="text-xs text-primary">{tx("Your location is shared with this booking only.", "Votre position est partagée avec cette réservation.")}</p>}
              {active && !them ? <p className="text-xs text-muted-foreground">{isProvider ? (tx("The customer hasn't enabled their location yet.", "Le client n'a pas encore activé sa localisation.")) : tx("The provider hasn't enabled their location yet.", "Le prestataire n'a pas encore activé sa localisation.")}</p> : null}
              {locError ? <p className="text-xs text-destructive">{locError}</p> : null}
            </div>
          </>;
        })()}
        <div className="space-y-1 p-4 text-sm">
          <p className="flex items-center gap-2"><MapPin className="size-4 text-primary" /> {r.location ?? (tx("No location given", "Lieu non indiqué"))}</p>
          {sharing && loc ? (
            <p className="text-xs text-muted-foreground">
              {tx("Position updated", "Position mise à jour")} {formatDateTime(loc.updated_at)}
              {loc.accuracy_m ? ` · ±${Math.round(loc.accuracy_m)} m` : ""}
            </p>
          ) : null}
          <p className="text-sm font-semibold text-foreground">{etaText}</p>
          {gpsError ? <p className="text-xs text-destructive">{gpsError}</p> : null}
          {directionsUrl ? <Button asChild variant="outline" className="mt-3 w-full rounded-full"><a href={directionsUrl} target="_blank" rel="noreferrer"><Navigation className="size-4" />{tx("Directions", "Itinéraire")}</a></Button> : null}
        </div>
      </TrackingDock>

      {isProvider && active ? (
        <div className="grid grid-cols-2 gap-2">
          <Button disabled={busy || ts !== "NOT_STARTED"} onClick={() => void setTrip("ON_THE_WAY")} className="rounded-full">
            {tx("Start trip", "Démarrer le trajet")}
          </Button>
          <Button disabled={busy || ts !== "ON_THE_WAY"} onClick={() => void setTrip("ARRIVED")} className="rounded-full">
            {tx("Arrived", "Je suis arrivé")}
          </Button>
          <Button asChild variant={ts === "ARRIVED" ? "default" : "outline"} className="col-span-2 rounded-full">
            <Link to="/bookings" search={{ tab: "provider", booking: bookingId }}>{tx("Verify customer (enter code)", "Vérifier le client (saisir le code)")}</Link>
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {directionsUrl ? (
          <Button asChild variant="outline" className="rounded-full">
            <a href={directionsUrl} target="_blank" rel="noreferrer"><Navigation className="size-4" /> {tx("Directions", "Itinéraire")}</a>
          </Button>
        ) : null}
        {!isProvider ? (
          <Button variant="outline" className="rounded-full" onClick={() => void chat()}><MessageCircle className="size-4" /> Chat</Button>
        ) : null}
        {other.phone && active ? (
          <Button asChild variant="outline" className="rounded-full"><a href={`tel:${other.phone}`}><Phone className="size-4" /> {tx("Call", "Appeler")}</a></Button>
        ) : null}
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/booking/$bookingId/receipt" params={{ bookingId }}>{tx("Receipt", "Reçu")}</Link>
        </Button>
      </div>
    </div>
  );
}
