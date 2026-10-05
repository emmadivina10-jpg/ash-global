import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Store, Search, MapPin, Plus, UserRound, MessageCircle, SlidersHorizontal, House, Tag, Sparkles, ImageOff, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useDeals, type Deal } from "@/lib/ash.queries";
import { usePropertyListings } from "@/lib/property.queries";
import { formatPropertyPrice } from "@/lib/property";
import { type DiscoveryProvider } from "@/lib/discovery.queries";
import { claimDeal } from "@/lib/commerce.functions";
import { useI18n } from "@/lib/i18n";
import { useRegion } from "@/lib/region-context";
import { formatXAF } from "@/lib/format";
import { setServicesMode } from "@/lib/services-mode";
import { playTabSound } from "@/lib/sound";

type Listing = { id: string; kind: "property" | "service" | "deal"; title: string; city: string; image: string | null; price: number | null; priceLabel: string; date: string; deal?: Deal };

export function MarketBrowser({ providers, loadingProviders, providerError, hasMore, loadMore, loadingMore }: {
  providers: DiscoveryProvider[]; loadingProviders: boolean; providerError: boolean; hasMore: boolean; loadMore: () => void; loadingMore: boolean;
}) {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const region = useRegion();
  const deals = useDeals();
  const properties = usePropertyListings(region.seesEverything ? {} : { country: region.country });
  const claim = useServerFn(claimDeal);
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [kind, setKind] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("recent");
  const [selected, setSelected] = useState<Deal | null>(null);
  const [claiming, setClaiming] = useState(false);
  const listings = useMemo(() => {
    const items: Listing[] = providers.map((p) => ({ id: p.id, kind: "service", title: p.business_name, city: p.city ?? "", image: p.photos[0]?.url ?? null, price: p.fromPrice, priceLabel: p.fromPrice === null ? (fr ? "Voir les services" : "View services") : `${fr ? "Dès" : "From"} ${formatXAF(p.fromPrice)}`, date: p.created_at }));
    for (const p of properties.data ?? []) items.push({ id: p.id, kind: "property", title: p.title, city: p.city, image: p.cover, price: p.price, priceLabel: formatPropertyPrice(p.price, p.currency, p.price_period, fr), date: p.created_at });
    for (const d of deals.data ?? []) {
      if (!region.seesEverything && d.country !== region.country) continue;
      items.push({ id: d.id, kind: "deal", title: d.title, city: d.city ?? "", image: null, price: d.deal_price, priceLabel: formatXAF(d.deal_price), date: d.starts_at, deal: d });
    }
    return items;
  }, [providers, properties.data, deals.data, fr, region.country, region.seesEverything]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const area = city.trim().toLowerCase();
    const rows = listings.filter((l) => (kind === "all" || kind === l.kind) && (!term || `${l.title} ${l.city}`.toLowerCase().includes(term)) && (!area || l.city.toLowerCase().includes(area)) && (!maxPrice || (l.price !== null && l.price <= Number(maxPrice))));
    return rows.sort((a, b) => sort === "low" ? (a.price ?? Infinity) - (b.price ?? Infinity) : sort === "high" ? (b.price ?? -Infinity) - (a.price ?? -Infinity) : Date.parse(b.date) - Date.parse(a.date));
  }, [listings, query, city, kind, maxPrice, sort]);
  const categories = [
    { value: "all", label: fr ? "Tout" : "All", icon: Store },
    { value: "property", label: fr ? "Immobilier" : "Property", icon: House },
    { value: "deal", label: fr ? "Offres" : "Deals", icon: Tag },
    { value: "service", label: "Services", icon: Sparkles },
  ];
  const isLoading = loadingProviders || properties.isLoading || deals.isLoading;
  const hasError = providerError || properties.isError || deals.isError;
  async function onClaim() {
    if (!selected || claiming) return;
    setClaiming(true);
    try {
      const result = await claim({ data: { dealId: selected.id } });
      if (!result.ok) { toast.error(fr ? "Cette offre n’est plus disponible." : "This deal is no longer available."); return; }
      toast.success(`${fr ? "Votre code" : "Your code"}: ${result.code}`, { description: fr ? "Présentez ce code au commerce." : "Show this code to the business." });
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["deals"] }), queryClient.invalidateQueries({ queryKey: ["deal-claims"] })]);
      setSelected(null);
    } catch { toast.error(fr ? "Impossible de réclamer cette offre." : "Could not claim this deal."); }
    finally { setClaiming(false); }
  }
  const listingContent = (l: Listing) => <>
    <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
      {l.image ? <img src={l.image} alt={l.title} loading="lazy" className="size-full object-cover transition-transform duration-200 group-hover:scale-105" /> : <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground"><ImageOff className="size-8" aria-hidden /><span className="text-xs">{fr ? "Sans photo" : "No photo"}</span></div>}
      <span className="absolute bottom-2 left-2 rounded-md bg-background/95 px-2 py-1 text-[11px] font-semibold text-foreground">{categories.find((c) => c.value === l.kind)?.label}</span>
    </div>
    <div className="space-y-0.5 px-0.5 py-2 text-left"><p className="break-words text-sm font-bold text-foreground sm:text-base">{l.priceLabel}</p><h3 className="line-clamp-2 text-sm font-medium text-foreground">{l.title}</h3><p className="truncate text-xs text-muted-foreground">{l.city || (fr ? "Lieu non précisé" : "Location not provided")}</p></div>
  </>;
  return <div className="space-y-4">
    <header className="flex items-center justify-between gap-2">
      <h1 className="flex min-w-0 items-center gap-2 font-display text-3xl font-bold text-foreground"><Store className="size-7 shrink-0 text-primary" aria-hidden />Market</h1>
      <div className="flex shrink-0 gap-1">
        <Button variant="ghost" size="icon" className="rounded-full" title={fr ? "Retour aux services" : "Back to Services"} aria-label={fr ? "Retour aux services" : "Back to Services"} onClick={() => { playTabSound(); setServicesMode("services"); }}><ArrowLeft /></Button>
        <Button variant="secondary" size="icon" className="rounded-full" asChild title={fr ? "Messages" : "Messages"}><Link to="/messages" aria-label={fr ? "Messages Market" : "Market messages"}><MessageCircle /></Link></Button>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="secondary" size="icon" className="rounded-full" aria-label={fr ? "Votre activité Market" : "Your Market activity"} title={fr ? "Votre activité" : "Your activity"}><UserRound /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem asChild><Link to="/property/manage">{fr ? "Mes biens et favoris" : "My properties & saved homes"}</Link></DropdownMenuItem><DropdownMenuItem asChild><Link to="/deals">{fr ? "Mes offres et codes" : "My deals & codes"}</Link></DropdownMenuItem><DropdownMenuItem asChild><Link to="/studio">{fr ? "Mon commerce" : "My storefront"}</Link></DropdownMenuItem><DropdownMenuItem asChild><Link to="/bookings">{fr ? "Mes réservations" : "My bookings"}</Link></DropdownMenuItem></DropdownMenuContent></DropdownMenu>
      </div>
    </header>
    <div className="flex gap-2"><div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-3 size-5 text-muted-foreground" aria-hidden /><Input aria-label={fr ? "Rechercher dans Market" : "Search Market"} placeholder={fr ? "Rechercher dans Market" : "Search Market"} value={query} onChange={(e) => setQuery(e.target.value)} className="h-11 rounded-full bg-muted pl-10" /></div><Button variant="secondary" size="icon" className="size-11 rounded-full" aria-label={fr ? "Filtres Market" : "Market filters"} aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal /></Button></div>
    <div className="flex gap-2"><Button variant="secondary" className="min-w-0 flex-1 rounded-full" onClick={() => setSellOpen(true)}><Plus className="size-4" />{fr ? "Vendre" : "Sell"}</Button><Button variant="secondary" className="min-w-0 flex-1 rounded-full" onClick={() => setFiltersOpen(!filtersOpen)}><MapPin className="size-4 shrink-0" /><span className="truncate">{city || (fr ? "Localisation" : "Location")}</span></Button></div>
    <nav aria-label={fr ? "Catégories Market" : "Market categories"} className="flex gap-2 overflow-x-auto pb-1">{categories.map((c) => <Button key={c.value} variant={kind === c.value ? "default" : "outline"} className="shrink-0 rounded-full" aria-pressed={kind === c.value} onClick={() => setKind(c.value)}><c.icon className="size-4" />{c.label}</Button>)}</nav>
    {filtersOpen && <section className="grid gap-3 border-y border-border py-4 sm:grid-cols-3" aria-label={fr ? "Filtres" : "Filters"}><div className="space-y-1.5"><Label htmlFor="market-city">{fr ? "Ville" : "City"}</Label><Input id="market-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder={fr ? "Toutes les villes" : "All cities"} /></div><div className="space-y-1.5"><Label htmlFor="market-price">{fr ? "Prix maximum" : "Maximum price"}</Label><Input id="market-price" type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="XAF" /></div><div className="space-y-1.5"><Label>{fr ? "Trier" : "Sort"}</Label><Select value={sort} onValueChange={setSort}><SelectTrigger aria-label={fr ? "Trier les annonces" : "Sort listings"}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="recent">{fr ? "Plus récentes" : "Newest first"}</SelectItem><SelectItem value="low">{fr ? "Prix croissant" : "Price: low to high"}</SelectItem><SelectItem value="high">{fr ? "Prix décroissant" : "Price: high to low"}</SelectItem></SelectContent></Select></div><Button variant="ghost" className="justify-self-start" onClick={() => { setCity(""); setMaxPrice(""); setSort("recent"); setQuery(""); setKind("all"); }}>{fr ? "Réinitialiser" : "Reset filters"}</Button></section>}
    <div className="flex items-baseline justify-between gap-2 border-t border-border pt-4"><h2 className="text-lg font-bold text-foreground">{query ? (fr ? "Résultats" : "Search results") : (fr ? "À découvrir" : "Today's picks")}</h2><span className="text-xs text-muted-foreground">{filtered.length} {fr ? "annonces" : "listings"}</span></div>
    {hasError && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground"><span>{fr ? "Certaines annonces n’ont pas pu être chargées." : "Some listings could not be loaded."}</span><Button variant="outline" size="sm" onClick={() => void queryClient.resetQueries({ predicate: (q) => ["deals", "property", "discovery"].includes(String(q.queryKey[0])) })}>{fr ? "Réessayer" : "Retry"}</Button></div>}
    {isLoading && filtered.length === 0 ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label={fr ? "Chargement des annonces" : "Loading listings"}>{[0,1,2,3].map((i) => <div key={i} className="aspect-square animate-pulse rounded-lg bg-muted" />)}</div> : filtered.length === 0 ? <div className="flex flex-col items-center gap-3 py-14 text-center"><Store className="size-10 text-muted-foreground" aria-hidden /><h3 className="font-semibold text-foreground">{fr ? "Aucune annonce trouvée" : "No listings found"}</h3><Button variant="outline" onClick={() => { setQuery(""); setCity(""); setMaxPrice(""); setKind("all"); }}>{fr ? "Voir toutes les annonces" : "Show all listings"}</Button></div> : <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 xl:grid-cols-4">{filtered.map((l) => l.kind === "property" ? <Link key={`property-${l.id}`} to="/property/$listingId" params={{ listingId: l.id }} className="group min-w-0">{listingContent(l)}</Link> : l.kind === "service" ? <Link key={`service-${l.id}`} to="/services/$providerId" params={{ providerId: l.id }} className="group min-w-0">{listingContent(l)}</Link> : <Button key={`deal-${l.id}`} variant="ghost" onClick={() => setSelected(l.deal ?? null)} className="group block h-auto min-w-0 whitespace-normal p-0 hover:bg-transparent">{listingContent(l)}</Button>)}</div>}
    {hasMore && (kind === "all" || kind === "service") && <Button variant="outline" className="w-full" disabled={loadingMore} onClick={loadMore}>{loadingMore ? (fr ? "Chargement…" : "Loading…") : (fr ? "Plus de services" : "More services")}</Button>}
    <Dialog open={sellOpen} onOpenChange={setSellOpen}><DialogContent><DialogHeader><DialogTitle>{fr ? "Créer une annonce" : "Create a listing"}</DialogTitle><DialogDescription>{fr ? "Que souhaitez-vous proposer ?" : "What would you like to offer?"}</DialogDescription></DialogHeader><div className="grid gap-3"><Button asChild variant="outline" onClick={() => setSellOpen(false)}><Link to="/property/new"><House />{fr ? "Un bien immobilier" : "A property"}</Link></Button><Button asChild variant="outline" onClick={() => setSellOpen(false)}><Link to="/create"><Tag />{fr ? "Une offre" : "A deal"}</Link></Button><Button asChild variant="outline" onClick={() => setSellOpen(false)}><Link to="/studio"><Sparkles />{fr ? "Mes services" : "My services"}</Link></Button></div></DialogContent></Dialog>
    <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}><DialogContent><DialogHeader><DialogTitle>{selected?.title}</DialogTitle><DialogDescription>{selected?.city ?? selected?.country}</DialogDescription></DialogHeader><p className="text-2xl font-bold text-foreground">{selected ? formatXAF(selected.deal_price) : ""}</p><p className="whitespace-pre-wrap text-sm text-muted-foreground">{selected?.description}</p><Button disabled={claiming || !selected || selected.claimed_count >= selected.claim_limit} onClick={() => void onClaim()}>{claiming ? (fr ? "Traitement…" : "Claiming…") : (fr ? "Réclamer l’offre" : "Claim deal")}</Button><Button asChild variant="outline"><Link to="/deals">{fr ? "Mes offres et codes" : "My deals & codes"}</Link></Button></DialogContent></Dialog>
  </div>;
}