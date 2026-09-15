import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "@/components/refer/AvatarUpload";
import { PostCard } from "@/components/refer/PostCard";
import { StoriesRail } from "@/components/refer/StoriesRail";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateSocialPost, useSocialFeed } from "@/lib/social.queries";
import { useProfile } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({
    meta: [
      { title: "ASH Feed — the community wall" },
      {
        name: "description",
        content: "Share photos, follow friends and discover what the ASH community is building today.",
      },
      { property: "og:title", content: "ASH Feed — the community wall" },
      { property: "og:description", content: "Photos, likes, comments and reposts from real ASH members." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FeedPage,
});

function FeedPage() {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const { data: posts, isLoading } = useSocialFeed();
  const { data: profile } = useProfile();
  const create = useCreateSocialPost();
  const fileRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith("image/"));
    event.target.value = "";
    setFiles((current) => [...current, ...picked].slice(0, 4));
  }

  function publish() {
    create.mutate(
      { caption, files },
      {
        onSuccess: () => {
          setCaption("");
          setFiles([]);
          toast.success(fr ? "Publié" : "Posted");
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Could not post."),
      },
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      <header>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          {fr ? "Fil ASH" : "ASH Feed"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {fr
            ? "Des photos de vrais membres ASH. Aimez, commentez, repartagez."
            : "Photos from real ASH members. Like, comment, repost."}
        </p>
      </header>

      <StoriesRail />

      <section className="tile p-4">
        <div className="flex gap-3">
          <Avatar path={profile?.avatar_url} name={profile?.full_name} className="size-10" />
          <Textarea
            rows={2}
            value={caption}
            onChange={(event) => setCaption(event.target.value.slice(0, 1200))}
            placeholder={fr ? "Quoi de neuf ?" : "What's happening?"}
            aria-label={fr ? "Votre publication" : "Your post"}
            className="min-h-11 resize-none rounded-2xl"
          />
        </div>

        {files.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {files.map((file, index) => (
              <span key={index} className="relative">
                <img
                  src={URL.createObjectURL(file)}
                  alt=""
                  className="size-20 rounded-xl border border-border object-cover"
                />
                <button
                  type="button"
                  aria-label={fr ? "Retirer" : "Remove"}
                  onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}
                  className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-foreground text-background"
                >
                  <X className="size-3" aria-hidden />
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between">
          <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
            <ImagePlus className="size-4" aria-hidden />
            {fr ? "Photo" : "Photo"}
          </Button>
          <Button
            size="sm"
            onClick={publish}
            disabled={create.isPending || (caption.trim().length === 0 && files.length === 0)}
            className="touch-manipulation"
          >
            {create.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {fr ? "Publier" : "Post"}
          </Button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={pick} />
        <p className="mt-2 text-[11px] text-muted-foreground">
          {fr ? "Photos uniquement pour l'instant — 4 maximum." : "Photos only for now — up to 4."}
        </p>
      </section>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-3xl bg-muted" />
          ))}
        </div>
      ) : (posts ?? []).length === 0 ? (
        <p className="tile p-8 text-center text-sm text-muted-foreground">
          {fr ? "Rien encore. Soyez le premier à publier." : "Nothing yet. Be the first to post."}
        </p>
      ) : (
        <div className="space-y-4">
          {(posts ?? []).map((post) => (
            <PostCard key={post.id} post={post} currentUserId={me} />
          ))}
        </div>
      )}
    </div>
  );
}
