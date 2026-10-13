import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ListingGallery, type GalleryItem } from "@/components/refer/ListingGallery";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  CalendarCheck,
  Clock,
  MapPin,
  MessageCircle,
  Play,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { contactVendor } from "@/lib/contact-vendor";
import { trackEvent } from "@/lib/activity";
import {
  openConversation,
  usePortfolio,
  useProvider,
  useProviderReviews,
  useProviderServices,
} from "@/lib/marketplace.queries";
import { useUser } from "@/lib/queries";
import { SectionCard } from "@/components/refer/cards";
import { RatingStars } from "@/components/refer/RatingStars";
import { MediaLightbox, isVideoSource, type LightboxMedia } from "@/components/refer/MediaLightbox";
import { ReviewComposer } from "@/components/refer/ReviewComposer";
import { ReportDialog } from "@/components/refer/ReportDialog";
import { EmptyState, SkeletonRows } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { type ServiceCategory } from "@/lib/marketplace";
import { categoryLabel } from "@/lib/taxonomy";
import { formatDateTime, formatXAF } from "@/lib/format";
import { useI18n, baseLang } from "@/lib/i18n";
import {
  formatDateTimeInZone,
  formatTimeInZone,
  isDifferentZone,
  providerTimeZone,
  zoneLabel,
} from "@/lib/timezone";

/** Friendly message for a `request_booking` failure code. */
function bookingRequestError(code: string, fr: boolean): string {
  switch (code) {
    case "CANNOT_BOOK_SELF":
      return fr
        ? "Vous ne pouvez pas réserver votre propre service."
        : "You can't book your own service.";
    case "SERVICE_NOT_FOUND":
      return fr ? "Ce service n'existe plus." : "That service no longer exists.";
    case "SERVICE_UNAVAILABLE":
      return fr
        ? "Ce créneau vient d'être pris. Choisissez-en un autre."
        : "That time was just taken. Please pick another.";
    case "UNAUTHENTICATED":
      return fr ? "Connectez-vous pour réserver." : "Please sign in to book.";
    default:
      return fr ? "Envoi impossible. Réessayez." : "Couldn't send your request. Please try again.";
  }
}

export const Route = createFileRoute("/_authenticated/services/$providerId")({
  head: () => ({
    meta: [
      { title: "Provider profile — ASH Glo" },
      {
        name: "description",
        content: "See a provider's work, services and reviews, then book or chat with them.",
      },
      { property: "og:title", content: "Provider profile — ASH Glo" },
      {
        property: "og:description",
        content: "Portfolio, services, reviews and instant booking on ASH Glo.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProviderPage,
});

type ServiceRow = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  category: ServiceCategory;
  is_active: boolean;
};

/** Placeholder used when a pro hasn't published a service yet — the client describes the job. */
const CUSTOM_ID = "custom";

function customService(fr: boolean): ServiceRow {
  return {
    id: CUSTOM_ID,
    title: fr ? "Prestation sur mesure" : "Custom request",
    description: null,
    price: 0,
    duration_minutes: 60,
    category: "OTHER" as ServiceCategory,
    is_active: true,
  };
}

function ProviderPage() {
  const { providerId } = Route.useParams();
  const { tx, t, lang } = useI18n();
  const fr = lang === "fr";
  const navigate = useNavigate();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { data: provider, isLoading } = useProvider(providerId);
  const { data: services } = useProviderServices(providerId);
  const { data: portfolio } = usePortfolio(providerId);
  const [lightbox, setLightbox] = useState<LightboxMedia | null>(null);
  const { data: reviews } = useProviderReviews(providerId);

  const [detail, setDetail] = useState<ServiceRow | null>(null);
  const [booking, setBooking] = useState<ServiceRow | null>(null);

  // Activity intelligence: a storefront visit is a strong interest signal.
  useEffect(() => {
    if (!provider) return;
    const categories = (provider as { categories?: string[] | null }).categories;
    trackEvent({
      event_type: "provider_view",
      surface: "services",
      target_type: "provider",
      target_id: provider.id,
      author_id: provider.user_id ?? null,
      category: categories && categories.length > 0 ? (categories[0] ?? null) : null,
    });
  }, [provider]);

  const activeServices = useMemo(
    () => ((services ?? []) as ServiceRow[]).filter((s) => s.is_active),
    [services],
  );
  const bookable = Boolean(
    provider?.is_live &&
    (provider as { accepting_bookings?: boolean })?.accepting_bookings !== false,
  );
  const isOwner = provider?.user_id === user?.id;

  async function chat() {
    try {
      // Opens with a friendly "Hi + why I'm reaching out" so the vendor has
      // context from the first message.
      const id = await contactVendor({
        providerId,
        businessName: provider?.business_name ?? null,
        subject: activeServices[0]?.title ?? provider?.business_name ?? null,
        fr: lang === "fr",
        source: "ash_provider_page",
      });
      if (!id) {
        toast.error(t("book.err"));
        return;
      }
      void navigate({ to: "/messages", search: { c: id } });
    } catch {
      toast.error(t("book.err"));
    }
  }

  if (isLoading) return <SkeletonRows rows={4} />;
  if (!provider) return <EmptyState title={t("svc.empty")} description={t("svc.emptyCopy")} />;

  const verified = (provider as { is_verified?: boolean }).is_verified === true;
  const completed = Number((provider as { completed_bookings?: number }).completed_bookings ?? 0);
  const areas = ((provider as { service_areas?: string[] }).service_areas ?? []).filter(Boolean);

  // Say *why* booking is unavailable instead of showing a dead grey button.
  const blockedReason = isOwner
    ? tx(
        "This is your own storefront, so you can't book yourself.",
        "C'est votre propre vitrine — vous ne pouvez pas vous réserver.",
      )
    : !bookable
      ? tx(
          "This pro isn't accepting new bookings right now. You can still start a chat.",
          "Ce pro n'accepte pas de nouvelles réservations pour le moment. Vous pouvez quand même discuter.",
        )
      : null;

  const cats = (provider.categories ?? []) as ServiceCategory[];
  const gallery: GalleryItem[] = (portfolio ?? [])
    .filter((i) => i.url)
    .map((i) => ({
      id: i.id,
      url: i.url!,
      caption: i.caption,
      isVideo: isVideoSource(i.image_path) || isVideoSource(i.url!),
    }));
  const place = [provider.city, ...areas.slice(0, 1)].filter(Boolean).join(" · ");
  const minPrice = activeServices.length
    ? Math.min(...activeServices.map((s) => Number(s.price)))
    : null;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <ListingGallery
        items={gallery}
        alt={provider.business_name}
        emptyLabel={tx("No photos yet", "Pas encore de photos")}
        onOpen={(i) =>
          setLightbox({ url: i.url, caption: i.caption ?? null, isVideo: Boolean(i.isVideo) })
        }
      />

      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl font-extrabold text-foreground">
            {provider.business_name}
          </h1>
          {verified ? (
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
              <BadgeCheck className="size-3.5" aria-hidden />
              {tx("Verified", "Vérifié")}
            </span>
          ) : null}
        </div>
        {minPrice !== null ? (
          <p className="text-xl font-bold text-foreground">
            {tx("From", "Dès")} {formatXAF(minPrice)}
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground">
          {tx("Listed", "Publié")} {relativeTime(provider.created_at, lang)}
          {place ? ` ${tx("in", "à")} ${place}` : ""}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <RatingStars value={Number(provider.rating_avg)} size={14} />
            <span className="tabular">
              {Number(provider.rating_avg).toFixed(1)} ({provider.rating_count})
            </span>
          </span>
          {completed > 0 ? (
            <span className="flex items-center gap-1">
              <CalendarCheck className="size-3.5" aria-hidden />
              {completed} {tx("completed bookings", "prestations terminées")}
            </span>
          ) : null}
          <span className={bookable ? "font-semibold text-primary" : ""}>
            {bookable ? tx("Available", "Disponible") : tx("Unavailable", "Indisponible")}
          </span>
        </div>
      </section>

      {!isOwner && (
        <SellerMessageBox
          providerId={providerId}
          businessName={provider.business_name}
          categories={cats}
        />
      )}

      {blockedReason ? (
        <p className="rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          {blockedReason}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          className="touch-manipulation"
          disabled={Boolean(blockedReason)}
          onClick={() => setBooking(activeServices[0] ?? customService(fr))}
        >
          {tx("Book service", "Réserver un service")}
        </Button>
        <Button variant="outline" onClick={() => void chat()} disabled={isOwner}>
          <MessageCircle className="size-4" aria-hidden />
          {t("svc.chat")}
        </Button>
        {isOwner ? null : (
          <ReportDialog
            targetType="PROVIDER"
            targetId={provider.id}
            targetUserId={provider.user_id}
            targetLabel={provider.business_name}
            variant="outline"
          />
        )}
      </div>

      {provider.bio ? (
        <SectionCard title={tx("Description", "Description")}>
          <ClampText text={provider.bio} />
        </SectionCard>
      ) : null}

      <SectionCard title={tx("Details", "Détails")}>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm">
          {cats.length > 0 && (
            <>
              <dt className="text-muted-foreground">{tx("Category", "Catégorie")}</dt>
              <dd>{cats.map((c) => categoryLabel(c, lang)).join(", ")}</dd>
            </>
          )}
          <dt className="text-muted-foreground">{tx("Bookings", "Réservations")}</dt>
          <dd>
            {bookable
              ? tx("Accepting bookings", "Accepte les réservations")
              : tx("Paused", "En pause")}
          </dd>
          {areas.length > 0 && (
            <>
              <dt className="text-muted-foreground">{tx("Service areas", "Zones")}</dt>
              <dd>{areas.join(", ")}</dd>
            </>
          )}
          <dt className="text-muted-foreground">{tx("Services", "Services")}</dt>
          <dd>{activeServices.length}</dd>
        </dl>
      </SectionCard>

      <SectionCard title={tx("Services", "Services")}>
        {activeServices.length === 0 ? (
          <EmptyState title={tx("No active service", "Aucun service actif")} />
        ) : (
          <ul className="divide-y divide-border">
            {activeServices.map((service) => (
              <li
                key={service.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3"
              >
                <button
                  type="button"
                  className="min-w-0 text-left"
                  onClick={() => setDetail(service)}
                >
                  <p className="truncate font-semibold text-foreground">{service.title}</p>
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="size-3.5" aria-hidden />
                    {service.duration_minutes} min · {categoryLabel(service.category, lang)}
                  </p>
                </button>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="tabular text-sm font-bold">{formatXAF(service.price)}</span>
                  <Button
                    size="sm"
                    className="touch-manipulation"
                    disabled={Boolean(blockedReason)}
                    onClick={() => setBooking(service)}
                  >
                    {t("svc.book")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {provider.city ? (
        <SectionCard title={tx("Location", "Localisation")}>
          <LocationMap
            place={[provider.city, (provider as { country?: string | null }).country]
              .filter(Boolean)
              .join(", ")}
          />
        </SectionCard>
      ) : null}

      <RelatedListings
        providerId={provider.id}
        categories={cats}
        country={(provider as { country?: string | null }).country ?? null}
      />

      <MediaLightbox media={lightbox} onClose={() => setLightbox(null)} />

      <SectionCard title={t("svc.reviews")}>
        <ReviewComposer providerId={providerId} isOwner={isOwner} fr={fr} />

        {(reviews ?? []).length === 0 ? (
          <div className="mt-3">
            <EmptyState title={tx("No reviews yet", "Pas encore d'avis")} />
          </div>
        ) : (
          <ul className="mt-3 space-y-3">
            {(reviews ?? []).map((review) => {
              const isVerified = review.kind !== "COMMUNITY";
              return (
                <li key={review.id} className="rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <RatingStars value={review.rating} size={14} />
                    <span className="text-xs font-semibold text-foreground">{review.author}</span>
                    <span
                      className={
                        isVerified
                          ? "flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary"
                          : "rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground"
                      }
                    >
                      {isVerified ? (
                        <>
                          <ShieldCheck className="size-3" aria-hidden />
                          {tx("Verified booking", "Réservation vérifiée")}
                        </>
                      ) : fr ? (
                        "Avis communautaire"
                      ) : (
                        "Community review"
                      )}
                    </span>
                  </div>
                  {review.comment ? (
                    <p className="mt-1 text-sm text-foreground/90">{review.comment}</p>
                  ) : null}
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="text-[11px] text-muted-foreground">
                      {formatDateTime(review.created_at)}
                    </p>
                    <ReportDialog
                      targetType="REVIEW"
                      targetId={review.id}
                      allowBlock={false}
                      compact
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      {/* Service detail */}
      <Dialog open={Boolean(detail)} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detail?.title}</DialogTitle>
          </DialogHeader>
          {detail ? (
            <div className="space-y-3 text-sm">
              {detail.description ? (
                <p className="text-foreground/90">{detail.description}</p>
              ) : null}
              <dl className="grid grid-cols-2 gap-2 text-muted-foreground">
                <div>
                  <dt className="text-xs">{tx("Price", "Prix")}</dt>
                  <dd className="tabular font-bold text-foreground">{formatXAF(detail.price)}</dd>
                </div>
                <div>
                  <dt className="text-xs">{tx("Duration", "Durée")}</dt>
                  <dd className="font-semibold text-foreground">{detail.duration_minutes} min</dd>
                </div>
                <div>
                  <dt className="text-xs">{tx("Provider", "Pro")}</dt>
                  <dd className="font-semibold text-foreground">{provider.business_name}</dd>
                </div>
                <div>
                  <dt className="text-xs">{tx("Service area", "Zone")}</dt>
                  <dd className="font-semibold text-foreground">
                    {areas.length > 0 ? areas.join(", ") : (provider.city ?? "—")}
                  </dd>
                </div>
              </dl>
              <Button
                className="w-full"
                disabled={Boolean(blockedReason) || !detail.is_active}
                onClick={() => {
                  setBooking(detail);
                  setDetail(null);
                }}
              >
                {bookable ? t("svc.book") : tx("Unavailable", "Indisponible")}
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {booking ? (
        <BookingRequestDialog
          provider={{
            id: provider.id,
            name: provider.business_name,
            city: provider.city,
            country: (provider as { country?: string | null }).country ?? null,
          }}
          service={booking}
          services={activeServices}
          onClose={() => setBooking(null)}
          onDone={() => {
            setBooking(null);
            void queryClient.invalidateQueries({ queryKey: ["bookings"] });
            void queryClient.invalidateQueries({ queryKey: ["notifications"] });
            void navigate({ to: "/bookings" });
          }}
        />
      ) : null}
    </div>
  );
}

function BookingRequestDialog({
  provider,
  service,
  services,
  onClose,
  onDone,
}: {
  provider: { id: string; name: string; city: string | null; country: string | null };
  service: ServiceRow;
  services: ServiceRow[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const zone = providerTimeZone(provider.country);
  const showZone = isDifferentZone(zone);
  const [serviceId, setServiceId] = useState(service.id);
  /** The chosen instant, as an ISO string. Never a device-local wall clock. */
  const [when, setWhen] = useState("");
  const [day, setDay] = useState("");
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slotError, setSlotError] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [busy, setBusy] = useState(false);
  /** The vendor's own published weekly hours — the single source of truth. */
  const [hours, setHours] = useState<
    { weekday: number; start_minute: number; end_minute: number }[] | null
  >(null);
  /** Guards against a double tap firing two `request_booking` calls. */
  const sending = useRef(false);

  const isCustom = serviceId === CUSTOM_ID;
  const selected = services.find((s) => s.id === serviceId) ?? service;
  const effTitle = isCustom ? customTitle.trim() : selected.title;
  const effPrice = isCustom ? Math.max(0, Math.round(Number(customPrice) || 0)) : selected.price;

  // Load the vendor's published weekly hours so the customer sees exactly the
  // days and times the vendor set, and cannot land on a closed day by accident.
  useEffect(() => {
    let cancelled = false;
    void supabase
      .from("provider_availability")
      .select("weekday, start_minute, end_minute")
      .eq("provider_id", provider.id)
      .order("weekday")
      .then(({ data }) => {
        if (!cancelled) setHours((data ?? []) as typeof hours);
      });
    return () => {
      cancelled = true;
    };
  }, [provider.id]);

  // Real bookable slots come from the provider's weekly hours minus taken times.
  useEffect(() => {
    if (!day) {
      setSlots(null);
      setSlotError(false);
      return;
    }
    let cancelled = false;
    setLoadingSlots(true);
    setSlotError(false);
    void supabase
      .rpc("provider_slots", {
        _provider_id: provider.id,
        _date: day,
        _duration: selected.duration_minutes,
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("provider_slots failed", error);
          setSlotError(true);
          setSlots([]);
          setLoadingSlots(false);
          return;
        }
        setSlots((data ?? []) as string[]);
        setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [day, provider.id, selected.duration_minutes]);

  async function submit() {
    // Prevent duplicate submissions from double taps or repeated clicks.
    if (sending.current || busy) return;

    const scheduledAt = new Date(when);
    if (!when || Number.isNaN(scheduledAt.getTime())) {
      toast.error(
        tx("Please choose a valid date and time.", "Choisissez une date et une heure valides."),
      );
      return;
    }

    if (isCustom && !customTitle.trim()) {
      toast.error(tx("Please describe the service you need.", "Décrivez le service demandé."));
      return;
    }

    if (isCustom && effPrice < 0) {
      toast.error(tx("The budget is invalid.", "Le budget est invalide."));
      return;
    }

    sending.current = true;
    setBusy(true);

    try {
      /*
       * Keep booking creation server-side through the existing RPC.
       * Provider availability, ownership, pricing and notifications must
       * remain enforced by the database function.
       */
      const payload = {
        _provider_id: provider.id,
        _service_id: isCustom ? null : serviceId!,
        _scheduled_at: scheduledAt.toISOString(),
        _notes: notes.trim(),
        _address: address.trim(),
        ...(isCustom
          ? {
              _custom_title: effTitle,
              _custom_price: effPrice,
            }
          : {}),
      };

      // The deployed RPC accepts NULL for custom requests; generated client
      // types lag that nullable signature until the next schema sync.
      const { data, error } = await supabase.rpc("request_booking", payload as never);

      if (error) {
        console.error("request_booking failed", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });

        toast.error(bookingRequestError("REQUEST_FAILED", fr));
        return;
      }

      /*
       * The RPC's `error` is the authoritative Supabase failure signal.
       * Older/newer versions of the function may return an object, id, or
       * NULL on success. Only reject an explicitly negative result.
       */
      if (
        typeof data === "object" &&
        data !== null &&
        "ok" in data &&
        (data as { ok?: unknown }).ok === false
      ) {
        const code =
          "error" in data && typeof (data as { error?: unknown }).error === "string"
            ? (data as { error: string }).error
            : "REQUEST_FAILED";

        console.error("request_booking returned a negative result:", data);
        toast.error(bookingRequestError(code, fr));
        return;
      }

      if (
        typeof data === "object" &&
        data !== null &&
        "success" in data &&
        (data as { success?: unknown }).success === false
      ) {
        console.error("request_booking returned success=false:", data);
        toast.error(bookingRequestError("REQUEST_FAILED", fr));
        return;
      }

      trackEvent({
        event_type: "booking",
        surface: "services",
        target_type: "provider",
        target_id: provider.id,
        author_id: (provider as { user_id?: string | null }).user_id ?? null,
        category: (selected as { category?: string | null }).category ?? null,
      });

      toast.success(
        tx(
          "Request sent. The pro has 24 hours to respond.",
          "Demande envoyée. Le pro a 24 h pour répondre.",
        ),
      );

      onDone();
    } catch (err) {
      console.error("Unexpected request_booking error:", err);
      toast.error(
        tx(
          "Something went wrong while sending the request. Please try again.",
          "Une erreur inattendue est survenue. Réessayez.",
        ),
      );
    } finally {
      setBusy(false);
      sending.current = false;
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem-env(safe-area-inset-bottom,0px))] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
        <DialogHeader>
          <DialogTitle>
            {step === "form"
              ? tx("Request a booking", "Demander une réservation")
              : tx("Confirm", "Confirmer")}
          </DialogTitle>
        </DialogHeader>

        {step === "form" ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();

              if (!when) {
                toast.error(
                  tx("Please choose a date and time.", "Choisissez une date et une heure."),
                );
                return;
              }

              const selectedDate = new Date(when);
              if (Number.isNaN(selectedDate.getTime())) {
                toast.error(tx("Invalid date or time.", "Date ou heure invalide."));
                return;
              }

              if (isCustom && !customTitle.trim()) {
                toast.error(
                  tx("Please describe the service you need.", "Décrivez le service demandé."),
                );
                return;
              }

              setStep("confirm");
            }}
          >
            {isCustom ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="ctitle">{tx("What do you need?", "Que voulez-vous ?")}</Label>
                  <Input
                    id="ctitle"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder={tx(
                      "e.g. Box braids, men's haircut…",
                      "ex. Tresses box, coupe homme…",
                    )}
                    maxLength={120}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cprice">{tx("Your budget (XAF)", "Votre budget (XAF)")}</Label>
                  <Input
                    id="cprice"
                    type="number"
                    min={0}
                    step={500}
                    inputMode="numeric"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    placeholder="5000"
                  />
                  <p className="text-xs text-muted-foreground">
                    {tx(
                      "The pro confirms the price before any payment.",
                      "Le pro confirme le prix avant tout paiement.",
                    )}
                  </p>
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="svc">{tx("Service", "Service")}</Label>
                <select
                  id="svc"
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} — {formatXAF(s.price)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {hours && hours.length > 0 ? (
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {tx("Pro's opening hours", "Horaires du pro")}
                  {showZone ? ` · ${zoneLabel(zone, baseLang(lang))}` : ""}
                </p>
                <ul className="mt-2 space-y-1 text-xs text-foreground">
                  {hours.map((h) => (
                    <li
                      key={`${h.weekday}-${h.start_minute}`}
                      className="flex justify-between gap-3"
                    >
                      <span>{dayName(h.weekday, fr)}</span>
                      <span className="tabular font-semibold">
                        {clock(h.start_minute)} – {clock(h.end_minute)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="day">{tx("Date", "Date")}</Label>

              <Input
                id="day"
                type="date"
                value={day}
                min={todayInput()}
                onChange={(e) => {
                  setDay(e.target.value);
                  setWhen("");
                }}
                required
              />
              {day && hours && !hours.some((h) => h.weekday === weekdayOf(day)) ? (
                <p className="text-xs font-medium text-destructive">
                  {fr
                    ? `Fermé le ${dayName(weekdayOf(day), true).toLowerCase()}. Choisissez un jour ouvert ci-dessus.`
                    : `Closed on ${dayName(weekdayOf(day), false)}. Pick one of the open days listed above.`}
                </p>
              ) : null}
            </div>

            {day ? (
              <div className="space-y-1.5">
                <Label>{tx("Available slots", "Créneaux disponibles")}</Label>
                {loadingSlots ? (
                  <p className="text-sm text-muted-foreground">{tx("Loading…", "Chargement…")}</p>
                ) : (slots ?? []).length === 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {slotError
                        ? tx(
                            "Could not load the slots. Please try again.",
                            "Impossible de charger les créneaux. Réessayez.",
                          )
                        : tx(
                            "No free slot left that day. Pick another date, or propose a time to the pro.",
                            "Plus de créneau libre ce jour-là. Choisissez une autre date, ou proposez une heure au pro.",
                          )}
                    </p>
                    <Input
                      type="datetime-local"
                      aria-label={tx("Propose a time", "Proposer une heure")}
                      value={when}
                      onChange={(e) => setWhen(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {tx(
                        "Entered in your own timezone — the pro still has to accept it.",
                        "Heure saisie dans votre fuseau ; le pro doit l'accepter.",
                      )}
                    </p>
                  </div>
                ) : (
                  <>
                    {showZone ? (
                      <p className="text-xs text-muted-foreground">
                        {fr
                          ? `Heures affichées dans le fuseau du pro (${zoneLabel(zone, baseLang(lang))}).`
                          : `Times shown in the pro's timezone (${zoneLabel(zone, baseLang(lang))}).`}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      {(slots ?? []).map((slot) => {
                        const local = formatTimeInZone(slot, zone, baseLang(lang));
                        const value = toLocalInput(slot);
                        const active = when === value;
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setWhen(value)}
                            className={
                              active
                                ? "rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground"
                                : "rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                            }
                          >
                            {local}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="addr">{tx("Location / address", "Lieu / adresse")}</Label>
              <Input
                id="addr"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={provider.city ?? tx("Where?", "Où ?")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">{tx("Details", "Détails")}</Label>
              <Textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              className="w-full touch-manipulation"
              disabled={!when || (isCustom && !customTitle.trim())}
            >
              {tx("Continue", "Continuer")}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <dl className="space-y-2 rounded-xl border border-border p-3 text-sm">
              <Row label={tx("Provider", "Pro")} value={provider.name} />
              <Row label={tx("Service", "Service")} value={effTitle} />
              <Row
                label={tx("Date", "Date")}
                value={`${formatDateTimeInZone(new Date(when).toISOString(), zone, baseLang(lang))}${
                  showZone ? ` (${zoneLabel(zone, baseLang(lang))})` : ""
                }`}
              />
              <Row label={tx("Duration", "Durée")} value={`${selected.duration_minutes} min`} />
              <Row label={tx("Location", "Lieu")} value={address || provider.city || "—"} />
              <Row
                label={isCustom ? tx("Budget", "Budget") : tx("Total", "Total")}
                value={effPrice > 0 ? formatXAF(effPrice) : tx("To be confirmed", "À confirmer")}
              />
            </dl>

            <p className="flex items-start gap-2 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
              {tx(
                "No payment now. You only pay after the pro accepts.",
                "Aucun paiement maintenant. Vous paierez seulement après l'acceptation du pro.",
              )}
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setStep("form")}
                disabled={busy}
              >
                {tx("Back", "Retour")}
              </Button>
              <Button
                type="button"
                className="flex-1 touch-manipulation"
                onClick={() => void submit()}
                disabled={busy}
                aria-busy={busy}
              >
                {busy ? tx("Sending…", "Envoi…") : tx("Send request", "Envoyer la demande")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const DAY_NAMES_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_NAMES_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

function dayName(weekday: number, fr: boolean): string {
  return (fr ? DAY_NAMES_FR : DAY_NAMES_EN)[weekday] ?? "";
}

/** "08:30" from minutes-after-midnight, exactly as the vendor entered it. */
function clock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Weekday index of a `YYYY-MM-DD` value, read as a plain calendar date. */
function weekdayOf(day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)).getUTCDay();
}

/** Today's calendar date on the visitor's device, for the date input `min`. */
function todayInput(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** datetime-local value for a UTC timestamp, in the visitor's own timezone. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate text-right font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function relativeTime(iso: string, lang: string): string {
  const days = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 86_400_000));
  const rtf = new Intl.RelativeTimeFormat(baseLang(lang as never), { numeric: "auto" });
  if (days < 1) return rtf.format(0, "day");
  if (days < 30) return rtf.format(-days, "day");
  if (days < 365) return rtf.format(-Math.round(days / 30), "month");
  return rtf.format(-Math.round(days / 365), "year");
}

const FOOD = new Set(["PRIVATE_CHEF", "CATERING"]);

function SellerMessageBox({
  providerId,
  businessName,
  categories,
}: {
  providerId: string;
  businessName: string;
  categories: string[];
}) {
  const { tx } = useI18n();
  const navigate = useNavigate();
  const food = categories.some((c) => FOOD.has(c));
  const [text, setText] = useState(
    food
      ? tx("Hi, is this dish available today?", "Bonjour, ce plat est-il disponible aujourd’hui ?")
      : tx("Hi, is this available?", "Bonjour, est-ce disponible ?"),
  );
  const [busy, setBusy] = useState(false);
  async function send() {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      const id = await openConversation(providerId);
      const { data: auth } = await supabase.auth.getUser();
      if (!id || !auth.user) throw new Error("no conversation");
      const { error } = await supabase
        .from("messages")
        .insert({
          conversation_id: id,
          sender_id: auth.user.id,
          body,
          metadata: { source: "ash_listing_quick_message", subject: businessName },
        });
      if (error) throw error;
      toast.success(tx("Message sent", "Message envoyé"));
      void navigate({ to: "/messages", search: { c: id } });
    } catch {
      toast.error(tx("Couldn't send your message.", "Envoi impossible."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="space-y-2 rounded-2xl border border-border bg-card p-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <MessageCircle className="size-4 text-primary" aria-hidden />
        {tx("Send seller a message", "Envoyer un message au vendeur")}
      </p>
      <div className="flex gap-2">
        <Input
          aria-label={tx("Message", "Message")}
          value={text}
          maxLength={500}
          onChange={(e) => setText(e.target.value)}
          className="rounded-full bg-muted"
        />
        <Button
          className="rounded-full"
          disabled={busy || !text.trim()}
          onClick={() => void send()}
        >
          {busy ? "…" : tx("Send", "Envoyer")}
        </Button>
      </div>
    </section>
  );
}

function ClampText({ text }: { text: string }) {
  const { tx } = useI18n();
  const [open, setOpen] = useState(false);
  const long = text.length > 220;
  return (
    <div className="text-sm text-foreground/90">
      <p className={open || !long ? "whitespace-pre-wrap" : "line-clamp-3 whitespace-pre-wrap"}>
        {text}
      </p>
      {long && (
        <button
          type="button"
          className="mt-1 font-semibold text-primary"
          onClick={() => setOpen(!open)}
        >
          {open ? tx("See less", "Voir moins") : tx("See more", "Voir plus")}
        </button>
      )}
    </div>
  );
}

function openNativeMap(place: string) {
  const q = encodeURIComponent(place);
  const ios =
    typeof navigator !== "undefined" &&
    /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent) &&
    "ontouchend" in document;
  const url = ios
    ? `https://maps.apple.com/?q=${q}`
    : `https://www.google.com/maps/search/?api=1&query=${q}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function LocationMap({ place }: { place: string }) {
  const { tx } = useI18n();
  return (
    <button
      type="button"
      onClick={() => openNativeMap(place)}
      className="block w-full overflow-hidden rounded-xl border border-border text-left"
      aria-label={tx("Open in maps", "Ouvrir dans Plans")}
    >
      <iframe
        title={place}
        src={`https://maps.google.com/maps?q=${encodeURIComponent(place)}&z=12&output=embed`}
        className="pointer-events-none h-48 w-full"
        loading="lazy"
      />
      <span className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-foreground">
        <MapPin className="size-4 text-primary" aria-hidden />
        {place}
        <span className="ml-auto text-xs text-primary">
          {tx("Open in maps", "Ouvrir dans Plans")}
        </span>
      </span>
    </button>
  );
}

function RelatedListings({
  providerId,
  categories,
  country,
}: {
  providerId: string;
  categories: string[];
  country: string | null;
}) {
  const { tx } = useI18n();
  const { data } = useQuery({
    queryKey: ["related-providers", providerId, categories.join(","), country],
    queryFn: async () => {
      let q = supabase
        .from("provider_profiles")
        .select("id, business_name, city, avatar_url, rating_avg, rating_count")
        .eq("is_live", true)
        .neq("id", providerId)
        .limit(6);
      if (country) q = q.eq("country", country);
      if (categories.length) q = q.overlaps("categories", categories as never);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
  if (!data || data.length === 0) return null;
  return (
    <SectionCard title={tx("Related listings", "Annonces similaires")}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {data.map((p) => (
          <Link
            key={p.id}
            to="/services/$providerId"
            params={{ providerId: p.id }}
            className="min-w-0"
          >
            <div className="aspect-square overflow-hidden rounded-lg bg-muted">
              {p.avatar_url ? (
                <img
                  src={p.avatar_url}
                  alt={p.business_name}
                  loading="lazy"
                  className="size-full object-cover"
                />
              ) : (
                <div className="grid size-full place-items-center font-display text-2xl font-bold text-primary/70">
                  {p.business_name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <p className="mt-1 line-clamp-1 text-sm font-medium text-foreground">
              {p.business_name}
            </p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <RatingStars value={Number(p.rating_avg)} size={11} />
              {Number(p.rating_count) > 0 ? Number(p.rating_avg).toFixed(1) : ""}
              {p.city ? ` · ${p.city}` : ""}
            </p>
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}
