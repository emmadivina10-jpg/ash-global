import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { verifyMediaFiles } from "@/lib/media-safety";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AMENITIES,
  LAND_USES,
  PRICE_PERIODS,
  PROPERTY_BUCKET,
  PROPERTY_CATEGORIES,
  PROPERTY_CURRENCIES,
  PROPERTY_LOCATIONS,
  SIZE_UNITS,
} from "@/lib/property";
import { useI18n } from "@/lib/i18n";
import { useProperty } from "@/lib/property.queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/property/new")({
  head: () => ({
    meta: [
      { title: "List your property free — ASH Property" },
      {
        name: "description",
        content:
          "Publish a room, apartment, house, commercial space or land on ASH Property. Listing is free.",
      },
      { property: "og:title", content: "List your property free — ASH Property" },
      {
        property: "og:description",
        content: "Publish a property or land listing on ASH in minutes — free.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { edit?: string } =>
    typeof search.edit === "string" && search.edit ? { edit: search.edit } : {},
  component: NewProperty,
});

const MAX_PHOTOS = 8;

function NewProperty() {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [category, setCategory] = useState("STUDENT_HOUSING");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [country, setCountry] = useState("CM");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("Buea");
  const [neighborhood, setNeighborhood] = useState("");
  const [university, setUniversity] = useState("");
  const [distance, setDistance] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("XAF");
  const [period, setPeriod] = useState("YEAR");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [sizeValue, setSizeValue] = useState("");
  const [sizeUnit, setSizeUnit] = useState("m²");
  const [landUse, setLandUse] = useState("RESIDENTIAL");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [furnished, setFurnished] = useState(false);
  const [availableFrom, setAvailableFrom] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [ownerKind, setOwnerKind] = useState("LANDLORD");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const { edit: editId } = Route.useSearch();
  const { data: existing } = useProperty(editId ?? "");
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [keptImages, setKeptImages] = useState<{ id: string; url: string | null }[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);

  useEffect(() => {
    if (!editId || !existing || loadedId === editId) return;
    const l = existing.listing;
    setCategory(l.category);
    setTitle(l.title);
    setDescription(l.description ?? "");
    setCountry(l.country);
    setRegion(l.region ?? "");
    setCity(l.city);
    setNeighborhood(l.neighborhood ?? "");
    setUniversity(l.university ?? "");
    setDistance(l.distance_km != null ? String(l.distance_km) : "");
    setPrice(String(l.price));
    setCurrency(l.currency);
    if (l.price_period !== "TOTAL") setPeriod(l.price_period);
    setBedrooms(l.bedrooms ? String(l.bedrooms) : "");
    setBathrooms(l.bathrooms ? String(l.bathrooms) : "");
    setSizeValue(l.size_value != null ? String(l.size_value) : "");
    if (l.size_unit) setSizeUnit(l.size_unit);
    if (l.land_use) setLandUse(l.land_use);
    setAmenities(l.amenities ?? []);
    setFurnished(l.is_furnished);
    setAvailableFrom(l.available_from ?? "");
    setPhone(l.contact_phone ?? "");
    setWhatsapp(l.contact_whatsapp ?? "");
    setOwnerKind(l.owner_kind);
    setKeptImages(existing.images.map((image) => ({ id: image.id, url: image.url })));
    setLoadedId(editId);
  }, [editId, existing, loadedId]);
  const editing = Boolean(editId);
  const photoSlots = MAX_PHOTOS - keptImages.length;

  const meta = PROPERTY_CATEGORIES.find((item) => item.code === category);
  const kind = meta?.kind ?? "RENT";
  const isLand = category === "LAND";

  function pickFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files, ...Array.from(list)].slice(0, Math.max(0, MAX_PHOTOS - keptImages.length));
    setFiles(next);
  }

  async function submit() {
    if (title.trim().length < 6) {
      toast.error(
        tx("Give a clear title (6 characters min).", "Donnez un titre clair (6 caractères min)."),
      );
      return;
    }
    if (!city.trim()) {
      toast.error(tx("City is required.", "La ville est obligatoire."));
      return;
    }
    if (!price || Number(price) <= 0) {
      toast.error(tx("Enter a price.", "Indiquez un prix."));
      return;
    }

    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error(tx("Session expired.", "Session expirée."));
      await verifyMediaFiles(files, "PROPERTY_LISTING");

      const fields = {
          owner_kind: ownerKind,
          listing_kind: kind,
          category,
          title: title.trim(),
          description: description.trim() || null,
          country,
          region: region.trim() || null,
          city: city.trim(),
          neighborhood: neighborhood.trim() || null,
          university: university.trim() || null,
          distance_km: distance ? Number(distance) : null,
          price: Number(price),
          currency,
          price_period: kind === "SALE" ? "TOTAL" : period,
          bedrooms: bedrooms ? Number(bedrooms) : 0,
          bathrooms: bathrooms ? Number(bathrooms) : 0,
          size_value: sizeValue ? Number(sizeValue) : null,
          size_unit: sizeValue ? sizeUnit : null,
          land_use: isLand ? landUse : null,
          amenities,
          is_furnished: furnished,
          available_from: availableFrom || null,
          contact_phone: phone.trim() || null,
          contact_whatsapp: whatsapp.trim() || null,
      };
      let created: { id: string } | null = null;
      let error: { message: string } | null = null;
      if (editId) {
        if (existing?.listing.owner_id !== auth.user.id) {
          throw new Error(tx("Only the owner can edit this listing.", "Seul le propriétaire peut modifier cette annonce."));
        }
        const res = await supabase
          .from("property_listings")
          .update(fields)
          .eq("id", editId)
          .eq("owner_id", auth.user.id)
          .select("id")
          .single();
        created = res.data;
        error = res.error;
        if (!error && removedImageIds.length) {
          await supabase.from("property_images").delete().in("id", removedImageIds);
        }
      } else {
        const res = await supabase
          .from("property_listings")
          .insert({ ...fields, owner_id: auth.user.id, status: "ACTIVE" })
          .select("id")
          .single();
        created = res.data;
        error = res.error;
      }

      if (error || !created) throw new Error(error?.message ?? "INSERT_FAILED");

      for (const [index, file] of files.entries()) {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${auth.user.id}/${created.id}/${crypto.randomUUID()}.${ext}`;
        const upload = await supabase.storage
          .from(PROPERTY_BUCKET)
          .upload(path, file, { upsert: false });
        if (upload.error) {
          toast.error(`${tx("Photo not uploaded", "Photo non envoyée")}: ${upload.error.message}`);
          continue;
        }
        await supabase.from("property_images").insert({
          listing_id: created.id,
          image_path: path,
          sort_order: keptImages.length + index,
        });
      }

      await queryClient.invalidateQueries({ queryKey: ["property"] });
      toast.success(
        editing
          ? tx("Listing updated", "Annonce mise à jour")
          : tx("Your listing is live!", "Annonce publiée !"),
      );
      void navigate({ to: "/property/$listingId", params: { listingId: created.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  const cities = PROPERTY_LOCATIONS[country]?.cities ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <header>
        <h1 className="font-display text-2xl font-extrabold text-foreground sm:text-3xl">
          {editing ? tx("Edit listing", "Modifier l’annonce") : tx("List a property", "Publier un bien")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tx(
            "Free. Only list real property you are allowed to rent or sell.",
            "Gratuit. Ne publiez que des biens réels que vous êtes autorisé à louer ou vendre.",
          )}
        </p>
      </header>

      <section className="tile space-y-4 p-4 sm:p-5">
        <div className="space-y-1.5">
          <Label>{tx("Property type", "Type de bien")}</Label>
          <div className="flex flex-wrap gap-2">
            {PROPERTY_CATEGORIES.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => setCategory(item.code)}
                className={cn(
                  "rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition-colors",
                  category === item.code
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "text-muted-foreground",
                )}
              >
                {tx(item.en, item.fr)}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {kind === "SALE"
              ? tx("Listing: for sale", "Annonce : à vendre")
              : tx("Listing: for rent", "Annonce : à louer")}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="p-title">{tx("Title", "Titre")}</Label>
          <Input
            id="p-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={tx("Single room in Molyko", "Chambre simple à Molyko")}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="p-desc">{tx("Description", "Description")}</Label>
          <Textarea
            id="p-desc"
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={tx(
              "Describe the property, the area and the conditions.",
              "Décrivez le bien, l’environnement et les conditions.",
            )}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{tx("Country", "Pays")}</Label>
            <select
              value={country}
              onChange={(event) => setCountry(event.target.value)}
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
            <Label htmlFor="p-region">{tx("Region / state", "Région / État")}</Label>
            <Input
              id="p-region"
              value={region}
              onChange={(event) => setRegion(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-city">{tx("City", "Ville")}</Label>
            <Input
              id="p-city"
              list="property-cities"
              value={city}
              onChange={(event) => setCity(event.target.value)}
            />
            <datalist id="property-cities">
              {cities.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-hood">
              {tx("Neighborhood (approximate)", "Quartier (approximatif)")}
            </Label>
            <Input
              id="p-hood"
              value={neighborhood}
              onChange={(event) => setNeighborhood(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-uni">
              {tx("Nearby university (optional)", "Université proche (optionnel)")}
            </Label>
            <Input
              id="p-uni"
              value={university}
              onChange={(event) => setUniversity(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-dist">{tx("Distance (km)", "Distance (km)")}</Label>
            <Input
              id="p-dist"
              inputMode="decimal"
              value={distance}
              onChange={(event) => setDistance(event.target.value.replace(/[^\d.]/g, ""))}
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {tx(
            "Do not publish your exact address — a neighborhood is enough until someone contacts you.",
            "N’indiquez pas votre adresse exacte publiquement — le quartier suffit jusqu’au premier contact.",
          )}
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="p-price">{tx("Price", "Prix")}</Label>
            <Input
              id="p-price"
              inputMode="numeric"
              value={price}
              onChange={(event) => setPrice(event.target.value.replace(/\D/g, ""))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{tx("Currency", "Devise")}</Label>
            <select
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
            >
              {PROPERTY_CURRENCIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          {kind === "RENT" ? (
            <div className="space-y-1.5">
              <Label>{tx("Period", "Période")}</Label>
              <select
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
              >
                {PRICE_PERIODS.filter((item) => item.code !== "TOTAL").map((item) => (
                  <option key={item.code} value={item.code}>
                    {tx(item.en, item.fr)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        {isLand ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-size">{tx("Land size", "Superficie")}</Label>
              <Input
                id="p-size"
                inputMode="decimal"
                value={sizeValue}
                onChange={(event) => setSizeValue(event.target.value.replace(/[^\d.]/g, ""))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{tx("Unit", "Unité")}</Label>
              <select
                value={sizeUnit}
                onChange={(event) => setSizeUnit(event.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
              >
                {SIZE_UNITS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{tx("Land use", "Usage")}</Label>
              <select
                value={landUse}
                onChange={(event) => setLandUse(event.target.value)}
                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
              >
                {LAND_USES.map((item) => (
                  <option key={item.code} value={item.code}>
                    {tx(item.en, item.fr)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-bed">{tx("Bedrooms", "Chambres")}</Label>
              <Input
                id="p-bed"
                inputMode="numeric"
                value={bedrooms}
                onChange={(event) => setBedrooms(event.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-bath">{tx("Bathrooms", "Salles de bain")}</Label>
              <Input
                id="p-bath"
                inputMode="numeric"
                value={bathrooms}
                onChange={(event) => setBathrooms(event.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-avail">{tx("Available from", "Disponible à partir du")}</Label>
              <Input
                id="p-avail"
                type="date"
                value={availableFrom}
                onChange={(event) => setAvailableFrom(event.target.value)}
              />
            </div>
          </div>
        )}

        <div>
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
                    active
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  {tx(item.en, item.fr)}
                </button>
              );
            })}
          </div>
        </div>

        {!isLand ? (
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox
              checked={furnished}
              onCheckedChange={(value) => setFurnished(value === true)}
            />
            {tx("Furnished", "Meublé")}
          </label>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>{tx("I am", "Je suis")}</Label>
            <select
              value={ownerKind}
              onChange={(event) => setOwnerKind(event.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
            >
              <option value="LANDLORD">{tx("Landlord", "Propriétaire")}</option>
              <option value="AGENT">{tx("Property agent", "Agent immobilier")}</option>
              <option value="OWNER_REP">{tx("Owner representative", "Représentant")}</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-phone">{tx("Contact phone", "Téléphone de contact")}</Label>
            <Input id="p-phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-wa">WhatsApp</Label>
            <Input
              id="p-wa"
              value={whatsapp}
              onChange={(event) => setWhatsapp(event.target.value)}
            />
          </div>
        </div>

        <div>
          <Label className="mb-2 block">
            {fr ? `Photos (max ${MAX_PHOTOS})` : `Photos (max ${MAX_PHOTOS})`}
          </Label>
          <div className="flex flex-wrap gap-2">
            {keptImages.map((image) => (
              <div key={image.id} className="relative size-20 overflow-hidden rounded-xl border border-border">
                {image.url ? <img src={image.url} alt="" className="size-full object-cover" /> : null}
                <button
                  type="button"
                  aria-label="Remove"
                  onClick={() => {
                    setKeptImages((list) => list.filter((item) => item.id !== image.id));
                    setRemovedImageIds((list) => [...list, image.id]);
                  }}
                  className="absolute right-1 top-1 rounded-full bg-background/90 p-1"
                >
                  <X className="size-3" aria-hidden />
                </button>
              </div>
            ))}
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="relative size-20 overflow-hidden rounded-xl border border-border"
              >
                <img src={URL.createObjectURL(file)} alt="" className="size-full object-cover" />
                <button
                  type="button"
                  aria-label="Remove"
                  onClick={() => setFiles((list) => list.filter((_, i) => i !== index))}
                  className="absolute right-1 top-1 rounded-full bg-background/90 p-1"
                >
                  <X className="size-3" aria-hidden />
                </button>
              </div>
            ))}
            {files.length < photoSlots ? (
              <label className="grid size-20 cursor-pointer place-items-center rounded-xl border border-dashed border-border text-muted-foreground">
                <ImagePlus className="size-5" aria-hidden />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(event) => pickFiles(event.target.files)}
                />
              </label>
            ) : null}
          </div>
        </div>

        <Button className="w-full" disabled={busy} onClick={submit}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {busy
            ? tx("Saving…", "Enregistrement…")
            : editing
              ? tx("Save changes", "Enregistrer les modifications")
              : tx("Publish for free", "Publier gratuitement")}
        </Button>
      </section>
    </div>
  );
}
