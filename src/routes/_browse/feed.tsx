import { useEffect, useMemo, useRef, useState } from "react";
import { extractTags, recordTagInterest } from "@/lib/interests";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Camera, ImagePlus, Loader2, Plus, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/refer/AvatarUpload";
import { PullToRefresh } from "@/components/refer/PullToRefresh";
import { PostCard } from "@/components/refer/PostCard";
import { CommunityVideoCard } from "@/components/refer/CommunityVideoCard";
import { SwipeDeck } from "@/components/refer/SwipeDeck";
import {
  COMMUNITY_TOPICS,
  matchesCommunityPost,
  matchesCommunityTopic,
} from "@/components/refer/community-topics";
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
import {
  isStoryVideoSource,
  useCreateSocialPost,
  usePublicDiscoverVideoFeed,
  useSocialFeed,
} from "@/lib/social.queries";
import { useDiscoverInstructors } from "@/lib/campus.queries";
import {
  FEED_CATEGORIES,
  matchesCategory,
  type FeedCategory,
} from "@/components/refer/feed-categories";
import { cn } from "@/lib/utils";
import { useProfile, useUser } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import { useAuthGate } from "@/lib/guest-gate";
import { useFollowedBusinessIds } from "@/lib/business-follow.queries";

export const Route = createFileRoute("/_browse/feed")({
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
  const { user } = useUser();
  const me = user?.id ?? null;
  const { isGuest, requireAuth } = useAuthGate();
  // Preserve the same safety-filtered, stable feed pool.
  const { data: posts, isLoading, refetch } = useSocialFeed(120);
  const publicVideos = usePublicDiscoverVideoFeed(120, isGuest);
  const { data: instructors } = useDiscoverInstructors();
  const [communityOpen, setCommunityOpen] = useState(false);
  const communityPosts =
    (isGuest ? publicVideos.data : posts)?.filter(
      (post) =>
        post.images.length > 0 &&
        matchesCommunityPost(
          post.caption,
          post.author.name,
          post.images.some(isStoryVideoSource),
          "all",
          "",
        ),
    ) ?? [];
  const isApprovedInstructor = Boolean(
    user &&
    instructors?.some((instructor) => instructor.user_id === user.id && instructor.is_active),
  );
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
  const [category, setCategory] = useState<FeedCategory>("for_you");
  const { data: followedBusinesses = [] } = useFollowedBusinessIds(me);
  const filtered = useMemo(() => {
    const all = posts ?? [];
    if (category === "for_you") return all;
    if (category === "following") {
      const ids = new Set(followedBusinesses);
      return all.filter((p) => ids.has(p.author_id));
    }
    return all.filter((p) => matchesCategory(p.caption, category, p.images.length));
  }, [posts, category, followedBusinesses]);
  const mixed = useMemo(
    () => interleaveSpotlights(filtered, category === "for_you" ? spotlights : []),
    [filtered, spotlights, category],
  );
  const create = useCreateSocialPost();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [postTopic, setPostTopic] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const publishingRef = useRef(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []).filter(
      (file) => file.type.startsWith("image/") || file.type.startsWith("video/"),
    );

    event.target.value = "";

    if (picked.length === 0) {
      toast.error(tx("Please choose a photo or video.", "Choisissez une photo ou une vidéo."));
      return;
    }
    if (picked.some(isStoryVideoSource) && !isApprovedInstructor) {
      toast.error(
        tx(
          "Video posts are currently available to approved instructors.",
          "Les vidéos sont actuellement réservées aux instructeurs approuvés.",
        ),
      );
      return;
    }
    if (
      (picked.some(isStoryVideoSource) && (picked.length > 1 || files.length > 0)) ||
      (files.some(isStoryVideoSource) && picked.length > 0)
    ) {
      toast.error(tx("Upload a video on its own.", "Publiez une vidéo seule."));
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
    setPostTopic("");
    setFiles([]);
    setComposerOpen(false);
  }

  async function publish() {
    if (create.isPending || publishingRef.current) return;
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

    const tag =
      postTopic && !matchesCommunityTopic(cleanCaption, postTopic, false) ? `#${postTopic}` : "";
    const taggedCaption = tag ? [cleanCaption, tag].filter(Boolean).join("\n") : cleanCaption;
    if (taggedCaption.length > 1200) {
      toast.error(
        tx(
          "Please shorten your post to include its category.",
          "Raccourcissez votre publication pour inclure sa catégorie.",
        ),
      );
      return;
    }

    publishingRef.current = true;
    try {
      recordTagInterest(extractTags(cleanCaption), 1.5);
      await create.mutateAsync({
        caption: taggedCaption,
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
    } finally {
      publishingRef.current = false;
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
      <div className="home-feed mx-auto min-h-dvh w-full bg-background text-foreground">
        <h1 className="sr-only">{tx("Home", "Accueil")}</h1>

        <div
          role="tablist"
          aria-label={tx("Feed categories", "Catégories du fil")}
          className="flex gap-1 overflow-x-auto border-b border-border bg-background px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {FEED_CATEGORIES.filter((c) => c.id === "for_you" || c.id === "following").map((c) => {
            const on = c.id === category;
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setCategory(c.id)}
                className={cn(
                  "h-11 shrink-0 border-b-2 px-4 text-sm font-semibold transition-colors",
                  on
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {fr ? c.fr : c.en}
              </button>
            );
          })}
        </div>

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
                {tx("Create Business Post", "Créer une publication professionnelle")}
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
            <label className="space-y-1 text-sm font-medium">
              <span>{tx("Post category", "Catégorie de publication")}</span>
              <select
                value={postTopic}
                onChange={(event) => setPostTopic(event.target.value)}
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="">{tx("No category", "Sans catégorie")}</option>
                {COMMUNITY_TOPICS.filter((topic) => topic.id !== "all").map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {fr ? topic.fr : topic.en}
                  </option>
                ))}
              </select>
            </label>

            {files.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {previewUrls.map((url, index) => (
                  <span key={`${url}-${index}`} className="relative">
                    {files[index]?.type.startsWith("video/") ? (
                      <video
                        src={url}
                        muted
                        playsInline
                        className="size-20 rounded-xl border border-border object-cover"
                      />
                    ) : (
                      <img
                        src={url}
                        alt=""
                        className="size-20 rounded-xl border border-border object-cover"
                      />
                    )}
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
                {files.length}/4 {tx("media", "médias")}
              </span>
              <span>{caption.length}/1200</span>
            </div>
            {isApprovedInstructor ? (
              <Link
                to="/discover/upload"
                className="flex h-11 items-center gap-3 rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground"
              >
                <Camera className="size-5 text-primary" aria-hidden />
                {tx("Upload a video", "Publier une vidéo")}
              </Link>
            ) : null}
            {!isApprovedInstructor ? (
              <p className="text-xs text-muted-foreground">
                {tx(
                  "Video posts are currently available to approved instructors.",
                  "Les vidéos sont actuellement réservées aux instructeurs approuvés.",
                )}
              </p>
            ) : null}
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
              accept={
                isApprovedInstructor
                  ? "image/*,video/mp4,video/webm,video/quicktime,video/x-m4v,video/ogg"
                  : "image/*"
              }
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
          <div className="mx-3 my-2 flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
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

        <div id="home-stories">
          <StoriesRail compact />
        </div>
        {false ? (
          <details
            className="px-3 pb-3"
            open={communityOpen}
            onToggle={(event) => setCommunityOpen(event.currentTarget.open)}
          >
            <summary className="cursor-pointer font-display text-sm font-bold">
              {tx("Community posts", "Publications de la communauté")}
            </summary>
            <section
              aria-label={tx("Community posts", "Publications de la communauté")}
              className="space-y-3 pt-3"
            >
              {communityPosts.length ? (
                <SwipeDeck
                  key="community"
                  items={communityPosts}
                  getKey={(post) => post.id}
                  renderItem={(post) => {
                    const instructor = instructors?.find((item) => item.user_id === post.author.id);
                    return post.images.some(isStoryVideoSource) ? (
                      <CommunityVideoCard
                        post={post}
                        {...(instructor ? { instructorId: instructor.id } : {})}
                      />
                    ) : (
                      <PostCard post={post} currentUserId={me} />
                    );
                  }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {tx(
                    "No posts match this category and search.",
                    "Aucune publication ne correspond à cette catégorie et à cette recherche.",
                  )}
                </p>
              )}
            </section>
          </details>
        ) : null}
        {isGuest && publicVideos.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {tx("Community videos could not be loaded.", "Impossible de charger les vidéos.")}
          </p>
        ) : null}
        {spotlightRequest ? (
          <StoriesRail
            key={spotlightRequest.spotlightId}
            viewerRequest={spotlightRequest}
            onViewerClose={() => setSpotlightRequest(undefined)}
          />
        ) : null}

        {isLoading || !spotlightsReady ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-56 animate-pulse bg-muted" />
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
          <div className="space-y-2">
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
                <div key={post.id} className="space-y-2">
                  {block ? <DiscoveryRow block={block} /> : null}
                  <PostCard post={post} currentUserId={me} home />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}
