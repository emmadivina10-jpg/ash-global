import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
  const { lang } = useI18n();
  const fr = lang === "fr";
  const queryClient = useQueryClient();

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
      toast.success(fr ? "Retiré des favoris" : "Removed from saved");
    } else {
      const { error } = await supabase
        .from("property_saves")
        .insert({ listing_id: listingId, user_id: auth.user.id });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success(fr ? "Enregistré" : "Saved");
    }
    await queryClient.invalidateQueries({ queryKey: ["property"] });
  }

  const areas = STUDENT_AREAS.filter((area) => !city || area.city.toLowerCase() === city.toLowerCase());
  const cities = PROPERTY_LOCATIONS[country]?.cities ?? [];

  return (
    <div className="space-y-6">
      <header className="tile overflow-hidden p-5 sm:p-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">ASH Property</p>
        <h1 className="mt-1 font-display text-2xl font-extrabold text-foreground sm:text-3xl">
          {fr ? "Trouvez un logement. Trouvez un terrain." : "Find a place. Find land. Find opportunities."}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {fr
            ? "Recherche, consultation et contact 100% gratuits. Publier une annonce est également gratuit."
            : "Searching, browsing and contacting is completely free — and listing your property is free too."}
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
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              className="pl-9"
              placeholder={fr ? "Où cherchez-vous ? Ville, quartier, université" : "Where are you looking? City, neighborhood or university"}
              aria-label={fr ? "Rechercher un bien" : "Search property"}
            />
          </div>
          <Button variant="outline" onClick={() => setShowFilters((value) => !value)}>
            <SlidersHorizontal className="size-4" aria-hidden />
            {fr ? "Filtres" : "Filters"}
          </Button>
          <Button asChild>
            <Link to="/property/new">
              <Plus className="size-4" aria-hidden />
              {fr ? "Publier" : "List property"}
            </Link>
          </Button>
        </div>

        {showFilters ? (
          <div className="mt-4 grid gap-4 rounded-2xl border border-border bg-background/60 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label>{fr ? "Pays" : "Country"}</Label>
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
              <Label>{fr ? "Ville" : "City"}</Label>
              <select
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
              >
                <option value="">{fr ? "Toutes les villes" : "All cities"}</option>
                {cities.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{fr ? "Type de bien" : "Property type"}</Label>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
              >
                <option value="">{fr ? "Tous les types" : "All types"}</option>
                {PROPERTY_CATEGORIES.map((item) => (
                  <option key={item.code} value={item.code}>
                    {fr ? item.fr : item.en}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{fr ? "Prix maximum" : "Max price"}</Label>
              <Input
                inputMode="numeric"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value.replace(/\D/g, ""))}
                placeholder="150000"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{fr ? "Chambres min." : "Min bedrooms"}</Label>
              <Input
                inputMode="numeric"
                value={bedrooms}
                onChange={(event) => setBedrooms(event.target.value.replace(/\D/g, ""))}
                placeholder="1"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{fr ? "Trier par" : "Sort by"}</Label>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as PropertyFilters["sort"])}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
              >
                <option value="recent">{fr ? "Plus récents" : "Recently added"}</option>
                <option value="price_asc">{fr ? "Prix croissant" : "Price: low to high"}</option>
                <option value="price_desc">{fr ? "Prix décroissant" : "Price: high to low"}</option>
              </select>
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <Label className="mb-2 block">{fr ? "Commodités" : "Amenities"}</Label>
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
              {fr ? "Meublé" : "Furnished"}
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox checked={verifiedOnly} onCheckedChange={(value) => setVerifiedOnly(value === true)} />
              {fr ? "Annonces vérifiées uniquement" : "Verified listings only"}
            </label>
          </div>
        ) : null}
      </header>

      {tab === "STUDENT" && areas.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-bold text-foreground">
            {fr ? "Zones étudiantes populaires" : "Popular student areas"}
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
            {fr ? "Annonces" : "Listings"}
            {listings ? <span className="ml-2 text-sm font-normal text-muted-foreground">{listings.length}</span> : null}
          </h2>
          <Link to="/property/manage" className="text-xs font-semibold text-primary">
            {fr ? "Mes biens" : "My property"}
          </Link>
        </div>

        {isLoading ? (
          <LoadingState label={fr ? "Recherche en cours…" : "Searching…"} />
        ) : (listings?.length ?? 0) === 0 ? (
          <EmptyState
            icon={Home}
            title={fr ? "Aucune annonce pour l’instant" : "No listings yet"}
            description={
              fr
                ? "Soyez le premier à publier dans cette catégorie — c’est gratuit."
                : "Be the first to list here — it is free."
            }
            action={
              <Button asChild>
                <Link to="/property/new">{fr ? "Publier une annonce" : "List a property"}</Link>
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
