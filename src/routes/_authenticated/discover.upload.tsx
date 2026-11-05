import { useRef, useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Film, ImageIcon, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import {
  SOCIAL_BUCKET,
  isStoryVideoSource,
  uploadResumableStorageFile,
} from "@/lib/social.queries";
import { cn } from "@/lib/utils";
import { DISCOVER_TOPICS, DISCOVER_UPLOAD_DESTINATION } from "@/lib/discover-topics";

export const Route = createFileRoute("/_authenticated/discover/upload")({
  beforeLoad: async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) {
      throw redirect({ to: "/login", search: { next: "/discover/upload" } });
    }
    const { data: isActiveInstructor, error } = await (supabase as any).rpc("current_user_is_active_campus_instructor",
    );
    if (error) throw error;
    if (!isActiveInstructor) throw redirect({ to: "/discover" });
  },
  head: () => ({
    meta: [
      { title: "Upload a video — ASH Glo Discover" },
      { name: "description", content: "Share a video on ASH Glo Discover." },
      { property: "og:title", content: "Upload a video — ASH Glo Discover" },
      { property: "og:description", content: "Share a video on ASH Glo Discover." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DiscoverUpload,
});

const TOPICS = DISCOVER_TOPICS.filter((topic) => topic.id !== "all");

function ext(file: File, fallback: string) {
  const e = file.name.split(".").pop()?.toLowerCase() ?? fallback;
  return /^[a-z0-9]+$/.test(e) ? e : fallback;
}

function DiscoverUpload() {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [video, setVideo] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState("forex");
  const [progress, setProgress] = useState<number | null>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  async function publish() {
    if (!video || !title.trim()) return;
    try {
      setProgress(0);
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) throw new Error(tx("Please sign in again.", "Veuillez vous reconnecter."));
      const media: string[] = [];
      if (cover) {
        const coverPath = `${uid}/post/${crypto.randomUUID()}.${ext(cover, "jpg")}`;
        const r = await supabase.storage.from(SOCIAL_BUCKET).upload(coverPath, cover, {
          contentType: cover.type || "image/jpeg",
          upsert: false,
        });
        if (r.error) throw r.error;
        media.push(coverPath);
      }
      const videoPath = `${uid}/post/${crypto.randomUUID()}.${ext(video, "mp4")}`;
      // Resumable upload: no length cap in the app, survives dropped connections.
      await uploadResumableStorageFile(
        SOCIAL_BUCKET,
        videoPath,
        video,
        video.type || "video/mp4",
        (p) => setProgress(Math.round(p)),
      );
      media.push(videoPath);
      const caption = [title.trim(), description.trim(), `#${topic}`].filter(Boolean).join("\n\n");
      const { error } = await supabase
        .from("social_posts")
        .insert({ author_id: uid, caption, media, tags: [topic] })
        .select("id")
        .single();
      if (error) throw error;
      await qc.invalidateQueries();
      toast.success(tx("Your video is live on Discover", "Votre vidéo est en ligne sur Découvrir"));
      void navigate({ to: DISCOVER_UPLOAD_DESTINATION });
    } catch (e) {
      setProgress(null);
      toast.error(e instanceof Error ? e.message : tx("Upload failed", "Échec de l'envoi"));
    }
  }

  const busy = progress !== null;

  return (
    <div className="mx-auto w-full max-w-xl space-y-6 pb-24">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          {tx("Upload a video", "Publier une vidéo")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {tx("Step", "Étape")} {step} / 3 · {tx("Any length", "Toute durée")}
        </p>
        <div className="mt-3 flex gap-1.5" aria-hidden>
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className={cn("h-1 flex-1 rounded-full", n <= step ? "bg-primary" : "bg-muted")}
            />
          ))}
        </div>
      </div>

      {step === 1 ? (
        <section className="space-y-4">
          <input
            ref={videoInput}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f && isStoryVideoSource(f)) setVideo(f);
              else if (f)
                toast.error(tx("Please choose a video file.", "Choisissez un fichier vidéo."));
            }}
          />
          <button
            type="button"
            onClick={() => videoInput.current?.click()}
            className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
          >
            {video ? <Check className="size-8 text-primary" /> : <Film className="size-8" />}
            <span className="max-w-[80%] truncate text-sm font-semibold">
              {video ? video.name : tx("Choose a video", "Choisir une vidéo")}
            </span>
          </button>
          <button
            type="button"
            disabled={!video}
            onClick={() => setStep(2)}
            className="h-12 w-full rounded-full bg-primary font-bold text-primary-foreground disabled:opacity-50"
          >
            {tx("Next", "Suivant")}
          </button>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-foreground">{tx("Title", "Titre")}</span>
            <input
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              className="h-12 w-full rounded-xl border border-border bg-card px-4 text-foreground outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-foreground">
              {tx("Description", "Description")}
            </span>
            <textarea
              value={description}
              rows={4}
              maxLength={2000}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-border bg-card p-4 text-foreground outline-none focus:ring-2 focus:ring-primary"
            />
          </label>
          <div className="space-y-1.5">
            <span className="text-sm font-semibold text-foreground">
              {tx("Category", "Catégorie")}
            </span>
            <div className="flex flex-wrap gap-2">
              {TOPICS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTopic(t.id)}
                  className={cn(
                    "h-9 rounded-full border px-4 text-sm font-bold",
                    topic === t.id
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground",
                  )}
                >
                  {fr ? t.fr : t.en}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="h-12 flex-1 rounded-full border border-border font-bold text-foreground"
            >
              {tx("Back", "Retour")}
            </button>
            <button
              type="button"
              disabled={!title.trim()}
              onClick={() => setStep(3)}
              className="h-12 flex-1 rounded-full bg-primary font-bold text-primary-foreground disabled:opacity-50"
            >
              {tx("Next", "Suivant")}
            </button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-4">
          <input
            ref={coverInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setCover(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => coverInput.current?.click()}
            className="flex aspect-video w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-border bg-card text-muted-foreground"
          >
            {cover ? (
              <img src={URL.createObjectURL(cover)} alt="" className="size-full object-cover" />
            ) : (
              <>
                <ImageIcon className="size-7" />
                <span className="text-sm font-semibold">
                  {tx(
                    "Add a cover image (optional)",
                    "Ajouter une image de couverture (facultatif)",
                  )}
                </span>
              </>
            )}
          </button>
          <p className="text-xs text-muted-foreground">
            {tx(
              "Selling videos to buyers opens once paid lessons are switched on. Payment will be MTN or Orange Money.",
              "La vente de vidéos ouvrira avec les leçons payantes. Paiement par MTN ou Orange Money.",
            )}
          </p>
          {busy ? (
            <div className="space-y-1.5" aria-live="polite">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {tx("Uploading…", "Envoi…")} {progress}%
              </p>
            </div>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setStep(2)}
              className="h-12 flex-1 rounded-full border border-border font-bold text-foreground"
            >
              {tx("Back", "Retour")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={publish}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary font-bold text-primary-foreground disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {tx("Publish", "Publier")}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
