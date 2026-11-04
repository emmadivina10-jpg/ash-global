import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BadgeCheck, BookOpen, Check, ChevronDown, Eye, MessageCircle, Play, Search, ThumbsUp, Upload } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Avatar } from "@/components/refer/AvatarUpload";
import { DiscoverVideo } from "@/components/refer/DiscoverVideo";
import { NotificationBell } from "@/components/refer/NotificationBell";
import { VideoActions } from "@/components/refer/VideoActions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DiscoverVideoEngagement } from "@/components/refer/DiscoverVideoEngagement";
import ashLogo from "@/assets/ash-logo.png.asset.json";
import { useInstructors } from "@/lib/campus.queries";
import { DISCOVER_TOPICS, topicMatches } from "@/lib/discover-topics";
import { useI18n } from "@/lib/i18n";
import { loadAuthors, isStoryVideoSource, useSocialFeed, type FeedPost } from "@/lib/social.queries";
import { useUser } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_browse/discover")({
  head: () => ({
    meta: [
      { title: "Discover — ASH Glo" },
      { name: "description", content: "Watch creators, instructors and the ASH community — videos, tutorials, business and learning content in one premium destination." },
      { property: "og:title", content: "Discover — ASH Glo" },
      { property: "og:description", content: "A video-first home for ASH creators, instructors and learning content." },
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
  return caption.split("\n").find((line) => line.trim().length > 0)?.trim() ?? "";
}

function VideoCard({ post, instructorId }: { post: FeedPost; instructorId?: string }) {
  const { tx } = useI18n();
  const video = postVideos(post)[0];
  if (!video) return null;
  const title = firstLine(post.caption) || tx("Untitled video", "Vidéo sans titre");
  return (
    <article className="min-w-0 w-full overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-card)]">
      <DiscoverVideo autoPlayOnVisible compact src={video} poster={post.images.find((src) => !isStoryVideoSource(src))} title={title} />
      <div className="flex items-start gap-2.5 px-3 py-3 lg:px-4">
        <Avatar path={post.author.avatar_url} name={post.author.name} className="size-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <Link to="/post/$postId" params={{ postId: post.id }} className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">{title}</Link>
          <p className="mt-1 truncate text-xs leading-4 text-muted-foreground">{post.author.name}</p>
        </div>
        <VideoActions id={post.id} title={title} authorId={post.author.id} />
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 px-3 py-2.5 lg:px-4">
        <DiscoverVideoEngagement post={post} />
        {instructorId ? (
          <Button asChild size="sm" className="ml-auto h-9 rounded-full px-4 font-bold active:bg-transparent active:text-primary active:shadow-none">
            <Link to="/campus/instructors/$instructorId" params={{ instructorId }}>
              <BookOpen className="size-4" aria-hidden />
              {tx("View Courses", "Voir les cours")}
            </Link>
          </Button>
        ) : (
          <Button asChild size="sm" className="ml-auto h-9 rounded-full px-4 font-bold active:bg-transparent active:text-primary active:shadow-none">
            <Link to="/campus/instructors">
              <BookOpen className="size-4" aria-hidden />
              {tx("View Courses", "Voir les cours")}
            </Link>
          </Button>
        )}
      </div>
    </article>
  );
}

function DiscoverPage() {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const navigate = useNavigate();
  const { user } = useUser();
  const [topic, setTopic] = useState("all");
  const [coursesOpen, setCoursesOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { data: posts, isLoading } = useSocialFeed(120);
  const { data: instructors } = useInstructors({});

  const isApprovedInstructor = Boolean(
    user && (instructors ?? []).some((instructor) => instructor.user_id === user.id && instructor.is_active),
  );
  const videoPosts = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase();
    return (posts ?? []).filter((post) =>
      postVideos(post).length > 0 && topicMatches(post.caption, topic) &&
      (!term || `${post.caption} ${post.author.name}`.toLocaleLowerCase().includes(term)),
    );
  }, [posts, topic, searchTerm]);
  const selectedTopic = DISCOVER_TOPICS.find((item) => item.id === topic);
  const topicLabel = selectedTopic && selectedTopic.id !== "all"
    ? (fr ? selectedTopic.fr : selectedTopic.en)
    : undefined;
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
  const courseTopics = DISCOVER_TOPICS.filter((item) => item.id !== "all");

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearchOpen(false);
  }

  return (
    <div className="discover-surface market-theme w-full">
      <header className="bg-background/95 px-3 py-3 lg:px-6">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Link to="/discover" aria-label="ASH Glo" className="mr-auto inline-flex min-w-0 items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <img src={ashLogo.url} alt="ASH" className="size-9 shrink-0 rounded-xl object-cover" />
            <span className="truncate font-display text-lg font-extrabold tracking-tight text-foreground">ASH Glo</span>
          </Link>
          {isApprovedInstructor ? (
            <Link to="/discover/upload" aria-label={tx("Upload Video", "Publier une vidéo")} title={tx("Upload Video", "Publier une vidéo")} className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <Upload className="size-5" aria-hidden />
            </Link>
          ) : null}
          <Button type="button" variant="ghost" size="icon" className="shrink-0 rounded-full" aria-label={tx("Search videos", "Rechercher des vidéos")} onClick={() => setSearchOpen(true)}>
            <Search className="size-5" aria-hidden />
          </Button>
          <NotificationBell />
        </div>
      </header>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent overlayClassName="bg-slate-950/45 backdrop-blur-md" className="max-w-xl rounded-3xl border-border/70 bg-background/95 p-5 shadow-2xl backdrop-blur-xl sm:p-7">
          <DialogHeader className="pr-8 text-left">
            <DialogTitle className="font-display text-xl font-bold">{tx("Search videos", "Rechercher des vidéos")}</DialogTitle>
            <DialogDescription>{tx("Find a video, creator or topic on ASH Glo.", "Trouvez une vidéo, un créateur ou un sujet sur ASH Glo.")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitSearch} className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input autoFocus value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={tx("Search videos and creators", "Rechercher des vidéos et des créateurs")} aria-label={tx("Search videos and creators", "Rechercher des vidéos et des créateurs")} className="h-11 rounded-full pl-10" />
            </div>
            <Button type="submit" size="icon" className="size-11 shrink-0 rounded-full" aria-label={tx("Search", "Rechercher")}>
              <Search className="size-4" aria-hidden />
            </Button>
          </form>
          <Button type="button" variant="ghost" className="w-fit rounded-full" onClick={() => { setSearchTerm(""); setSearchOpen(false); }}>
            {tx("Clear search", "Effacer la recherche")}
          </Button>
        </DialogContent>
      </Dialog>

      <div role="group" aria-label={tx("Video categories", "Catégories de vidéos")} className="flex gap-2 overflow-x-auto px-3 pb-3 pt-1 lg:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Button type="button" aria-pressed={topic === "all"} onClick={() => setTopic("all")} className={cn(
          "h-9 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          topic === "all" ? "border-transparent bg-primary text-primary-foreground hover:bg-primary/90" : "border-border bg-card text-foreground hover:bg-muted",
        )}>{tx("All", "Tout")}</Button>
        <Button type="button" aria-haspopup="dialog" aria-expanded={coursesOpen} onClick={() => setCoursesOpen(true)} className={cn(
          "h-9 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          topic !== "all" ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15" : "border-border bg-card text-foreground hover:bg-muted",
        )}>
          <BookOpen className="size-4" aria-hidden />{tx("Buy Courses", "Acheter des cours")}
          {topic !== "all" ? <span className="size-1.5 rounded-full bg-primary" aria-label={tx("A course category is selected", "Une catégorie de cours est sélectionnée")} /> : null}
          <ChevronDown className="size-4 opacity-70" aria-hidden />
        </Button>
      </div>

      <Dialog open={coursesOpen} onOpenChange={setCoursesOpen}>
        <DialogContent overlayClassName="bg-slate-950/45 backdrop-blur-md" className="max-h-[min(82dvh,680px)] max-w-md overflow-hidden rounded-3xl border-white/10 bg-background/95 p-0 shadow-2xl backdrop-blur-xl">
          <DialogHeader className="border-b border-border/70 bg-gradient-to-br from-primary/15 via-background to-background px-6 pb-5 pt-7 pr-14 text-left">
            <span className="mb-2 grid size-11 place-items-center rounded-2xl bg-primary/15 text-primary"><BookOpen className="size-5" aria-hidden /></span>
            <DialogTitle className="font-display text-2xl font-bold">{tx("Buy Courses", "Acheter des cours")}</DialogTitle>
            <DialogDescription>{tx("Choose a subject to explore its videos and lessons.", "Choisissez un sujet pour découvrir ses vidéos et ses cours.")}</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto p-3">
            <div className="space-y-1.5" role="list" aria-label={tx("Course categories", "Catégories de cours")}>
              {courseTopics.map((course, index) => {
                const selected = topic === course.id;
                return (
                  <button key={course.id} type="button" role="listitem" onClick={() => { setTopic(course.id); setCoursesOpen(false); }} className={cn(
                    "group flex min-h-14 w-full items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    selected ? "border-primary/30 bg-primary/10 shadow-sm" : "border-transparent bg-card/60 hover:border-border hover:bg-muted/70",
                  )}>
                    <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl text-sm font-bold", selected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary")}>
                      {selected ? <Check className="size-4" aria-hidden /> : <span aria-hidden>{String(index + 1).padStart(2, "0")}</span>}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-foreground">{fr ? course.fr : course.en}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{tx("Explore lessons and videos", "Découvrir des cours et des vidéos")}</span>
                    </span>
                    <ChevronDown className="size-4 -rotate-90 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </button>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="discover-video-grid" aria-busy="true">{[0, 1, 2].map((id) => <div key={id} className="aspect-video w-full animate-pulse bg-muted" />)}</div>
      ) : videoPosts.length > 0 ? (
        <section aria-label={tx("Videos", "Vidéos")} className="discover-video-grid">
          {videoPosts.map((post) => {
            const instructor = instructors?.find((item) => item.user_id === post.author.id);
            return <VideoCard key={post.id} post={post} instructorId={instructor?.id} />;
          })}
        </section>
      ) : (
        <section role="status" className="border-y border-border bg-primary/5 px-6 py-12 text-center">
          <Play className="mx-auto size-8 text-primary" aria-hidden />
          <p className="mt-4 text-xl font-bold text-foreground">{searchTerm.trim()
            ? tx("No matching videos", "Aucune vidéo correspondante")
            : topicLabel ? tx(`No ${topicLabel} videos yet`, `Pas encore de vidéos : ${topicLabel}`) : tx("No videos yet", "Pas encore de vidéos")}</p>
        </section>
      )}

      <section aria-label={tx("Featured instructors", "Instructeurs à la une")} className="px-3 py-5 lg:px-6">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="font-display text-base font-semibold text-foreground">{tx("Featured instructors", "Instructeurs à la une")}</h2>
          {featured.length > 0 ? <Link to="/campus" className="text-sm font-semibold text-primary hover:underline">{tx("See all", "Tout voir")}</Link> : null}
        </div>
        {featured.length > 0 ? (
          <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {featured.map((instructor) => (
              <Link key={instructor.id} to="/campus/instructors/$instructorId" params={{ instructorId: instructor.id }} className="flex w-20 shrink-0 flex-col items-center gap-1.5 rounded-2xl p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
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
          <p className="text-sm text-muted-foreground">{topicLabel ? tx(`No ${topicLabel} instructors yet`, `Pas encore d’instructeurs : ${topicLabel}`) : tx("Approved instructors will be featured here.", "Les instructeurs approuvés apparaîtront ici.")}</p>
        )}
      </section>
    </div>
  );
}
