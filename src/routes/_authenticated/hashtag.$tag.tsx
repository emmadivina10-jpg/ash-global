import { createFileRoute, Link } from "@tanstack/react-router";
import { recordTagInterest } from "@/lib/interests";
import { ChevronLeft, Hash, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { trackEvent } from "@/lib/activity";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHashtagFeed } from "@/lib/social.queries";

export const Route = createFileRoute("/_authenticated/hashtag/$tag")({
  head: ({ params }) => ({
    meta: [
      { title: `#${params.tag} — ASH` },
      { name: "description", content: `Explore real ASH community posts using #${params.tag}.` },
      { property: "og:title", content: `#${params.tag} — ASH` },
      {
        property: "og:description",
        content: `Explore real ASH community posts using #${params.tag}.`,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HashtagPage,
});

function HashtagPage() {
  const { tag } = Route.useParams();
  const [sort, setSort] = useState<"recent" | "top">("recent");
  const [page, setPage] = useState(0);
  const { data, isLoading } = useHashtagFeed(tag, page, sort);
  // Activity intelligence: opening a hashtag is a clear topic interest signal.
  useEffect(() => {
    recordTagInterest([tag], 2);
    trackEvent({
      event_type: "hashtag_view",
      surface: "hashtag",
      target_type: "hashtag",
      hashtags: [tag],
    });
  }, [tag]);
  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      <header className="flex items-center gap-3">
        <Button asChild size="icon" variant="ghost">
          <Link to="/feed" aria-label="Back to Feed">
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <span className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
          <Hash className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-foreground">#{tag}</h1>
          <p className="text-xs text-muted-foreground">Real posts from ASH members</p>
        </div>
      </header>
      <Tabs
        value={sort}
        onValueChange={(value) => {
          setSort(value as "recent" | "top");
          setPage(0);
        }}
      >
        <TabsList>
          <TabsTrigger value="recent">Recent</TabsTrigger>
          <TabsTrigger value="top">Top</TabsTrigger>
        </TabsList>
      </Tabs>
      {isLoading ? (
        <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
      ) : (data ?? []).length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No posts use this hashtag yet.
        </p>
      ) : (
        <div className="divide-y divide-border/40">
          {(data ?? []).map((post) => (
            <Link
              key={post.id}
              to="/post/$postId"
              params={{ postId: post.id }}
              className="block py-4"
            >
              <p className="whitespace-pre-wrap text-sm text-foreground">{post.caption}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {post.like_count} reactions · {post.comment_count} comments
              </p>
            </Link>
          ))}
        </div>
      )}
      <div className="flex justify-between">
        <Button
          variant="outline"
          disabled={page === 0}
          onClick={() => setPage((value) => Math.max(0, value - 1))}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          disabled={(data ?? []).length < 20}
          onClick={() => setPage((value) => value + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
