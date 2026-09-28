import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bike, Footprints, Loader2, LocateFixed, MapPin, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  cleanPlaceDetails,
  cleanQuoteLocation,
  cleanReverseGeocode,
  cleanSearchPlaces,
  createCleanOrder,
} from "@/lib/clean.functions";
import { fcfa } from "@/lib/clean";
import { useI18n } from "@/lib/i18n";
import { CleanMap } from "@/components/clean/CleanMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/clean/book")({
  head: () => ({
    meta: [
      { title: "Book a laundry pickup — ASH Clean" },
      { name: "description", content: "Set your location and we choose ASH Staff or ASH Rider pickup automatically." },
      { property: "og:title", content: "Book a laundry pickup — ASH Clean" },
      { property: "og:description", content: "Automatic pickup method and fee based on your road distance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BookClean,
});

type Loc = { address: string; lat: number; lng: number };
type Quote = { km: number; etaMin: number; method: "STAFF" | "RIDER"; fee: number; source: string };

function useQuote(loc: Loc | null, direction: "PICKUP" | "DELIVERY") {
  const fn = useServerFn(cleanQuoteLocation);
  return useQuery({
    queryKey: ["clean", "quote", direction, loc?.lat, loc?.lng],
    queryFn: () => fn({ data: { lat: loc!.lat, lng: loc!.lng, direction } }) as Promise<Quote>,
    enabled: Boolean(loc),
    staleTime: 5 * 60_000,
  });
}

function AddressPicker({
  value,
  onChange,
  center,
  fr,
}: {
  value: Loc | null;
  onChange: (l: Loc) => void;
  center: { lat: number; lng: number };
  fr: boolean;
}) {
  const search = useServerFn(cleanSearchPlaces);
  const details = useServerFn(cleanPlaceDetails);
  const reverse = useServerFn(cleanReverseGeocode);
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<{ placeId: string; text: string }[]>([]);
  const [locating, setLocating] = useState(false);
  const token = useRef(crypto.randomUUID());
  const seq = useRef(0);

  useEffect(() => {
    if (term.trim().length < 3) {
      setResults([]);
      return;
    }
    const id = ++seq.current;
    const t = setTimeout(async () => {
      const r = await search({ data: { input: term, sessionToken: token.current } }).catch(() => []);
      if (id === seq.current) setResults(r);
    }, 300);
    return () => clearTimeout(t);
  }, [term, search]);

  const pick = async (lat: number, lng: number) => {
    onChange({ address: fr ? "Position choisie…" : "Pinned location…", lat, lng });
    const { address } = await reverse({ data: { lat, lng } }).catch(() => ({ address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` }));
    onChange({ address, lat, lng });
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={fr ? "Rechercher ou saisir une adresse" : "Search or type an address"}
          className="rounded-full pl-9"
        />
        {results.length ? (
          <ul className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-2xl border border-border bg-popover shadow-lg">
            {results.map((r) => (
              <li key={r.placeId}>
                <button
                  type="button"
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-secondary"
                  onClick={async () => {
                    setResults([]);
                    setTerm(r.text);
                    const d = await details({ data: { placeId: r.placeId, sessionToken: token.current } });
                    token.current = crypto.randomUUID();
                    if (d) onChange(d);
                    else toast.error(fr ? "Adresse introuvable" : "Couldn't find that address");
                  }}
                >
                  {r.text}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-full"
        disabled={locating}
        onClick={() => {
          if (!navigator.geolocation) {
            toast.error(fr ? "Localisation indisponible" : "Location unavailable");
            return;
          }
          setLocating(true);
          navigator.geolocation.getCurrentPosition(
            (p) => {
              setLocating(false);
              void pick(p.coords.latitude, p.coords.longitude);
            },
            () => {
              setLocating(false);
              toast.error(fr ? "Autorisez la localisation ou choisissez sur la carte" : "Allow location, or tap the map instead");
            },
            { enableHighAccuracy: true, timeout: 12000 },
          );
        }}
      >
        {locating ? <Loader2 className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}
        {fr ? "Utiliser ma position" : "Use my current location"}
      </Button>
      <CleanMap
        className="h-56 w-full"
        center={value ?? center}
        markers={[
          { ...center, label: "A", color: "#7c3aed" },
          ...(value ? [{ lat: value.lat, lng: value.lng, label: "•" }] : []),
        ]}
        onPick={(p) => void pick(p.lat, p.lng)}
      />
      <p className="text-xs text-muted-foreground">{fr ? "Touchez la carte pour placer l'épingle. A = ASH Clean." : "Tap the map to drop your pin. A = ASH Clean."}</p>
      {value ? (
        <p className="flex items-start gap-2 text-sm font-medium text-foreground">
          <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /> {value.address}
        </p>
      ) : null}
    </div>
  );
}

function QuoteCard({ q, loading, direction, fr }: { q: Quote | undefined; loading: boolean; direction: "PICKUP" | "DELIVERY"; fr: boolean }) {
  if (loading) return <div className="flex items-center gap-2 rounded-2xl bg-muted p-4 text-sm"><Loader2 className="size-4 animate-spin" /> {fr ? "Calcul de la distance…" : "Working out road distance…"}</div>;
  if (!q) return null;
  const staff = q.method === "STAFF";
  const Icon = staff ? Footprints : Bike;
  const word = direction === "PICKUP" ? (fr ? "COLLECTE" : "PICKUP") : fr ? "LIVRAISON" : "DELIVERY";
  return (
    <div className={cn("rounded-2xl border p-4", staff ? "border-primary/40 bg-primary/5" : "border-border bg-card")}>
      <p className="flex items-center gap-2 font-extrabold text-foreground">
        <Icon className="size-5 text-primary" aria-hidden /> {staff ? `ASH STAFF ${word}` : `ASH RIDER ${word}`}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {staff
          ? fr ? "Votre adresse est dans notre zone staff." : "Your location is within our staff area."
          : fr ? "Un ASH Rider s'en charge." : "An ASH Rider will handle this."}
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
        <span><b className="block text-foreground">{q.km} km</b><span className="text-xs text-muted-foreground">{q.source === "ROAD" ? (fr ? "par la route" : "by road") : fr ? "estimé" : "estimated"}</span></span>
        <span><b className="block text-foreground">~{q.etaMin} min</b><span className="text-xs text-muted-foreground">{fr ? "trajet" : "travel"}</span></span>
        <span><b className="block text-foreground">{q.fee > 0 ? fcfa(q.fee) : fr ? "GRATUIT" : "FREE"}</b><span className="text-xs text-muted-foreground">{fr ? "frais" : "fee"}</span></span>
      </div>
    </div>
  );
}

function BookClean() {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const navigate = useNavigate();
  const create = useServerFn(createCleanOrder);
  const { data: base } = useQuery({
    queryKey: ["clean", "book-base"],
    queryFn: async () => {
      const [s, sv] = await Promise.all([
        supabase.from("clean_settings").select("facility_lat, facility_lng, price_per_kg").eq("id", 1).single(),
        supabase.from("clean_services").select("code, kind, name_en, name_fr, price").eq("active", true).order("sort"),
      ]);
      return { settings: s.data, services: sv.data ?? [] };
    },
  });
  const center = useMemo(
    () => ({ lat: base?.settings?.facility_lat ?? 4.1537, lng: base?.settings?.facility_lng ?? 9.292 }),
    [base],
  );
  const [services, setServices] = useState<string[]>(["WASH", "DRY", "FOLD", "IRON"]);
  const [pickup, setPickup] = useState<Loc | null>(null);
  const [sameDelivery, setSameDelivery] = useState(true);
  const [delivery, setDelivery] = useState<Loc | null>(null);
  const [notes, setNotes] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const deliveryLoc = sameDelivery ? pickup : delivery;
  const pq = useQuote(pickup, "PICKUP");
  const dq = useQuote(deliveryLoc, "DELIVERY");

  const toggle = (code: string) =>
    setServices((s) => (s.includes(code) ? s.filter((x) => x !== code) : [...s, code]));

  const submit = async () => {
    if (!pickup || !deliveryLoc) {
      toast.error(fr ? "Choisissez votre adresse" : "Set your address first");
      return;
    }
    if (!services.length) {
      toast.error(fr ? "Choisissez au moins un service" : "Choose at least one service");
      return;
    }
    setBusy(true);
    try {
      const r = await create({ data: { services, notes, phone, pickup, delivery: deliveryLoc } });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(`${fr ? "Réservé" : "Booked"} · ${r.orderNo}`);
      void navigate({ to: "/clean/orders/$orderId", params: { orderId: r.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 pb-12">
      <h1 className="font-display text-2xl font-extrabold text-foreground">{fr ? "Réserver une collecte" : "Book a pickup"}</h1>

      <section className="space-y-2 rounded-3xl bg-card p-4 shadow-[var(--shadow-card)]">
        <Label className="font-bold">{fr ? "Services" : "Services"}</Label>
        <div className="flex flex-wrap gap-2">
          {(base?.services ?? []).filter((s) => s.kind === "SERVICE").map((s) => (
            <button key={s.code} type="button" onClick={() => toggle(s.code)}
              className={cn("rounded-full border px-3.5 py-1.5 text-sm font-semibold", services.includes(s.code) ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground")}>
              {fr ? s.name_fr : s.name_en}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {fr ? "Articles spéciaux (costume, couette…) comptés à la réception : " : "Special items (suits, duvets…) are counted on arrival: "}
          {(base?.services ?? []).filter((s) => s.kind === "SPECIAL").map((s) => `${fr ? s.name_fr : s.name_en} ${fcfa(s.price)}`).join(" · ")}
        </p>
      </section>

      <section className="space-y-3 rounded-3xl bg-card p-4 shadow-[var(--shadow-card)]">
        <Label className="font-bold">{fr ? "Adresse de collecte" : "Pickup location"}</Label>
        <AddressPicker value={pickup} onChange={setPickup} center={center} fr={fr} />
        <QuoteCard q={pq.data} loading={pq.isFetching} direction="PICKUP" fr={fr} />
      </section>

      <section className="space-y-3 rounded-3xl bg-card p-4 shadow-[var(--shadow-card)]">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={sameDelivery} onChange={(e) => setSameDelivery(e.target.checked)} />
          {fr ? "Livrer à la même adresse" : "Deliver to the same address"}
        </label>
        {!sameDelivery ? <AddressPicker value={delivery} onChange={setDelivery} center={center} fr={fr} /> : null}
        <QuoteCard q={dq.data} loading={dq.isFetching} direction="DELIVERY" fr={fr} />
      </section>

      <section className="space-y-3 rounded-3xl bg-card p-4 shadow-[var(--shadow-card)]">
        <div>
          <Label htmlFor="cl-phone">{fr ? "Téléphone de contact" : "Contact phone"}</Label>
          <Input id="cl-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="6XX XXX XXX" inputMode="tel" />
        </div>
        <div>
          <Label htmlFor="cl-notes">{fr ? "Instructions (optionnel)" : "Instructions (optional)"}</Label>
          <Textarea id="cl-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
        </div>
        <p className="rounded-2xl bg-muted p-3 text-sm text-foreground">
          {fr
            ? "Votre linge sera pesé chez ASH Clean. Le prix final est calculé à partir du poids vérifié. Vous validez le prix avant le lavage."
            : "Your laundry will be weighed at ASH Clean. Your final charge is calculated from the verified weight. You approve the final price before washing begins."}
        </p>
        <Button className="w-full rounded-full" size="lg" disabled={busy || !pickup || pq.isFetching || dq.isFetching} onClick={() => void submit()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {fr ? "Confirmer la collecte" : "Confirm pickup"}
          {pq.data && dq.data ? ` · ${fr ? "transport" : "transport"} ${fcfa(pq.data.fee + dq.data.fee)}` : ""}
        </Button>
      </section>
    </div>
  );
}
