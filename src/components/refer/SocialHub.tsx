/** Shared social wall: stories/Spotlight bubbles, Spotlights and photo posts with likes and comments. */
import { useEffect, useMemo, useRef, useState } from "react";
import { extractTags, recordTagInterest } from "@/lib/interests";
import { Link, useNavigate } from "@tanstack/react-router";
import { Camera, Gift, ImagePlus, Loader2, Plus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/refer/AvatarUpload";
import { PullToRefresh } from "@/components/refer/PullToRefresh";
import { PostCard } from "@/components/refer/PostCard";
import { StoriesRail, loadSpotlights, type SpotlightPost } from "@/components/refer/StoriesRail";
import { useQuery } from "@tanstack/react-query";
import { resetFeedRotation } from "@/lib/rotation";
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
import { useCreateSocialPost, useFriendships, useSocialFeed } from "@/lib/social.queries";
import { FEED_CATEGORIES, matchesCategory, type FeedCategory } from "@/components/refer/feed-categories";
import { cn } from "@/lib/utils";
import { useProfile, useUser } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import { useAuthGate } from "@/lib/guest-gate";
import { useFeatureFlags } from "@/lib/feature-flags";

export function SocialHub({ redirectToDiscover = false }: { redirectToDiscover?: boolean }) {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const { user } = useUser();
  const me = user?.id ?? null;
  const { isGuest, requireAuth } = useAuthGate();
  // Under the new navigation the Feed becomes Discover; /feed redirects there.
  const newNav = useFeatureFlags().new_nav === true;
  // Preserve the same safety-filtered, stable feed pool.
  const { data: posts, isLoading, refetch } = useSocialFeed(120);
  const { data: profile } = useProfile();
  const { data: discovery } = useFeedDiscovery();
  const {
    data: spotlights = [],
    refetch: refreshSpotlights,
    isFetched: spotlightsFetched,
    isError: spotlightsFailed,
  } = useQuery<SpotlightPost[]>({
    queryKey: ["ash-spotlights", me],
    enabled: Boolean(me),
    queryFn: loadSpotlights,
    staleTime: 15_000,
  });
  // Wait for Spotlights before showing the Feed, so they never slot in late
  // and push the people you're looking at up or down. Guests skip the wait:
  // their Spotlights query is disabled until sign-in.
  const spotlightsReady = isGuest || spotlightsFetched || spotlightsFailed;
  const [spotlightRequest, setSpotlightRequest] = useState<
    { authorId: string; kind: "spotlight"; spotlightId: string } | undefined
  >();
  // Spotlights keep their slots too, so the Feed never shuffles under the reader.
  const navigate = useNavigate();
  useEffect(() => {
    if (newNav && redirectToDiscover) void navigate({ to: "/discover", replace: true });
  }, [newNav, navigate, redirectToDiscover]);
  const [category, setCategory] = useState<FeedCategory>("for_you");
  const { data: friendships } = useFriendships();
  const filtered = useMemo(() => {
    const all = posts ?? [];
    if (category === "for_you") return all;
    if (category === "following") {
      const ids = new Set((friendships?.friends ?? []).map((f) => f.other.id));
      return all.filter((p) => ids.has(p.author_id));
    }
    return all.filter((p) => matchesCategory(p.caption, category, p.images.length));
  }, [posts, category, friendships]);
  const mixed = useMemo(
    () => interleaveSpotlights(filtered, category === "for_you" ? spotlights : []),
    [filtered, spotlights, category],
  );
  const create = useCreateSocialPost();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

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
    if (
      !requireAuth({
        en: "Sign in to share a post.",
        fr: "Connectez-vous pour publier.",
      })
    )
      return;

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
        resetFeedRotation(me);
        await Promise.all([refetch(), refreshSpotlights()]);
      }}
      label={tx("Refreshing", "Actualisation")}
    >
      <div className="mx-auto w-full max-w-xl space-y-2">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0 self-center">
            <h1 className="sr-only">{tx("ASH Feed", "Fil ASH")}</h1>
            {!isGuest && (
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
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {!isGuest && (
              <Link
                to="/referral-rewards"
                aria-label={tx("Open Referral rewards", "Ouvrir les récompenses de parrainage")}
                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 text-xs font-bold text-foreground transition-colors hover:bg-gold/20"
              >
                <Gift className="size-4 text-gold" aria-hidden />
                <span className="hidden min-[390px]:inline">{tx("Referral rewards", "Parrainage")}</span>
              </Link>
            )}
            <Button
              type="button"
              size="icon"
              className="size-10 rounded-full shadow-sm [&_svg]:size-6 motion-safe:transition-transform motion-safe:hover:rotate-90"
              aria-label={tx("Create a post", "Créer une publication")}
              title={tx("Create a post", "Créer une publication")}
              onClick={() => {
                if (
                  !requireAuth({
                    en: "Sign in to share a post.",
                    fr: "Connectez-vous pour publier.",
                  })
                )
                  return;
                setComposerOpen(true);
              }}
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

        {isGuest && (
          <div className="tile flex items-center gap-3 rounded-3xl border border-primary/30 bg-primary/5 p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="size-5" aria-hidden />
            </span>
            <p className="min-w-0 flex-1 text-xs text-muted-foreground">
              {tx(
                "You're browsing as a guest. Create a free account to post, react and message.",
                "Vous explorez en invité. Créez un compte gratuit pour publier, réagir et écrire.",
              )}
            </p>
            <Link to="/register" search={{ next: "/feed" }}>
              <Button size="sm" className="h-9 rounded-full px-4">
                {tx("Join free", "Rejoindre")}
              </Button>
            </Link>
          </div>
        )}

        <StoriesRail />
        {spotlightRequest ? (
          <StoriesRail
            key={spotlightRequest.spotlightId}
            viewerRequest={spotlightRequest}
            onViewerClose={() => setSpotlightRequest(undefined)}
          />
        ) : null}

        <div
          role="tablist"
          aria-label={tx("Discover", "Découvrir")}
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {FEED_CATEGORIES.map((c) => {
            const on = c.id === category;
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setCategory(c.id)}
                className={cn(
                  "h-8 shrink-0 rounded-full border px-3.5 text-xs font-bold transition-colors",
                  on
                    ? "border-transparent bg-gradient-to-r from-primary to-gold text-primary-foreground shadow-[var(--shadow-gold)]"
                    : "border-border bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {fr ? c.fr : c.en}
              </button>
            );
          })}
        </div>

        {isLoading || !spotlightsReady ? (
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
              {category === "for_you"
                ? tx("Nothing here yet", "Rien encore")
                : tx("No posts in this category yet", "Aucune publication dans cette catégorie")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isGuest
                ? tx(
                    "Public posts will appear here as the community grows.",
                    "Les publications publiques apparaîtront ici au fur et à mesure.",
                  )
                : tx(
                    "Share a photo — that is how the feed comes alive.",
                    "Partagez une photo — c'est ainsi que le fil prend vie.",
                  )}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {mixed.map((entry) => {
              if (entry.kind === "spotlight")
                return (
                  <FeedSpotlightCard
                    key={`spotlight:${entry.item.id}`}
                    spotlight={entry.item}
                    onOpen={() =>
                      void navigate({ to: "/spotlight", search: { open: entry.item.id } })
                    }
                  />
                );
              const post = entry.item;
              const index = entry.postIndex;
              // A single calm listings row every four posts — easy to scroll past.
              const block =
                category === "for_you" && index > 0 && index % 4 === 0
                  ? (discovery ?? [])[Math.floor(index / 4) - 1]
                  : undefined;
              return (
                <div key={post.id} className="space-y-4">
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
