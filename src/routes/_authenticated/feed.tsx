import { useEffect, useMemo, useRef, useState } from "react";
import { extractTags, recordTagInterest } from "@/lib/interests";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Camera, ImagePlus, Loader2, Plus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "@/components/refer/AvatarUpload";
import { PullToRefresh } from "@/components/refer/PullToRefresh";
import { PostCard } from "@/components/refer/PostCard";
import { StoriesRail, loadSpotlights, type SpotlightPost } from "@/components/refer/StoriesRail";
import { useQuery } from "@tanstack/react-query";
import { FeedSpotlightCard } from "@/components/refer/FeedSpotlightCard";
import { interleaveSpotlights } from "@/components/refer/feed-spotlights";
import { SocialSuggestions } from "@/components/refer/SocialSuggestions";
import { DiscoveryRow, useFeedDiscovery } from "@/components/refer/FeedDiscovery";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useCreateSocialPost, useSocialFeed } from "@/lib/social.queries";
import { useProfile } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({
    meta: [
      { title: "ASH Feed — the community wall" },
      {
        name: "description",
        content:
          "Share photos, follow friends and discover what the ASH community is building today.",
      },
      { property: "og:title", content: "ASH Feed — the community wall" },
      {
        property: "og:description",
        content: "Photos, likes, comments and reposts from real ASH members.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FeedPage,
});

function FeedPage() {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  // Preserve the same safety-filtered, stable feed pool.
  const { data: posts, isLoading, refetch } = useSocialFeed(120);
  const { data: profile } = useProfile();
  const { data: discovery } = useFeedDiscovery();
  const { data: spotlights = [], refetch: refreshSpotlights } = useQuery<SpotlightPost[]>({
    queryKey: ["ash-spotlights"],
    queryFn: loadSpotlights,
    staleTime: 15_000,
  });
  const [spotlightRequest, setSpotlightRequest] = useState<
    { authorId: string; kind: "spotlight"; spotlightId: string } | undefined
  >();
  const mixed = useMemo(() => interleaveSpotlights(posts ?? [], spotlights), [posts, spotlights]);
  const create = useCreateSocialPost();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []).filter((file) =>
      file.type.startsWith("image/"),
    );

    event.target.value = "";

    if (picked.length === 0) {
      toast.error(tx("Please choose an image.", "Veuillez choisir une image."));
      return;
    }

    setFiles((current) => {
      const next = [...current, ...picked].slice(0, 4);
      return next;
    });

    setComposerOpen(true);
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, i) => i !== index));
  }

  function clearComposer() {
    setCaption("");
    setFiles([]);
    setComposerOpen(false);
  }

  async function publish() {
    if (create.isPending) return;

    const cleanCaption = caption.trim();

    if (!cleanCaption && files.length === 0) {
      toast.error(
        tx("Add a photo or write something.", "Ajoutez une photo ou écrivez quelque chose."),
      );
      return;
    }

    try {
      recordTagInterest(extractTags(cleanCaption), 1.5);
      await create.mutateAsync({
        caption: cleanCaption,
        files,
      });

      clearComposer();
      toast.success(tx("Post published", "Publication créée"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : tx(
              "Could not publish. Please try again.",
              "Impossible de publier. Veuillez réessayer.",
            ),
      );
    }
  }

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  const firstName = (profile?.full_name ?? "").trim().split(" ")[0] ?? "";

  return (
    <PullToRefresh
      onRefresh={async () => {
        await Promise.all([refetch(), refreshSpotlights()]);
      }}
      label={tx("Refreshing", "Actualisation")}
    >
      <div className="mx-auto w-full max-w-xl space-y-2">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0 self-center">
            <h1 className="sr-only">{tx("ASH Feed", "Fil ASH")}</h1>
            <Link
              to="/profile"
              aria-label={tx("My profile", "Mon profil")}
              className="inline-flex rounded-full ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Avatar
                path={profile?.avatar_url}
                name={profile?.full_name}
                online
                className="size-11 shrink-0"
              />
            </Link>
          </div>
          <div className="flex items-center gap-1.5">
            <Link
              to="/fx-analytics"
              aria-label={tx("Open FX Analytics", "Ouvrir Analyse FX")}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 text-xs font-bold text-primary transition-colors hover:bg-primary/15"
            >
              <BarChart3 className="size-4" aria-hidden />
              <span className="hidden min-[390px]:inline">{tx("FX Analytics", "Analyse FX")}</span>
            </Link>
            <Button
              type="button"
              size="icon"
              className="size-10 rounded-full shadow-sm [&_svg]:size-6 motion-safe:transition-transform motion-safe:hover:rotate-90"
              aria-label={tx("Create a post", "Créer une publication")}
              title={tx("Create a post", "Créer une publication")}
              onClick={() => setComposerOpen(true)}
            >
              <Plus aria-hidden />
            </Button>
          </div>
        </header>

        <Dialog
          open={composerOpen}
          onOpenChange={(next) => {
            if (!create.isPending) setComposerOpen(next);
          }}
        >
          <DialogContent
            overlayClassName="bg-foreground/20 backdrop-blur-md duration-300 motion-reduce:animate-none"
            className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-3xl border-border bg-card p-5 shadow-raised duration-300 motion-reduce:animate-none sm:max-w-lg sm:rounded-3xl sm:p-6"
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary">
                  <Plus className="size-4" aria-hidden />
                </span>
                {tx("Create a post", "Créer une publication")}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {tx("Your post", "Votre publication")}
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-3">
              <Avatar
                path={profile?.avatar_url}
                name={profile?.full_name}
                online
                className="size-10 shrink-0"
              />
              <p className="min-w-0 truncate text-sm font-semibold text-foreground">
                {profile?.full_name}
              </p>
            </div>
            <Textarea
              rows={4}
              maxLength={1200}
              value={caption}
              onChange={(event) => setCaption(event.target.value.slice(0, 1200))}
              placeholder={
                firstName
                  ? fr
                    ? `Quoi de neuf, ${firstName} ?`
                    : `What's on your mind, ${firstName}?`
                  : tx("What's on your mind?", "Quoi de neuf ?")
              }
              aria-label={tx("Your post", "Votre publication")}
              className="min-h-28 resize-none border-border bg-background"
            />
            <SocialSuggestions value={caption} onChange={setCaption} />

            {files.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {previewUrls.map((url, index) => (
                  <span key={`${url}-${index}`} className="relative">
                    <img
                      src={url}
                      alt=""
                      className="size-20 rounded-xl border border-border object-cover"
                    />
                    <button
                      type="button"
                      aria-label={tx("Remove", "Retirer")}
                      onClick={() => removeFile(index)}
                      className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-foreground text-background shadow-sm"
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={files.length >= 4 || create.isPending}
                className="h-14 justify-start gap-3 rounded-lg border-border bg-background px-4"
                onClick={() => fileRef.current?.click()}
              >
                <ImagePlus className="text-primary" aria-hidden />
                {tx("Gallery", "Galerie")}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={files.length >= 4 || create.isPending}
                className="h-14 justify-start gap-3 rounded-lg border-border bg-background px-4"
                onClick={() => cameraRef.current?.click()}
              >
                <Camera className="text-accent" aria-hidden />
                {tx("Camera", "Caméra")}
              </Button>
            </div>
            <div className="flex items-center justify-between gap-2 text-[11px] tabular-nums text-muted-foreground">
              <span>
                {files.length}/4 {tx("photos", "photos")}
              </span>
              <span>{caption.length}/1200</span>
            </div>
            <Button
              onClick={publish}
              disabled={create.isPending || (caption.trim().length === 0 && files.length === 0)}
              className="h-11 w-full touch-manipulation"
            >
              {create.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {create.isPending ? tx("Posting...", "Publication...") : tx("Post", "Publier")}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={pick}
            />
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={pick}
            />
          </DialogContent>
        </Dialog>

        <StoriesRail />
        {spotlightRequest ? (
          <StoriesRail
            key={spotlightRequest.spotlightId}
            viewerRequest={spotlightRequest}
            onViewerClose={() => setSpotlightRequest(undefined)}
          />
        ) : null}

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-56 animate-pulse rounded-3xl bg-muted" />
            ))}
          </div>
        ) : mixed.length === 0 ? (
          <div className="tile p-8 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="size-5" aria-hidden />
            </span>
            <p className="mt-3 text-sm font-bold text-foreground">
              {tx("Nothing here yet", "Rien encore")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {tx(
                "Share a photo — that is how the feed comes alive.",
                "Partagez une photo — c'est ainsi que le fil prend vie.",
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-0 sm:space-y-4">
            {mixed.map((entry) => {
              if (entry.kind === "spotlight")
                return (
                  <FeedSpotlightCard
                    key={`spotlight:${entry.item.id}`}
                    spotlight={entry.item}
                    onOpen={() =>
                      setSpotlightRequest({
                        authorId: entry.item.provider.user_id ?? "",
                        kind: "spotlight",
                        spotlightId: entry.item.id,
                      })
                    }
                  />
                );
              const post = entry.item;
              const index = entry.postIndex;
              // A single calm listings row every four posts — easy to scroll past.
              const block =
                index > 0 && index % 4 === 0
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
    </PullToRefresh>
  );
}
