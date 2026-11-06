import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
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
  useMyMusician,
  type Musician,
} from "@/lib/musician.queries";

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

export function MusicianCard({ musician }: { musician: Musician }) {
  const { tx } = useI18n();
  const portfolio = useMusicianMedia(musician.id);
  const { user } = useUser();
  const { requireAuth } = useAuthGate();
  const navigate = useNavigate();
  const cache = useQueryClient();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [busy, setBusy] = useState(false);
  const sentEnquiries = useQuery({
    queryKey: ["sent-musician-enquiries", musician.id, user?.id],
    enabled: Boolean(open && user && user.id !== musician.user_id),
    queryFn: async () => {
      const result = await talentDb
        .from("musician_enquiries")
        .select("*")
        .eq("musician_id", musician.id)
        .eq("customer_id", user!.id)
        .order("created_at", { ascending: false });
      if (result.error) throw result.error;
      return result.data;
    },
  });
  const enquiry = async () => {
    if (!requireAuth({ en: "Sign in to enquire.", fr: "Connectez-vous pour contacter." })) return;
    setBusy(true);
    try {
      const { error } = await talentDb.rpc("submit_musician_enquiry", {
        _musician_id: musician.id,
        _message: message.trim(),
        _event_date: eventDate || null,
      });
      if (error) throw error;
      setMessage("");
      setEventDate("");
      await cache.invalidateQueries({ queryKey: ["sent-musician-enquiries", musician.id] });
      toast.success(tx("Enquiry sent", "Demande envoyée"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : tx("Could not send enquiry", "Impossible d'envoyer la demande"),
      );
    } finally {
      setBusy(false);
    }
  };
  const chat = async () => {
    if (!requireAuth({ en: "Sign in to message.", fr: "Connectez-vous pour discuter." })) return;
    try {
      const id = await openMemberConversation(musician.user_id);
      if (!id)
        throw new Error(tx("Could not open conversation", "Impossible d'ouvrir la discussion"));
      await navigate({ to: "/messages", search: { c: id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open conversation");
    }
  };
  return (
    <article className="rounded-3xl border border-primary/20 bg-card p-4 shadow-sm">
      {portfolio.data?.find(
        (item) => item.media_type === "PHOTO" && item.review_status === "APPROVED",
      ) ? (
        <img
          src={
            portfolio.data.find(
              (item) => item.media_type === "PHOTO" && item.review_status === "APPROVED",
            )?.url
          }
          alt=""
          className="mb-3 h-40 w-full rounded-2xl object-cover"
        />
      ) : null}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-bold">{musician.display_name}</h3>
          <p className="text-xs text-muted-foreground">
            {musician.city} · {musician.country}
          </p>
        </div>
        <span className="text-xs font-bold text-primary">
          {musician.online ? tx("Online", "En ligne") : tx("Offline", "Hors ligne")}
        </span>
      </div>
      <p className="mt-2 text-sm">{musician.instruments.join(" · ")}</p>
      {musician.biography ? (
        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{musician.biography}</p>
      ) : null}
      <Button className="mt-3 w-full rounded-full" onClick={() => setOpen(true)}>
        {tx("View musician", "Voir le musicien")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{musician.display_name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm">{musician.biography}</p>
          <p className="text-sm">
            {musician.genres.join(" · ")} {musician.experience}
          </p>
          <Media id={musician.id} />
          {user?.id !== musician.user_id ? (
            <>
              <Button variant="outline" onClick={() => void chat()}>
                {tx("Message", "Écrire")}
              </Button>
              {musician.accepting_enquiries ? (
                <div className="space-y-2">
                  <Textarea
                    value={message}
                    maxLength={2000}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={tx("Describe your gig", "Décrivez votre événement")}
                  />
                  <Input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    aria-label={tx("Event date", "Date de l'événement")}
                  />
                  <Button disabled={busy || !message.trim()} onClick={() => void enquiry()}>
                    {tx("Send gig enquiry", "Envoyer une demande")}
                  </Button>
                </div>
              ) : (
                <p>{tx("Not accepting enquiries", "Demandes indisponibles")}</p>
              )}
              {sentEnquiries.isError ? (
                <p role="alert">
                  {tx("Could not load your enquiries", "Impossible de charger vos demandes")}
                </p>
              ) : null}
              {sentEnquiries.data?.map((item) => (
                <p key={item.id} className="rounded-xl border p-2 text-sm">
                  {item.message} · {item.status}
                </p>
              ))}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </article>
  );
}

export function MusicianManager() {
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
      <Button onClick={() => void openManager()} className="rounded-full">
        {mine.data
          ? tx("Manage musician profile", "Gérer mon profil musicien")
          : tx("Become a Musician", "Devenir musicien")}
      </Button>
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
                </div>
              ))}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
