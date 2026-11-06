import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { Avatar } from "@/components/refer/AvatarUpload";
import { DiscoverVideo } from "@/components/refer/DiscoverVideo";
import { DiscoverVideoEngagement } from "@/components/refer/DiscoverVideoEngagement";
import { VideoActions } from "@/components/refer/VideoActions";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { isStoryVideoSource, type FeedPost } from "@/lib/social.queries";

export function CommunityVideoCard({
  post,
  instructorId,
}: {
  post: FeedPost;
  instructorId?: string;
}) {
  const { tx } = useI18n();
  const [playbackRequest, setPlaybackRequest] = useState(0);
  const video = post.images.find(isStoryVideoSource);
  if (!video) return null;
  const title =
    post.caption
      .split("\n")
      .find((line) => line.trim())
      ?.trim() || tx("Untitled video", "Vidéo sans titre");
  return (
    <article className="w-full min-w-0 bg-background">
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
        <Button asChild size="sm" className="ml-auto h-9 rounded-full px-4 font-bold">
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
