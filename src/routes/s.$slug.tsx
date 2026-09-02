import { useMemo, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { BadgeCheck, CalendarCheck, Clock, MapPin, MessageCircle, Play, Share2, Star } from "lucide-react";
import { toast } from "sonner";
import { getStorefront, type Storefront } from "@/lib/storefront.functions";
import { Button } from "@/components/ui/button";
import { formatXAF } from "@/lib/format";
import { Logo } from "@/components/refer/Logo";
import { MediaLightbox, isVideoSource, type LightboxMedia } from "@/components/refer/MediaLightbox";

const SITE = "https://ashglogroup.company";
const FALLBACK_IMAGE = `${SITE}/ash-social.png`;

function previewImage(store: Storefront | null): string {
  const candidates = [store?.cover_url, store?.avatar_url, store?.photos?.find((p) => !isVideoSource(p.url))?.url];
  const found = candidates.find((u) => typeof u === "string" && u.startsWith("https://"));
  return found ?? FALLBACK_IMAGE;
}

export const Route = createFileRoute("/s/$slug")({
  loader: async ({ params }) => {
    const store = await getStorefront({ data: { slug: params.slug } });
    if (!store) throw notFound();
    return { store };
  },
  head: ({ loaderData }) => {
    const store = loaderData?.store ?? null;
    if (!store) {
      return {
        meta: [
          { title: "Storefront unavailable — ASH Glo" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = `${store.business_name}${store.city ? ` · ${store.city}` : ""} — Book on ASH Glo`;
    const cheapest = store.services.length > 0 ? Math.min(...store.services.map((s) => s.price)) : null;
    const description = `${store.tagline ?? store.bio ?? `Book ${store.business_name} on ASH Glo`}${
      cheapest ? ` · From ${cheapest.toLocaleString("fr-FR")} XAF` : ""
    } · ${store.rating_avg.toFixed(1)}★ (${store.rating_count} reviews)`.slice(0, 158);
    const image = previewImage(store);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        { property: "og:image", content: image },
        { property: "og:url", content: `${SITE}/s/${store.slug}` },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: `${SITE}/s/${store.slug}` }],
    };
  },
  notFoundComponent: StoreMissing,
  component: StorefrontPage,
});

function StoreMissing() {
  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center p-6 text-center">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Storefront not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This ASH storefront is offline or the link is wrong.</p>
        <Button asChild className="mt-5">
          <Link to="/">Explore ASH Glo</Link>
        </Button>
      </div>
    </main>
  );
}

function StorefrontPage() {
  const { store } = Route.useLoaderData();
  const [openPhoto, setOpenPhoto] = useState<LightboxMedia | null>(null);

  const shareUrl = `${SITE}/s/${store.slug}`;
  const jsonLd = useMemo(
    () =>
      JSON.stringify({
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: store.business_name,
        description: store.tagline ?? store.bio ?? undefined,
        image: previewImage(store),
        url: shareUrl,
        telephone: store.phone ?? undefined,
        address: store.city ? { "@type": "PostalAddress", addressLocality: store.city, addressCountry: "CM" } : undefined,
        aggregateRating:
          store.rating_count > 0
            ? { "@type": "AggregateRating", ratingValue: store.rating_avg, reviewCount: store.rating_count }
            : undefined,
        makesOffer: store.services.map((s) => ({
          "@type": "Offer",
          name: s.title,
          price: s.price,
          priceCurrency: "XAF",
        })),
      }),
    [store, shareUrl],
  );

  async function share() {
    const text = `${store.business_name} on ASH Glo — book online: ${shareUrl}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: store.business_name, text, url: shareUrl });
        return;
      } catch {
        /* user dismissed */
      }
    }
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied");
  }

  const whatsapp = store.whatsapp?.replace(/[^\d]/g, "");

  return (
    <main className="min-h-screen bg-background pb-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <Logo />
          </Link>
          <Button size="sm" variant="outline" onClick={() => void share()}>
            <Share2 className="size-4" aria-hidden />
            Share
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 pt-5">
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="relative h-36 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent sm:h-44">
            {store.cover_url ? (
              <img src={store.cover_url} alt="" className="size-full object-cover" loading="eager" />
            ) : store.photos.find((p) => !isVideoSource(p.url)) ? (
              <img src={store.photos.find((p) => !isVideoSource(p.url))!.url} alt="" className="size-full object-cover" loading="eager" />
            ) : null}
          </div>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 p-4 sm:p-5">
            <div className="-mt-12 size-20 overflow-hidden rounded-2xl border-4 border-card bg-muted">
              {store.avatar_url ? (
                <img src={store.avatar_url} alt={store.business_name} className="size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center font-display text-2xl font-black text-primary">
                  {store.business_name.charAt(0)}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate font-display text-2xl font-extrabold text-foreground">{store.business_name}</h1>
                {store.is_verified ? <VerifiedBadge /> : null}
              </div>
              {store.tagline ? <p className="mt-1 text-sm text-muted-foreground">{store.tagline}</p> : null}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="size-3.5 fill-gold text-gold" aria-hidden />
                  <span className="tabular font-semibold text-foreground">{store.rating_avg.toFixed(1)}</span>
                  <span>({store.rating_count})</span>
                </span>
                {store.city ? (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" aria-hidden />
                    {store.city}
                  </span>
                ) : null}
                {store.completed_bookings > 0 ? (
                  <span className="flex items-center gap-1">
                    <CalendarCheck className="size-3.5" aria-hidden />
                    {store.completed_bookings} completed
                  </span>
                ) : null}
              </div>
              {store.bio ? <p className="mt-3 text-sm text-foreground/90">{store.bio}</p> : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild>
                  <Link to="/services/$providerId" params={{ providerId: store.id }}>
                    Book now
                  </Link>
                </Button>
                {whatsapp ? (
                  <Button asChild variant="outline">
                    <a
                      href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hi ${store.business_name}, I found you on ASH Glo: ${shareUrl}`)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MessageCircle className="size-4" aria-hidden />
                      WhatsApp
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-5 max-w-3xl px-4">
        <h2 className="font-display text-lg font-bold text-foreground">Services &amp; prices</h2>
        {store.services.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No services published yet.</p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {store.services.map((s) => (
              <li key={s.id} className="rounded-2xl border border-border bg-card p-4">
                <p className="font-semibold text-foreground">{s.title}</p>
                {s.description ? (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
                ) : null}
                <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3.5" aria-hidden />
                  {s.duration_minutes} min
                </p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="tabular font-display text-lg font-extrabold text-foreground">
                    {formatXAF(s.price)}
                  </span>
                  <Button size="sm" asChild>
                    <Link to="/services/$providerId" params={{ providerId: store.id }}>
                      Book
                    </Link>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {store.photos.length > 0 ? (
        <section className="mx-auto mt-6 max-w-3xl px-4">
          <h2 className="font-display text-lg font-bold text-foreground">Work gallery</h2>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {store.photos.map((p) => {
              const video = isVideoSource(p.url);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setOpenPhoto({ url: p.url, caption: p.caption, isVideo: video })}
                  className="relative overflow-hidden rounded-xl border border-border"
                >
                  {video ? (
                    <>
                      <video src={p.url} muted playsInline preload="metadata" className="aspect-square w-full object-cover" />
                      <span className="absolute inset-0 grid place-items-center bg-black/30">
                        <span className="grid size-9 place-items-center rounded-full bg-white/90 text-black">
                          <Play className="size-4 fill-current" aria-hidden />
                        </span>
                      </span>
                    </>
                  ) : (
                    <img
                      src={p.url}
                      alt={p.caption ?? store.business_name}
                      loading="lazy"
                      className="aspect-square w-full object-cover transition-transform hover:scale-105"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {store.reviews.length > 0 ? (
        <section className="mx-auto mt-6 max-w-3xl px-4">
          <h2 className="font-display text-lg font-bold text-foreground">Reviews</h2>
          <ul className="mt-3 space-y-2">
            {store.reviews.map((r) => (
              <li key={r.id} className="rounded-2xl border border-border bg-card p-3">
                <span className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={i < r.rating ? "size-3.5 fill-gold text-gold" : "size-3.5 text-muted-foreground/40"}
                      aria-hidden
                    />
                  ))}
                </span>
                {r.comment ? <p className="mt-1 text-sm text-foreground/90">{r.comment}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mx-auto mt-8 max-w-3xl px-4">
        <div className="rounded-3xl border border-primary/30 bg-primary/5 p-5 text-center">
          <p className="font-display text-lg font-bold text-foreground">Book securely on ASH Glo</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pay only after the pro accepts. Mobile Money supported.
          </p>
          <Button asChild className="mt-4">
            <Link to="/services/$providerId" params={{ providerId: store.id }}>
              Choose a time slot
            </Link>
          </Button>
        </div>
      </section>

      <MediaLightbox media={openPhoto} onClose={() => setOpenPhoto(null)} />
    </main>
  );
}

function VerifiedBadge() {
  return (
    <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
      <BadgeCheck className="size-3.5" aria-hidden />
      ASH Verified
    </span>
  );
}
