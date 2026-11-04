import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, Play, Search, Upload } from "lucide-react";
import { Avatar } from "@/components/refer/AvatarUpload";
import { useInstructors } from "@/lib/campus.queries";
import { useI18n } from "@/lib/i18n";
import { useUser } from "@/lib/queries";
import { isStoryVideoSource, useSocialFeed, type FeedPost } from "@/lib/social.queries";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DiscoverVideo } from "@/components/refer/DiscoverVideo";
import { DISCOVER_TOPICS, topicMatches } from "@/lib/discover-topics";
import { useQuery } from "@tanstack/react-query";
import { loadAuthors } from "@/lib/social.queries";
import { VideoActions } from "@/components/refer/VideoActions";

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

function VideoCard({ post }: { post: FeedPost }) {
  const { tx } = useI18n();
  const video = postVideos(post)[0];
  if (!video) return null;
  const title = firstLine(post.caption) || tx("Untitled video", "Vidéo sans titre");
  return <article className="min-w-0 w-full">
    <DiscoverVideo compact src={video} poster={post.images.find((src) => !isStoryVideoSource(src))} title={title} />
    <div className="flex items-start gap-2.5 px-3 py-2.5 lg:px-0">
      <Avatar path={post.author.avatar_url} name={post.author.name} className="size-9 shrink-0" />
      <div className="min-w-0 flex-1">
        <Link to="/post/$postId" params={{ postId: post.id }} className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">{title}</Link>
        <p className="mt-0.5 truncate text-xs leading-4 text-muted-foreground">{post.author.name}</p>
      </div>
      <VideoActions id={post.id} title={title} authorId={post.author.id} />
    </div>
  </article>;
}

function DiscoverPage() {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const { user } = useUser();
  const [topic, setTopic] = useState("all");
  const { data: posts, isLoading } = useSocialFeed(120);
  const { data: instructors } = useInstructors({});

  // Upload Video is only offered to approved instructors (server checks still apply).
  const isApprovedInstructor = Boolean(
    user && (instructors ?? []).some((i) => i.user_id === user.id && i.is_active),
  );

  const videoPosts = useMemo(
    () =>
      (posts ?? []).filter(
        (p) => postVideos(p).length > 0 && topicMatches(p.caption, topic),
      ),
    [posts, topic],
  );
  const topicLabel = (() => {
    const t = DISCOVER_TOPICS.find((x) => x.id === topic);
    return t && t.id !== "all" ? (fr ? t.fr : t.en) : undefined;
  })();
  const featured = (instructors ?? []).filter((instructor) => topicMatches(
    [instructor.headline, instructor.bio, ...instructor.subjects, ...instructor.skills].join(" "), topic,
  )).slice(0, 12);
  const instructorIds = (instructors ?? []).map((instructor) => instructor.user_id).sort();
  const { data: instructorPresence } = useQuery({
    queryKey: ["discover-instructor-presence", user?.id, instructorIds],
    enabled: Boolean(user) && instructorIds.length > 0,
    queryFn: () => loadAuthors(instructorIds),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
  const headerHidden = useHideOnScrollDown();

  return (
    <div className="discover-surface market-theme w-full">
      <header
        className={cn(
          "sticky top-0 z-20 bg-background/95 px-3 py-2 backdrop-blur transition-[opacity,transform] duration-300 motion-reduce:transition-none lg:px-6",
          headerHidden && "pointer-events-none -translate-y-full opacity-0",
        )}
      >
        <h1 className="sr-only">{tx("Discover", "Découvrir")}</h1>
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <Link
            to="/search"
            className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-card px-3 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Search className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{tx("Search videos", "Rechercher des vidéos")}</span>
          </Link>
          {isApprovedInstructor ? (
            <Link
              to="/discover/upload"
              aria-label={tx("Upload Video", "Publier une vidéo")}
              title={tx("Upload Video", "Publier une vidéo")}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:w-auto lg:gap-2 lg:px-3"
            >
              <Upload className="size-4" aria-hidden />
              <span className="hidden lg:inline">{tx("Upload Video", "Publier une vidéo")}</span>
            </Link>
          ) : null}
        </div>
      </header>

      <div
        role="tablist"
        aria-label={tx("Categories", "Catégories")}
        className="flex gap-2 overflow-x-auto px-3 pb-3 pt-1 lg:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {DISCOVER_TOPICS.map((c) => {
          const on = c.id === topic;
          return (
            <Button
              variant="ghost"
              key={c.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTopic(c.id)}
              className={cn(
                "h-8 shrink-0 rounded-md border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                on
                  ? "border-transparent bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted",
              )}
            >
              {fr ? c.fr : c.en}
            </Button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="discover-video-grid" aria-busy="true">{[0, 1, 2].map((id) => <div key={id} className="aspect-video w-full animate-pulse bg-muted" />)}</div>
      ) : videoPosts.length > 0 ? (
        <section aria-label={tx("Videos", "Vidéos")} className="discover-video-grid">{videoPosts.map((post) => <VideoCard key={post.id} post={post} />)}</section>
      ) : (
        <section role="status" className="border-y border-border bg-primary/5 px-6 py-12 text-center">
          <Play className="mx-auto size-8 text-primary" aria-hidden />
          <p className="mt-4 text-xl font-bold text-foreground">{topicLabel
            ? tx(`No ${topicLabel} videos yet`, `Pas encore de vidéos : ${topicLabel}`)
            : tx("No videos yet", "Pas encore de vidéos")}</p>
        </section>
      )}
      <section aria-label={tx("Featured instructors", "Instructeurs à la une")} className="px-3 py-5 lg:px-6">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-foreground">
            {tx("Featured instructors", "Instructeurs à la une")}
          </h2>
          {featured.length > 0 ? (
            <Link to="/campus" className="text-sm font-semibold text-primary hover:underline">
              {tx("See all", "Tout voir")}
            </Link>
          ) : null}
        </div>
        {featured.length > 0 ? (
          <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {featured.map((instructor) => (
              <Link
                key={instructor.id}
                to="/campus/instructors/$instructorId"
                params={{ instructorId: instructor.id }}
                className="flex w-20 shrink-0 flex-col items-center gap-1.5 rounded-2xl p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className={cn("relative rounded-full p-[2px] ring-2 ring-primary", instructorPresence?.get(instructor.user_id)?.online && "instructor-online-ring")}>
                  <Avatar path={instructor.profile?.avatar_url} name={instructor.display_name} className="size-16" />
                  {instructorPresence?.get(instructor.user_id)?.online && <span role="status" aria-label={tx("Online", "En ligne")} className="instructor-online-dot absolute -bottom-0.5 right-0 size-3.5 rounded-full border-2 border-background bg-primary" />}
                </span>
                <span className="flex w-full items-center justify-center gap-0.5 text-center text-xs font-bold leading-tight text-foreground">
                  <span className="line-clamp-2">{instructor.display_name}</span>
                  {instructor.is_verified ? <BadgeCheck className="size-3 shrink-0 text-primary" aria-hidden /> : null}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {topicLabel ? tx(`No ${topicLabel} instructors yet`, `Pas encore d’instructeurs : ${topicLabel}`) : tx("Approved instructors will be featured here.", "Les instructeurs approuvés apparaîtront ici.")}
          </p>
        )}
      </section>

    </div>
  );
}

/** YouTube-style: hide the top bar while scrolling down, bring it back on scroll up. */
function useHideOnScrollDown() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const container = document.querySelector<HTMLElement>(".app-shell-scroll");
    const target: HTMLElement | Window = document.documentElement.classList.contains("native") && container ? container : window;
    const scrollTop = () => target === window ? window.scrollY : container?.scrollTop ?? 0;
    let last = scrollTop();
    const onScroll = () => {
      const y = scrollTop();
      if (Math.abs(y - last) < 8) return;
      setHidden(y > last && y > 80);
      last = y;
    };
    target.addEventListener("scroll", onScroll, { passive: true });
    return () => target.removeEventListener("scroll", onScroll);
  }, []);
  return hidden;
}
