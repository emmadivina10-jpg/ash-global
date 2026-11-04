import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, GraduationCap, Play, Search, Upload } from "lucide-react";
import { Avatar } from "@/components/refer/AvatarUpload";
import { useInstructors } from "@/lib/campus.queries";
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
  categoryLabel?: string | undefined;
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
          <p className="mt-1 truncate text-xs text-[#A1A1AA]">{post.author.name}</p>
        </div>
      </div>
    </Link>
  );
}

const DISCOVER_TOPICS: { id: string; en: string; fr: string; words: string[] }[] = [
  { id: "all", en: "All", fr: "Tout", words: [] },
  { id: "forex", en: "Forex", fr: "Forex", words: ["forex", "trading", "fx"] },
  { id: "web", en: "Web", fr: "Web", words: ["web", "html", "css", "javascript", "react"] },
  { id: "mobile", en: "Mobile apps", fr: "Applis mobiles", words: ["mobile", "android", "ios", "flutter", "app"] },
  { id: "programming", en: "Programming", fr: "Programmation", words: ["code", "coding", "programming", "python", "developer"] },
  { id: "maths", en: "Mathematics", fr: "Mathématiques", words: ["math", "maths", "algebra", "calculus"] },
];

function topicMatches(text: string, topic: string): boolean {
  const t = DISCOVER_TOPICS.find((x) => x.id === topic);
  if (!t || t.words.length === 0) return true;
  const lower = text.toLowerCase();
  return t.words.some((w) => lower.includes(w));
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
  const hero = videoPosts[0];
  const rowVideos = videoPosts.slice(1, 9);
  const topicLabel = (() => {
    const t = DISCOVER_TOPICS.find((x) => x.id === topic);
    return t && t.id !== "all" ? (fr ? t.fr : t.en) : undefined;
  })();
  const featured = (instructors ?? []).slice(0, 12);
  const headerHidden = useHideOnScrollDown();

  return (
    <div className="mx-auto w-full max-w-xl space-y-5 lg:max-w-5xl">
      <header
        className={cn(
          "sticky top-0 z-20 -mx-4 space-y-3 bg-background/90 px-4 py-2 backdrop-blur transition-[opacity,transform] duration-300 motion-reduce:transition-none",
          headerHidden && "pointer-events-none -translate-y-full opacity-0",
        )}
      >
        <h1 className="sr-only">{tx("Discover", "Découvrir")}</h1>
        <div className="flex items-center gap-2">
          <Link
            to="/search"
            className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
          >
            <Search className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{tx("Search videos and courses", "Rechercher vidéos et cours")}</span>
          </Link>
          {isApprovedInstructor ? (
            <Link
              to="/discover/upload"
              className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-brass px-4 text-sm font-bold text-onyx transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
            >
              <Upload className="size-4" aria-hidden />
              {tx("Upload Video", "Publier une vidéo")}
            </Link>
          ) : null}
        </div>
      </header>

      <div
        role="tablist"
        aria-label={tx("Categories", "Catégories")}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {DISCOVER_TOPICS.map((c) => {
          const on = c.id === topic;
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTopic(c.id)}
              className={cn(
                "h-9 shrink-0 rounded-full border px-4 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass",
                on
                  ? "border-transparent bg-brass text-onyx"
                  : "border-border bg-card text-foreground hover:bg-muted",
              )}
            >
              {fr ? c.fr : c.en}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="aspect-video w-full animate-pulse rounded-2xl bg-muted" aria-busy="true" />
      ) : hero ? (
        <section aria-label={tx("Featured video", "Vidéo à la une")} className="-mx-4">
          <VideoCard post={hero} large categoryLabel={topicLabel} />
          <div className="flex items-start gap-3 px-4 pt-3 sm:px-0">
            <Avatar path={hero.author.avatar_url} name={hero.author.name} className="size-10 ring-2 ring-brass" />
            <div className="min-w-0">
              <p className="line-clamp-2 font-semibold text-foreground">
                {firstLine(hero.caption) || tx("Untitled video", "Vidéo sans titre")}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {hero.author.name}
                {topicLabel ? ` · ${topicLabel}` : ""} · {new Date(hero.created_at).toLocaleDateString(fr ? "fr" : "en")}
              </p>
            </div>
          </div>
        </section>
      ) : (
        <div className="relative overflow-hidden rounded-3xl border border-border bg-onyx px-6 py-12 text-center">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(60% 50% at 50% 20%, rgba(75,0,130,0.45), transparent 70%)" }}
            aria-hidden
          />
          <span className="relative mx-auto grid size-14 place-items-center rounded-full bg-black/60 text-brass ring-1 ring-brass/40">
            <Play className="size-6 fill-current" aria-hidden />
          </span>
          <p className="relative mt-4 font-display text-xl font-bold text-[#F5F5F7]">
            {tx("No videos yet", "Pas encore de vidéos")}
          </p>
          <p className="relative mx-auto mt-2 max-w-sm text-sm text-[#A1A1AA]">
            {tx(
              "Lessons and tutorials from approved ASH instructors will appear here.",
              "Les leçons et tutoriels des instructeurs ASH approuvés apparaîtront ici.",
            )}
          </p>
        </div>
      )}

      {rowVideos.length > 0 ? (
        <section aria-label={tx("More videos", "Plus de vidéos")}>
          <h2 className="mb-2.5 font-display text-xl font-semibold text-foreground">
            {tx("More videos", "Plus de vidéos")}
          </h2>
          <div className="-mx-4 flex flex-col gap-5">
            {rowVideos.map((post) => (
              <VideoCard key={post.id} post={post} large />
            ))}
          </div>
        </section>
      ) : null}

      <section aria-label={tx("Featured instructors", "Instructeurs à la une")}>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-foreground">
            {tx("Featured instructors", "Instructeurs à la une")}
          </h2>
          {featured.length > 0 ? (
            <Link to="/campus" className="text-sm font-semibold text-brass hover:underline">
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
                className="flex w-20 shrink-0 flex-col items-center gap-1.5 rounded-2xl p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
              >
                <span className="rounded-full p-[2px] ring-2 ring-brass">
                  <Avatar path={instructor.profile?.avatar_url} name={instructor.display_name} className="size-16" />
                </span>
                <span className="flex w-full items-center justify-center gap-0.5 text-center text-xs font-bold leading-tight text-foreground">
                  <span className="line-clamp-2">{instructor.display_name}</span>
                  {instructor.is_verified ? <BadgeCheck className="size-3 shrink-0 text-brass" aria-hidden /> : null}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {tx("Approved instructors will be featured here.", "Les instructeurs approuvés apparaîtront ici.")}
          </p>
        )}
      </section>

      <section aria-label={tx("Popular courses", "Cours populaires")}>
        <h2 className="mb-2.5 font-display text-xl font-semibold text-foreground">
          {tx("Popular courses", "Cours populaires")}
        </h2>
        <div className="relative grid aspect-[16/8] place-items-center overflow-hidden rounded-2xl bg-royal px-6 text-center">
          <div>
            <GraduationCap className="mx-auto size-8 text-brass" aria-hidden />
            <p className="mt-2 font-display text-lg font-bold text-[#F5F5F7]">
              {tx("Courses are coming soon", "Les cours arrivent bientôt")}
            </p>
            <p className="mt-1 text-sm text-[#D4D4D8]">
              {tx(
                "Full courses with lessons and free previews will appear here once instructors publish them.",
                "Les cours complets avec leçons et aperçus gratuits apparaîtront ici dès leur publication.",
              )}
            </p>
          </div>
        </div>
      </section>
          </div>
  );
}

/** YouTube-style: hide the top bar while scrolling down, bring it back on scroll up. */
function useHideOnScrollDown() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) < 8) return;
      setHidden(y > last && y > 80);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return hidden;
}
