import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Camera, ImagePlus, Loader2, RefreshCw, Sparkles, Users, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "@/components/refer/AvatarUpload";
import { PostCard } from "@/components/refer/PostCard";
import { StoriesRail } from "@/components/refer/StoriesRail";
import { DiscoveryRow, useFeedDiscovery } from "@/components/refer/FeedDiscovery";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateSocialPost, useFriendships, useSocialFeed } from "@/lib/social.queries";
import { useProfile } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

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
  const { data: posts, isLoading, isFetching, refetch } = useSocialFeed();
  const { data: friendships } = useFriendships();
  const { data: profile } = useProfile();
  const { data: discovery } = useFeedDiscovery();
  const create = useCreateSocialPost();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"foryou" | "friends" | "mine">("foryou");
  const [caption, setCaption] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
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
          setComposerOpen(false);
          toast.success(fr ? "Publié" : "Posted");
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Could not post."),
      },
    );
  }

  const firstName = (profile?.full_name ?? "").trim().split(" ")[0] ?? "";

  const friendIds = new Set(
    (friendships?.friends ?? []).map((entry) => entry.other.id),
  );

  const all = posts ?? [];
  const visible =
    tab === "friends"
      ? all.filter((post) => friendIds.has(post.author_id))
      : tab === "mine"
        ? all.filter((post) => post.author_id === me)
        : all;

  const TABS = [
    { id: "foryou" as const, icon: Sparkles, en: "For you", fr: "Pour vous" },
    { id: "friends" as const, icon: Users, en: "Friends", fr: "Amis" },
    { id: "mine" as const, icon: ImagePlus, en: "Mine", fr: "Mes posts" },
  ];

  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            {fr ? "Fil ASH" : "ASH Feed"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {fr
              ? "Des photos de vrais membres ASH. Aimez, commentez, repartagez."
              : "Photos from real ASH members. Like, comment, repost."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          aria-label={fr ? "Actualiser" : "Refresh"}
          className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-primary"
        >
          <RefreshCw className={cn("size-4", isFetching && "animate-spin")} aria-hidden />
        </button>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition-colors",
                active
                  ? "border-transparent bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {fr ? item.fr : item.en}
            </button>
          );
        })}
      </div>

      <section className="tile p-3">
        <div className="flex items-center gap-2.5">
          <Avatar path={profile?.avatar_url} name={profile?.full_name} className="size-10 shrink-0" />
          {composerOpen ? (
            <Textarea
              autoFocus
              rows={3}
              value={caption}
              onChange={(event) => setCaption(event.target.value.slice(0, 1200))}
              placeholder={firstName ? (fr ? `Quoi de neuf, ${firstName} ?` : `What's on your mind, ${firstName}?`) : fr ? "Quoi de neuf ?" : "What's on your mind?"}
              aria-label={fr ? "Votre publication" : "Your post"}
              className="min-h-11 resize-none rounded-2xl"
            />
          ) : (
            <>
              <button
                type="button"
                onClick={() => setComposerOpen(true)}
                className="min-w-0 flex-1 truncate rounded-full bg-secondary px-4 py-2.5 text-left text-sm text-muted-foreground"
              >
                {firstName
                  ? fr
                    ? `Quoi de neuf, ${firstName} ?`
                    : `What's on your mind, ${firstName}?`
                  : fr
                    ? "Quoi de neuf ?"
                    : "What's on your mind?"}
              </button>
              <button
                type="button"
                aria-label={fr ? "Caméra" : "Camera"}
                onClick={() => {
                  setComposerOpen(true);
                  cameraRef.current?.click();
                }}
                className="grid size-9 shrink-0 place-items-center rounded-full text-primary"
              >
                <Camera className="size-5" aria-hidden />
              </button>
              <button
                type="button"
                aria-label={fr ? "Galerie" : "Gallery"}
                onClick={() => {
                  setComposerOpen(true);
                  fileRef.current?.click();
                }}
                className="grid size-9 shrink-0 place-items-center rounded-full text-accent"
              >
                <ImagePlus className="size-5" aria-hidden />
              </button>
            </>
          )}
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

        {composerOpen ? (
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => fileRef.current?.click()}>
                <ImagePlus className="size-4" aria-hidden />
                {fr ? "Galerie" : "Gallery"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => cameraRef.current?.click()}>
                <Camera className="size-4" aria-hidden />
                {fr ? "Caméra" : "Camera"}
              </Button>
              <span className="ml-1 text-[11px] tabular-nums text-muted-foreground">{caption.length}/1200</span>
            </div>
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
        ) : null}
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={pick} />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={pick}
        />
      </section>

      <StoriesRail />


      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-3xl bg-muted" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="tile p-8 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="size-5" aria-hidden />
          </span>
          <p className="mt-3 text-sm font-bold text-foreground">
            {tab === "friends"
              ? fr
                ? "Vos amis n'ont rien publié"
                : "Your friends haven't posted yet"
              : tab === "mine"
                ? fr
                  ? "Vous n'avez rien publié"
                  : "You haven't posted yet"
                : fr
                  ? "Rien encore"
                  : "Nothing here yet"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {fr
              ? "Partagez une photo — c'est ainsi que le fil prend vie."
              : "Share a photo — that is how the feed comes alive."}
          </p>
        </div>
      ) : (
        <div className="space-y-0 sm:space-y-4">
          {visible.map((post, index) => {
            // A single calm listings row every four posts — easy to scroll past.
            const block = index > 0 && index % 4 === 0
              ? (discovery ?? [])[Math.floor(index / 4) - 1]
              : undefined;
            return (
              <div key={post.id} className="space-y-0 sm:space-y-4">
                {block ? <DiscoveryRow block={block} /> : null}
                <PostCard post={post} currentUserId={me} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
