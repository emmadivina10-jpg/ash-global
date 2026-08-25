import { Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, Star } from "lucide-react";
import { BadgeCheck } from "lucide-react";
import { RatingStars } from "./RatingStars";
import { useI18n } from "@/lib/i18n";
import { type ServiceCategory } from "@/lib/marketplace";
import { categoryLabel } from "@/lib/taxonomy";
import { formatXAF } from "@/lib/format";
import type { ProviderProfile } from "@/lib/marketplace.queries";
import { cn } from "@/lib/utils";

export function ProviderCard({
  provider,
  fromPrice,
  photos = [],
  isVerified = false,
  acceptingBookings = true,
}: {
  provider: ProviderProfile;
  fromPrice?: number | null;
  photos?: { id: string; url: string; caption: string | null }[];
  isVerified?: boolean;
  acceptingBookings?: boolean;
}) {
  const { t, lang } = useI18n();
  const cover = photos[0];
  const hasPhoto = Boolean(cover);

  const categories = (provider.categories ?? []) as ServiceCategory[];
  const rating = Number(provider.rating_avg);
  const ratingText =
    provider.rating_count > 0
      ? t("svc.reviews", { count: provider.rating_count })
      : t("svc.noRating");

  return (
    <Link
      to="/services/$providerId"
      params={{ providerId: provider.id }}
      className="tile group flex flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-1"
    >
      {/* Image */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {cover ? (
          <img
            src={cover.url}
            alt={cover.caption ?? provider.business_name}

            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-gold/10">
            <span className="font-display text-3xl font-extrabold text-primary/80">
              {provider.business_name.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          {isVerified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-background/95 px-2 py-1 text-[10px] font-bold text-primary shadow-sm backdrop-blur-sm dark:bg-background/80">
              <BadgeCheck className="size-3" aria-hidden />
              {t("svc.verifiedBadge")}
            </span>
          ) : null}
          {typeof fromPrice === "number" ? (
            <span className="ml-auto rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground shadow-sm">
              {t("svc.from", { price: formatXAF(fromPrice) })}
            </span>
          ) : null}
        </div>

        {!acceptingBookings ? (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
            <span className="text-[10px] font-semibold text-white">{t("svc.unavailable")}</span>
          </div>
        ) : null}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-3.5 sm:p-4">
        {categories.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {categories.slice(0, 3).map((c) => (
              <span
                key={c}
                className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"
              >
                {categoryLabel(c, lang)}
              </span>
            ))}
          </div>
        ) : null}

        <div>
          <h3 className="line-clamp-1 font-display text-base font-semibold text-foreground sm:text-lg">
            {provider.business_name}
          </h3>
          <p className="line-clamp-1 text-xs text-muted-foreground sm:text-sm">
            {provider.bio ?? t("svc.byProvider", { name: provider.business_name })}
          </p>
        </div>

        {provider.city ? (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{provider.city}</span>
          </p>
        ) : null}

        <div className="flex items-center gap-1.5">
          <RatingStars value={rating} size={12} />
          <span className="text-xs text-muted-foreground">
            {rating > 0 ? (
              <>
                <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
                {" · "}
              </>
            ) : null}
            {ratingText}
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="tabular text-sm font-bold text-foreground">
            {typeof fromPrice === "number" ? formatXAF(fromPrice) : "—"}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              acceptingBookings
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground",
            )}
          >
            {t("svc.viewService")}
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}

