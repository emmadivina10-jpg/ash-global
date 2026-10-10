import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Store, Search, MapPin, Plus, UserRound, MessageCircle, SlidersHorizontal, House, Tag, Sparkles, ImageOff, LayoutGrid } from "lucide-react";
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
import { playTabSound } from "@/lib/sound";

type Listing = { id: string; kind: "property" | "service" | "deal"; title: string; city: string; image: string | null; price: number | null; priceLabel: string; date: string; deal?: Deal };

export function MarketBrowser({ providers, loadingProviders, providerError, hasMore, loadMore, loadingMore }: {
  providers: DiscoveryProvider[]; loadingProviders: boolean; providerError: boolean; hasMore: boolean; loadMore: () => void; loadingMore: boolean;
}) {
  const { tx, lang } = useI18n();
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
    const items: Listing[] = providers.map((p) => ({ id: p.id, kind: "service", title: p.business_name, city: p.city ?? "", image: p.photos[0]?.url ?? null, price: p.fromPrice, priceLabel: p.fromPrice === null ? (tx("View services", "Voir les services")) : `${tx("From", "Dès")} ${formatXAF(p.fromPrice)}`, date: p.created_at }));
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
    { value: "all", label: tx("All", "Tout"), icon: Store },
    { value: "property", label: tx("Property", "Immobilier"), icon: House },
    { value: "deal", label: tx("Deals", "Offres"), icon: Tag },
    { value: "service", label: "Services", icon: Sparkles },
  ];
  const isLoading = loadingProviders || properties.isLoading || deals.isLoading;
  const hasError = providerError || properties.isError || deals.isError;
  async function onClaim() {
    if (!selected || claiming) return;
    setClaiming(true);
    try {
      const result = await claim({ data: { dealId: selected.id } });
      if (!result.ok) { toast.error(tx("This deal is no longer available.", "Cette offre n’est plus disponible.")); return; }
      toast.success(`${tx("Your code", "Votre code")}: ${result.code}`, { description: tx("Show this code to the business.", "Présentez ce code au commerce.") });
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["deals"] }), queryClient.invalidateQueries({ queryKey: ["deal-claims"] })]);
      setSelected(null);
    } catch { toast.error(tx("Could not claim this deal.", "Impossible de réclamer cette offre.")); }
    finally { setClaiming(false); }
  }
  const listingContent = (l: Listing) => <>
    <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
      {l.image ? <img src={l.image} alt={l.title} loading="lazy" className="size-full object-cover transition-transform duration-200 group-hover:scale-105" /> : <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground"><ImageOff className="size-8" aria-hidden /><span className="text-xs">{tx("No photo", "Sans photo")}</span></div>}
      <span className="absolute bottom-2 left-2 rounded-md bg-background/95 px-2 py-1 text-[11px] font-semibold text-foreground">{categories.find((c) => c.value === l.kind)?.label}</span>
    </div>
    <div className="space-y-0.5 px-0.5 py-2 text-left"><p className="break-words text-sm font-bold text-foreground sm:text-base">{l.priceLabel}</p><h3 className="line-clamp-2 text-sm font-medium text-foreground">{l.title}</h3><p className="truncate text-xs text-muted-foreground">{l.city || (tx("Location not provided", "Lieu non précisé"))}</p></div>
  </>;
  return <div className="member-market space-y-4">
    <header className="flex items-center justify-between gap-2">
      <h1 className="flex min-w-0 items-center gap-2 font-display text-3xl font-bold text-foreground"><Store className="size-7 shrink-0 text-primary" aria-hidden />Market</h1>
      <div className="flex shrink-0 gap-1">
        <Button variant="secondary" size="icon" className="rounded-full" asChild title={tx("Messages", "Messages")}><Link to="/messages" aria-label={tx("Market messages", "Messages Market")}><MessageCircle /></Link></Button>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="secondary" size="icon" className="rounded-full" aria-label={tx("Your Market activity", "Votre activité Market")} title={tx("Your activity", "Votre activité")}><UserRound /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem asChild><Link to="/property/manage">{tx("My properties & saved homes", "Mes biens et favoris")}</Link></DropdownMenuItem><DropdownMenuItem asChild><Link to="/deals">{tx("My deals & codes", "Mes offres et codes")}</Link></DropdownMenuItem><DropdownMenuItem asChild><Link to="/studio">{tx("My storefront", "Mon commerce")}</Link></DropdownMenuItem><DropdownMenuItem asChild><Link to="/bookings">{tx("My bookings", "Mes réservations")}</Link></DropdownMenuItem></DropdownMenuContent></DropdownMenu>
      </div>
    </header>
    <div className="flex gap-2"><div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-3 size-5 text-muted-foreground" aria-hidden /><Input aria-label={tx("Search Market", "Rechercher dans Market")} placeholder={tx("Search Market", "Rechercher dans Market")} value={query} onChange={(e) => setQuery(e.target.value)} className="h-11 rounded-full bg-muted pl-10" /></div><Button variant="secondary" size="icon" className="size-11 rounded-full" aria-label={tx("Market filters", "Filtres Market")} aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal /></Button></div>
    <div className="flex gap-2"><Button variant="secondary" className="min-w-0 flex-1 rounded-full" onClick={() => setSellOpen(true)}><Plus className="size-4" />{tx("Sell", "Vendre")}</Button><Button variant="secondary" className="min-w-0 flex-1 rounded-full" onClick={() => setFiltersOpen(!filtersOpen)}><MapPin className="size-4 shrink-0" /><span className="truncate">{city || (tx("Location", "Localisation"))}</span></Button></div>
    <nav aria-label={tx("Market categories", "Catégories Market")} className="flex gap-2 overflow-x-auto pb-1">{categories.map((c) => <Button key={c.value} variant={kind === c.value ? "default" : "outline"} className="shrink-0 rounded-full" aria-pressed={kind === c.value} onClick={() => setKind(c.value)}><c.icon className="size-4" />{c.label}</Button>)}<Button asChild variant="outline" className="shrink-0 rounded-full" onClick={playTabSound}><Link to="/services/extras"><LayoutGrid className="size-4" />Extras</Link></Button></nav>
    {filtersOpen && <section className="grid gap-3 border-y border-border py-4 sm:grid-cols-3" aria-label={tx("Filters", "Filtres")}><div className="space-y-1.5"><Label htmlFor="market-city">{tx("City", "Ville")}</Label><Input id="market-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder={tx("All cities", "Toutes les villes")} /></div><div className="space-y-1.5"><Label htmlFor="market-price">{tx("Maximum price", "Prix maximum")}</Label><Input id="market-price" type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="XAF" /></div><div className="space-y-1.5"><Label>{tx("Sort", "Trier")}</Label><Select value={sort} onValueChange={setSort}><SelectTrigger aria-label={tx("Sort listings", "Trier les annonces")}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="recent">{tx("Newest first", "Plus récentes")}</SelectItem><SelectItem value="low">{tx("Price: low to high", "Prix croissant")}</SelectItem><SelectItem value="high">{tx("Price: high to low", "Prix décroissant")}</SelectItem></SelectContent></Select></div><Button variant="ghost" className="justify-self-start" onClick={() => { setCity(""); setMaxPrice(""); setSort("recent"); setQuery(""); setKind("all"); }}>{tx("Reset filters", "Réinitialiser")}</Button></section>}
    <div className="flex items-baseline justify-between gap-2 border-t border-border pt-4"><h2 className="text-lg font-bold text-foreground">{query ? (tx("Search results", "Résultats")) : (tx("Today's picks", "À découvrir"))}</h2><span className="text-xs text-muted-foreground">{filtered.length} {tx("listings", "annonces")}</span></div>
    {hasError && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground"><span>{tx("Some listings could not be loaded.", "Certaines annonces n’ont pas pu être chargées.")}</span><Button variant="outline" size="sm" onClick={() => void queryClient.resetQueries({ predicate: (q) => ["deals", "property", "discovery"].includes(String(q.queryKey[0])) })}>{tx("Retry", "Réessayer")}</Button></div>}
    {isLoading && filtered.length === 0 ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label={tx("Loading listings", "Chargement des annonces")}>{[0,1,2,3].map((i) => <div key={i} className="aspect-square animate-pulse rounded-lg bg-muted" />)}</div> : filtered.length === 0 ? <div className="flex flex-col items-center gap-3 py-14 text-center"><Store className="size-10 text-muted-foreground" aria-hidden /><h3 className="font-semibold text-foreground">{tx("No listings found", "Aucune annonce trouvée")}</h3><Button variant="outline" onClick={() => { setQuery(""); setCity(""); setMaxPrice(""); setKind("all"); }}>{tx("Show all listings", "Voir toutes les annonces")}</Button></div> : <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 xl:grid-cols-4">{filtered.map((l) => l.kind === "property" ? <Link key={`property-${l.id}`} to="/property/$listingId" params={{ listingId: l.id }} className="group min-w-0">{listingContent(l)}</Link> : l.kind === "service" ? <Link key={`service-${l.id}`} to="/services/$providerId" params={{ providerId: l.id }} className="group min-w-0">{listingContent(l)}</Link> : <Button key={`deal-${l.id}`} variant="ghost" onClick={() => setSelected(l.deal ?? null)} className="group block h-auto min-w-0 whitespace-normal p-0 hover:bg-transparent">{listingContent(l)}</Button>)}</div>}
    {hasMore && (kind === "all" || kind === "service") && <Button variant="outline" className="w-full" disabled={loadingMore} onClick={loadMore}>{loadingMore ? (tx("Loading…", "Chargement…")) : (tx("More services", "Plus de services"))}</Button>}
    <Dialog open={sellOpen} onOpenChange={setSellOpen}><DialogContent><DialogHeader><DialogTitle>{tx("Create a listing", "Créer une annonce")}</DialogTitle><DialogDescription>{tx("What would you like to offer?", "Que souhaitez-vous proposer ?")}</DialogDescription></DialogHeader><div className="grid gap-3"><Button asChild variant="outline" onClick={() => setSellOpen(false)}><Link to="/property/new"><House />{tx("A property", "Un bien immobilier")}</Link></Button><Button asChild variant="outline" onClick={() => setSellOpen(false)}><Link to="/create"><Tag />{tx("A deal", "Une offre")}</Link></Button><Button asChild variant="outline" onClick={() => setSellOpen(false)}><Link to="/studio"><Sparkles />{tx("My services", "Mes services")}</Link></Button></div></DialogContent></Dialog>
    <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}><DialogContent><DialogHeader><DialogTitle>{selected?.title}</DialogTitle><DialogDescription>{selected?.city ?? selected?.country}</DialogDescription></DialogHeader><p className="text-2xl font-bold text-foreground">{selected ? formatXAF(selected.deal_price) : ""}</p><p className="whitespace-pre-wrap text-sm text-muted-foreground">{selected?.description}</p><Button disabled={claiming || !selected || selected.claimed_count >= selected.claim_limit} onClick={() => void onClaim()}>{claiming ? (tx("Claiming…", "Traitement…")) : (tx("Claim deal", "Réclamer l’offre"))}</Button><Button asChild variant="outline"><Link to="/deals">{tx("My deals & codes", "Mes offres et codes")}</Link></Button></DialogContent></Dialog>
  </div>;
}