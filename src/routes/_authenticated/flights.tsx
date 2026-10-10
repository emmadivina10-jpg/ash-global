import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  ArrowRightLeft,
  Loader2,
  Plane,
  PlaneTakeoff,
  PlaneLanding,
  Minus,
  Plus,
  Luggage,
  ShieldCheck,
  Info,
  Ticket,
  LifeBuoy,
  BadgeCheck,
  Headphones,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import heroImg from "@/assets/feed-flight-banner.jpg";
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
      { title: "ASH Flights — Coming soon" },
      {
        name: "description",
        content:
          "Flight search and booking are coming soon to ASH Glo. Booking and payment are not enabled.",
      },
      { property: "og:title", content: "ASH Flights" },
      {
        property: "og:description",
        content: "Flight search and booking are coming soon to ASH Glo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FlightsPage,
});

type Trip = "round" | "oneway" | "multi";
type Cabin = "economy" | "premium_economy" | "business" | "first";
type Leg = { from: Place | null; to: Place | null; date: string };
const POPULAR: Place[] = [
  {
    code: "DLA",
    name: "Douala International Airport",
    city: "Douala",
    country: "Cameroon",
    type: "airport",
  },
  {
    code: "NSI",
    name: "Yaoundé Nsimalen International Airport",
    city: "Yaoundé",
    country: "Cameroon",
    type: "airport",
  },
  {
    code: "LOS",
    name: "Murtala Muhammed International Airport",
    city: "Lagos",
    country: "Nigeria",
    type: "airport",
  },
  {
    code: "YYZ",
    name: "Toronto Pearson International Airport",
    city: "Toronto",
    country: "Canada",
    type: "airport",
  },
  {
    code: "CDG",
    name: "Paris Charles de Gaulle Airport",
    city: "Paris",
    country: "France",
    type: "airport",
  },
  {
    code: "LHR",
    name: "London Heathrow Airport",
    city: "London",
    country: "United Kingdom",
    type: "airport",
  },
  {
    code: "DXB",
    name: "Dubai International Airport",
    city: "Dubai",
    country: "United Arab Emirates",
    type: "airport",
  },
];
type Sort = "recommended" | "cheapest" | "fastest" | "earliest" | "latest";

const isoDur = (d: string | null) => {
  if (!d) return 0;
  const m = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/.exec(d);
  return m ? +(m[1] ?? 0) * 1440 + +(m[2] ?? 0) * 60 + +(m[3] ?? 0) : 0;
};
const fmtDur = (min: number) => `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
const time = (s: string) => s.slice(11, 16);
const day = (s: string) =>
  new Date(s.slice(0, 10) + "T00:00:00").toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
const money = (a: string, c: string) =>
  `${c} ${Number(a).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const offerMinutes = (o: Offer) => o.slices.reduce((t, s) => t + isoDur(s.duration), 0);
const offerStops = (o: Offer) => Math.max(...o.slices.map((s) => s.segments.length - 1));

function FlightsPage() {
  const { tx, lang } = useI18n();
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
              ...(trip === "round"
                ? [{ origin: legs[0]!.to!.code, destination: legs[0]!.from!.code, date: ret }]
                : []),
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
      const minP = Math.min(...list.map(price)),
        minD = Math.min(...list.map(offerMinutes));
      list = [...list].sort(
        (a, b) =>
          price(a) / minP + offerMinutes(a) / minD - (price(b) / minP + offerMinutes(b) / minD),
      );
    }
    return list;
  }, [offers, sort, stopsFilter, airline, baggageOnly]);

  const unavailable = status.data && !status.data.available;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-28">
      <div className="relative isolate -mx-4 -mt-5 overflow-hidden sm:mx-0 sm:mt-0 sm:rounded-3xl">
        <img
          src={heroImg}
          alt=""
          width={1536}
          height={768}
          className="absolute inset-0 -z-10 size-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/10 via-background/40 to-background" />
        <header className="flex items-center gap-2 px-4 pt-4">
          <Button
            asChild
            variant="secondary"
            size="icon"
            className="size-10 rounded-full bg-card/80 backdrop-blur"
            aria-label={tx("Back to Feed", "Retour au fil")}
          >
            <Link to="/feed">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div className="flex-1" />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full bg-card/80 backdrop-blur"
              >
                <Ticket className="size-4" />
                {tx("My Trips", "Mes voyages")}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 text-sm">
              <p className="font-semibold">{tx("No trips yet", "Aucun voyage pour l’instant")}</p>
              <p className="text-muted-foreground">
                {tx("Flights you book with ASH will appear here.", "Vos vols réservés avec ASH apparaîtront ici.")}
              </p>
            </PopoverContent>
          </Popover>
          <Button
            asChild
            variant="secondary"
            size="icon"
            className="size-10 rounded-full bg-card/80 backdrop-blur"
            aria-label={tx("Help", "Aide")}
          >
            <Link to="/support">
              <LifeBuoy className="size-5" />
            </Link>
          </Button>
        </header>
        <div className="px-5 pb-24 pt-10 sm:px-8">
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-card/80 px-3 py-1 text-[11px] font-bold tracking-wider text-primary backdrop-blur">
            <Plane className="size-3.5" /> ASH FLIGHTS
          </p>
          <h1 className="max-w-sm font-display text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-4xl">
            {tx("Where to next?", "Où allez-vous ensuite ?")}
          </h1>
          <p className="mt-3 inline-flex rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
            {tx("Coming soon", "Bientôt disponible")}
          </p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {tx("Flight search and booking are coming to ASH.", "La recherche et la réservation de vols arrivent bientôt sur ASH.")}
          </p>
        </div>
      </div>

      <div className="relative z-10 -mt-24 space-y-4 px-0">
        <section className="space-y-4 rounded-3xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur-xl sm:p-6">
          <div className="grid grid-cols-3 rounded-full bg-muted p-1 text-sm">
            {(["round", "oneway", "multi"] as Trip[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTrip(t);
                  if (t === "multi" && legs.length < 2)
                    setLegs([...legs, { from: legs[0]!.to, to: null, date: "" }]);
                }}
                className={`rounded-full px-2 py-2 font-semibold transition-all ${trip === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t === "round"
                  ? tx("Round trip", "Aller-retour")
                  : t === "oneway"
                    ? tx("One way", "Aller simple")
                    : tx("Multi-city", "Multi-villes")}
              </button>
            ))}
          </div>

          {activeLegs.map((leg, i) => (
            <div key={i} className="space-y-3">
              {trip === "multi" && (
                <p className="text-xs font-semibold text-muted-foreground">
                  {tx("Flight", "Vol")} {i + 1}
                </p>
              )}
              <div className="relative grid gap-2 sm:grid-cols-2">
                <PlacePicker
                  label={tx("FROM", "DE")}
                  icon={<PlaneTakeoff className="size-4" />}
                  value={leg.from}
                  disabled={!!unavailable}
                  fr={fr}
                  onChange={(p) => setLegs(legs.map((l, j) => (j === i ? { ...l, from: p } : l)))}
                />
                <PlacePicker
                  label={tx("TO", "VERS")}
                  icon={<PlaneLanding className="size-4" />}
                  value={leg.to}
                  disabled={!!unavailable}
                  fr={fr}
                  onChange={(p) => setLegs(legs.map((l, j) => (j === i ? { ...l, to: p } : l)))}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={tx("Swap", "Inverser")}
                  className="absolute right-4 top-1/2 z-10 size-9 -translate-y-1/2 rotate-90 rounded-full bg-card shadow-md sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:rotate-0"
                  onClick={() =>
                    setLegs(legs.map((l, j) => (j === i ? { ...l, from: l.to, to: l.from } : l)))
                  }
                >
                  <ArrowRightLeft className="size-3.5" />
                </Button>
              </div>
              <div className="grid min-w-0 grid-cols-1 gap-2">
                <Field label={tx("DEPARTURE", "DÉPART")}>
                  <Input
                    type="date"
                    className="block h-12 min-w-0 w-full max-w-full appearance-none [&::-webkit-date-and-time-value]:min-w-0 [&::-webkit-date-and-time-value]:text-left"
                    min={i > 0 ? legs[i - 1]?.date || today : today}
                    value={leg.date}
                    onChange={(e) =>
                      setLegs(legs.map((l, j) => (j === i ? { ...l, date: e.target.value } : l)))
                    }
                  />
                </Field>
                {trip !== "multi" && (
                  <Field label={tx("RETURN", "RETOUR")}>
                    <Input
                      type="date"
                      className="block h-12 min-w-0 w-full max-w-full appearance-none [&::-webkit-date-and-time-value]:min-w-0 [&::-webkit-date-and-time-value]:text-left"
                      disabled={trip === "oneway"}
                      min={leg.date || today}
                      value={trip === "oneway" ? "" : ret}
                      onChange={(e) => setRet(e.target.value)}
                    />
                  </Field>
                )}
              </div>
            </div>
          ))}
          {trip === "multi" && (
            <div className="flex gap-2">
              {legs.length < 4 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLegs([...legs, { from: legs.at(-1)!.to, to: null, date: "" }])}
                >
                  {tx("Add flight", "Ajouter un vol")}
                </Button>
              )}
              {legs.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setLegs(legs.slice(0, -1))}
                >
                  {tx("Remove", "Retirer")}
                </Button>
              )}
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <Field label={tx("PASSENGERS", "PASSAGERS")}>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start font-normal"
                  >
                    {pax.adults + pax.children + pax.infants} {tx("passenger(s)", "passager(s)")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 space-y-3">
                  {(
                    [
                      ["adults", tx("Adults", "Adultes"), "12+", 1],
                      ["children", tx("Children", "Enfants"), "2–11", 0],
                      ["infants", tx("Infants", "Bébés"), "<2", 0],
                    ] as const
                  ).map(([k, l, sub, min]) => (
                    <div key={k} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{l}</p>
                        <p className="text-xs text-muted-foreground">{sub}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="size-8 rounded-full"
                          disabled={pax[k] <= min}
                          onClick={() => setPax({ ...pax, [k]: pax[k] - 1 })}
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-4 text-center text-sm">{pax[k]}</span>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="size-8 rounded-full"
                          disabled={
                            pax.adults + pax.children + pax.infants >= 9 ||
                            (k === "infants" && pax.infants >= pax.adults)
                          }
                          onClick={() => setPax({ ...pax, [k]: pax[k] + 1 })}
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </PopoverContent>
              </Popover>
            </Field>
            <Field label={tx("CABIN CLASS", "CLASSE")}>
              <Select value={cabin} onValueChange={(v) => setCabin(v as Cabin)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="economy">{tx("Economy", "Économique")}</SelectItem>
                  <SelectItem value="premium_economy">
                    {tx("Premium Economy", "Économique premium")}
                  </SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                  <SelectItem value="first">{tx("First", "Première")}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Button
            className="h-14 w-full rounded-2xl text-base font-bold shadow-lg shadow-primary/25 transition-transform active:scale-[0.98]"
            disabled={!valid || search.isPending || !!unavailable}
            onClick={() => search.mutate()}
          >
            {search.isPending ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Plane className="size-5" />
            )}
            {search.isPending
              ? tx("Finding the best flights…", "Recherche des meilleurs vols…")
              : tx("Search Flights", "Rechercher des vols")}
          </Button>
        </section>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { icon: BadgeCheck, t: tx("Live airline prices", "Prix en direct des compagnies") },
          { icon: ShieldCheck, t: tx("Transparent ASH fees", "Frais ASH transparents") },
          { icon: Headphones, t: tx("ASH Support help", "Aide ASH Support") },
        ].map(({ icon: I, t }) => (
          <div key={t} className="rounded-2xl border border-border bg-card px-2 py-3">
            <I className="mx-auto mb-1 size-5 text-primary" />
            <p className="text-[11px] font-semibold leading-tight">{t}</p>
          </div>
        ))}
      </div>

      {unavailable && (
        <div
          role="status"
          className="flex gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm"
        >
          <Info className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="font-semibold">
              {tx("Live flight search is currently unavailable.", "La recherche de vols en direct est momentanément indisponible.")}
            </p>
            <p className="text-muted-foreground">
              {tx("ASH never shows invented flights or prices. Search turns on as soon as our flight provider is connected.", "ASH n’affiche jamais de vols ou de prix inventés. La recherche s’activera dès que le fournisseur sera connecté.")}
            </p>
          </div>
        </div>
      )}

      {search.error && (
        <p className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {(search.error as Error).message}
        </p>
      )}
      {search.data && !search.data.available && (
        <p className="rounded-2xl border border-border p-4 text-sm">
          {tx("Flight search temporarily unavailable.", "Recherche de vols momentanément indisponible.")}
        </p>
      )}

      {search.isPending && (
        <div className="space-y-3" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-3xl border border-border bg-muted/60"
            />
          ))}
        </div>
      )}

      {!search.data && !search.isPending && (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold">
            {tx("Popular destinations", "Destinations populaires")}
          </h2>
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
            {POPULAR.map((p) => (
              <button
                key={p.code}
                type="button"
                disabled={!!unavailable}
                onClick={() => setLegs(legs.map((l, j) => (j === 0 ? { ...l, to: p } : l)))}
                className="group w-36 shrink-0 snap-start rounded-2xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg disabled:opacity-60"
              >
                <p className="font-mono text-2xl font-extrabold text-primary">{p.code}</p>
                <p className="mt-1 truncate text-sm font-semibold">{p.city}</p>
                <p className="truncate text-xs text-muted-foreground">{p.country}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {search.data?.available && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold">
              {tx("Available Flights", "Vols disponibles")}{" "}
              <span className="text-sm font-normal text-muted-foreground">({shown.length})</span>
            </h2>
            <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recommended">{tx("Recommended", "Recommandés")}</SelectItem>
                <SelectItem value="cheapest">{tx("Cheapest", "Moins chers")}</SelectItem>
                <SelectItem value="fastest">{tx("Fastest", "Plus rapides")}</SelectItem>
                <SelectItem value="earliest">
                  {tx("Earliest departure", "Départ le plus tôt")}
                </SelectItem>
                <SelectItem value="latest">
                  {tx("Latest departure", "Départ le plus tard")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            {(["any", "0", "1", "2"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStopsFilter(s)}
                className={`rounded-full border px-3 py-1 ${stopsFilter === s ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
              >
                {s === "any"
                  ? tx("Any stops", "Toutes escales")
                  : s === "0"
                    ? tx("Nonstop", "Direct")
                    : s === "1"
                      ? tx("1 stop", "1 escale")
                      : tx("2+ stops", "2+ escales")}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setBaggageOnly(!baggageOnly)}
              className={`rounded-full border px-3 py-1 ${baggageOnly ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
            >
              {tx("Checked bag", "Bagage en soute")}
            </button>
            {airlines.length > 1 && (
              <Select value={airline} onValueChange={setAirline}>
                <SelectTrigger className="h-8 w-44 rounded-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tx("All airlines", "Toutes compagnies")}</SelectItem>
                  {airlines.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          {shown.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {tx("No flights match this search.", "Aucun vol trouvé pour ces critères.")}
            </p>
          )}
          {shown.map((o) => (
            <OfferCard key={o.id} offer={o} fr={fr} onOpen={() => setSelected(o.id)} />
          ))}
        </section>
      )}

      <OfferSheet id={selected} fr={fr} onClose={() => setSelected(null)} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0 max-w-full space-y-1">
      <span className="text-[11px] font-semibold tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function PlacePicker({
  label,
  icon,
  value,
  onChange,
  disabled,
  fr,
}: {
  label: string;
  icon: React.ReactNode;
  value: Place | null;
  onChange: (p: Place) => void;
  disabled: boolean;
  fr: boolean;
}) {
  const fn = useServerFn(searchPlaces);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  const res = useQuery({
    queryKey: ["places", debounced],
    queryFn: () => fn({ data: { query: debounced } }),
    enabled: open && debounced.length >= 2,
  });
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-background p-3.5 text-left transition-colors hover:border-primary/50 disabled:opacity-60"
        >
          <span className="text-primary">{icon}</span>
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold tracking-wide text-muted-foreground">
              {label}
            </span>
            <span className="block truncate font-medium">
              {value
                ? `${value.city} (${value.code})`
                : fr
                  ? "Ville ou aéroport"
                  : "City or airport"}
            </span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(22rem,calc(100vw-2rem))] p-2" align="start">
        <Input
          autoFocus
          placeholder={fr ? "Ville, aéroport, code, pays" : "City, airport, code or country"}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="mt-2 max-h-72 overflow-y-auto">
          {res.isFetching && <Loader2 className="mx-auto my-4 size-4 animate-spin" />}
          {res.data && !res.data.available && (
            <p className="p-3 text-sm text-muted-foreground">
              {fr ? "Recherche indisponible." : "Search unavailable."}
            </p>
          )}
          {res.data?.available && res.data.places.length === 0 && (
            <p className="p-3 text-sm text-muted-foreground">
              {fr ? "Aucun résultat" : "No results"}
            </p>
          )}
          {res.data?.available &&
            res.data.places.map((p) => (
              <button
                key={p.code + p.type}
                type="button"
                onClick={() => {
                  onChange(p);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 rounded-lg p-2 text-left hover:bg-muted"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{p.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {p.city}
                    {p.country ? `, ${p.country}` : ""}
                  </span>
                </span>
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
    <article className="rounded-3xl border border-border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl">
      <div className="mb-3 flex items-center gap-2">
        {offer.airlineLogo ? (
          <img src={offer.airlineLogo} alt="" className="size-6 object-contain" loading="lazy" />
        ) : (
          <Plane className="size-5 text-primary" />
        )}
        <span className="text-sm font-semibold">{offer.airline}</span>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {offer.slices[0]?.segments.map((s) => s.flightNumber).join(" · ")}
        </span>
      </div>
      <div className="space-y-3">
        {offer.slices.map((s, i) => {
          const first = s.segments[0]!,
            last = s.segments.at(-1)!;
          const stops = s.segments.length - 1;
          return (
            <div key={i} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
              <div>
                <p className="text-lg font-bold">{time(first.departAt)}</p>
                <p className="text-xs text-muted-foreground">
                  {first.from} · {day(first.departAt)}
                </p>
              </div>
              <div className="text-center text-xs text-muted-foreground">
                <p>{fmtDur(isoDur(s.duration))}</p>
                <div className="relative my-1 h-px bg-border">
                  <Plane className="absolute left-1/2 top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rotate-90 bg-card text-primary" />
                </div>
                <p>
                  {stops === 0
                    ? fr
                      ? "Direct"
                      : "Nonstop"
                    : `${stops} ${fr ? "escale(s)" : stops === 1 ? "stop" : "stops"}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{time(last.arriveAt)}</p>
                <p className="text-xs text-muted-foreground">
                  {last.to} · {day(last.arriveAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-end justify-between border-t border-border pt-3">
        <div className="text-xs text-muted-foreground">
          {offer.slices[0]?.segments[0]?.cabin && <p>{offer.slices[0].segments[0].cabin}</p>}
          {offer.slices[0]?.segments[0]?.baggage && (
            <p className="flex items-center gap-1">
              <Luggage className="size-3" />
              {offer.slices[0].segments[0].baggage}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{fr ? "Total" : "Total"}</p>
          <p className="text-xl font-bold text-primary">
            {money(offer.totalAmount, offer.currency)}
          </p>
          <Button size="sm" className="mt-1 rounded-full" onClick={onOpen}>
            {fr ? "Voir le vol" : "View Flight"}
          </Button>
        </div>
      </div>
    </article>
  );
}

function OfferSheet({ id, fr, onClose }: { id: string | null; fr: boolean; onClose: () => void }) {
  const fn = useServerFn(getFlightOffer);
  const q = useQuery({
    queryKey: ["flight-offer", id],
    queryFn: () => fn({ data: { id: id! } }),
    enabled: !!id,
    staleTime: 0,
    gcTime: 0,
  });
  const offer = q.data?.available ? q.data.offer : null;
  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{fr ? "Détails du vol" : "Flight details"}</SheetTitle>
        </SheetHeader>
        {q.isLoading && (
          <p className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {fr ? "Vérification du prix en direct…" : "Checking the latest live price…"}
          </p>
        )}
        {q.error && (
          <p className="py-6 text-sm text-destructive">
            {fr
              ? "Cette offre n’est plus disponible. Relancez la recherche."
              : "This offer is no longer available. Please search again."}
          </p>
        )}
        {offer && (
          <div className="mx-auto max-w-2xl space-y-5 pb-6">
            {offer.slices.map((s, i) => (
              <div key={i} className="space-y-2">
                <p className="text-sm font-semibold">
                  {s.from} → {s.to} · {fmtDur(isoDur(s.duration))}
                </p>
                <ol className="space-y-2 border-l-2 border-primary/40 pl-4">
                  {s.segments.map((g, j) => {
                    const next = s.segments[j + 1];
                    const lay = next
                      ? Math.round((+new Date(next.departAt) - +new Date(g.arriveAt)) / 60000)
                      : 0;
                    return (
                      <li key={j} className="space-y-1">
                        <div className="rounded-xl bg-muted/50 p-3 text-sm">
                          <p className="font-semibold">
                            {g.airline} · <span className="font-mono">{g.flightNumber}</span>
                            {g.aircraft ? ` · ${g.aircraft}` : ""}
                          </p>
                          <p>
                            {time(g.departAt)} {g.fromName} ({g.from}) → {time(g.arriveAt)}{" "}
                            {g.toName} ({g.to})
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {day(g.departAt)}
                            {g.cabin ? ` · ${g.cabin}` : ""}
                            {g.baggage ? ` · ${g.baggage}` : ""}
                          </p>
                        </div>
                        {next && (
                          <p className="text-xs text-muted-foreground">
                            {fr ? "Escale" : "Layover"} {g.toName}: {fmtDur(lay)}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
            <div className="space-y-1 rounded-xl border border-border p-3 text-sm">
              <p className="font-semibold">{fr ? "Conditions tarifaires" : "Fare conditions"}</p>
              {offer.conditionsText.length ? (
                offer.conditionsText.map((c) => <p key={c}>{c}</p>)
              ) : (
                <p className="text-muted-foreground">
                  {fr ? "Non communiquées par la compagnie." : "Not provided by the airline."}
                </p>
              )}
            </div>
            <div className="space-y-1 rounded-xl border border-border p-3 text-sm">
              {offer.baseAmount && (
                <Row l={fr ? "Tarif" : "Flight fare"} v={money(offer.baseAmount, offer.currency)} />
              )}
              {offer.taxAmount && (
                <Row
                  l={fr ? "Taxes et frais" : "Taxes & airline fees"}
                  v={money(offer.taxAmount, offer.currency)}
                />
              )}
              <Row l="Total" v={money(offer.totalAmount, offer.currency)} bold />
            </div>
            <div className="flex gap-2 rounded-xl bg-muted/50 p-3 text-sm">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <p>
                {fr
                  ? "La réservation et le paiement ASH Flights ne sont pas encore activés. Aucun paiement ne sera demandé."
                  : "ASH Flights booking and payment are not switched on yet. No payment will be taken."}
              </p>
            </div>
            <Button className="h-12 w-full rounded-xl" disabled>
              {fr ? "Continuer vers les passagers" : "Continue to Passenger Details"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Row({ l, v, bold }: { l: string; v: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "border-t border-border pt-1 font-bold" : ""}`}>
      <span>{l}</span>
      <span>{v}</span>
    </div>
  );
}
