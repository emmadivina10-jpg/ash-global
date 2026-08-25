import { Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, CheckCircle2, MapPin } from "lucide-react";
import { RatingStars } from "./RatingStars";
import { useI18n } from "@/lib/i18n";
import { type ServiceCategory } from "@/lib/marketplace";
import { categoryLabel } from "@/lib/taxonomy";
import { formatXAF } from "@/lib/format";
import type { ProviderProfile } from "@/lib/marketplace.queries";
import { cn } from "@/lib/utils";

export type CardService = { id: string; title: string; price: number };

export function ProviderCard({
  provider,
  fromPrice,
  photos = [],
  services = [],
  isVerified = false,
  acceptingBookings = true,
  completedBookings = 0,
  nearby = false,
}: {
  provider: ProviderProfile;
  fromPrice?: number | null;
  photos?: { id: string; url: string; caption: string | null }[];
  services?: CardService[];
  isVerified?: boolean;
  acceptingBookings?: boolean;
  completedBookings?: number;
  nearby?: boolean;
}) {
  const { t, lang } = useI18n();
  const fr = lang === "fr";
  const cover = photos[0];
  const thumbs = photos.slice(1, 3);

  const categories = (provider.categories ?? []) as ServiceCategory[];
  const rating = Number(provider.rating_avg);
  const ratingText =
    provider.rating_count > 0
      ? t("svc.reviews", { count: provider.rating_count })
      : t("svc.noRating");

  const prices = services.map((s) => Number(s.price)).filter((n) => Number.isFinite(n));
  const min = prices.length > 0 ? Math.min(...prices) : (fromPrice ?? null);
  const max = prices.length > 0 ? Math.max(...prices) : null;
  const topServices = [...services].sort((a, b) => Number(a.price) - Number(b.price)).slice(0, 3);

  return (
    <Link
      to="/services/$providerId"
      params={{ providerId: provider.id }}
      className="tile group flex flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-1"
    >
      {/* Media */}
      <div className="relative">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-1 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted sm:aspect-[4/3]">
            {cover ? (
              <img
                src={cover.url}
                alt={cover.caption ?? provider.business_name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-gold/15">
                <span className="font-display text-3xl font-extrabold text-primary/80">
                  {provider.business_name.slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {thumbs.length > 0 ? (
            <div className="hidden grid-rows-2 gap-1 sm:grid">
              {thumbs.map((p) => (
                <div key={p.id} className="overflow-hidden bg-muted">
                  <img
                    src={p.url}
                    alt={p.caption ?? provider.business_name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start gap-1.5 p-2.5">
          {isVerified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-background/95 px-2 py-1 text-[10px] font-bold text-primary shadow-sm backdrop-blur-sm">
              <BadgeCheck className="size-3" aria-hidden />
              {t("svc.verifiedBadge")}
            </span>
          ) : null}
          {nearby ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground shadow-sm">
              <MapPin className="size-3" aria-hidden />
              {fr ? "Près de vous" : "Near you"}
            </span>
          ) : null}
          {typeof min === "number" ? (
            <span className="ml-auto rounded-full bg-background/95 px-2.5 py-1 text-[10px] font-bold text-foreground shadow-sm backdrop-blur-sm">
              {t("svc.from", { price: formatXAF(min) })}
            </span>
          ) : null}
        </div>

        {!acceptingBookings ? (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2.5 pt-8">
            <span className="text-[10px] font-semibold text-white">{t("svc.unavailable")}</span>
          </div>
        ) : null}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-3.5 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="line-clamp-1 font-display text-base font-semibold text-foreground sm:text-lg">
              {provider.business_name}
            </h3>
            <p className="line-clamp-1 text-xs text-muted-foreground">
              {provider.bio ?? t("svc.byProvider", { name: provider.business_name })}
            </p>
          </div>
          {completedBookings > 0 ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              <CheckCircle2 className="size-3" aria-hidden />
              {completedBookings}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <RatingStars value={rating} size={12} />
            {rating > 0 ? <span className="font-semibold text-foreground">{rating.toFixed(1)}</span> : null}
          </span>
          <span>·</span>
          <span className="truncate">{ratingText}</span>
          {provider.city ? (
            <>
              <span>·</span>
              <span className="flex items-center gap-1 truncate">
                <MapPin className="size-3 shrink-0" aria-hidden />
                {provider.city}
              </span>
            </>
          ) : null}
        </div>

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

        {/* Catalogue preview — a vendor sells many things at many prices. */}
        {topServices.length > 0 ? (
          <ul className="mt-0.5 divide-y divide-border rounded-xl border border-border">
            {topServices.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-2.5 py-1.5">
                <span className="truncate text-xs font-medium text-foreground">{s.title}</span>
                <span className="tabular shrink-0 text-xs font-bold text-foreground">{formatXAF(Number(s.price))}</span>
              </li>
            ))}
            {services.length > topServices.length ? (
              <li className="px-2.5 py-1.5 text-[11px] font-semibold text-primary">
                +{services.length - topServices.length} {fr ? "autres prestations" : "more services"}
              </li>
            ) : null}
          </ul>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          <span className="tabular text-sm font-bold text-foreground">
            {typeof min === "number"
              ? max !== null && max > min
                ? `${formatXAF(min)} – ${formatXAF(max)}`
                : formatXAF(min)
              : "—"}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              acceptingBookings
                ? "bg-primary text-primary-foreground group-hover:bg-primary/90"
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
