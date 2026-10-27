import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import {
  Store,
  Search,
  MapPin,
  Plus,
  UserRound,
  MessageCircle,
  House,
  Tag,
  Sparkles,
  ImageOff,
  LayoutGrid,
  UtensilsCrossed,
  Smartphone,
  Shirt,
  Hammer,
  PartyPopper,
  HeartPulse,
  Briefcase,
  X,
  Star,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { CATEGORY_GROUPS, categoryLabel } from "@/lib/taxonomy";
import { rotateSessionContent } from "@/lib/rotation";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MarketCart } from "./MarketCart";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useDeals, type Deal } from "@/lib/ash.queries";
import { usePropertyListings } from "@/lib/property.queries";
import { formatPropertyPrice } from "@/lib/property";
import { type DiscoveryProvider } from "@/lib/discovery.queries";
import { claimDeal } from "@/lib/commerce.functions";
import { useI18n } from "@/lib/i18n";
import { useRegion } from "@/lib/region-context";
import { formatXAF } from "@/lib/format";
import { playTabSound } from "@/lib/sound";

type Listing = {
  id: string;
  kind: "property" | "service" | "deal";
  title: string;
  city: string;
  image: string | null;
  price: number | null;
  priceLabel: string;
  date: string;
  deal?: Deal;
  cats?: string[];
  rating?: number;
  ratingCount?: number;
};

const FOOD_CATS = ["PRIVATE_CHEF", "CATERING"];
const groupCats = (id: string): string[] =>
  CATEGORY_GROUPS.find((g) => g.id === id)?.categories ?? [];

function BlurModal({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/40 backdrop-blur-md data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-border bg-card p-5 shadow-2xl duration-300 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95">
          <div className="mb-4 flex items-center justify-between">
            <DialogPrimitive.Title className="font-display text-lg font-bold text-foreground">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="grid size-8 place-items-center rounded-full bg-muted text-foreground"
              aria-label="Close"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function RoundIcon({
  icon: Icon,
  label,
  active,
  onClick,
  delay = 0,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
  delay?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{ animationDelay: `${delay}ms` }}
      className="flex w-16 shrink-0 flex-col items-center gap-1.5 animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both duration-500"
    >
      <span
        className={cn(
          "grid size-14 place-items-center rounded-full ring-1 transition-colors",
          active
            ? "bg-primary text-primary-foreground ring-primary"
            : "bg-muted text-foreground ring-border",
        )}
      >
        <Icon className="size-6" aria-hidden />
      </span>
      <span
        className={cn(
          "line-clamp-1 text-[11px] font-medium",
          active ? "text-primary" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </button>
  );
}

export function MarketBrowser({
  providers,
  loadingProviders,
  providerError,
  hasMore,
  loadMore,
  loadingMore,
}: {
  providers: DiscoveryProvider[];
  loadingProviders: boolean;
  providerError: boolean;
  hasMore: boolean;
  loadMore: () => void;
  loadingMore: boolean;
}) {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const region = useRegion();
  const deals = useDeals();
  const properties = usePropertyListings(region.seesEverything ? {} : { country: region.country });
  const claim = useServerFn(claimDeal);
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [city, setCity] = useState("");
  const [kind, setKind] = useState("all");
    const [sellOpen, setSellOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);
  const [cityDraft, setCityDraft] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("recent");
  const [selected, setSelected] = useState<Deal | null>(null);
  const [claiming, setClaiming] = useState(false);
  const listings = useMemo(() => {
    const items: Listing[] = providers.map((p) => ({
      id: p.id,
      kind: "service",
      title: p.business_name,
      city: p.city ?? "",
      image: p.photos[0]?.url ?? null,
      price: p.fromPrice,
      priceLabel:
        p.fromPrice === null
          ? tx("View services", "Voir les services")
          : `${tx("From", "Dès")} ${formatXAF(p.fromPrice)}`,
      date: p.created_at,
      cats: (p.categories ?? []) as string[],
      rating: Number(p.rating_avg),
      ratingCount: Number(p.rating_count),
    }));
    for (const p of properties.data ?? [])
      items.push({
        id: p.id,
        kind: "property",
        title: p.title,
        city: p.city,
        image: p.cover,
        price: p.price,
        priceLabel: formatPropertyPrice(p.price, p.currency, p.price_period, fr),
        date: p.created_at,
      });
    for (const d of deals.data ?? []) {
      if (!region.seesEverything && d.country !== region.country) continue;
      items.push({
        id: d.id,
        kind: "deal",
        title: d.title,
        city: d.city ?? "",
        image: null,
        price: d.deal_price,
        priceLabel: formatXAF(d.deal_price),
        date: d.starts_at,
        deal: d,
      });
    }
    // Never show a listing without a photo.
    return items.filter((l) => Boolean(l.image));
  }, [providers, properties.data, deals.data, fr, region.country, region.seesEverything]);
  const SVC_GROUPS: Record<string, string[]> = {
    food: FOOD_CATS,
    electronics: groupCats("TECH"),
    fashion: groupCats("BEAUTY"),
    home: groupCats("HOME"),
    events: groupCats("EVENTS"),
    health: groupCats("HEALTH"),
    pro: groupCats("PROFESSIONAL"),
  };
  const matchKind = (l: Listing) =>
    kind === "all" ||
    kind === l.kind ||
    // A vendor belongs only to the section of its main category.
    (l.kind === "service" && Boolean(l.cats?.[0] && SVC_GROUPS[kind]?.includes(l.cats[0])));
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const area = city.trim().toLowerCase();
    const rows = listings.filter(
      (l) =>
        matchKind(l) &&
        (!term || `${l.title} ${l.city}`.toLowerCase().includes(term)) &&
        (!area || l.city.toLowerCase().includes(area)) &&
        (!maxPrice || (l.price !== null && l.price <= Number(maxPrice))),
    );
    if (sort === "recent")
      return rotateSessionContent(
        "market",
        rows.map((l) => ({
          item: l,
          id: `${l.kind}-${l.id}`,
          creator: `${l.kind}-${l.id}`,
          relevance: Math.max(0, 1 - (Date.now() - Date.parse(l.date)) / (90 * 864e5)),
        })),
        null,
      );
    return rows.sort((a, b) =>
      sort === "low"
        ? (a.price ?? Infinity) - (b.price ?? Infinity)
        : sort === "high"
          ? (b.price ?? -Infinity) - (a.price ?? -Infinity)
          : Date.parse(b.date) - Date.parse(a.date),
    );
  }, [listings, query, city, kind, maxPrice, sort]);
  const categories = [
    { value: "all", label: tx("All", "Tout"), icon: Store },
    { value: "food", label: tx("Food", "Cuisine"), icon: UtensilsCrossed },
    { value: "electronics", label: tx("Tech", "Tech"), icon: Smartphone },
    { value: "fashion", label: tx("Beauty", "Beauté"), icon: Shirt },
    { value: "home", label: tx("Home", "Maison"), icon: Hammer },
    { value: "events", label: tx("Events", "Événements"), icon: PartyPopper },
    { value: "health", label: tx("Health", "Santé"), icon: HeartPulse },
    { value: "pro", label: tx("Pro", "Pro"), icon: Briefcase },
    { value: "property", label: tx("Homes", "Maisons"), icon: House },
    { value: "deal", label: tx("Deals", "Offres"), icon: Tag },
    { value: "service", label: "Services", icon: Sparkles },
  ];
  const citySuggestions = useMemo(
    () => Array.from(new Set(listings.map((l) => l.city.trim()).filter(Boolean))).slice(0, 10),
    [listings],
  );
  const isLoading = loadingProviders || properties.isLoading || deals.isLoading;
  const hasError = providerError || properties.isError || deals.isError;
  async function onClaim() {
    if (!selected || claiming) return;
    setClaiming(true);
    try {
      const result = await claim({ data: { dealId: selected.id } });
      if (!result.ok) {
        toast.error(tx("This deal is no longer available.", "Cette offre n’est plus disponible."));
        return;
      }
      toast.success(`${tx("Your code", "Votre code")}: ${result.code}`, {
        description: tx("Show this code to the business.", "Présentez ce code au commerce."),
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["deals"] }),
        queryClient.invalidateQueries({ queryKey: ["deal-claims"] }),
      ]);
      setSelected(null);
    } catch {
      toast.error(tx("Could not claim this deal.", "Impossible de réclamer cette offre."));
    } finally {
      setClaiming(false);
    }
  }
  const listingContent = (l: Listing) => (
    <>
      <div className="relative aspect-square overflow-hidden bg-muted">
        {l.image ? (
          <img
            src={l.image}
            alt={l.title}
            loading="lazy"
            className="size-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageOff className="size-8" aria-hidden />
            <span className="text-xs">{tx("No photo", "Sans photo")}</span>
          </div>
        )}
      </div>
      <div className="space-y-0.5 px-1.5 py-2 text-left">
        <h3 className="line-clamp-2 text-sm font-semibold text-foreground sm:text-base">
          {l.kind === "service" && l.cats?.[0] ? categoryLabel(l.cats[0], lang) : l.title}
        </h3>
        {l.kind === "service" && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="flex" aria-label={`${(l.rating ?? 0).toFixed(1)} / 5`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={cn(
                    "size-3",
                    n <= Math.round(l.rating ?? 0)
                      ? "fill-star text-star"
                      : "text-muted-foreground/40",
                  )}
                  aria-hidden
                />
              ))}
            </span>
            {(l.ratingCount ?? 0) > 0
              ? `${(l.rating ?? 0).toFixed(1)} (${l.ratingCount})`
              : tx("New", "Nouveau")}
          </p>
        )}
        <p className="truncate text-xs text-muted-foreground">
          {l.city || tx("Location not provided", "Lieu non précisé")}
        </p>
      </div>
    </>
  );
  return (
    <div className="member-market space-y-4">
      <header className="flex items-center justify-between gap-2">
        <h1 className="flex min-w-0 items-center gap-2 font-display text-3xl font-bold text-foreground">
          <Store className="size-7 shrink-0 text-primary" aria-hidden />
          Market
        </h1>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full"
            asChild
            title={tx("Wallet", "Portefeuille")}
          >
            <Link to="/wallet" aria-label={tx("Wallet", "Portefeuille")}>
              <Wallet />
            </Link>
          </Button>
          <MarketCart />
          {optionsOpen && typeof document !== "undefined"
            ? createPortal(
                <div
                  aria-hidden
                  className="market-options-backdrop fixed inset-0 z-40 bg-background/40 backdrop-blur-md"
                  onClick={() => setOptionsOpen(false)}
                />,
                document.body,
              )
            : null}
          <Popover open={optionsOpen} onOpenChange={setOptionsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="relative z-50 rounded-full"
                aria-label={tx("Market options", "Options Market")}
                title={tx("Market options", "Options Market")}
              >
                <UserRound />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={12}
              className="market-options w-[min(92vw,22rem)] origin-top-right overflow-hidden rounded-3xl border-border/60 bg-card/95 p-0 shadow-2xl backdrop-blur-xl"
            >
              <div className="border-b border-border/60 px-5 pb-3 pt-4">
                <p className="font-display text-lg font-bold text-foreground">
                  {tx("Your Market", "Votre Market")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {tx("Sell, filter and manage in one place", "Vendre, filtrer et gérer au même endroit")}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 p-4">
                {[
                  { icon: Plus, label: tx("Sell", "Vendre"), onClick: () => { setOptionsOpen(false); setSellOpen(true); } },
                  { icon: MapPin, label: city || tx("Location", "Lieu"), onClick: () => { setOptionsOpen(false); setCityDraft(city); setLocOpen(true); } },
                  { icon: House, label: tx("Homes", "Biens"), to: "/property/manage" as const },
                  { icon: Tag, label: tx("Deals", "Offres"), to: "/deals" as const },
                  { icon: Store, label: tx("My shop", "Ma boutique"), to: "/studio" as const },
                  { icon: Briefcase, label: tx("Bookings", "Réservations"), to: "/bookings" as const },
                ].map((item, i) => {
                  const inner = (
                    <>
                      <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                        <item.icon className="size-5" aria-hidden />
                      </span>
                      <span className="w-full truncate text-center text-[11px] font-semibold text-foreground">
                        {item.label}
                      </span>
                    </>
                  );
                  const cls =
                    "market-option-tile flex flex-col items-center gap-1.5 rounded-2xl p-2 transition-colors hover:bg-muted";
                  return item.to ? (
                    <Link key={item.to} to={item.to} className={cls} style={{ animationDelay: `${60 + i * 35}ms` }} onClick={() => setOptionsOpen(false)}>
                      {inner}
                    </Link>
                  ) : (
                    <button key={i} type="button" className={cls} style={{ animationDelay: `${60 + i * 35}ms` }} onClick={item.onClick}>
                      {inner}
                    </button>
                  );
                })}
              </div>
              <div className="space-y-3 border-t border-border/60 bg-muted/30 px-5 py-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="market-price" className="text-xs text-muted-foreground">
                      {tx("Max price", "Prix max")}
                    </Label>
                    <Input
                      id="market-price"
                      type="number"
                      min="0"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      placeholder="XAF"
                      className="h-10 rounded-xl bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{tx("Sort", "Trier")}</Label>
                    <Select value={sort} onValueChange={setSort}>
                      <SelectTrigger className="h-10 rounded-xl bg-background" aria-label={tx("Sort listings", "Trier les annonces")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[60]">
                        <SelectItem value="recent">{tx("For you", "Pour vous")}</SelectItem>
                        <SelectItem value="low">{tx("Price: low to high", "Prix croissant")}</SelectItem>
                        <SelectItem value="high">{tx("Price: high to low", "Prix décroissant")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <button
                  type="button"
                  className="text-xs font-bold text-primary"
                  onClick={() => {
                    setCity("");
                    setMaxPrice("");
                    setSort("recent");
                    setQuery("");
                    setKind("all");
                  }}
                >
                  {tx("Reset filters", "Réinitialiser les filtres")}
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </header>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-3 size-5 text-muted-foreground"
            aria-hidden
          />
          <Input
            aria-label={tx("Search Market", "Rechercher dans Market")}
            placeholder={tx("Search Market", "Rechercher dans Market")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 rounded-full bg-muted pl-10"
          />
        </div>
      </div>
      <nav
        aria-label={tx("Market categories", "Catégories Market")}
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]"
      >
        {categories.map((c) => (
          <RoundIcon
            key={c.value}
            icon={c.icon}
            label={c.label}
            active={kind === c.value}
            onClick={() => setKind(c.value)}
          />
        ))}
        <Link to="/services/extras" onClick={playTabSound} className="contents">
          <RoundIcon icon={LayoutGrid} label="Extras" />
        </Link>
      </nav>
      <div className="flex items-baseline justify-between gap-2 border-t border-border pt-4">
        <h2 className="text-lg font-bold text-foreground">
          {query ? tx("Search results", "Résultats") : tx("Today's picks", "À découvrir")}
        </h2>
        <span className="text-xs text-muted-foreground">
          {filtered.length} {tx("listings", "annonces")}
        </span>
      </div>
      {hasError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground"
        >
          <span>
            {tx(
              "Some listings could not be loaded.",
              "Certaines annonces n’ont pas pu être chargées.",
            )}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              void queryClient.resetQueries({
                predicate: (q) =>
                  ["deals", "property", "discovery"].includes(String(q.queryKey[0])),
              })
            }
          >
            {tx("Retry", "Réessayer")}
          </Button>
        </div>
      )}
      {isLoading && filtered.length === 0 ? (
        <div
          className="grid grid-cols-2 gap-3 sm:grid-cols-3"
          aria-label={tx("Loading listings", "Chargement des annonces")}
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="aspect-square animate-pulse bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          <Store className="size-10 text-muted-foreground" aria-hidden />
          <h3 className="font-semibold text-foreground">
            {tx("No listings found", "Aucune annonce trouvée")}
          </h3>
          <Button
            variant="outline"
            onClick={() => {
              setQuery("");
              setCity("");
              setMaxPrice("");
              setKind("all");
            }}
          >
            {tx("Show all listings", "Voir toutes les annonces")}
          </Button>
        </div>
      ) : (
        <div className="-mx-4 grid grid-cols-2 gap-x-1 gap-y-3 sm:mx-0 sm:grid-cols-3 xl:grid-cols-4">
          {filtered.map((l) =>
            l.kind === "property" ? (
              <Link
                key={`property-${l.id}`}
                to="/property/$listingId"
                params={{ listingId: l.id }}
                className="group min-w-0"
              >
                {listingContent(l)}
              </Link>
            ) : l.kind === "service" ? (
              <Link
                key={`service-${l.id}`}
                to="/services/$providerId"
                params={{ providerId: l.id }}
                className="group min-w-0"
              >
                {listingContent(l)}
              </Link>
            ) : (
              <Button
                key={`deal-${l.id}`}
                variant="ghost"
                onClick={() => setSelected(l.deal ?? null)}
                className="group block h-auto min-w-0 whitespace-normal p-0 hover:bg-transparent"
              >
                {listingContent(l)}
              </Button>
            ),
          )}
        </div>
      )}
      {hasMore && (kind === "all" || kind === "service") && (
        <Button variant="outline" className="w-full" disabled={loadingMore} onClick={loadMore}>
          {loadingMore ? tx("Loading…", "Chargement…") : tx("More services", "Plus de services")}
        </Button>
      )}
      <BlurModal
        open={sellOpen}
        onOpenChange={setSellOpen}
        title={tx("What are you selling?", "Que vendez-vous ?")}
      >
        <div className="grid grid-cols-3 justify-items-center gap-4">
          {(
            [
              { to: "/property/new", icon: House, label: tx("Property", "Immobilier") },
              { to: "/create", icon: Tag, label: tx("Deal", "Offre") },
              { to: "/studio", icon: Sparkles, label: tx("Service", "Service") },
              { to: "/studio", icon: UtensilsCrossed, label: tx("Food", "Cuisine") },
              { to: "/studio", icon: Smartphone, label: tx("Electronics", "Électronique") },
              { to: "/studio", icon: Shirt, label: tx("Fashion", "Mode") },
            ] as const
          ).map((o, i) => (
            <Link key={o.label} to={o.to} onClick={() => setSellOpen(false)} className="contents">
              <RoundIcon icon={o.icon} label={o.label} delay={i * 70} />
            </Link>
          ))}
        </div>
      </BlurModal>
      <BlurModal
        open={locOpen}
        onOpenChange={setLocOpen}
        title={tx("Change location", "Changer de lieu")}
      >
        <div className="space-y-4">
          <div className="relative">
            <MapPin
              className="pointer-events-none absolute left-3 top-3 size-5 text-muted-foreground"
              aria-hidden
            />
            <Input
              autoFocus
              aria-label={tx("City", "Ville")}
              value={cityDraft}
              onChange={(e) => setCityDraft(e.target.value)}
              placeholder={tx("Search a city", "Rechercher une ville")}
              className="h-11 rounded-full bg-muted pl-10"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setCity(cityDraft.trim());
                  setLocOpen(false);
                }
              }}
            />
          </div>
          {citySuggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {citySuggestions.map((c) => (
                <Button
                  key={c}
                  size="sm"
                  variant={cityDraft === c ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setCityDraft(c)}
                >
                  {c}
                </Button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              className="flex-1 rounded-full"
              onClick={() => {
                setCity("");
                setLocOpen(false);
              }}
            >
              {tx("All locations", "Tous les lieux")}
            </Button>
            <Button
              className="flex-1 rounded-full"
              onClick={() => {
                setCity(cityDraft.trim());
                setLocOpen(false);
              }}
            >
              {tx("Save", "Enregistrer")}
            </Button>
          </div>
        </div>
      </BlurModal>
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
            <DialogDescription>{selected?.city ?? selected?.country}</DialogDescription>
          </DialogHeader>
          <p className="text-2xl font-bold text-foreground">
            {selected ? formatXAF(selected.deal_price) : ""}
          </p>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {selected?.description}
          </p>
          <Button
            disabled={claiming || !selected || selected.claimed_count >= selected.claim_limit}
            onClick={() => void onClaim()}
          >
            {claiming ? tx("Claiming…", "Traitement…") : tx("Claim deal", "Réclamer l’offre")}
          </Button>
          <Button asChild variant="outline">
            <Link to="/deals">{tx("My deals & codes", "Mes offres et codes")}</Link>
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
