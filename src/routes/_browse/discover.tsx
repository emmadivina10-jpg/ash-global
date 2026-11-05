import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  Check,
  ChevronDown,
  Play,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Avatar } from "@/components/refer/AvatarUpload";
import { DiscoverVideo } from "@/components/refer/DiscoverVideo";
import { DiscoverVideoEngagement } from "@/components/refer/DiscoverVideoEngagement";
import { NotificationBell } from "@/components/refer/NotificationBell";
import { StoriesRail } from "@/components/refer/StoriesRail";
import { VideoActions } from "@/components/refer/VideoActions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import ashLogo from "@/assets/ash-logo.png.asset.json";
import { useDiscoverInstructors } from "@/lib/campus.queries";
import { DISCOVER_TOPICS, topicMatches } from "@/lib/discover-topics";
import { useI18n } from "@/lib/i18n";
import {
  loadAuthors,
  isStoryVideoSource,
  usePublicDiscoverVideoFeed,
  useSocialFeed,
  type FeedPost,
} from "@/lib/social.queries";
import { useUser } from "@/lib/queries";
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

function postVideos(post: FeedPost): string[] {
  return post.images.filter((src) => isStoryVideoSource(src));
}

function firstLine(caption: string): string {
  return (
    caption
      .split("\n")
      .find((line) => line.trim().length > 0)
      ?.trim() ?? ""
  );
}

const EXPLORE_CATEGORIES = [
  { id: "all", en: "All", fr: "Tout", words: [] },
  {
    id: "food",
    en: "Food",
    fr: "Cuisine",
    words: ["food", "chef", "cooking", "recipe", "restaurant"],
  },
  {
    id: "tech",
    en: "Tech",
    fr: "Tech",
    words: ["tech", "technology", "software", "computer", "digital"],
  },
  {
    id: "beauty",
    en: "Beauty",
    fr: "Beauté",
    words: ["beauty", "makeup", "hair", "skincare", "fashion"],
  },
  { id: "home", en: "Home", fr: "Maison", words: ["home", "interior", "decor", "furniture"] },
  { id: "events", en: "Events", fr: "Événements", words: ["event", "events", "wedding", "party"] },
  { id: "health", en: "Health", fr: "Santé", words: ["health", "fitness", "wellness", "medical"] },
  { id: "pro", en: "Pro", fr: "Pro", words: ["professional", "business", "career", "freelance"] },
  {
    id: "homes",
    en: "Homes",
    fr: "Logement",
    words: ["homes", "property", "real estate", "housing"],
  },
  { id: "deals", en: "Deals", fr: "Offres", words: ["deal", "deals", "discount", "offer"] },
  { id: "services", en: "Services", fr: "Services", words: ["service", "services", "tutorial"] },
  { id: "extra", en: "Extra", fr: "Autres", words: ["extra", "other", "community"] },
] as const;

function VideoCard({ post, instructorId }: { post: FeedPost; instructorId?: string }) {
  const { tx } = useI18n();
  const [playbackRequest, setPlaybackRequest] = useState(0);
  const video = postVideos(post)[0];
  if (!video) return null;
  const title = firstLine(post.caption) || tx("Untitled video", "Vidéo sans titre");
  return (
    <article className="w-full min-w-0 border-b border-border bg-background">
      <DiscoverVideo
        compact
        src={video}
        poster={post.images.find((src) => !isStoryVideoSource(src))}
        title={title}
        postId={post.id}
        playbackRequest={playbackRequest}
      />
      <div className="flex items-start gap-2.5 px-3 py-3 lg:px-4">
        <Avatar
          path={post.author.avatar_url}
          name={post.author.name}
          className="size-10 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <Link
            to="/post/$postId"
            params={{ postId: post.id }}
            className="line-clamp-2 text-sm font-semibold leading-5 text-foreground"
          >
            {title}
          </Link>
          <p className="mt-1 truncate text-xs leading-4 text-muted-foreground">
            {post.author.name}
          </p>
        </div>
        <VideoActions id={post.id} title={title} authorId={post.author.id} />
      </div>
      <div className="flex flex-wrap items-center gap-1 border-t border-border/60 px-2 py-2 lg:px-3">
        <DiscoverVideoEngagement post={post} onWatch={() => setPlaybackRequest((n) => n + 1)} />
        <Button
          asChild
          size="sm"
          className="ml-auto h-9 rounded-full px-4 font-bold active:bg-transparent active:text-primary active:shadow-none"
        >
          {instructorId ? (
            <Link to="/campus/instructors/$instructorId" params={{ instructorId }}>
              <BookOpen className="size-4" aria-hidden />
              {tx("View Courses", "Voir les cours")}
            </Link>
          ) : (
            <Link to="/campus/instructors">
              <BookOpen className="size-4" aria-hidden />
              {tx("View Courses", "Voir les cours")}
            </Link>
          )}
        </Button>
      </div>
    </article>
  );
}

function CategoryShelf({
  selected,
  onSelect,
  sticky = false,
}: {
  selected: string;
  onSelect: (id: string) => void;
  sticky?: boolean;
}) {
  const { tx, lang } = useI18n();
  return (
    <nav
      aria-label={tx("Explore topics", "Explorer les thèmes")}
      className={cn(
        "border-y border-border bg-background/95 py-3 backdrop-blur",
        sticky && "sticky top-0 z-30",
      )}
    >
      <div className="flex gap-2 overflow-x-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {EXPLORE_CATEGORIES.map((category) => (
          <Button
            key={category.id}
            type="button"
            size="sm"
            variant={selected === category.id ? "default" : "outline"}
            aria-pressed={selected === category.id}
            onClick={() => onSelect(category.id)}
            className="h-8 shrink-0 rounded-full px-3 text-xs font-semibold"
          >
            {lang === "fr" ? category.fr : category.en}
          </Button>
        ))}
      </div>
    </nav>
  );
}

function DiscoverPage() {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const { user } = useUser();
  const topic = "all";
  const [marketCategory, setMarketCategory] = useState("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const memberFeed = useSocialFeed(120);
  const publicFeed = usePublicDiscoverVideoFeed(120, !user);
  const posts = user ? memberFeed.data : publicFeed.data;
  const isLoading = user ? memberFeed.isLoading : publicFeed.isLoading;
  const feedError = user ? memberFeed.isError : publicFeed.isError;
  const { data: instructors } = useDiscoverInstructors();
  const isApprovedInstructor = Boolean(
    user &&
    (instructors ?? []).some(
      (instructor) => instructor.user_id === user.id && instructor.is_active,
    ),
  );
  const videoPosts = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase();
    const category = EXPLORE_CATEGORIES.find((item) => item.id === marketCategory);
    return (posts ?? []).filter((post) => {
      const content = `${post.caption} ${post.author.name}`.toLocaleLowerCase();
      const categoryMatches =
        !category || category.id === "all" || category.words.some((word) => content.includes(word));
      return (
        postVideos(post).length > 0 &&
        topicMatches(post.caption, topic) &&
        categoryMatches &&
        (!term || content.includes(term))
      );
    });
  }, [posts, topic, marketCategory, searchTerm]);
  const selectedTopic = DISCOVER_TOPICS.find((item) => item.id === topic);
  const topicLabel =
    selectedTopic && selectedTopic.id !== "all"
      ? fr
        ? selectedTopic.fr
        : selectedTopic.en
      : undefined;
  const featured = (instructors ?? [])
    .filter((instructor) =>
      topicMatches(
        [instructor.headline, instructor.bio, ...instructor.subjects, ...instructor.skills].join(
          " ",
        ),
        topic,
      ),
    )
    .slice(0, 12);
  const instructorIds = (instructors ?? []).map((instructor) => instructor.user_id).sort();
  const { data: instructorPresence } = useQuery({
    queryKey: ["discover-instructor-presence", user?.id, instructorIds],
    enabled: Boolean(user) && instructorIds.length > 0,
    queryFn: () => loadAuthors(instructorIds),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchOpen(false);
  }

  return (
    <div className="discover-surface market-theme -mx-4 w-[calc(100%+2rem)] sm:-mx-6 sm:w-[calc(100%+3rem)] lg:-mx-8 lg:w-[calc(100%+4rem)]">
      <header className="relative bg-background px-3 py-2.5 lg:px-6">
        <div className="mx-auto flex h-11 max-w-5xl items-center gap-2">
          {searchOpen ? (
            <form
              role="search"
              onSubmit={submitSearch}
              className="discover-search-open flex min-w-0 flex-1 items-center gap-2"
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 rounded-full"
                aria-label={tx("Close search", "Fermer la recherche")}
                onClick={() => setSearchOpen(false)}
              >
                <ArrowLeft className="size-5" aria-hidden />
              </Button>
              <div className="relative min-w-0 flex-1">
                <Input
                  autoFocus
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setSearchOpen(false);
                  }}
                  placeholder={tx("Search ASH Glo", "Rechercher sur ASH Glo")}
                  aria-label={tx(
                    "Search videos and creators",
                    "Rechercher des vidéos et des créateurs",
                  )}
                  className="h-10 rounded-full border-border bg-muted/60 pl-4 pr-10 focus-visible:ring-primary"
                />
                {searchTerm ? (
                  <button
                    type="button"
                    aria-label={tx("Clear search", "Effacer la recherche")}
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-background"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                ) : null}
              </div>
              <Button
                type="submit"
                size="icon"
                variant="secondary"
                className="shrink-0 rounded-full"
                aria-label={tx("Search", "Rechercher")}
              >
                <Search className="size-5" aria-hidden />
              </Button>
            </form>
          ) : (
            <>
              <Link
                to="/discover"
                aria-label="ASH Glo"
                className="mr-auto inline-flex min-w-0 items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <img
                  src={ashLogo.url}
                  alt="ASH"
                  className="size-9 shrink-0 rounded-full object-cover"
                />
                <span className="truncate font-display text-xl font-extrabold tracking-tight text-foreground">
                  ASH Glo
                </span>
              </Link>
              {isApprovedInstructor ? (
                <Link
                  to="/discover/upload"
                  aria-label={tx("Upload a video", "Publier une vidéo")}
                  title={tx("Upload a video", "Publier une vidéo")}
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Plus className="size-5" aria-hidden />
                </Link>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 rounded-full"
                aria-label={tx("Search videos", "Rechercher des vidéos")}
                onClick={() => setSearchOpen(true)}
              >
                <Search className="size-5" aria-hidden />
              </Button>
              <NotificationBell />
            </>
          )}
        </div>
        {searchOpen ? (
          <div className="absolute inset-x-0 top-full z-40 border-b border-border bg-background px-3 pb-3 shadow-lg lg:px-6">
            <ul className="mx-auto max-w-5xl divide-y divide-border/50">
              {[
                ...EXPLORE_CATEGORIES.slice(1, 6).map((item) => (fr ? item.fr : item.en)),
                ...(instructors ?? []).slice(0, 4).map((item) => item.display_name),
              ]
                .filter(
                  (item) =>
                    !searchTerm.trim() ||
                    item.toLocaleLowerCase().includes(searchTerm.trim().toLocaleLowerCase()),
                )
                .map((suggestion) => (
                  <li key={suggestion}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 py-2.5 text-left text-sm text-foreground hover:text-primary"
                      onClick={() => {
                        setSearchTerm(suggestion);
                        setSearchOpen(false);
                      }}
                    >
                      <Search className="size-4 text-muted-foreground" aria-hidden />
                      {suggestion}
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}
      </header>

      <StoriesRail />

      <CategoryShelf selected={marketCategory} onSelect={setMarketCategory} sticky />

      <section
        aria-label={tx("Featured instructors", "Instructeurs à la une")}
        className="border-y border-border bg-background px-3 py-4 lg:px-6"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-foreground">
            {tx("Featured instructors", "Instructeurs à la une")}
          </h2>
          {featured.length > 0 ? (
            <Link to="/campus" className="text-sm font-semibold text-primary hover:underline">
              {tx("See all", "Tout voir")}
            </Link>
          ) : null}
        </div>
        {featured.length ? (
          <div className="-mx-2 flex gap-4 overflow-x-auto px-2 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {featured.map((instructor) => (
              <Link
                key={instructor.id}
                to="/campus/instructors/$instructorId"
                params={{ instructorId: instructor.id }}
                className="flex w-20 shrink-0 flex-col items-center gap-1.5 rounded-2xl p-1"
              >
                <span
                  className={cn(
                    "relative rounded-full p-[2px] ring-2 ring-primary",
                    instructorPresence?.get(instructor.user_id)?.online && "instructor-online-ring",
                  )}
                >
                  <Avatar
                    path={instructor.profile?.avatar_url}
                    name={instructor.display_name}
                    className="size-16"
                  />
                  {instructorPresence?.get(instructor.user_id)?.online ? (
                    <span
                      role="status"
                      aria-label={tx("Online", "En ligne")}
                      className="instructor-online-dot absolute -bottom-0.5 right-0 size-3.5 rounded-full border-2 border-background bg-primary"
                    />
                  ) : null}
                </span>
                <span className="flex w-full items-center justify-center gap-0.5 text-center text-xs font-bold leading-tight text-foreground">
                  <span className="line-clamp-2">{instructor.display_name}</span>
                  {instructor.is_verified ? (
                    <BadgeCheck className="size-3 shrink-0 text-primary" aria-hidden />
                  ) : null}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {tx(
              "Approved instructors will be featured here.",
              "Les instructeurs approuvés apparaîtront ici.",
            )}
          </p>
        )}
      </section>

      {isLoading ? (
        <div className="space-y-4" aria-busy="true">
          {[0, 1, 2].map((id) => (
            <div key={id} className="aspect-video w-full animate-pulse bg-muted" />
          ))}
        </div>
      ) : feedError ? (
        <p role="alert" className="px-4 py-8 text-center text-sm text-muted-foreground">
          {tx(
            "Videos could not be loaded. Please try again.",
            "Impossible de charger les vidéos. Veuillez réessayer.",
          )}
        </p>
      ) : videoPosts.length ? (
        <section aria-label={tx("Videos", "Vidéos")} className="w-full">
          {videoPosts.map((post) => {
            const instructor = instructors?.find((item) => item.user_id === post.author.id);
            return (
              <VideoCard
                key={post.id}
                post={post}
                {...(instructor ? { instructorId: instructor.id } : {})}
              />
            );
          })}
        </section>
      ) : (
        <>
          <CategoryShelf selected={marketCategory} onSelect={setMarketCategory} />
          <section
            role="status"
            className="border-y border-border bg-primary/5 px-6 py-12 text-center"
          >
            <p className="text-xl font-bold text-foreground">
              {searchTerm.trim()
                ? tx("No matching videos", "Aucune vidéo correspondante")
                : topicLabel
                  ? tx(`No ${topicLabel} videos yet`, `Pas encore de vidéos : ${topicLabel}`)
                  : tx("No videos yet", "Pas encore de vidéos")}
            </p>
          </section>
        </>
      )}
    </div>
  );
}
