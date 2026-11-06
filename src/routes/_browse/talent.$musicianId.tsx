import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  AudioLines,
  BadgeCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Heart,
  MapPin,
  MessageCircle,
  Music2,
  Play,
  Share2,
  Star,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/refer/AvatarUpload";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuthGate } from "@/lib/guest-gate";
import { useI18n } from "@/lib/i18n";
import { openMemberConversation } from "@/lib/contact-vendor";
import { useUser } from "@/lib/queries";
import {
  useMusicianFavorite,
  useMusicianMedia,
  useMusicianReviews,
  useMusicianStats,
  useMusician,
} from "@/lib/musician.queries";
import { talentDb } from "@/lib/musician.queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_browse/talent/$musicianId")({
  head: () => ({ meta: [{ title: "Musician — ASH Talent" }] }),
  component: MusicianProfilePage,
});

function MusicianProfilePage() {
  const { musicianId } = Route.useParams();
  const { tx } = useI18n();
  const navigate = useNavigate();
  const { user } = useUser();
  const { requireAuth } = useAuthGate();
  const cache = useQueryClient();
  const profile = useMusician(musicianId);
  const media = useMusicianMedia(musicianId);
  const reviews = useMusicianReviews(musicianId);
  const stats = useMusicianStats([musicianId]);
  const favorite = useMusicianFavorite(user?.id, musicianId);
  const [activeTab, setActiveTab] = useState("Portfolio");
  const [mediaIndex, setMediaIndex] = useState(0);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const musician = profile.data;
  const approvedMedia = (media.data ?? []).filter((item) => item.review_status === "APPROVED");
  const visualMedia = approvedMedia.filter((item) => item.media_type !== "AUDIO");
  const selected = visualMedia[mediaIndex];
  const summary = stats.data?.get(musicianId);
  const formattedRate =
    musician?.hourly_rate_minor !== null &&
    musician?.hourly_rate_minor !== undefined &&
    musician.rate_currency
      ? new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: musician.rate_currency,
          maximumFractionDigits: musician.rate_currency === "CAD" ? 2 : 0,
        }).format(
          musician.rate_currency === "CAD"
            ? musician.hourly_rate_minor / 100
            : musician.hourly_rate_minor,
        )
      : null;
  const ownEnquiries = useQuery({
    queryKey: ["sent-musician-enquiries", musicianId, user?.id],
    enabled: Boolean(musician && user && musician.user_id !== user.id),
    queryFn: async () => {
      const { data, error } = await talentDb
        .from("musician_enquiries")
        .select("*")
        .eq("musician_id", musicianId)
        .eq("customer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const openEnquiry = () => {
    if (
      !requireAuth({
        en: "Sign in to book a musician.",
        fr: "Connectez-vous pour réserver un musicien.",
      })
    )
      return;
    setEnquiryOpen(true);
  };
  const submitEnquiry = async () => {
    if (!musician || !message.trim()) return;
    try {
      const { error } = await talentDb.rpc("submit_musician_enquiry", {
        _musician_id: musician.id,
        _message: message.trim(),
        _event_date: eventDate || null,
      });
      if (error) throw error;
      setMessage("");
      setEventDate("");
      setEnquiryOpen(false);
      await cache.invalidateQueries({ queryKey: ["sent-musician-enquiries", musicianId] });
      toast.success(tx("Gig enquiry sent", "Demande de prestation envoyée"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : tx("Could not send enquiry", "Impossible d'envoyer la demande"),
      );
    }
  };
  const toggleFavorite = async () => {
    if (!user || !musician) {
      requireAuth({
        en: "Sign in to save this musician.",
        fr: "Connectez-vous pour enregistrer ce musicien.",
      });
      return;
    }
    try {
      const result = favorite.data
        ? await talentDb
            .from("musician_favorites")
            .delete()
            .eq("user_id", user.id)
            .eq("musician_id", musician.id)
        : await talentDb
            .from("musician_favorites")
            .insert({ user_id: user.id, musician_id: musician.id });
      if (result.error) throw result.error;
      await cache.invalidateQueries({ queryKey: ["musician-favorite", user.id, musicianId] });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : tx("Could not update favorites", "Impossible de modifier les favoris"),
      );
    }
  };
  const chat = async () => {
    if (
      !musician ||
      !requireAuth({ en: "Sign in to message.", fr: "Connectez-vous pour discuter." })
    )
      return;
    try {
      const id = await openMemberConversation(musician.user_id);
      if (!id)
        throw new Error(tx("Could not open conversation", "Impossible d'ouvrir la discussion"));
      await navigate({ to: "/messages", search: { c: id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open conversation");
    }
  };
  const confirmCompleted = async (id: string) => {
    try {
      const { error } = await talentDb.rpc("confirm_musician_gig_completed", { _enquiry_id: id });
      if (error) throw error;
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["sent-musician-enquiries", musicianId] }),
        cache.invalidateQueries({ queryKey: ["musician-stats"] }),
      ]);
      toast.success(
        tx(
          "Completion confirmed. Both parties must confirm before review.",
          "Confirmation enregistrée. Les deux parties doivent confirmer avant l'avis.",
        ),
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : tx("Could not confirm completion", "Impossible de confirmer"),
      );
    }
  };
  const submitReview = async (id: string) => {
    try {
      const { error } = await talentDb.rpc("create_musician_review", {
        _enquiry_id: id,
        _rating: rating,
        _review: reviewText.trim(),
      });
      if (error) throw error;
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["musician-reviews-public", musicianId] }),
        cache.invalidateQueries({ queryKey: ["musician-stats"] }),
        cache.invalidateQueries({ queryKey: ["sent-musician-enquiries", musicianId] }),
      ]);
      toast.success(tx("Review submitted", "Avis envoyé"));
      setReviewText("");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : tx("Could not submit review", "Impossible d'envoyer l'avis"),
      );
    }
  };
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share)
        await navigator.share({ title: musician?.display_name ?? "ASH Talent", url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success(tx("Profile link copied", "Lien du profil copié"));
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError")
        toast.error(tx("Could not share profile", "Impossible de partager le profil"));
    }
  };

  if (profile.isLoading)
    return (
      <main className="p-8 text-center text-muted-foreground">
        {tx("Loading musician…", "Chargement…")}
      </main>
    );
  if (profile.isError || !musician)
    return (
      <main className="mx-auto max-w-xl p-8 text-center">
        <p role="alert">{tx("Musician profile unavailable.", "Profil musicien indisponible.")}</p>
        <Button asChild className="mt-4">
          <Link to="/discover">{tx("Back to Discover", "Retour à Découvrir")}</Link>
        </Button>
      </main>
    );

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl overflow-hidden pb-10 text-foreground">
      <section className="relative h-[52vh] min-h-80 max-h-[34rem] overflow-hidden bg-gradient-to-br from-primary/30 via-slate-950 to-violet-950 sm:rounded-b-3xl">
        {selected?.media_type === "VIDEO" ? (
          <video
            key={selected.id}
            src={selected.url}
            controls
            playsInline
            className="size-full object-cover"
          />
        ) : selected ? (
          <img
            src={selected.url}
            alt={`${musician.display_name} performing`}
            className="size-full object-cover"
          />
        ) : (
          <div className="grid size-full place-items-center text-primary/70">
            <Music2 className="size-24" aria-hidden />
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/90 to-transparent" />
        <Link
          to="/discover"
          aria-label={tx("Back", "Retour")}
          className="absolute left-4 top-4 grid size-11 place-items-center rounded-full bg-black/50 text-white backdrop-blur"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <div className="absolute right-4 top-4 flex gap-2">
          <button
            type="button"
            onClick={() => void share()}
            aria-label={tx("Share profile", "Partager le profil")}
            className="grid size-11 place-items-center rounded-full bg-black/50 text-white backdrop-blur"
          >
            <Share2 className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => void toggleFavorite()}
            aria-label={
              favorite.data
                ? tx("Remove favorite", "Retirer des favoris")
                : tx("Add favorite", "Ajouter aux favoris")
            }
            aria-pressed={Boolean(favorite.data)}
            className="grid size-11 place-items-center rounded-full bg-black/50 text-white backdrop-blur"
          >
            <Heart
              className={cn("size-5", favorite.data && "fill-primary text-primary")}
              aria-hidden
            />
          </button>
        </div>
        {visualMedia.length > 1 ? (
          <>
            <button
              type="button"
              aria-label={tx("Previous photo", "Photo précédente")}
              onClick={() =>
                setMediaIndex((mediaIndex - 1 + visualMedia.length) % visualMedia.length)
              }
              className="absolute left-3 top-1/2 grid size-9 place-items-center rounded-full bg-black/45 text-white"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              aria-label={tx("Next photo", "Photo suivante")}
              onClick={() => setMediaIndex((mediaIndex + 1) % visualMedia.length)}
              className="absolute right-3 top-1/2 grid size-9 place-items-center rounded-full bg-black/45 text-white"
            >
              <ChevronRight className="size-5" />
            </button>
            <span className="absolute bottom-4 left-4 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
              {mediaIndex + 1}/{visualMedia.length}
            </span>
            <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
              {visualMedia.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={`${tx("Show photo", "Afficher la photo")} ${index + 1}`}
                  onClick={() => setMediaIndex(index)}
                  className={cn(
                    "size-2 rounded-full",
                    index === mediaIndex ? "bg-white" : "bg-white/50",
                  )}
                />
              ))}
            </div>
          </>
        ) : null}
      </section>

      <section className="space-y-5 px-4 pt-5 sm:px-6">
        <div className="flex items-center gap-3">
          <Avatar
            path={
              selected?.media_type === "PHOTO"
                ? selected.url
                : visualMedia.find((item) => item.media_type === "PHOTO")?.url
            }
            name={musician.display_name}
            className="size-20 shrink-0 border-2 border-primary object-cover"
          />
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-1 font-display text-2xl font-bold">
              {musician.display_name}
              <BadgeCheck
                className="size-5 shrink-0 fill-primary text-primary-foreground"
                aria-label={tx("ASH approved musician", "Musicien approuvé par ASH")}
              />
            </h1>
            <p className="text-sm text-muted-foreground">{musician.instruments.join(" · ")}</p>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-4" aria-hidden />
              {musician.city}, {musician.country}
            </p>
            <span
              className={cn(
                "mt-1 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold",
                musician.accepting_enquiries
                  ? "bg-emerald-500/15 text-emerald-500"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  musician.accepting_enquiries ? "bg-emerald-500" : "bg-muted-foreground",
                )}
              />
              {musician.accepting_enquiries
                ? tx("Available for Booking", "Disponible pour réservation")
                : tx("Not accepting enquiries", "Indisponible")}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[
            {
              icon: Star,
              value: summary?.review_count ? Number(summary.rating_average).toFixed(1) : "—",
              label: tx("Rating", "Note"),
              color: "text-amber-400",
            },
            {
              icon: Users,
              value: String(summary?.review_count ?? 0),
              label: tx("Reviews", "Avis"),
              color: "text-primary",
            },
            {
              icon: CalendarDays,
              value: musician.experience || "—",
              label: tx("Experience", "Expérience"),
              color: "text-primary",
            },
            {
              icon: Zap,
              value: String(summary?.booking_count ?? 0),
              label: tx("Bookings", "Réservations"),
              color: "text-orange-400",
            },
          ].map(({ icon: Icon, value, label, color }) => (
            <div
              key={label}
              className="flex min-h-24 flex-col items-center justify-center rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-violet-500/10 p-2 text-center"
            >
              <Icon className={cn("mb-1 size-5", color)} aria-hidden />
              <strong className="max-w-full truncate text-base">{value}</strong>
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        <section>
          <h2 className="font-display text-xl font-bold">{tx("About", "À propos")}</h2>
          <p className="mt-1 whitespace-pre-line text-sm leading-6 text-muted-foreground">
            {musician.biography || tx("No biography has been added.", "Aucune biographie ajoutée.")}
          </p>
          {musician.genres.length ? (
            <p className="mt-2 text-sm">{musician.genres.join(" · ")}</p>
          ) : null}
        </section>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 to-violet-500/10 p-3">
          <strong>{tx("Hourly Rate", "Tarif horaire")}</strong>
          <span className="rounded-xl border border-primary bg-primary/10 px-4 py-2 font-display text-xl font-black text-primary">
            {formattedRate ? (
              <>
                {formattedRate}
                <small className="ml-1 text-xs font-medium">{tx("/hour", "/h")}</small>
              </>
            ) : (
              tx("Ask for rate", "Sur demande")
            )}
          </span>
        </div>
        {user?.id !== musician.user_id ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              onClick={openEnquiry}
              disabled={!musician.accepting_enquiries}
              className="h-13 rounded-full bg-gradient-to-r from-primary to-pink-600 text-base font-bold text-white hover:brightness-110"
            >
              <CalendarDays className="mr-2 size-5" aria-hidden />
              {tx("Book Now", "Réserver")}
            </Button>
            <Button
              variant="outline"
              onClick={openEnquiry}
              className="h-13 rounded-full border-primary/60 text-base"
            >
              <MessageCircle className="mr-2 size-5" aria-hidden />
              {tx("Send Enquiry", "Envoyer une demande")}
            </Button>
          </div>
        ) : null}

        <nav
          className="grid grid-cols-4 border-b border-border"
          aria-label={tx("Musician profile sections", "Sections du profil")}
        >
          {["Portfolio", "Reviews", "Availability", "More"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "border-b-2 px-1 py-3 text-xs font-semibold sm:text-sm",
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground",
              )}
            >
              {tab === "Portfolio"
                ? tx("Portfolio", "Portfolio")
                : tab === "Reviews"
                  ? `${tx("Reviews", "Avis")} (${summary?.review_count ?? 0})`
                  : tab === "Availability"
                    ? tx("Availability", "Disponibilité")
                    : tx("More", "Plus")}
            </button>
          ))}
        </nav>
        {activeTab === "Portfolio" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {approvedMedia.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-2xl border border-primary/25 bg-card"
              >
                {item.media_type === "PHOTO" ? (
                  <img src={item.url} alt="" className="aspect-square size-full object-cover" />
                ) : item.media_type === "VIDEO" ? (
                  <video
                    src={item.url}
                    controls
                    playsInline
                    preload="metadata"
                    className="aspect-square size-full object-cover"
                  />
                ) : (
                  <div className="p-3">
                    <AudioLines className="mb-2 size-6 text-primary" aria-hidden />
                    <audio src={item.url} controls preload="none" className="w-full" />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : null}
        {activeTab === "Reviews" ? (
          <div className="space-y-3">
            {ownEnquiries.data
              ?.filter((item) => item.status === "COMPLETED")
              .map((item) => (
                <article
                  key={item.id}
                  className="space-y-2 rounded-2xl border border-primary/20 p-3"
                >
                  <p className="text-sm">
                    {tx("Your gig", "Votre prestation")} ·{" "}
                    {item.event_date ?? tx("Date not set", "Date non définie")}
                  </p>
                  {!item.completed_by_customer ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void confirmCompleted(item.id)}
                    >
                      {tx("Confirm gig completed", "Confirmer la prestation")}
                    </Button>
                  ) : null}
                  <div className="flex gap-2">
                    <select
                      value={rating}
                      onChange={(e) => setRating(Number(e.target.value))}
                      aria-label={tx("Rating", "Note")}
                      className="rounded-xl border bg-background px-2"
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n} ★
                        </option>
                      ))}
                    </select>
                    <Textarea
                      value={reviewText}
                      maxLength={1200}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder={tx("Write a review", "Écrire un avis")}
                    />
                  </div>
                  <Button size="sm" onClick={() => void submitReview(item.id)}>
                    {tx("Submit review", "Envoyer l'avis")}
                  </Button>
                </article>
              ))}
            {reviews.isError ? (
              <p role="alert">{tx("Could not load reviews.", "Impossible de charger les avis.")}</p>
            ) : null}
            {reviews.data?.map((item) => (
              <article key={item.id} className="rounded-2xl border border-border p-3">
                <p className="text-amber-400">
                  {"★".repeat(item.rating)}
                  {"☆".repeat(5 - item.rating)}
                </p>
                <p className="mt-1 text-sm">
                  {item.review || tx("No written comment.", "Aucun commentaire.")}
                </p>
                <time className="text-xs text-muted-foreground">
                  {new Date(item.created_at).toLocaleDateString()}
                </time>
              </article>
            ))}
            {!reviews.data?.length ? (
              <p className="text-sm text-muted-foreground">
                {tx("No reviews yet.", "Aucun avis pour le moment.")}
              </p>
            ) : null}
          </div>
        ) : null}
        {activeTab === "Availability" ? (
          <div className="rounded-2xl border border-primary/20 p-4">
            <p className="font-bold">
              {musician.accepting_enquiries
                ? tx("Accepting booking enquiries", "Accepte les demandes de réservation")
                : tx("Not accepting booking enquiries", "N'accepte pas les demandes")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {musician.online ? tx("Online now", "En ligne") : tx("Offline", "Hors ligne")}
            </p>
          </div>
        ) : null}
        {activeTab === "More" ? (
          <div className="space-y-3 rounded-2xl border border-border p-4">
            <p>
              {tx("Instrument", "Instrument")}: {musician.instruments.join(", ")}
            </p>
            <p>
              {tx("Location", "Lieu")}: {musician.city}, {musician.country}
            </p>
            <p>
              {tx("Genres", "Genres")}: {musician.genres.join(", ") || "—"}
            </p>
            {user && user.id !== musician.user_id ? (
              <Button variant="outline" onClick={() => void chat()}>
                <MessageCircle className="mr-2 size-4" />
                {tx("Message musician", "Écrire au musicien")}
              </Button>
            ) : null}
          </div>
        ) : null}
        {ownEnquiries.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {tx("Could not load your bookings.", "Impossible de charger vos réservations.")}
          </p>
        ) : null}
        {ownEnquiries.data
          ?.filter((item) => item.status === "ACCEPTED")
          .map((item) => (
            <div key={item.id} className="rounded-xl border p-3 text-sm">
              <p>
                {tx("Accepted gig enquiry", "Demande acceptée")} · {item.event_date ?? "—"}
              </p>
              {!item.completed_by_customer ? (
                <Button
                  className="mt-2"
                  size="sm"
                  variant="outline"
                  onClick={() => void confirmCompleted(item.id)}
                >
                  {tx("Confirm gig completed", "Confirmer la prestation")}
                </Button>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  {tx(
                    "Waiting for musician confirmation.",
                    "En attente de confirmation du musicien.",
                  )}
                </p>
              )}
            </div>
          ))}
      </section>

      <Dialog open={enquiryOpen} onOpenChange={setEnquiryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {tx("Book", "Réserver")} {musician.display_name}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {formattedRate
              ? `${formattedRate} ${tx("per hour", "par heure")}`
              : tx("Ask the musician for a rate.", "Demandez le tarif au musicien.")}
          </p>
          <Textarea
            value={message}
            maxLength={2000}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={tx(
              "Describe your event and requirements",
              "Décrivez votre événement et vos besoins",
            )}
          />
          <Input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            aria-label={tx("Event date", "Date de l'événement")}
          />
          <Button disabled={!message.trim()} onClick={() => void submitEnquiry()}>
            {tx("Send booking enquiry", "Envoyer la demande")}
          </Button>
        </DialogContent>
      </Dialog>
    </main>
  );
}
