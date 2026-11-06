import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BadgeCheck,
  BookOpen,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import { Avatar } from "@/components/refer/AvatarUpload";
import { PostCard } from "@/components/refer/PostCard";
import { DiscoverVideo } from "@/components/refer/DiscoverVideo";
import { DiscoverVideoEngagement } from "@/components/refer/DiscoverVideoEngagement";
import { LiveConnectVendorCard } from "@/components/refer/LiveConnectRail";
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
import { useImpression, trackEvent } from "@/lib/activity";
import { useDiscoverInstructors } from "@/lib/campus.queries";
import { useLiveConnectVendors, type LiveConnectVendor } from "@/lib/live-connect.queries";
import { useRegion } from "@/lib/region-context";
import { useUser } from "@/lib/queries";
import {
  isStoryVideoSource,
  loadAuthors,
  usePublicDiscoverVideoFeed,
  useSocialFeed,
  type FeedPost,
} from "@/lib/social.queries";
import { CATEGORY_GROUPS, categoryLabel, type GroupId } from "@/lib/taxonomy";
import { useI18n } from "@/lib/i18n";
import { newSessionSeed, rotate } from "@/lib/rotation";
import { cn } from "@/lib/utils";
import { topicMatches } from "@/lib/discover-topics";
import { openConversation } from "@/lib/marketplace.queries";
import { toast } from "sonner";

export const Route = createFileRoute("/_browse/discover")({
  head: () => ({
    meta: [
      { title: "Discover on ASH — ASH Glo" },
      {
        name: "description",
        content: "Find real ASH businesses and service providers who are ready to connect.",
      },
      { property: "og:title", content: "Discover on ASH — ASH Glo" },
      {
        property: "og:description",
        content: "Find people ready to serve you on ASH Glo.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: DiscoverLiveConnectPage,
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

const VIDEO_CATEGORIES = [
  { id: "all", en: "All videos", fr: "Toutes", words: [] },
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

function DiscoverVendorCard({ vendor }: { vendor: LiveConnectVendor }) {
  const { tx, lang } = useI18n();
  const { user } = useUser();
  const navigate = useNavigate();
  const impression = useImpression({
    event_type: "impression",
    surface: "discover",
    target_type: "provider",
    target_id: vendor.provider_id,
  });
  const messageVendor = async () => {
    if (!user) {
      await navigate({ to: "/login" });
      return;
    }
    try {
      const conversationId = await openConversation(vendor.provider_id);
      if (!conversationId) throw new Error("The conversation could not be opened.");
      trackEvent({
        event_type: "click",
        surface: "discover",
        target_type: "provider",
        target_id: vendor.provider_id,
        metadata: { action: "message" },
      });
      await navigate({ to: "/messages", search: { c: conversationId } });
    } catch (error) {
      console.error("Could not start vendor conversation", error);
      toast.error(tx("Could not open this vendor chat.", "Impossible d’ouvrir cette discussion."));
    }
  };
  return (
    <article
      ref={impression}
      className="live-connect-discovery-card overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
    >
      <div className="flex items-center gap-3 p-4">
        <Link
          to="/services/$providerId"
          params={{ providerId: vendor.provider_id }}
          onClick={() =>
            trackEvent({
              event_type: "provider_view",
              surface: "discover",
              target_type: "provider",
              target_id: vendor.provider_id,
            })
          }
          aria-label={tx(`View ${vendor.business_name}`, `Voir ${vendor.business_name}`)}
        >
          <Avatar path={vendor.avatar_url} name={vendor.business_name} className="size-14" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <h2 className="truncate font-display text-base font-bold text-foreground">
              {vendor.business_name}
            </h2>
            {vendor.is_verified ? (
              <BadgeCheck
                className="size-4 shrink-0 text-primary"
                aria-label={tx("Verified business", "Entreprise vérifiée")}
              />
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              {vendor.is_online ? (
                <>
                  <span className="live-connect-dot" aria-hidden />
                  <span className="font-semibold text-primary">{tx("Live now", "En ligne")}</span>
                </>
              ) : (
                tx("Storefront", "Boutique")
              )}
            </span>
            {vendor.city ? (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden />
                {vendor.city}
              </span>
            ) : null}
            {vendor.rating_count > 0 ? (
              <span className="flex items-center gap-1">
                <Star className="size-3.5 fill-current text-primary" aria-hidden />
                {Number(vendor.rating_avg).toFixed(1)} ({vendor.rating_count})
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <p className="mx-4 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
        {vendor.bio || tx("Discover this ASH business.", "Découvrez cette entreprise ASH.")}
      </p>
      <div className="flex flex-wrap gap-1.5 px-4 pt-3">
        {vendor.categories.slice(0, 3).map((category) => (
          <span
            key={category}
            className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary"
          >
            {categoryLabel(category, lang)}
          </span>
        ))}
      </div>
      {Array.isArray(vendor.services) && vendor.services.length ? (
        <div className="mx-4 mt-3 rounded-2xl bg-muted/50 p-3">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {tx("Services", "Services")}
          </p>
          <p className="line-clamp-2 text-xs font-medium text-foreground">
            {(vendor.services as { title: string }[])
              .slice(0, 3)
              .map((service) => service.title)
              .join(" · ")}
          </p>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2 p-4">
        <Link
          to="/services/$providerId"
          params={{ providerId: vendor.provider_id }}
          onClick={() =>
            trackEvent({
              event_type: "provider_view",
              surface: "discover",
              target_type: "provider",
              target_id: vendor.provider_id,
            })
          }
          className="inline-flex min-h-10 items-center justify-center rounded-full bg-primary px-3 text-center text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {tx("View services", "Voir les services")}
        </Link>
        <Button
          type="button"
          variant="outline"
          className="min-h-10 rounded-full px-3 text-xs"
          onClick={() => void messageVendor()}
        >
          <MessageCircle className="size-4" aria-hidden />
          {tx("Message", "Écrire")}
        </Button>
      </div>
      {vendor.accepting_bookings ? (
        <Link
          to="/services/$providerId"
          params={{ providerId: vendor.provider_id }}
          onClick={() =>
            trackEvent({
              event_type: "click",
              surface: "discover",
              target_type: "provider",
              target_id: vendor.provider_id,
              metadata: { action: "booking_entry" },
            })
          }
          className="mx-4 mb-4 inline-flex min-h-9 w-[calc(100%-2rem)] items-center justify-center rounded-full bg-primary/10 px-3 text-xs font-bold text-primary hover:bg-primary/15"
        >
          {tx("Book a service", "Réserver un service")}
        </Link>
      ) : null}
    </article>
  );
}

function DiscoverLiveConnectPage() {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const region = useRegion();
  const { user } = useUser();
  const navigate = useNavigate();
  const [selectedGroup, setSelectedGroup] = useState<GroupId | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [videoCategory, setVideoCategory] = useState("all");
  const [onlineLimit, setOnlineLimit] = useState(9);
  const [storefrontLimit, setStorefrontLimit] = useState(12);
  const {
    data: vendors = [],
    isLoading,
    isError,
    refetch,
  } = useLiveConnectVendors(region.seesEverything ? null : region.country);
  const memberFeed = useSocialFeed(120);
  const publicFeed = usePublicDiscoverVideoFeed(120, !user);
  const posts = user ? memberFeed.data : publicFeed.data;
  const feedLoading = user ? memberFeed.isLoading : publicFeed.isLoading;
  const feedError = user ? memberFeed.isError : publicFeed.isError;
  const { data: instructors } = useDiscoverInstructors();
  const isApprovedInstructor = Boolean(
    user &&
    (instructors ?? []).some(
      (instructor) => instructor.user_id === user.id && instructor.is_active,
    ),
  );
  const [sessionSeed, setSessionSeed] = useState("live-connect");
  useEffect(() => {
    setSessionSeed(newSessionSeed(user?.id ?? null));
  }, [user?.id]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return vendors.filter((vendor) => {
      const group = CATEGORY_GROUPS.find((item) => item.id === selectedGroup);
      const groupMatch =
        !group || vendor.categories.some((category) => group.categories.includes(category));
      const text = [
        vendor.business_name,
        vendor.city ?? "",
        vendor.bio ?? "",
        ...vendor.categories,
        ...(Array.isArray(vendor.services)
          ? (vendor.services as { title: string }[]).map((service) => service.title)
          : []),
      ]
        .join(" ")
        .toLocaleLowerCase();
      return groupMatch && (!term || text.includes(term));
    });
  }, [search, selectedGroup, vendors]);

  const onlineVendors = useMemo(() => {
    const online = filtered.filter((vendor) => vendor.is_online);
    const ranked = rotate(
      "live-vendor",
      online.map((vendor) => ({
        item: vendor,
        id: vendor.provider_id,
        creator: vendor.provider_id,
        relevance:
          (vendor.is_verified ? 0.3 : 0) +
          Math.min(0.35, ((vendor.rating_avg ?? 0) / 5) * 0.35) +
          (vendor.accepting_bookings ? 0.25 : 0) +
          Math.min(0.1, vendor.rating_count / 100),
        explorable: vendor.rating_count < 3,
      })),
      sessionSeed,
    );
    return ranked;
  }, [filtered, sessionSeed]);

  const offlineVendors = filtered.filter((vendor) => !vendor.is_online);
  const videoPosts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    const category = VIDEO_CATEGORIES.find((item) => item.id === videoCategory);
    return (posts ?? []).filter((post) => {
      const content = `${post.caption} ${post.author.name}`.toLocaleLowerCase();
      return (
        post.images.length > 0 &&
        topicMatches(post.caption, "all") &&
        (!category ||
          category.id === "all" ||
          category.words.some((word) => content.includes(word))) &&
        (!term || content.includes(term))
      );
    });
  }, [posts, search, videoCategory]);
  const featuredInstructors = (instructors ?? []).slice(0, 12);
  const instructorIds = (instructors ?? []).map((instructor) => instructor.user_id).sort();
  const { data: instructorPresence } = useQuery({
    queryKey: ["discover-instructor-presence", user?.id, instructorIds],
    enabled: Boolean(user) && instructorIds.length > 0,
    queryFn: () => loadAuthors(instructorIds),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
  const selectCategory = (group: GroupId | "ALL") => {
    setSelectedGroup(group);
    setOnlineLimit(9);
    setStorefrontLimit(12);
    trackEvent({
      event_type: "category_view",
      surface: "services",
      target_type: "category",
      category: group,
    });
  };

  return (
    <main className="live-connect-discover mx-auto w-full max-w-7xl space-y-7 px-4 pb-8 pt-3 sm:px-6 lg:px-8">
      <header className="flex items-center gap-2 border-b border-border pb-3">
        <Link
          to="/discover"
          aria-label="ASH Glo"
          className="mr-auto inline-flex min-w-0 items-center gap-2 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <img src={ashLogo.url} alt="ASH" className="size-9 shrink-0 rounded-full object-cover" />
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
          aria-label={tx("Search ASH", "Rechercher sur ASH")}
          onClick={() => setSearchOpen(true)}
        >
          <Search className="size-5" aria-hidden />
        </Button>
        <NotificationBell />
      </header>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="top-0 max-w-2xl translate-y-0 rounded-b-3xl rounded-t-none p-4 sm:top-16 sm:translate-y-0 sm:rounded-3xl">
          <DialogHeader>
            <DialogTitle>{tx("Search ASH Glo", "Rechercher sur ASH Glo")}</DialogTitle>
            <DialogDescription>
              {tx(
                "Search businesses, services, creators and videos.",
                "Rechercher des entreprises, services, créateurs et vidéos.",
              )}
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setOnlineLimit(9);
              setStorefrontLimit(12);
            }}
            placeholder={tx("Search ASH Glo", "Rechercher sur ASH Glo")}
            aria-label={tx("Search ASH Glo", "Rechercher sur ASH Glo")}
            className="h-11 rounded-full bg-background"
          />
        </DialogContent>
      </Dialog>

      <StoriesRail />

      {isError ? (
        <section
          role="alert"
          className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-center"
        >
          <p className="font-semibold text-foreground">
            {tx("Live businesses could not be loaded.", "Impossible de charger les entreprises.")}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 rounded-full"
            onClick={() => void refetch()}
          >
            {tx("Try again", "Réessayer")}
          </Button>
        </section>
      ) : null}

      <section aria-labelledby="live-now-heading" className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary">
              {tx("Available now", "Disponibles maintenant")}
            </p>
            <h2
              id="live-now-heading"
              className="mt-1 font-display text-2xl font-bold text-foreground"
            >
              {tx("Live on ASH", "En direct sur ASH")}
            </h2>
          </div>
          <span className="text-xs font-semibold text-muted-foreground">
            {onlineVendors.length} {tx("available", "disponibles")}
          </span>
        </div>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-60 animate-pulse rounded-3xl bg-muted" />
            ))}
          </div>
        ) : onlineVendors.length ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {onlineVendors.slice(0, onlineLimit).map((vendor) => (
                <DiscoverVendorCard key={vendor.provider_id} vendor={vendor} />
              ))}
            </div>
            {onlineVendors.length > onlineLimit ? (
              <Button
                type="button"
                variant="outline"
                className="mx-auto mt-4 flex rounded-full"
                onClick={() => setOnlineLimit((limit) => Math.min(limit + 9, onlineVendors.length))}
              >
                {tx("Show more live businesses", "Voir plus d’entreprises en direct")}
              </Button>
            ) : null}
          </>
        ) : (
          <p className="rounded-3xl border border-dashed border-border bg-card/60 px-5 py-8 text-center text-sm text-muted-foreground">
            {tx(
              "No businesses are live in this category right now. Browse storefronts below.",
              "Aucune entreprise en direct dans cette catégorie. Découvrez les boutiques ci-dessous.",
            )}
          </p>
        )}
      </section>

      <section aria-labelledby="storefronts-heading" className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
              {tx("Explore businesses", "Explorer les entreprises")}
            </p>
            <h2
              id="storefronts-heading"
              className="mt-1 font-display text-2xl font-bold text-foreground"
            >
              {tx("Storefronts", "Boutiques")}
            </h2>
          </div>
          <Link to="/services" className="text-sm font-bold text-primary hover:underline">
            {tx("All services", "Tous les services")}
          </Link>
        </div>
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-60 animate-pulse rounded-3xl bg-muted" />
            ))}
          </div>
        ) : offlineVendors.length ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {offlineVendors.slice(0, storefrontLimit).map((vendor) => (
                <LiveConnectVendorCard key={vendor.provider_id} vendor={vendor} online={false} />
              ))}
            </div>
            {offlineVendors.length > storefrontLimit ? (
              <Button
                type="button"
                variant="outline"
                className="mx-auto mt-4 flex rounded-full"
                onClick={() =>
                  setStorefrontLimit((limit) => Math.min(limit + 12, offlineVendors.length))
                }
              >
                {tx("Show more storefronts", "Voir plus de boutiques")}
              </Button>
            ) : null}
          </>
        ) : (
          <p className="rounded-3xl border border-dashed border-border bg-card/60 px-5 py-8 text-center text-sm text-muted-foreground">
            {tx("No other storefronts match this search.", "Aucune autre boutique ne correspond.")}
          </p>
        )}
      </section>

      <nav
        aria-label={tx("Explore other ASH markets", "Explorer les autres marchés ASH")}
        className="flex flex-wrap gap-2"
      >
        {[
          { to: "/services", label: tx("Services", "Services") },
          { to: "/property", label: tx("Property & land", "Immobilier et terrains") },
          { to: "/deals", label: tx("Deals", "Offres") },
          { to: "/events", label: tx("Events", "Événements") },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            {item.label}
          </Link>
        ))}
      </nav>


      <section
        aria-label={tx("Featured instructors", "Instructeurs à la une")}
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">
            {tx("Featured instructors", "Instructeurs à la une")}
          </h2>
          {featuredInstructors.length > 0 ? (
            <Link to="/campus" className="text-sm font-semibold text-primary hover:underline">
              {tx("See all", "Tout voir")}
            </Link>
          ) : null}
        </div>
        {featuredInstructors.length ? (
          <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {featuredInstructors.map((instructor) => (
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

      <section aria-label={tx("Community videos", "Vidéos de la communauté")} className="space-y-4">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary">
            {tx("From the community", "De la communauté")}
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold text-foreground">
            {tx("Posts on ASH", "Publications sur ASH")}
          </h2>
        </div>
        <nav
          aria-label={tx("Video topics", "Thèmes vidéo")}
          className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {VIDEO_CATEGORIES.map((category) => (
            <Button
              key={category.id}
              type="button"
              size="sm"
              variant={videoCategory === category.id ? "default" : "outline"}
              aria-pressed={videoCategory === category.id}
              onClick={() => setVideoCategory(category.id)}
              className="h-9 shrink-0 rounded-full px-4"
            >
              {fr ? category.fr : category.en}
            </Button>
          ))}
        </nav>
        {feedLoading ? (
          <div className="space-y-4" aria-busy="true">
            {[0, 1, 2].map((id) => (
              <div key={id} className="aspect-video w-full animate-pulse rounded-3xl bg-muted" />
            ))}
          </div>
        ) : feedError ? (
          <p
            role="alert"
            className="rounded-3xl border border-destructive/30 bg-destructive/5 px-4 py-8 text-center text-sm text-muted-foreground"
          >
            {tx(
              "Videos could not be loaded. Please try again.",
              "Impossible de charger les vidéos. Veuillez réessayer.",
            )}
          </p>
        ) : videoPosts.length ? (
          <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-3xl border border-border bg-background">
            {videoPosts.map((post) => {
              const instructor = instructors?.find((item) => item.user_id === post.author.id);
              return (
                postVideos(post).length > 0 ? (
                  <VideoCard
                    key={post.id}
                    post={post}
                    {...(instructor ? { instructorId: instructor.id } : {})}
                  />
                ) : (
                  <PostCard
                    key={post.id}
                    post={post}
                    currentUserId={user?.id ?? null}
                  />
                )
              );
            })}
          </div>
        ) : (
          <p className="rounded-3xl border border-dashed border-border bg-card/60 px-5 py-8 text-center text-sm text-muted-foreground">
            {tx("No posts match this search.", "Aucune publication ne correspond à cette recherche.")}
          </p>
        )}
      </section>
    </main>
  );
}
