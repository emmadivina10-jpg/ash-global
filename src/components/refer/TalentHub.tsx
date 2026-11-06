import { useState, type MouseEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { BadgeCheck, Heart, Music2, Play, Star, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { useAuthGate } from "@/lib/guest-gate";
import { useUser } from "@/lib/queries";
import { useRegion } from "@/lib/region-context";
import { openMemberConversation } from "@/lib/contact-vendor";
import { supabase } from "@/integrations/supabase/client";
import { TALENT_ROLES } from "@/lib/talent.queries";
import {
  TALENT_BUCKET,
  talentDb,
  useMusicianMedia,
  useMusicianFavorite,
  useMyMusician,
  type MusicianStats,
  type SignedMusicianMedia,
  type Musician,
} from "@/lib/musician.queries";
import { cn } from "@/lib/utils";

function Media({ id, owner = false }: { id: string; owner?: boolean }) {
  const { tx } = useI18n();
  const query = useMusicianMedia(id);
  if (query.isError)
    return (
      <p role="alert">{tx("Could not load portfolio.", "Impossible de charger le portfolio.")}</p>
    );
  return (
    <div className="space-y-2">
      {query.data
        ?.filter((item) => owner || item.review_status === "APPROVED")
        .map((item) => (
          <div key={item.id} className="space-y-1">
            {item.media_type === "PHOTO" ? (
              <img src={item.url} alt="" className="max-h-64 w-full rounded-xl object-cover" />
            ) : item.media_type === "VIDEO" ? (
              <video
                src={item.url}
                controls
                playsInline
                preload="metadata"
                className="max-h-64 w-full rounded-xl"
              />
            ) : (
              <audio src={item.url} controls preload="none" className="w-full" />
            )}
            {owner ? (
              <p className="text-xs">
                {tx("Review", "Examen")}: {item.review_status}
              </p>
            ) : null}
          </div>
        ))}
    </div>
  );
}

export function MusicianCard({
  musician,
  media,
  stats,
}: {
  musician: Musician;
  media?: SignedMusicianMedia[];
  stats?: MusicianStats;
}) {
  const { tx } = useI18n();
  const { user } = useUser();
  const { requireAuth } = useAuthGate();
  const cache = useQueryClient();
  const favorite = useMusicianFavorite(user?.id, musician.id);
  const photo = media?.find((item) => item.media_type === "PHOTO");
  const video = media?.find((item) => item.media_type === "VIDEO");
  const rate =
    musician.hourly_rate_minor !== null && musician.rate_currency
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
  const toggleFavorite = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (
      !requireAuth({
        en: "Sign in to save musicians.",
        fr: "Connectez-vous pour enregistrer des musiciens.",
      })
    )
      return;
    try {
      if (favorite.data) {
        const { error } = await talentDb
          .from("musician_favorites")
          .delete()
          .eq("user_id", user!.id)
          .eq("musician_id", musician.id);
        if (error) throw error;
      } else {
        const { error } = await talentDb
          .from("musician_favorites")
          .insert({ user_id: user!.id, musician_id: musician.id });
        if (error) throw error;
      }
      await cache.invalidateQueries({ queryKey: ["musician-favorite", user?.id, musician.id] });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : tx("Could not save musician.", "Impossible d'enregistrer ce musicien."),
      );
    }
  };
  const availability = musician.accepting_enquiries
    ? musician.online
      ? tx("Available now", "Disponible maintenant")
      : tx("Available for booking", "Disponible pour réservation")
    : tx("Unavailable", "Indisponible");
  return (
    <article className="talent-card group relative">
      <Link to="/talent/$musicianId" params={{ musicianId: musician.id }} className="block">
        <div className="relative aspect-square overflow-hidden rounded-md bg-gradient-to-br from-pink-600/25 via-[#12091a] to-violet-950">
          {photo ? (
            <img
              src={photo.url}
              alt={musician.display_name}
              loading="lazy"
              className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : video ? (
            <video
              src={video.url}
              muted
              loop
              playsInline
              autoPlay
              preload="metadata"
              className="size-full object-cover"
            />
          ) : (
            <div className="grid size-full place-items-center text-pink-400/60">
              <Music2 className="size-12" aria-hidden />
            </div>
          )}
          {video ? (
            <span className="absolute bottom-2 right-2 grid size-7 place-items-center rounded-full bg-black/55 text-white">
              <Play className="size-3.5 fill-current" aria-hidden />
            </span>
          ) : null}
        </div>
        <div className="space-y-0.5 pt-2">
          <h3 className="flex items-center gap-1 text-[13px] font-semibold text-white">
            <span className="truncate">{musician.display_name}</span>
            <BadgeCheck
              className="size-3.5 shrink-0 fill-pink-500 text-black"
              aria-label={tx("ASH approved musician", "Musicien approuvé par ASH")}
            />
            {stats && stats.review_count > 0 ? (
              <span className="ml-auto flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-white/70">
                <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden />
                {Number(stats.rating_average).toFixed(1)}
              </span>
            ) : null}
          </h3>
          <p className="truncate text-xs capitalize text-white/55">
            {musician.instruments.join(" · ")}
          </p>
          <p className="pt-0.5">
            {rate ? (
              <>
                <strong className="text-sm font-bold text-pink-400">{rate}</strong>{" "}
                <span className="text-[11px] text-white/50">{tx("/hour", "/h")}</span>
              </>
            ) : (
              <span className="text-xs font-semibold text-pink-400">
                {tx("Contact for rate", "Tarif sur demande")}
              </span>
            )}
          </p>
          <p className="flex items-center gap-1.5 text-[11px] text-white/70">
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                musician.accepting_enquiries
                  ? musician.online
                    ? "animate-pulse bg-emerald-400"
                    : "bg-emerald-400"
                  : "bg-white/30",
              )}
            />
            <span className="truncate">{availability}</span>
          </p>
        </div>
      </Link>
      <button
        type="button"
        onClick={(event) => void toggleFavorite(event)}
        aria-label={
          favorite.data
            ? tx("Remove from favorites", "Retirer des favoris")
            : tx("Add to favorites", "Ajouter aux favoris")
        }
        aria-pressed={Boolean(favorite.data)}
        className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition hover:scale-105"
      >
        <Heart className={cn("size-4", favorite.data && "fill-pink-500 text-pink-500")} aria-hidden />
      </button>
    </article>
  );
}

export function MusicianManager({ compact = false }: { compact?: boolean } = {}) {
  const { tx, lang } = useI18n();
  const region = useRegion();
  const { user } = useUser();
  const navigate = useNavigate();
  const { requireAuth } = useAuthGate();
  const cache = useQueryClient();
  const mine = useMyMusician(user?.id);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [genres, setGenres] = useState("");
  const [experience, setExperience] = useState("");
  const [rateAmount, setRateAmount] = useState("");
  const [rateCurrency, setRateCurrency] = useState<"CAD" | "XAF">("CAD");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const inquiries = useQuery({
    queryKey: ["musician-enquiries", mine.data?.id],
    enabled: Boolean(mine.data?.id && open),
    queryFn: async () => {
      const result = await talentDb
        .from("musician_enquiries")
        .select("*")
        .eq("musician_id", mine.data!.id)
        .order("created_at", { ascending: false });
      if (result.error) throw result.error;
      return result.data;
    },
  });
  const refresh = async () => {
    await Promise.all([
      cache.invalidateQueries({ queryKey: ["my-musician"] }),
      cache.invalidateQueries({ queryKey: ["musicians"] }),
      cache.invalidateQueries({ queryKey: ["musician-media"] }),
      cache.invalidateQueries({ queryKey: ["musician-enquiries"] }),
      cache.invalidateQueries({ queryKey: ["musician-stats"] }),
    ]);
  };
  const status = useMutation({
    mutationFn: async (change: { online?: boolean; accepting_enquiries?: boolean }) => {
      if (!mine.data) throw new Error("Profile required");
      const result = await talentDb.from("musician_profiles").update(change).eq("id", mine.data.id);
      if (result.error) throw result.error;
    },
    onSuccess: refresh,
    onError: (error) => toast.error(error.message),
  });
  const openManager = async () => {
    if (
      !requireAuth({
        en: "Sign in to become a musician.",
        fr: "Connectez-vous pour devenir musicien.",
      })
    )
      return;
    if (mine.isLoading || mine.isError) {
      toast.error(tx("Profile unavailable. Try again.", "Profil indisponible. Réessayez."));
      return;
    }
    const p = mine.data;
    setName(p?.display_name ?? "");
    setBio(p?.biography ?? "");
    setCity(p?.city ?? "");
    setCountry(p?.country ?? region.detected);
    setGenres(p?.genres.join(", ") ?? "");
    setExperience(p?.experience ?? "");
    setRateCurrency(p?.rate_currency ?? "CAD");
    setRateAmount(
      p?.hourly_rate_minor == null
        ? ""
        : p.rate_currency === "CAD"
          ? (p.hourly_rate_minor / 100).toFixed(2)
          : String(p.hourly_rate_minor),
    );
    setRoles(p?.instruments ?? []);
    if (p) {
      const result = await talentDb
        .from("musician_contacts")
        .select("*")
        .eq("musician_id", p.id)
        .maybeSingle();
      if (result.error) {
        toast.error(result.error.message);
        return;
      }
      setEmail(result.data?.email ?? "");
      setPhone(result.data?.phone ?? "");
    } else {
      setEmail("");
      setPhone("");
    }
    setOpen(true);
  };
  const save = async () => {
    if (
      !user ||
      !name.trim() ||
      !city.trim() ||
      !/^[A-Z]{2}$/.test(country.trim()) ||
      !roles.length
    )
      return;
    const trimmedRate = rateAmount.trim();
    let hourly_rate_minor: number | null = null;
    let rate_currency: "CAD" | "XAF" | null = null;
    if (trimmedRate) {
      const validAmount =
        rateCurrency === "CAD"
          ? /^\d+(?:\.\d{1,2})?$/.test(trimmedRate)
          : /^\d+$/.test(trimmedRate);
      const amount = Number(trimmedRate);
      const minor = Math.round(amount * (rateCurrency === "CAD" ? 100 : 1));
      if (!validAmount || !Number.isSafeInteger(minor) || minor < 1 || minor > 1_000_000_000) {
        toast.error(
          tx(
            "Enter a valid hourly rate (up to 2 decimals for CAD).",
            "Saisissez un tarif valide (2 décimales maximum pour CAD).",
          ),
        );
        return;
      }
      hourly_rate_minor = minor;
      rate_currency = rateCurrency;
    }
    setBusy(true);
    try {
      const values = {
        display_name: name.trim(),
        biography: bio.trim(),
        city: city.trim(),
        country: country.trim(),
        genres: genres
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        experience: experience.trim(),
        hourly_rate_minor,
        rate_currency,
        instruments: roles,
      };
      const result = mine.data
        ? await talentDb
            .from("musician_profiles")
            .update(values)
            .eq("id", mine.data.id)
            .select("id")
            .single()
        : await talentDb
            .from("musician_profiles")
            .insert({ ...values, user_id: user.id })
            .select("id")
            .single();
      if (result.error) throw result.error;
      const contact = await talentDb.from("musician_contacts").upsert({
        musician_id: result.data.id,
        email: email.trim() || null,
        phone: phone.trim() || null,
      });
      if (contact.error) throw contact.error;
      await refresh();
      toast.success(tx("Profile submitted for review", "Profil soumis pour examen"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save profile");
    } finally {
      setBusy(false);
    }
  };
  const upload = async (file: File) => {
    if (!user || !mine.data) return;
    const kind = file.type.startsWith("image/")
      ? "PHOTO"
      : file.type.startsWith("video/")
        ? "VIDEO"
        : file.type.startsWith("audio/")
          ? "AUDIO"
          : null;
    if (!kind || file.size > 50 * 1024 * 1024) {
      toast.error(
        tx("Choose a supported file under 50 MB", "Choisissez un fichier de moins de 50 Mo"),
      );
      return;
    }
    setBusy(true);
    try {
      const path = `${user.id}/${crypto.randomUUID()}`;
      const result = await supabase.storage
        .from(TALENT_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (result.error) throw result.error;
      const submitted = await talentDb
        .from("musician_media")
        .insert({ musician_id: mine.data.id, object_path: path, media_type: kind });
      if (submitted.error) {
        const cleanup = await supabase.storage.from(TALENT_BUCKET).remove([path]);
        if (cleanup.error)
          console.warn("Could not remove unsubmitted musician media", cleanup.error.message);
        throw submitted.error;
      }
      await refresh();
      toast.success(tx("Media submitted for review", "Média soumis pour examen"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      {compact ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => void openManager()}
          aria-label={
            mine.data
              ? tx("Manage musician profile", "Gérer mon profil musicien")
              : tx("Become a Musician", "Devenir musicien")
          }
          title={
            mine.data
              ? tx("Manage musician profile", "Gérer mon profil musicien")
              : tx("Become a Musician", "Devenir musicien")
          }
          className="size-10 rounded-full text-white/80 hover:bg-white/10 hover:text-white [&_svg]:size-5"
        >
          {mine.data ? <Music2 aria-hidden /> : <Plus aria-hidden />}
        </Button>
      ) : (
        <Button onClick={() => void openManager()} className="rounded-full">
          {!mine.data ? <Plus className="mr-2 size-4" aria-hidden /> : null}
          {mine.data
            ? tx("Manage musician profile", "Gérer mon profil musicien")
            : tx("Become a Musician", "Devenir musicien")}
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tx("Musician profile", "Profil musicien")}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            {tx(
              "Free membership. Profile and media require approval. Contact details remain private.",
              "Adhésion gratuite. Profil et médias soumis à approbation. Vos coordonnées restent privées.",
            )}
          </p>
          {mine.data ? (
            <p className="text-sm">
              {tx("Profile review", "Examen du profil")}: {mine.data.review_status}
            </p>
          ) : null}
          <label className="text-sm">
            {tx("Name", "Nom")}
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          </label>
          <fieldset>
            <legend className="text-sm">{tx("Instruments", "Instruments")}</legend>
            <div className="flex flex-wrap gap-2">
              {TALENT_ROLES.map((role) => (
                <label key={role.id} className="text-xs">
                  <input
                    type="checkbox"
                    checked={roles.includes(role.id)}
                    onChange={(e) =>
                      setRoles((prev) =>
                        e.target.checked ? [...prev, role.id] : prev.filter((x) => x !== role.id),
                      )
                    }
                  />{" "}
                  {lang === "fr" ? role.fr : role.en}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="text-sm">
            {tx("Genres (comma separated)", "Genres (séparés par des virgules)")}
            <Input value={genres} onChange={(e) => setGenres(e.target.value)} />
          </label>
          <label className="text-sm">
            {tx("Biography", "Biographie")}
            <Textarea value={bio} maxLength={2000} onChange={(e) => setBio(e.target.value)} />
          </label>
          <label className="text-sm">
            {tx("Experience", "Expérience")}
            <Input
              value={experience}
              maxLength={1000}
              onChange={(e) => setExperience(e.target.value)}
            />
          </label>
          <fieldset className="space-y-2">
            <legend className="text-sm">
              {tx("Hourly rate (optional)", "Tarif horaire (facultatif)")}
            </legend>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Input
                value={rateAmount}
                onChange={(e) => setRateAmount(e.target.value)}
                inputMode="decimal"
                placeholder={tx("Leave blank to ask", "Laisser vide pour demander")}
                aria-label={tx("Hourly rate amount", "Montant du tarif horaire")}
              />
              <select
                value={rateCurrency}
                onChange={(e) => setRateCurrency(e.target.value as "CAD" | "XAF")}
                aria-label={tx("Rate currency", "Devise du tarif")}
                className="rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="CAD">CAD</option>
                <option value="XAF">XAF</option>
              </select>
            </div>
            <p className="text-xs text-muted-foreground">
              {tx(
                "Rate changes are reviewed before appearing publicly.",
                "Les changements de tarif sont examinés avant publication.",
              )}
            </p>
          </fieldset>
          <label className="text-sm">
            {tx("City", "Ville")}
            <Input value={city} maxLength={100} onChange={(e) => setCity(e.target.value)} />
          </label>
          <label className="text-sm">
            {tx("Country code (e.g. CM)", "Code pays (ex. CM)")}
            <Input
              value={country}
              maxLength={2}
              onChange={(e) => setCountry(e.target.value.toUpperCase())}
            />
          </label>
          <label className="text-sm">
            {tx("Private email", "E-mail privé")}
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={320}
            />
          </label>
          <label className="text-sm">
            {tx("Private phone", "Téléphone privé")}
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={50}
            />
          </label>
          <Button
            disabled={
              busy ||
              !name.trim() ||
              !city.trim() ||
              !/^[A-Z]{2}$/.test(country.trim()) ||
              !roles.length
            }
            onClick={() => void save()}
          >
            {tx("Save profile", "Enregistrer")}
          </Button>
          {mine.data ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={status.isPending}
                  onClick={() => status.mutate({ online: !mine.data!.online })}
                >
                  {mine.data.online
                    ? tx("Set offline", "Passer hors ligne")
                    : tx("Set online", "Passer en ligne")}
                </Button>
                <Button
                  variant="outline"
                  disabled={status.isPending}
                  onClick={() =>
                    status.mutate({ accepting_enquiries: !mine.data!.accepting_enquiries })
                  }
                >
                  {mine.data.accepting_enquiries
                    ? tx("Pause enquiries", "Suspendre les demandes")
                    : tx("Accept enquiries", "Accepter les demandes")}
                </Button>
              </div>
              <label className="block text-sm">
                {tx("Submit photo, video or audio", "Ajouter photo, vidéo ou audio")}
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/webm"
                  disabled={busy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) void upload(f);
                  }}
                />
              </label>
              <Media id={mine.data.id} owner />
              <h3 className="font-bold">{tx("Gig enquiries", "Demandes de prestation")}</h3>
              {inquiries.isError ? (
                <p role="alert">
                  {tx("Could not load enquiries", "Impossible de charger les demandes")}
                </p>
              ) : null}
              {inquiries.data?.map((e) => (
                <div key={e.id} className="space-y-2 rounded-xl border p-3">
                  <p>{e.message}</p>
                  <p className="text-xs">
                    {e.event_date} · {e.status}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const id = await openMemberConversation(e.customer_id);
                        if (!id)
                          throw new Error(
                            tx("Could not open conversation", "Impossible d'ouvrir la discussion"),
                          );
                        setOpen(false);
                        await navigate({ to: "/messages", search: { c: id } });
                      } catch (error) {
                        toast.error(
                          error instanceof Error ? error.message : "Could not open conversation",
                        );
                      }
                    }}
                  >
                    {tx("Message customer", "Écrire au client")}
                  </Button>
                  {e.status === "PENDING" ? (
                    <div className="flex gap-2">
                      {(["ACCEPTED", "DECLINED"] as const).map((value) => (
                        <Button
                          key={value}
                          size="sm"
                          onClick={async () => {
                            const result = await talentDb.rpc("respond_musician_enquiry", {
                              _id: e.id,
                              _status: value,
                            });
                            if (result.error) toast.error(result.error.message);
                            else await refresh();
                          }}
                        >
                          {value === "ACCEPTED"
                            ? tx("Accept", "Accepter")
                            : tx("Decline", "Refuser")}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                  {e.status === "ACCEPTED" ? (
                    e.completed_by_musician ? (
                      <p className="text-xs text-muted-foreground">
                        {tx(
                          "Completion confirmed. Waiting for the customer.",
                          "Prestation confirmée. En attente du client.",
                        )}
                      </p>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const result = await talentDb.rpc("confirm_musician_gig_completed", {
                            _enquiry_id: e.id,
                          });
                          if (result.error) toast.error(result.error.message);
                          else {
                            await refresh();
                            toast.success(tx("Gig completion confirmed.", "Prestation confirmée."));
                          }
                        }}
                      >
                        {tx("Confirm gig completed", "Confirmer la prestation")}
                      </Button>
                    )
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
