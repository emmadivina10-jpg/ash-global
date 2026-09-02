import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Bath,
  BedDouble,
  CalendarClock,
  Heart,
  MapPin,
  MessageCircle,
  Phone,
  Ruler,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, LoadingState } from "@/components/refer/states";
import { PropertyCard } from "@/components/refer/PropertyCard";
import { ReportDialog } from "@/components/refer/ReportDialog";
import { MediaLightbox } from "@/components/refer/MediaLightbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useProperty, useSavedIds, useSimilarProperties } from "@/lib/property.queries";
import { AMENITIES, VERIFICATION_STATES, categoryLabel, formatPropertyPrice, labelOf } from "@/lib/property";
import { formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/property/$listingId")({
  head: () => ({
    meta: [
      { title: "Property details — ASH Property" },
      { name: "description", content: "Photos, price, amenities, verification status and viewing requests for this ASH Property listing." },
      { property: "og:title", content: "Property details — ASH Property" },
      { property: "og:description", content: "Photos, price, amenities and viewing requests on ASH Property." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PropertyDetail,
});

function PropertyDetail() {
  const { listingId } = Route.useParams();
  const { lang } = useI18n();
  const fr = lang === "fr";
  const queryClient = useQueryClient();

  const { data, isLoading } = useProperty(listingId);
  const { data: similar } = useSimilarProperties(data?.listing ?? null);
  const { data: savedIds } = useSavedIds();
  const saved = new Set(savedIds ?? []).has(listingId);

  const [lightbox, setLightbox] = useState<number | null>(null);
  const [viewingOpen, setViewingOpen] = useState(false);
  const [when, setWhen] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase.rpc("record_property_view", { _listing_id: listingId });
  }, [listingId]);

  if (isLoading) return <LoadingState label={fr ? "Chargement du bien…" : "Loading property…"} />;
  if (!data)
    return (
      <EmptyState
        icon={MapPin}
        title={fr ? "Annonce introuvable" : "Listing not found"}
        description={fr ? "Cette annonce n’est plus disponible." : "This listing is no longer available."}
        action={
          <Button asChild>
            <Link to="/property">{fr ? "Retour" : "Back to Property"}</Link>
          </Button>
        }
      />
    );

  const { listing, images, owner } = data;
  const gallery = images.filter((image) => image.url);

  async function toggleSave() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    if (saved) {
      await supabase.from("property_saves").delete().eq("listing_id", listingId).eq("user_id", auth.user.id);
    } else {
      await supabase.from("property_saves").insert({ listing_id: listingId, user_id: auth.user.id });
    }
    await queryClient.invalidateQueries({ queryKey: ["property"] });
    toast.success(saved ? (fr ? "Retiré" : "Removed") : fr ? "Enregistré" : "Saved");
  }

  async function requestViewing() {
    if (!when) {
      toast.error(fr ? "Choisissez une date et une heure." : "Pick a date and time.");
      return;
    }
    setBusy(true);
    const { data: result, error } = await supabase.rpc("request_property_viewing", {
      _listing_id: listingId,
      _requested_at: new Date(when).toISOString(),
      _message: message,
    });
    setBusy(false);
    const payload = result as { ok?: boolean; error?: string } | null;
    if (error || !payload?.ok) {
      toast.error(payload?.error ?? error?.message ?? (fr ? "Échec de la demande." : "Request failed."));
      return;
    }
    setViewingOpen(false);
    setWhen("");
    setMessage("");
    await queryClient.invalidateQueries({ queryKey: ["property"] });
    toast.success(fr ? "Demande de visite envoyée." : "Viewing request sent.");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link to="/property" className="text-xs font-semibold text-primary">
          ← ASH Property
        </Link>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={fr ? "Partager" : "Share"}
            onClick={() => {
              void navigator.clipboard.writeText(window.location.href);
              toast.success(fr ? "Lien copié" : "Link copied");
            }}
          >
            <Share2 className="size-4" aria-hidden />
          </Button>
          <Button variant="ghost" size="icon" aria-label={fr ? "Enregistrer" : "Save"} onClick={toggleSave}>
            <Heart className={cn("size-4", saved && "fill-primary text-primary")} aria-hidden />
          </Button>
          <ReportDialog
            targetType="PROPERTY"
            targetId={listing.id}
            targetUserId={listing.owner_id}
            targetLabel={listing.title}
          />
        </div>
      </div>

      {gallery.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-[2fr_1fr]">
          <button
            type="button"
            onClick={() => setLightbox(0)}
            className="overflow-hidden rounded-2xl border border-border"
          >
            <img src={gallery[0]!.url!} alt={listing.title} className="aspect-[4/3] w-full object-cover" />
          </button>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-1">
            {gallery.slice(1, 4).map((image, index) => (
              <button
                key={image.id}
                type="button"
                onClick={() => setLightbox(index + 1)}
                className="overflow-hidden rounded-2xl border border-border"
              >
                <img src={image.url!} alt={image.caption ?? listing.title} className="aspect-[4/3] w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              {categoryLabel(listing.category, fr)} ·{" "}
              {listing.listing_kind === "SALE" ? (fr ? "À vendre" : "For sale") : fr ? "À louer" : "For rent"}
            </p>
            <h1 className="mt-1 font-display text-2xl font-extrabold text-foreground sm:text-3xl">{listing.title}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-4" aria-hidden />
              {[listing.neighborhood, listing.city, listing.region, listing.country].filter(Boolean).join(", ")}
            </p>
            <p className="mt-3 font-display text-2xl font-extrabold text-foreground">
              {formatPropertyPrice(listing.price, listing.currency, listing.price_period, fr)}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {listing.bedrooms > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5">
                <BedDouble className="size-4" aria-hidden /> {listing.bedrooms} {fr ? "chambres" : "bedrooms"}
              </span>
            ) : null}
            {listing.bathrooms > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5">
                <Bath className="size-4" aria-hidden /> {listing.bathrooms} {fr ? "salles de bain" : "bathrooms"}
              </span>
            ) : null}
            {listing.size_value ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5">
                <Ruler className="size-4" aria-hidden /> {listing.size_value} {listing.size_unit}
              </span>
            ) : null}
            {listing.university ? (
              <span className="rounded-xl border border-border px-3 py-1.5">
                {listing.university}
                {listing.distance_km ? ` · ${listing.distance_km} km` : ""}
              </span>
            ) : null}
          </div>

          {listing.description ? (
            <section>
              <h2 className="mb-2 text-sm font-bold text-foreground">{fr ? "Description" : "Description"}</h2>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{listing.description}</p>
            </section>
          ) : null}

          {listing.amenities.length > 0 ? (
            <section>
              <h2 className="mb-2 text-sm font-bold text-foreground">{fr ? "Commodités" : "Amenities"}</h2>
              <div className="flex flex-wrap gap-2">
                {listing.amenities.map((code) => (
                  <span key={code} className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                    ✓ {labelOf(AMENITIES, code, fr)}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-sm font-bold text-foreground">{fr ? "Vérification" : "Verification"}</h2>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <BadgeCheck className="size-4 text-primary" aria-hidden />
              {labelOf(VERIFICATION_STATES, listing.verification_status, fr)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {fr
                ? "ASH n’affiche que les vérifications réellement effectuées. Une annonce « simple » n’a pas été vérifiée — visitez toujours le bien avant de payer."
                : "ASH only shows checks it has actually performed. A basic listing has not been verified — always visit a property before paying anything."}
            </p>
          </section>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {fr ? "Publié par" : "Listed by"}
            </p>
            <p className="mt-1 font-semibold text-foreground">{owner?.full_name ?? (fr ? "Propriétaire ASH" : "ASH member")}</p>
            <p className="text-xs text-muted-foreground">
              {fr ? "Annonce publiée le" : "Listed"} {formatDateTime(listing.created_at)}
            </p>

            <div className="mt-3 grid gap-2">
              <Dialog open={viewingOpen} onOpenChange={setViewingOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <CalendarClock className="size-4" aria-hidden />
                    {fr ? "Demander une visite" : "Request viewing"}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{fr ? "Demander une visite" : "Request a viewing"}</DialogTitle>
                    <DialogDescription>
                      {fr ? "Le propriétaire peut accepter, refuser ou proposer un autre créneau." : "The owner can accept, decline or propose another time."}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="viewing-when">{fr ? "Date et heure" : "Date and time"}</Label>
                      <Input
                        id="viewing-when"
                        type="datetime-local"
                        value={when}
                        onChange={(event) => setWhen(event.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="viewing-message">{fr ? "Message" : "Message"}</Label>
                      <Textarea
                        id="viewing-message"
                        rows={3}
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        placeholder={fr ? "Présentez-vous en une ligne." : "Introduce yourself in one line."}
                      />
                    </div>
                    <Button className="w-full" disabled={busy} onClick={requestViewing}>
                      {busy ? (fr ? "Envoi…" : "Sending…") : fr ? "Envoyer la demande" : "Send request"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              {listing.contact_whatsapp ? (
                <Button variant="outline" asChild className="w-full">
                  <a
                    href={`https://wa.me/${listing.contact_whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="size-4" aria-hidden />
                    WhatsApp
                  </a>
                </Button>
              ) : null}
              {listing.contact_phone ? (
                <Button variant="outline" asChild className="w-full">
                  <a href={`tel:${listing.contact_phone}`}>
                    <Phone className="size-4" aria-hidden />
                    {fr ? "Appeler" : "Call"}
                  </a>
                </Button>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
            {fr
              ? "Ne payez jamais un dépôt avant d’avoir visité le bien et vérifié l’identité du propriétaire. Signalez toute annonce suspecte."
              : "Never pay a deposit before visiting the property and confirming the owner's identity. Report anything suspicious."}
          </div>
        </aside>
      </div>

      {(similar?.length ?? 0) > 0 ? (
        <section>
          <h2 className="mb-3 font-display text-lg font-extrabold text-foreground">
            {fr ? "Biens similaires" : "Similar properties"}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {similar?.map((item) => <PropertyCard key={item.id} listing={item} />)}
          </div>
        </section>
      ) : null}

      {lightbox !== null && gallery[lightbox] ? (
        <MediaLightbox
          open
          onOpenChange={(value) => setLightbox(value ? lightbox : null)}
          items={gallery.map((image) => ({ url: image.url!, kind: "image" as const, caption: image.caption }))}
          index={lightbox}
          onIndexChange={setLightbox}
        />
      ) : null}
    </div>
  );
}
