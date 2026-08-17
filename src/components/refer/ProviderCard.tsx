import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { RatingStars } from "./RatingStars";
import { useI18n } from "@/lib/i18n";
import { type ServiceCategory } from "@/lib/marketplace";
import { categoryLabel } from "@/lib/taxonomy";
import { formatXAF } from "@/lib/format";
import type { ProviderProfile } from "@/lib/marketplace.queries";

export function ProviderCard({
  provider,
  fromPrice,
  photos = [],
}: {
  provider: ProviderProfile;
  fromPrice?: number | null;
  photos?: { id: string; url: string; caption: string | null }[];
}) {
  const { t, lang } = useI18n();


  return (
    <Link
      to="/services/$providerId"
      params={{ providerId: provider.id }}
      className="tile group flex flex-col gap-3 p-4 transition-transform hover:-translate-y-0.5"
    >
      {photos.length > 0 ? (
        <div className={`grid gap-1.5 ${photos.length === 1 ? "grid-cols-1" : "grid-cols-3"}`}>
          {photos.slice(0, 3).map((p) => (
            <img
              key={p.id}
              src={p.url}
              alt={p.caption ?? provider.business_name}
              loading="lazy"
              className={`w-full rounded-xl object-cover ${photos.length === 1 ? "aspect-[16/9]" : "aspect-square"}`}
            />
          ))}
        </div>
      ) : null}

      <div className="flex items-start gap-3">

        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 font-display text-lg font-bold text-primary">
          {provider.business_name.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-semibold text-foreground">{provider.business_name}</p>
          {provider.city ? (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <MapPin className="size-3" aria-hidden />
              {provider.city}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(provider.categories ?? []).map((c: ServiceCategory) => (
          <span key={c} className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
            {categoryLabel(c, lang)}
          </span>
        ))}
      </div>

      {provider.bio ? <p className="line-clamp-2 text-sm text-muted-foreground">{provider.bio}</p> : null}

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          <RatingStars value={Number(provider.rating_avg)} />
          <span className="text-xs text-muted-foreground">
            {provider.rating_count > 0 ? t("svc.reviews", { count: provider.rating_count }) : t("svc.noRating")}
          </span>
        </div>
        {typeof fromPrice === "number" ? (
          <span className="tabular text-sm font-semibold text-foreground">
            {t("svc.from", { price: formatXAF(fromPrice) })}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
