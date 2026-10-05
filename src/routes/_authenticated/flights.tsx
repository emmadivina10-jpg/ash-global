import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRightLeft, Loader2, Plane, PlaneTakeoff, PlaneLanding, Minus, Plus, Luggage, ShieldCheck, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import {
  getFlightOffer,
  getFlightsStatus,
  searchFlights,
  searchPlaces,
  type Offer,
  type Place,
} from "@/lib/flights.functions";

export const Route = createFileRoute("/_authenticated/flights")({
  head: () => ({
    meta: [
      { title: "ASH Flights — Book flights worldwide with ASH" },
      { name: "description", content: "Search live flights and pay for your ticket with ASH." },
      { property: "og:title", content: "ASH Flights" },
      { property: "og:description", content: "Search live flights and pay for your ticket with ASH." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FlightsPage,
});

type Trip = "round" | "oneway" | "multi";
type Cabin = "economy" | "premium_economy" | "business" | "first";
type Leg = { from: Place | null; to: Place | null; date: string };
type Sort = "recommended" | "cheapest" | "fastest" | "earliest" | "latest";

const isoDur = (d: string | null) => {
  if (!d) return 0;
  const m = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/.exec(d);
  return m ? (+(m[1] ?? 0)) * 1440 + (+(m[2] ?? 0)) * 60 + +(m[3] ?? 0) : 0;
};
const fmtDur = (min: number) => `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
const time = (s: string) => s.slice(11, 16);
const day = (s: string) => new Date(s.slice(0, 10) + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" });
const money = (a: string, c: string) => `${c} ${Number(a).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const offerMinutes = (o: Offer) => o.slices.reduce((t, s) => t + isoDur(s.duration), 0);
const offerStops = (o: Offer) => Math.max(...o.slices.map((s) => s.segments.length - 1));

function FlightsPage() {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const statusFn = useServerFn(getFlightsStatus);
  const searchFn = useServerFn(searchFlights);
  const status = useQuery({ queryKey: ["flights-status"], queryFn: () => statusFn() });

  const [trip, setTrip] = useState<Trip>("round");
  const [legs, setLegs] = useState<Leg[]>([{ from: null, to: null, date: "" }]);
  const [ret, setRet] = useState("");
  const [pax, setPax] = useState({ adults: 1, children: 0, infants: 0 });
  const [cabin, setCabin] = useState<Cabin>("economy");
  const [selected, setSelected] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("recommended");
  const [stopsFilter, setStopsFilter] = useState<"any" | "0" | "1" | "2">("any");
  const [airline, setAirline] = useState("all");
  const [baggageOnly, setBaggageOnly] = useState(false);

  const search = useMutation({
    mutationFn: () => {
      const slices =
        trip === "multi"
          ? legs.map((l) => ({ origin: l.from!.code, destination: l.to!.code, date: l.date }))
          : [
              { origin: legs[0]!.from!.code, destination: legs[0]!.to!.code, date: legs[0]!.date },
              ...(trip === "round" ? [{ origin: legs[0]!.to!.code, destination: legs[0]!.from!.code, date: ret }] : []),
            ];
      return searchFn({ data: { slices, ...pax, cabin } });
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const activeLegs = trip === "multi" ? legs : legs.slice(0, 1);
  const valid =
    activeLegs.every((l) => l.from && l.to && l.date && l.from.code !== l.to.code) &&
    (trip !== "round" || (ret && ret >= legs[0]!.date)) &&
    pax.infants <= pax.adults;

  const offers = search.data?.available ? search.data.offers : [];
  const airlines = useMemo(() => [...new Set(offers.map((o) => o.airline))].sort(), [offers]);
  const shown = useMemo(() => {
    let list = offers.filter((o) => {
      const s = offerStops(o);
      if (stopsFilter === "0" && s !== 0) return false;
      if (stopsFilter === "1" && s !== 1) return false;
      if (stopsFilter === "2" && s < 2) return false;
      if (airline !== "all" && o.airline !== airline) return false;
      if (baggageOnly && !o.slices[0]?.segments[0]?.baggage?.includes("checked")) return false;
      return true;
    });
    const dep = (o: Offer) => o.slices[0]?.segments[0]?.departAt ?? "";
    const price = (o: Offer) => Number(o.totalAmount);
    if (sort === "cheapest") list = [...list].sort((a, b) => price(a) - price(b));
    if (sort === "fastest") list = [...list].sort((a, b) => offerMinutes(a) - offerMinutes(b));
    if (sort === "earliest") list = [...list].sort((a, b) => dep(a).localeCompare(dep(b)));
    if (sort === "latest") list = [...list].sort((a, b) => dep(b).localeCompare(dep(a)));
    if (sort === "recommended") {
      // Neutral blend of price and duration — no airline is favoured.
      const minP = Math.min(...list.map(price)), minD = Math.min(...list.map(offerMinutes));
      list = [...list].sort((a, b) => price(a) / minP + offerMinutes(a) / minD - (price(b) / minP + offerMinutes(b) / minD));
    }
    return list;
  }, [offers, sort, stopsFilter, airline, baggageOnly]);

  const unavailable = status.data && !status.data.available;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 pb-28 pt-4">
      <header className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="rounded-full" aria-label={fr ? "Retour au fil" : "Back to Feed"}>
          <Link to="/feed"><ArrowLeft className="size-5" /></Link>
        </Button>
        <div>
          <h1 className="font-display text-2xl font-bold leading-tight">ASH Flights</h1>
          <p className="text-sm text-muted-foreground">{fr ? "Réservez des vols dans le monde entier avec ASH" : "Book flights worldwide with ASH"}</p>
        </div>
      </header>

      {unavailable && (
        <div role="status" className="flex gap-3 rounded-xl border border-border bg-muted/50 p-4 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <div>
            <p className="font-semibold">{fr ? "La recherche de vols en direct est momentanément indisponible." : "Live flight search is currently unavailable."}</p>
            <p className="text-muted-foreground">{fr ? "ASH n’affiche jamais de vols ou de prix inventés. La recherche s’activera dès que le fournisseur sera connecté." : "ASH never shows invented flights or prices. Search turns on as soon as our flight provider is connected."}</p>
          </div>
        </div>
      )}

      <section className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-lg sm:p-5">
        <div className="inline-flex rounded-full bg-muted p-1 text-sm">
          {(["round", "oneway", "multi"] as Trip[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTrip(t);
                if (t === "multi" && legs.length < 2) setLegs([...legs, { from: legs[0]!.to, to: null, date: "" }]);
              }}
              className={`rounded-full px-4 py-1.5 font-medium transition-colors ${trip === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {t === "round" ? (fr ? "Aller-retour" : "Round trip") : t === "oneway" ? (fr ? "Aller simple" : "One way") : fr ? "Multi-villes" : "Multi-city"}
            </button>
          ))}
        </div>

        {activeLegs.map((leg, i) => (
          <div key={i} className="space-y-3">
            {trip === "multi" && <p className="text-xs font-semibold text-muted-foreground">{fr ? "Vol" : "Flight"} {i + 1}</p>}
            <div className="relative grid gap-2 sm:grid-cols-2">
              <PlacePicker label={fr ? "DE" : "FROM"} icon={<PlaneTakeoff className="size-4" />} value={leg.from} disabled={!!unavailable} fr={fr}
                onChange={(p) => setLegs(legs.map((l, j) => (j === i ? { ...l, from: p } : l)))} />
              <PlacePicker label={fr ? "VERS" : "TO"} icon={<PlaneLanding className="size-4" />} value={leg.to} disabled={!!unavailable} fr={fr}
                onChange={(p) => setLegs(legs.map((l, j) => (j === i ? { ...l, to: p } : l)))} />
              <Button type="button" variant="outline" size="icon" aria-label={fr ? "Inverser" : "Swap"}
                className="absolute left-1/2 top-1/2 hidden size-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-card sm:inline-flex"
                onClick={() => setLegs(legs.map((l, j) => (j === i ? { ...l, from: l.to, to: l.from } : l)))}>
                <ArrowRightLeft className="size-3.5" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label={fr ? "DÉPART" : "DEPARTURE"}>
                <Input type="date" min={i > 0 ? legs[i - 1]!.date || today : today} value={leg.date}
                  onChange={(e) => setLegs(legs.map((l, j) => (j === i ? { ...l, date: e.target.value } : l)))} />
              </Field>
              {trip !== "multi" && (
                <Field label={fr ? "RETOUR" : "RETURN"}>
                  <Input type="date" disabled={trip === "oneway"} min={leg.date || today} value={trip === "oneway" ? "" : ret} onChange={(e) => setRet(e.target.value)} />
                </Field>
              )}
            </div>
          </div>
        ))}
        {trip === "multi" && (
          <div className="flex gap-2">
            {legs.length < 4 && <Button type="button" variant="outline" size="sm" onClick={() => setLegs([...legs, { from: legs.at(-1)!.to, to: null, date: "" }])}>{fr ? "Ajouter un vol" : "Add flight"}</Button>}
            {legs.length > 2 && <Button type="button" variant="ghost" size="sm" onClick={() => setLegs(legs.slice(0, -1))}>{fr ? "Retirer" : "Remove"}</Button>}
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          <Field label={fr ? "PASSAGERS" : "PASSENGERS"}>
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="w-full justify-start font-normal">
                  {pax.adults + pax.children + pax.infants} {fr ? "passager(s)" : "passenger(s)"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 space-y-3">
                {([
                  ["adults", fr ? "Adultes" : "Adults", "12+", 1],
                  ["children", fr ? "Enfants" : "Children", "2–11", 0],
                  ["infants", fr ? "Bébés" : "Infants", "<2", 0],
                ] as const).map(([k, l, sub, min]) => (
                  <div key={k} className="flex items-center justify-between">
                    <div><p className="text-sm font-medium">{l}</p><p className="text-xs text-muted-foreground">{sub}</p></div>
                    <div className="flex items-center gap-3">
                      <Button type="button" size="icon" variant="outline" className="size-8 rounded-full" disabled={pax[k] <= min} onClick={() => setPax({ ...pax, [k]: pax[k] - 1 })}><Minus className="size-3" /></Button>
                      <span className="w-4 text-center text-sm">{pax[k]}</span>
                      <Button type="button" size="icon" variant="outline" className="size-8 rounded-full" disabled={pax.adults + pax.children + pax.infants >= 9 || (k === "infants" && pax.infants >= pax.adults)} onClick={() => setPax({ ...pax, [k]: pax[k] + 1 })}><Plus className="size-3" /></Button>
                    </div>
                  </div>
                ))}
              </PopoverContent>
            </Popover>
          </Field>
          <Field label={fr ? "CLASSE" : "CABIN CLASS"}>
            <Select value={cabin} onValueChange={(v) => setCabin(v as Cabin)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="economy">{fr ? "Économique" : "Economy"}</SelectItem>
                <SelectItem value="premium_economy">{fr ? "Économique premium" : "Premium Economy"}</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="first">{fr ? "Première" : "First"}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Button className="h-12 w-full rounded-xl text-base font-semibold" disabled={!valid || search.isPending || !!unavailable} onClick={() => search.mutate()}>
          {search.isPending ? <Loader2 className="size-5 animate-spin" /> : <Plane className="size-5" />}
          {fr ? "Rechercher des vols" : "Search Flights"}
        </Button>
      </section>

      {search.error && <p className="rounded-xl border border-destructive/40 p-3 text-sm text-destructive">{(search.error as Error).message}</p>}
      {search.data && !search.data.available && (
        <p className="rounded-xl border border-border p-3 text-sm">{fr ? "Recherche de vols momentanément indisponible." : "Flight search temporarily unavailable."}</p>
      )}

      {search.data?.available && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold">{fr ? "Vols disponibles" : "Available Flights"} <span className="text-sm font-normal text-muted-foreground">({shown.length})</span></h2>
            <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="recommended">{fr ? "Recommandés" : "Recommended"}</SelectItem>
                <SelectItem value="cheapest">{fr ? "Moins chers" : "Cheapest"}</SelectItem>
                <SelectItem value="fastest">{fr ? "Plus rapides" : "Fastest"}</SelectItem>
                <SelectItem value="earliest">{fr ? "Départ le plus tôt" : "Earliest departure"}</SelectItem>
                <SelectItem value="latest">{fr ? "Départ le plus tard" : "Latest departure"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            {(["any", "0", "1", "2"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setStopsFilter(s)}
                className={`rounded-full border px-3 py-1 ${stopsFilter === s ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                {s === "any" ? (fr ? "Toutes escales" : "Any stops") : s === "0" ? (fr ? "Direct" : "Nonstop") : s === "1" ? (fr ? "1 escale" : "1 stop") : fr ? "2+ escales" : "2+ stops"}
              </button>
            ))}
            <button type="button" onClick={() => setBaggageOnly(!baggageOnly)}
              className={`rounded-full border px-3 py-1 ${baggageOnly ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
              {fr ? "Bagage en soute" : "Checked bag"}
            </button>
            {airlines.length > 1 && (
              <Select value={airline} onValueChange={setAirline}>
                <SelectTrigger className="h-8 w-44 rounded-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{fr ? "Toutes compagnies" : "All airlines"}</SelectItem>
                  {airlines.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
          {shown.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">{fr ? "Aucun vol trouvé pour ces critères." : "No flights match this search."}</p>}
          {shown.map((o) => <OfferCard key={o.id} offer={o} fr={fr} onOpen={() => setSelected(o.id)} />)}
        </section>
      )}

      <OfferSheet id={selected} fr={fr} onClose={() => setSelected(null)} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-semibold tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function PlacePicker({ label, icon, value, onChange, disabled, fr }: { label: string; icon: React.ReactNode; value: Place | null; onChange: (p: Place) => void; disabled: boolean; fr: boolean }) {
  const fn = useServerFn(searchPlaces);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 300); return () => clearTimeout(t); }, [q]);
  const res = useQuery({ queryKey: ["places", debounced], queryFn: () => fn({ data: { query: debounced } }), enabled: open && debounced.length >= 2 });
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" disabled={disabled} className="flex w-full items-center gap-3 rounded-xl border border-border bg-background p-3 text-left disabled:opacity-60">
          <span className="text-primary">{icon}</span>
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold tracking-wide text-muted-foreground">{label}</span>
            <span className="block truncate font-medium">{value ? `${value.city} (${value.code})` : fr ? "Ville ou aéroport" : "City or airport"}</span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(22rem,calc(100vw-2rem))] p-2" align="start">
        <Input autoFocus placeholder={fr ? "Ville, aéroport, code, pays" : "City, airport, code or country"} value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="mt-2 max-h-72 overflow-y-auto">
          {res.isFetching && <Loader2 className="mx-auto my-4 size-4 animate-spin" />}
          {res.data && !res.data.available && <p className="p-3 text-sm text-muted-foreground">{fr ? "Recherche indisponible." : "Search unavailable."}</p>}
          {res.data?.available && res.data.places.length === 0 && <p className="p-3 text-sm text-muted-foreground">{fr ? "Aucun résultat" : "No results"}</p>}
          {res.data?.available && res.data.places.map((p) => (
            <button key={p.code + p.type} type="button" onClick={() => { onChange(p); setOpen(false); }} className="flex w-full items-center justify-between gap-3 rounded-lg p-2 text-left hover:bg-muted">
              <span className="min-w-0"><span className="block truncate text-sm font-medium">{p.name}</span><span className="block text-xs text-muted-foreground">{p.city}{p.country ? `, ${p.country}` : ""}</span></span>
              <span className="font-mono text-sm font-bold text-primary">{p.code}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function OfferCard({ offer, fr, onOpen }: { offer: Offer; fr: boolean; onOpen: () => void }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-center gap-2">
        {offer.airlineLogo ? <img src={offer.airlineLogo} alt="" className="size-6 object-contain" loading="lazy" /> : <Plane className="size-5 text-primary" />}
        <span className="text-sm font-semibold">{offer.airline}</span>
        <span className="ml-auto font-mono text-xs text-muted-foreground">{offer.slices[0]?.segments.map((s) => s.flightNumber).join(" · ")}</span>
      </div>
      <div className="space-y-3">
        {offer.slices.map((s, i) => {
          const first = s.segments[0], last = s.segments.at(-1)!;
          const stops = s.segments.length - 1;
          return (
            <div key={i} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
              <div><p className="text-lg font-bold">{time(first.departAt)}</p><p className="text-xs text-muted-foreground">{first.from} · {day(first.departAt)}</p></div>
              <div className="text-center text-xs text-muted-foreground">
                <p>{fmtDur(isoDur(s.duration))}</p>
                <div className="relative my-1 h-px bg-border"><Plane className="absolute left-1/2 top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rotate-90 bg-card text-primary" /></div>
                <p>{stops === 0 ? (fr ? "Direct" : "Nonstop") : `${stops} ${fr ? "escale(s)" : stops === 1 ? "stop" : "stops"}`}</p>
              </div>
              <div className="text-right"><p className="text-lg font-bold">{time(last.arriveAt)}</p><p className="text-xs text-muted-foreground">{last.to} · {day(last.arriveAt)}</p></div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-end justify-between border-t border-border pt-3">
        <div className="text-xs text-muted-foreground">
          {offer.slices[0]?.segments[0]?.cabin && <p>{offer.slices[0].segments[0].cabin}</p>}
          {offer.slices[0]?.segments[0]?.baggage && <p className="flex items-center gap-1"><Luggage className="size-3" />{offer.slices[0].segments[0].baggage}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{fr ? "Total" : "Total"}</p>
          <p className="text-xl font-bold text-primary">{money(offer.totalAmount, offer.currency)}</p>
          <Button size="sm" className="mt-1 rounded-full" onClick={onOpen}>{fr ? "Voir le vol" : "View Flight"}</Button>
        </div>
      </div>
    </article>
  );
}

function OfferSheet({ id, fr, onClose }: { id: string | null; fr: boolean; onClose: () => void }) {
  const fn = useServerFn(getFlightOffer);
  const q = useQuery({ queryKey: ["flight-offer", id], queryFn: () => fn({ data: { id: id! } }), enabled: !!id, staleTime: 0, gcTime: 0 });
  const offer = q.data?.available ? q.data.offer : null;
  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-2xl">
        <SheetHeader><SheetTitle>{fr ? "Détails du vol" : "Flight details"}</SheetTitle></SheetHeader>
        {q.isLoading && <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{fr ? "Vérification du prix en direct…" : "Checking the latest live price…"}</p>}
        {q.error && <p className="py-6 text-sm text-destructive">{fr ? "Cette offre n’est plus disponible. Relancez la recherche." : "This offer is no longer available. Please search again."}</p>}
        {offer && (
          <div className="mx-auto max-w-2xl space-y-5 pb-6">
            {offer.slices.map((s, i) => (
              <div key={i} className="space-y-2">
                <p className="text-sm font-semibold">{s.from} → {s.to} · {fmtDur(isoDur(s.duration))}</p>
                <ol className="space-y-2 border-l-2 border-primary/40 pl-4">
                  {s.segments.map((g, j) => {
                    const next = s.segments[j + 1];
                    const lay = next ? Math.round((+new Date(next.departAt) - +new Date(g.arriveAt)) / 60000) : 0;
                    return (
                      <li key={j} className="space-y-1">
                        <div className="rounded-xl bg-muted/50 p-3 text-sm">
                          <p className="font-semibold">{g.airline} · <span className="font-mono">{g.flightNumber}</span>{g.aircraft ? ` · ${g.aircraft}` : ""}</p>
                          <p>{time(g.departAt)} {g.fromName} ({g.from}) → {time(g.arriveAt)} {g.toName} ({g.to})</p>
                          <p className="text-xs text-muted-foreground">{day(g.departAt)}{g.cabin ? ` · ${g.cabin}` : ""}{g.baggage ? ` · ${g.baggage}` : ""}</p>
                        </div>
                        {next && <p className="text-xs text-muted-foreground">{fr ? "Escale" : "Layover"} {g.toName}: {fmtDur(lay)}</p>}
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
            <div className="space-y-1 rounded-xl border border-border p-3 text-sm">
              <p className="font-semibold">{fr ? "Conditions tarifaires" : "Fare conditions"}</p>
              {offer.conditionsText.length ? offer.conditionsText.map((c) => <p key={c}>{c}</p>) : <p className="text-muted-foreground">{fr ? "Non communiquées par la compagnie." : "Not provided by the airline."}</p>}
            </div>
            <div className="space-y-1 rounded-xl border border-border p-3 text-sm">
              {offer.baseAmount && <Row l={fr ? "Tarif" : "Flight fare"} v={money(offer.baseAmount, offer.currency)} />}
              {offer.taxAmount && <Row l={fr ? "Taxes et frais" : "Taxes & airline fees"} v={money(offer.taxAmount, offer.currency)} />}
              <Row l="Total" v={money(offer.totalAmount, offer.currency)} bold />
            </div>
            <div className="flex gap-2 rounded-xl bg-muted/50 p-3 text-sm">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <p>{fr ? "La réservation et le paiement ASH Flights ne sont pas encore activés. Aucun paiement ne sera demandé." : "ASH Flights booking and payment are not switched on yet. No payment will be taken."}</p>
            </div>
            <Button className="h-12 w-full rounded-xl" disabled>{fr ? "Continuer vers les passagers" : "Continue to Passenger Details"}</Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({ l, v, bold }: { l: string; v: string; bold?: boolean }) {
  return <div className={`flex justify-between ${bold ? "border-t border-border pt-1 font-bold" : ""}`}><span>{l}</span><span>{v}</span></div>;
}
