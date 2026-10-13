import { Link } from "@tanstack/react-router";
import { BadgeCheck, Bath, BedDouble, Heart, ImageOff, MapPin, Ruler } from "lucide-react";
import type { ListingWithCover } from "@/lib/property.queries";
import { categoryLabel, formatPropertyPrice } from "@/lib/property";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function PropertyCard({
  listing,
  saved,
  onToggleSave,
}: {
  listing: ListingWithCover;
  saved?: boolean;
  onToggleSave?: (id: string) => void;
}) {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5">
      <Link to="/property/$listingId" params={{ listingId: listing.id }} className="block">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          {listing.cover ? (
            <img
              src={listing.cover}
              alt={listing.title}
              loading="lazy"
              className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <ImageOff className="size-6" aria-hidden />
            </div>
          )}
          <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-foreground">
            {listing.listing_kind === "SALE"
              ? tx("For sale", "À vendre")
              : tx("For rent", "À louer")}
          </span>
          {listing.verification_status !== "BASIC" ? (
            <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-[11px] font-bold text-primary-foreground">
              <BadgeCheck className="size-3" aria-hidden />
              {tx("Verified", "Vérifié")}
            </span>
          ) : null}
        </div>

        <div className="space-y-2 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
            {categoryLabel(listing.category, fr)}
          </p>
          <h3 className="line-clamp-1 text-sm font-semibold text-foreground">{listing.title}</h3>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="line-clamp-1">
              {[listing.neighborhood, listing.city].filter(Boolean).join(", ")}
            </span>
          </p>
          <p className="font-display text-base font-extrabold text-foreground">
            {formatPropertyPrice(listing.price, listing.currency, listing.price_period, fr)}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            {listing.bedrooms > 0 ? (
              <span className="inline-flex items-center gap-1">
                <BedDouble className="size-3.5" aria-hidden />
                {listing.bedrooms}
              </span>
            ) : null}
            {listing.bathrooms > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Bath className="size-3.5" aria-hidden />
                {listing.bathrooms}
              </span>
            ) : null}
            {listing.size_value ? (
              <span className="inline-flex items-center gap-1">
                <Ruler className="size-3.5" aria-hidden />
                {listing.size_value} {listing.size_unit ?? ""}
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      {onToggleSave ? (
        <button
          type="button"
          aria-label={saved ? tx("Unsave", "Retirer") : tx("Save", "Enregistrer")}
          onClick={() => onToggleSave(listing.id)}
          className="absolute bottom-3 right-3 rounded-full border border-border bg-background/90 p-2 text-muted-foreground transition-colors hover:text-primary"
        >
          <Heart className={cn("size-4", saved && "fill-primary text-primary")} aria-hidden />
        </button>
      ) : null}
    </article>
  );
}
