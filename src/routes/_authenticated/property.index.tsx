import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Home, Landmark, Plus, School, Search, SlidersHorizontal, Store } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PropertyCard } from "@/components/refer/PropertyCard";
import { EmptyState, LoadingState } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { usePropertyListings, useSavedIds, type PropertyFilters } from "@/lib/property.queries";
import { AMENITIES, PROPERTY_CATEGORIES, PROPERTY_LOCATIONS, STUDENT_AREAS } from "@/lib/property";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const TITLE = "ASH Property — Find a place. Find land. Find opportunities.";
const DESCRIPTION =
  "Search student housing, rooms, apartments, houses, commercial space and land on ASH. Free to browse, free to contact, free to list.";

export const Route = createFileRoute("/_authenticated/property/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PropertyLanding,
});

type TabKey = "STUDENT" | "RENT" | "BUY" | "LAND" | "COMMERCIAL";

const TABS: Array<{ key: TabKey; en: string; fr: string; icon: typeof Home }> = [
  { key: "STUDENT", en: "Student housing", fr: "Logement étudiant", icon: School },
  { key: "RENT", en: "Rent", fr: "Louer", icon: Home },
  { key: "BUY", en: "Buy", fr: "Acheter", icon: Building2 },
  { key: "LAND", en: "Land", fr: "Terrains", icon: Landmark },
  { key: "COMMERCIAL", en: "Commercial", fr: "Commercial", icon: Store },
];

function filtersFor(tab: TabKey): Pick<PropertyFilters, "kind" | "category"> {
  switch (tab) {
    case "STUDENT":
      return { category: "STUDENT_HOUSING" };
    case "BUY":
      return { kind: "SALE", category: "FOR_SALE" };
    case "LAND":
      return { kind: "SALE", category: "LAND" };
    case "COMMERCIAL":
      return { kind: "RENT", category: "COMMERCIAL" };
    default:
      return { kind: "RENT" };
  }
}

function PropertyLanding() {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [tab, setTab] = useState<TabKey>("STUDENT");
  const [term, setTerm] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("CM");
  const [category, setCategory] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [furnished, setFurnished] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<PropertyFilters["sort"]>("recent");

  const filters = useMemo<PropertyFilters>(() => {
    const base = filtersFor(tab);
    return {
      ...base,
      ...(category ? { category } : {}),
      ...(city ? { city } : {}),
      ...(country ? { country } : {}),
      ...(term ? { term } : {}),
      ...(maxPrice ? { maxPrice: Number(maxPrice) } : {}),
      ...(bedrooms ? { bedrooms: Number(bedrooms) } : {}),
      ...(furnished ? { furnished: true } : {}),
      ...(verifiedOnly ? { verifiedOnly: true } : {}),
      ...(amenities.length > 0 ? { amenities } : {}),
      ...(sort ? { sort } : {}),
    };
  }, [tab, category, city, country, term, maxPrice, bedrooms, furnished, verifiedOnly, amenities, sort]);

  const { data: listings, isLoading } = usePropertyListings(filters);
  const { data: savedIds } = useSavedIds();
  const saved = new Set(savedIds ?? []);

  async function toggleSave(listingId: string) {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    if (saved.has(listingId)) {
      await supabase.from("property_saves").delete().eq("listing_id", listingId).eq("user_id", auth.user.id);
      toast.success(tx("Removed from saved", "Retiré des favoris"));
    } else {
      const { error } = await supabase.from("property_saves").insert({ listing_id: listingId, user_id: auth.user.id });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(tx("Saved", "Enregistré"));
    }
    await queryClient.invalidateQueries({ queryKey: ["property"] });
  }

  const areas = STUDENT_AREAS.filter((area) => !city || area.city.toLowerCase() === city.toLowerCase());
  const cities = PROPERTY_LOCATIONS[country]?.cities ?? [];

  return (
    <div className="relative space-y-6">
      {/* Coming Soon overlay — keeps the existing Property experience intact underneath. */}
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/55 px-5 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="property-coming-soon-title"
      >
        <div className="w-full max-w-sm rounded-3xl border border-border/70 bg-card/95 p-8 text-center shadow-2xl backdrop-blur-xl">
          <h2
            id="property-coming-soon-title"
            className="font-display text-4xl font-black tracking-tight text-foreground sm:text-5xl"
          >
            Coming Soon!
          </h2>
          <Button
            className="mt-7 h-11 w-full rounded-xl text-sm font-bold"
            onClick={() => void navigate({ to: "/feed" })}
          >
            {tx("Return to Feed", "Retour au fil")}
          </Button>
        </div>
      </div>
      <header className="tile overflow-hidden p-5 sm:p-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">ASH Property</p>
        <h1 className="mt-1 font-display text-2xl font-extrabold text-foreground sm:text-3xl">
          {tx("Find a place. Find land. Find opportunities.", "Trouvez un logement. Trouvez un terrain.")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {tx("Searching, browsing and contacting is completely free — and listing your property is free too.", "Recherche, consultation et contact 100% gratuits. Publier une annonce est également gratuit.")}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setTab(item.key);
                setCategory("");
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border border-border px-3.5 py-2 text-xs font-semibold transition-colors",
                tab === item.key
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              <item.icon className="size-3.5" aria-hidden />
              {fr ? item.fr : item.en}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              className="pl-9"
              placeholder={
                tx("Where are you looking? City, neighborhood or university", "Où cherchez-vous ? Ville, quartier, université")
              }
              aria-label={tx("Search property", "Rechercher un bien")}
            />
          </div>
          <Button variant="outline" onClick={() => setShowFilters((value) => !value)}>
            <SlidersHorizontal className="size-4" aria-hidden />
            {tx("Filters", "Filtres")}
          </Button>
          <Button asChild>
            <Link to="/property/new">
              <Plus className="size-4" aria-hidden />
              {tx("List property", "Publier")}
            </Link>
          </Button>
        </div>

        {showFilters ? (
          <div className="mt-4 grid gap-4 rounded-2xl border border-border bg-background/60 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label>{tx("Country", "Pays")}</Label>
              <select
                value={country}
                onChange={(event) => {
                  setCountry(event.target.value);
                  setCity("");
                }}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
              >
                {Object.entries(PROPERTY_LOCATIONS).map(([code, value]) => (
                  <option key={code} value={code}>
                    {value.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{tx("City", "Ville")}</Label>
              <select
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
              >
                <option value="">{tx("All cities", "Toutes les villes")}</option>
                {cities.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{tx("Property type", "Type de bien")}</Label>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
              >
                <option value="">{tx("All types", "Tous les types")}</option>
                {PROPERTY_CATEGORIES.map((item) => (
                  <option key={item.code} value={item.code}>
                    {fr ? item.fr : item.en}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{tx("Max price", "Prix maximum")}</Label>
              <Input
                inputMode="numeric"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value.replace(/\D/g, ""))}
                placeholder="150000"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{tx("Min bedrooms", "Chambres min.")}</Label>
              <Input
                inputMode="numeric"
                value={bedrooms}
                onChange={(event) => setBedrooms(event.target.value.replace(/\D/g, ""))}
                placeholder="1"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{tx("Sort by", "Trier par")}</Label>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as PropertyFilters["sort"])}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
              >
                <option value="recent">{tx("Recently added", "Plus récents")}</option>
                <option value="price_asc">{tx("Price: low to high", "Prix croissant")}</option>
                <option value="price_desc">{tx("Price: high to low", "Prix décroissant")}</option>
              </select>
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <Label className="mb-2 block">{tx("Amenities", "Commodités")}</Label>
              <div className="flex flex-wrap gap-2">
                {AMENITIES.map((item) => {
                  const active = amenities.includes(item.code);
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() =>
                        setAmenities((list) =>
                          active ? list.filter((code) => code !== item.code) : [...list, item.code],
                        )
                      }
                      className={cn(
                        "rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition-colors",
                        active ? "border-primary/60 bg-primary/10 text-primary" : "text-muted-foreground",
                      )}
                    >
                      {fr ? item.fr : item.en}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox checked={furnished} onCheckedChange={(value) => setFurnished(value === true)} />
              {tx("Furnished", "Meublé")}
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox checked={verifiedOnly} onCheckedChange={(value) => setVerifiedOnly(value === true)} />
              {tx("Verified listings only", "Annonces vérifiées uniquement")}
            </label>
          </div>
        ) : null}
      </header>

      {tab === "STUDENT" && areas.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-bold text-foreground">
            {tx("Popular student areas", "Zones étudiantes populaires")}
          </h2>
          <div className="flex flex-wrap gap-2">
            {areas.map((area) => (
              <button
                key={`${area.city}-${area.label}`}
                type="button"
                onClick={() => setTerm(area.label)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
              >
                {area.label} · {area.city}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-extrabold text-foreground">
            {tx("Listings", "Annonces")}
            {listings ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">{listings.length}</span>
            ) : null}
          </h2>
          <Link to="/property/manage" className="text-xs font-semibold text-primary">
            {tx("My property", "Mes biens")}
          </Link>
        </div>

        {isLoading ? (
          <LoadingState label={tx("Searching…", "Recherche en cours…")} />
        ) : (listings?.length ?? 0) === 0 ? (
          <EmptyState
            icon={<Home className="size-5" aria-hidden />}
            title={tx("No listings yet", "Aucune annonce pour l’instant")}
            description={
              tx("Be the first to list here — it is free.", "Soyez le premier à publier dans cette catégorie — c’est gratuit.")
            }
            action={
              <Button asChild>
                <Link to="/property/new">{tx("List a property", "Publier une annonce")}</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {listings?.map((listing) => (
              <PropertyCard
                key={listing.id}
                listing={listing}
                saved={saved.has(listing.id)}
                onToggleSave={toggleSave}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
