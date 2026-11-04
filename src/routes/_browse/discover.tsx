import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, Play, Search, Sparkles } from "lucide-react";
import { Avatar } from "@/components/refer/AvatarUpload";
import { StoriesRail } from "@/components/refer/StoriesRail";
import {
  FEED_CATEGORIES,
  matchesCategory,
  type FeedCategory,
} from "@/components/refer/feed-categories";
import { useInstructors } from "@/lib/campus.queries";
import { useAuthGate } from "@/lib/guest-gate";
import { useI18n } from "@/lib/i18n";
import { useUser } from "@/lib/queries";
import { isStoryVideoSource, useSocialFeed, type FeedPost } from "@/lib/social.queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_browse/discover")({
  head: () => ({
    meta: [
      { title: "Discover — ASH Glo" },
      {
        name: "description",
        content:
          "Watch creators, instructors and the ASH community — videos, tutorials, business and learning content in one premium destination.",
      },
      { property: "og:title", content: "Discover — ASH Glo" },
      {
        property: "og:description",
        content: "A video-first home for ASH creators, instructors and learning content.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DiscoverPage,
});

/** A post counts as video when any of its media is a video source. */
function postVideos(post: FeedPost): string[] {
  return post.images.filter((src) => isStoryVideoSource(src));
}

function firstLine(caption: string): string {
  const line = caption.split("\n").find((l) => l.trim().length > 0) ?? "";
  return line.trim();
}

/** Large 16:9 video card used for the hero and the video rows. */
function VideoCard({
  post,
  large = false,
  categoryLabel,
}: {
  post: FeedPost;
  large?: boolean;
  categoryLabel?: string;
}) {
  const { tx } = useI18n();
  const video = postVideos(post)[0];
  const poster = post.images.find((src) => !isStoryVideoSource(src));
  const title = firstLine(post.caption) || tx("Untitled video", "Vidéo sans titre");
  return (
    <Link
      to="/post/$postId"
      params={{ postId: post.id }}
      className={cn(
        "group relative block shrink-0 overflow-hidden rounded-2xl bg-onyx-elevated ring-1 ring-border/60 transition-transform duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass motion-safe:hover:scale-[1.02]",
        large ? "w-full" : "w-64 sm:w-72",
      )}
      aria-label={title}
    >
      <div className={cn("relative w-full", large ? "aspect-video" : "aspect-video")}>
        {video ? (
          <video
            src={video}
            poster={poster}
            muted
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : poster ? (
          <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
        <span
          className={cn(
            "absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-brass ring-1 ring-brass/50 backdrop-blur-sm transition-transform duration-200 group-hover:scale-110",
            large ? "size-14" : "size-11",
          )}
        >
          <Play className={cn("fill-current", large ? "size-6" : "size-5")} aria-hidden />
        </span>
        <div className="absolute inset-x-0 bottom-0 p-3.5">
          {categoryLabel ? (
            <span className="mb-1.5 inline-block rounded-full bg-brass/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brass ring-1 ring-brass/30">
              {categoryLabel}
            </span>
          ) : null}
          <p
            className={cn(
              "line-clamp-2 font-semibold text-[#F5F5F7]",
              large ? "text-base" : "text-sm",
            )}
          >
            {title}
          </p>
          <p className="mt-1 truncate text-xs text-[#A1A1AA]">{post.author.full_name}</p>
        </div>
      </div>
    </Link>
  );
}

function DiscoverPage() {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const { user } = useUser();
  const { isGuest } = useAuthGate();
  const [category, setCategory] = useState<FeedCategory>("for_you");
  const { data: posts, isLoading } = useSocialFeed(120);
  const { data: instructors } = useInstructors({});

  const filtered = useMemo(() => {
    const all = posts ?? [];
    if (category === "for_you" || category === "following") return all;
    return all.filter((p) => matchesCategory(p.caption, category, p.images.length));
  }, [posts, category]);

  const videoPosts = useMemo(() => filtered.filter((p) => postVideos(p).length > 0), [filtered]);
  const photoPosts = useMemo(
    () =>
      filtered
        .filter((p) => postVideos(p).length === 0 && p.images.length > 0)
        .sort((a, b) => b.like_count + b.comment_count - (a.like_count + a.comment_count)),
    [filtered],
  );
  const hero = videoPosts[0];
  const rowVideos = videoPosts.slice(hero ? 1 : 0, 9);
  const categoryLabel = (id: FeedCategory) => {
    const c = FEED_CATEGORIES.find((entry) => entry.id === id);
    return c ? (fr ? c.fr : c.en) : undefined;
  };
  const hasContent = videoPosts.length > 0 || photoPosts.length > 0;

  return (
    <div className="mx-auto w-full max-w-xl space-y-5 lg:max-w-5xl">
      <header className="flex items-center justify-between gap-3">
        <h1 className="font-display text-[28px] font-bold leading-8 text-foreground">
          {tx("Discover", "Découvrir")}
        </h1>
        <Link
          to="/search"
          aria-label={tx("Search", "Rechercher")}
          className="grid size-10 place-items-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
        >
          <Search className="size-5" aria-hidden />
        </Link>
      </header>

      {!isGuest && <StoriesRail />}

      <div
        role="tablist"
        aria-label={tx("Categories", "Catégories")}
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
                "h-8 shrink-0 rounded-full border px-3.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass",
                on
                  ? "border-transparent bg-brass text-onyx"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {fr ? c.fr : c.en}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-4" aria-busy="true">
          <div className="aspect-video w-full animate-pulse rounded-2xl bg-muted" />
          <div className="flex gap-3 overflow-hidden">
            {[0, 1, 2].map((i) => (
              <div key={i} className="aspect-video w-64 shrink-0 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        </div>
      ) : !hasContent ? (
        <div className="relative overflow-hidden rounded-3xl border border-border bg-onyx px-6 py-14 text-center">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 50% at 50% 20%, rgba(75,0,130,0.45), transparent 70%)",
            }}
            aria-hidden
          />
          <span className="relative mx-auto grid size-12 place-items-center rounded-2xl bg-brass/10 text-brass ring-1 ring-brass/30">
            <Sparkles className="size-5" aria-hidden />
          </span>
          <p className="relative mt-4 font-display text-xl font-bold text-[#F5F5F7]">
            {tx("Nothing to watch yet", "Rien à regarder pour le moment")}
          </p>
          <p className="relative mx-auto mt-2 max-w-sm text-sm text-[#A1A1AA]">
            {isGuest
              ? tx(
                  "Creator and instructor videos will appear here as the community publishes.",
                  "Les vidéos des créateurs et instructeurs apparaîtront ici au fur et à mesure.",
                )
              : tx(
                  "Share the first video — Discover comes alive with real creator content.",
                  "Partagez la première vidéo — Discover prend vie avec du vrai contenu.",
                )}
          </p>
        </div>
      ) : (
        <>
          {hero ? (
            <section aria-label={tx("Featured", "À la une")}>
              <VideoCard post={hero} large categoryLabel={categoryLabel(category)} />
            </section>
          ) : null}

          {rowVideos.length > 0 ? (
            <section aria-label={tx("Videos", "Vidéos")}>
              <h2 className="mb-2.5 font-display text-xl font-semibold text-foreground">
                {tx("Videos", "Vidéos")}
              </h2>
              <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {rowVideos.map((post) => (
                  <VideoCard key={post.id} post={post} />
                ))}
              </div>
            </section>
          ) : null}

          {photoPosts.length > 0 ? (
            <section aria-label={tx("Trending", "Tendances")}>
              <h2 className="mb-2.5 font-display text-xl font-semibold text-foreground">
                {tx("Trending now", "Tendances")}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photoPosts.slice(0, 9).map((post) => (
                  <Link
                    key={post.id}
                    to="/post/$postId"
                    params={{ postId: post.id }}
                    className="group relative block overflow-hidden rounded-2xl bg-onyx-elevated ring-1 ring-border/60 transition-transform duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass motion-safe:hover:scale-[1.02]"
                  >
                    <div className="relative aspect-square w-full">
                      <img
                        src={post.images[0]}
                        alt=""
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                      <p className="absolute inset-x-0 bottom-0 line-clamp-2 p-2.5 text-xs font-semibold text-[#F5F5F7] opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        {firstLine(post.caption)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}

      {(instructors ?? []).length > 0 ? (
        <section aria-label={tx("Creators and instructors", "Créateurs et instructeurs")}>
          <h2 className="mb-2.5 font-display text-xl font-semibold text-foreground">
            {tx("Creators & instructors", "Créateurs et instructeurs")}
          </h2>
          <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(instructors ?? []).slice(0, 12).map((instructor) => (
              <Link
                key={instructor.id}
                to="/campus/instructors/$instructorId"
                params={{ instructorId: instructor.id }}
                className="flex w-20 shrink-0 flex-col items-center gap-1.5 rounded-2xl p-1 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
              >
                <span
                  className={cn(
                    "rounded-full p-[2px]",
                    instructor.is_verified ? "ring-2 ring-brass" : "ring-1 ring-border",
                  )}
                >
                  <Avatar
                    path={instructor.profile?.avatar_url}
                    name={instructor.display_name}
                    className="size-14"
                  />
                </span>
                <span className="flex w-full items-center justify-center gap-0.5 text-center text-[11px] font-semibold leading-tight text-foreground">
                  <span className="line-clamp-2">{instructor.display_name}</span>
                  {instructor.is_verified ? (
                    <BadgeCheck className="size-3 shrink-0 text-brass" aria-hidden />
                  ) : null}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
