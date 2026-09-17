import { VerifiedBadge } from "@/components/refer/VerifiedBadge";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MessageCircle, Repeat2, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "./AvatarUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  useAddComment,
  useComments,
  useDeletePost,
  useSetCommentFilter,
  useEngagementRealtime,
  useSetPostReaction,
  useToggleRepost,
  type FeedPost,
  type PostComment,
  useSetCommentReaction,
} from "@/lib/social.queries";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ReactionButton, ReactionSummary } from "./ReactionButton";
import { SocialText } from "./SocialText";
import { SocialSuggestions } from "./SocialSuggestions";

function timeAgo(iso: string, fr: boolean) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return fr ? "à l'instant" : "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export function PostCard({
  post,
  currentUserId,
  detail = false,
}: {
  post: FeedPost;
  currentUserId: string | null;
  /** Full-screen post page: comments are open and tapping does not navigate. */
  detail?: boolean;
}) {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const navigate = useNavigate();
  const [commentsOpen, setCommentsOpen] = useState(detail);
  const openPost = () => {
    if (!detail) void navigate({ to: "/post/$postId", params: { postId: post.id } });
  };
  const react = useSetPostReaction();
  const repost = useToggleRepost();
  const setFilter = useSetCommentFilter();
  const remove = useDeletePost();
  const mine = currentUserId === post.author_id;
  const [captionExpanded, setCaptionExpanded] = useState(false);
  useEngagementRealtime(detail ? post.id : null);

  // Long captions on photo posts stay compact in the feed, like Facebook.
  // The full caption is still available with "See more".
  const collapsiblePhotoCaption = !detail && post.images.length > 0 && post.caption.trim().length > 280;

  return (
    <article
      className={cn(
        "tile overflow-hidden",
        !detail &&
          "-mx-4 rounded-none border-x-0 border-y border-border/20 bg-card bg-none shadow-none sm:mx-0 sm:rounded-3xl sm:border sm:border-border sm:shadow-[var(--shadow-card)]",
        detail && "rounded-none border-0 shadow-none sm:rounded-3xl sm:border",
      )}
    >
      <header className="flex items-center gap-3 p-4 pb-3">
        <button
          type="button"
          aria-label={post.author.name}
          onClick={() => void navigate({ to: "/u/$userId", params: { userId: post.author_id } })}
        >
          <Avatar path={post.author.avatar_url} name={post.author.name} className="size-10" />
        </button>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => void navigate({ to: "/u/$userId", params: { userId: post.author_id } })}
            className="flex max-w-full items-center gap-1 truncate text-sm font-bold text-foreground hover:underline"
          >
            <span className="truncate">{post.author.name}</span>
            <VerifiedBadge tier={post.author.verified_tier} until={post.author.verified_until} />
          </button>
          <p className="truncate text-xs text-muted-foreground">
            {timeAgo(post.created_at, fr)}
            {post.city ? ` · ${post.city}` : ""}
          </p>
        </div>
        {mine ? (
          <button
            type="button"
            aria-label={fr ? "Supprimer" : "Delete"}
            onClick={() =>
              remove.mutate(post.id, { onSuccess: () => toast.success(fr ? "Publication supprimée" : "Post deleted") })
            }
            className="text-muted-foreground transition-colors hover:text-destructive"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        ) : null}
      </header>

      {post.caption ? (
        <div className="px-4 pb-3">
          <SocialText
            text={post.caption}
            className={cn(
              "whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground",
              collapsiblePhotoCaption && !captionExpanded && "line-clamp-4",
            )}
          />

          {collapsiblePhotoCaption ? (
            <button
              type="button"
              onClick={() => setCaptionExpanded((expanded) => !expanded)}
              className="mt-1 inline-flex touch-manipulation text-sm font-semibold text-muted-foreground hover:text-foreground"
              aria-expanded={captionExpanded}
            >
              {captionExpanded ? (fr ? "Voir moins" : "See less") : fr ? "Voir plus" : "See more"}
            </button>
          ) : null}
        </div>
      ) : null}

      {post.images.length > 0 ? (
        <div
          className={cn(
            "grid gap-0.5",
            post.images.length > 1 && !detail ? "grid-cols-2" : "grid-cols-1",
            !detail && post.images.length > 1 && "aspect-square grid-rows-2",
            detail && "bg-black",
          )}
        >
          {post.images.map((src, index) => (
            <img
              key={index}
              src={src}
              alt=""
              loading="lazy"
              onClick={openPost}
              className={cn(
                "size-full min-h-0 bg-muted",
                detail ? "max-h-[75dvh] object-contain" : "cursor-pointer object-cover touch-manipulation",
                !detail && post.images.length === 2 && "row-span-2",
                !detail && post.images.length === 3 && index === 0 && "col-span-2",
              )}
            />
          ))}
        </div>
      ) : null}

      <div className="flex items-center justify-between px-4 pt-2">
        <ReactionSummary breakdown={post.reaction_breakdown} />
        <span className="text-[11px] text-muted-foreground">
          {post.comment_count} {fr ? "commentaires" : "comments"} · {post.repost_count}{" "}
          {fr ? "republications" : "reposts"}
        </span>
      </div>
      <div className="flex items-center gap-1 px-2 pb-2">
        <ReactionButton
          value={post.current_reaction}
          total={post.like_count}
          breakdown={post.reaction_breakdown}
          disabled={!currentUserId}
          onChange={(reaction) =>
            react.mutate(
              { postId: post.id, reaction },
              { onError: (error) => toast.error(error instanceof Error ? error.message : "Could not react.") },
            )
          }
        />
        <Button variant="ghost" size="sm" onClick={() => (detail ? setCommentsOpen((v) => !v) : openPost())}>
          <MessageCircle className="size-4" aria-hidden />
          {post.comment_count}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={repost.isPending}
          aria-pressed={post.reposted}
          className={cn(post.reposted && "text-primary")}
          onClick={() =>
            repost.mutate(
              { postId: post.id, reposted: post.reposted },
              {
                onSuccess: () =>
                  toast.success(
                    post.reposted ? (fr ? "Republication retirée" : "Repost removed") : fr ? "Republié" : "Reposted",
                  ),
                onError: (error) => toast.error(error instanceof Error ? error.message : "Could not repost."),
              },
            )
          }
        >
          <Repeat2 className="size-4" aria-hidden />
          {post.repost_count}
        </Button>
      </div>

      {mine ? (
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
          <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <ShieldCheck className="size-4" aria-hidden />
            {fr ? "Filtrer les commentaires inappropriés" : "Filter inappropriate comments"}
          </span>
          <Switch
            checked={post.filter_comments}
            onCheckedChange={(on) => setFilter.mutate({ postId: post.id, on })}
            aria-label={fr ? "Filtrer les commentaires" : "Filter comments"}
          />
        </div>
      ) : null}

      {commentsOpen ? <Comments post={post} currentUserId={currentUserId} detail={detail} /> : null}
    </article>
  );
}

function Comments({
  post,
  currentUserId,
  detail = false,
}: {
  post: FeedPost;
  currentUserId: string | null;
  detail?: boolean;
}) {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const { data, isLoading } = useComments(post.id);
  const add = useAddComment();
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<PostComment | null>(null);

  function submit() {
    const text = body.trim();
    if (!text) return;
    add.mutate(
      { postId: post.id, body: text, parentId: replyTo?.id ?? null, screen: post.filter_comments },
      {
        onSuccess: () => {
          setBody("");
          setReplyTo(null);
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Could not comment."),
      },
    );
  }

  return (
    <div className="space-y-3 border-t border-border p-4">
      {isLoading ? (
        <p className="text-xs text-muted-foreground">{fr ? "Chargement…" : "Loading…"}</p>
      ) : (data ?? []).length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {fr ? "Soyez le premier à commenter." : "Be the first to comment."}
        </p>
      ) : (
        (data ?? []).map((comment) => (
          <CommentRow key={comment.id} comment={comment} onReply={setReplyTo} currentUserId={currentUserId} />
        ))
      )}

      {replyTo ? (
        <p className="text-xs text-muted-foreground">
          {fr ? "Réponse à" : "Replying to"} <strong>{replyTo.author.name}</strong>{" "}
          <button type="button" className="underline" onClick={() => setReplyTo(null)}>
            {fr ? "annuler" : "cancel"}
          </button>
        </p>
      ) : null}

      {/* Kept above the bottom bar so the box is never hidden behind it. */}
      <div
        className={cn(
          "sticky z-20 -mx-4 flex items-center gap-2 border-t border-border bg-background px-4 py-2",
          detail
            ? "bottom-0 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
            : "bottom-[calc(5.6rem+env(safe-area-inset-bottom))] lg:bottom-3",
        )}
      >
        <Input
          value={body}
          onChange={(event) => setBody(event.target.value.slice(0, 600))}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={fr ? "Écrire un commentaire…" : "Write a comment…"}
          aria-label={fr ? "Commentaire" : "Comment"}
        />
        <Button size="sm" onClick={submit} disabled={add.isPending || body.trim().length === 0}>
          {fr ? "Envoyer" : "Send"}
        </Button>
      </div>
    </div>
  );
}

function CommentRow({
  comment,
  onReply,
  currentUserId,
  depth = 0,
}: {
  comment: PostComment;
  onReply: (comment: PostComment) => void;
  currentUserId: string | null;
  depth?: number;
}) {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const reactComment = useSetCommentReaction();
  const navigate = useNavigate();
  const openAuthor = () => void navigate({ to: "/u/$userId", params: { userId: comment.author.id } });
  return (
    <div className={cn("flex gap-2.5", depth > 0 && "ml-8")}>
      <button type="button" aria-label={comment.author.name} onClick={openAuthor}>
        <Avatar path={comment.author.avatar_url} name={comment.author.name} className="size-8" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl bg-muted px-3 py-2">
          <button
            type="button"
            onClick={openAuthor}
            className="flex max-w-full items-center gap-1 text-xs font-bold text-foreground hover:underline"
          >
            <span className="truncate">{comment.author.name}</span>
            <VerifiedBadge tier={comment.author.verified_tier} until={comment.author.verified_until} size={12} />
          </button>
          <SocialText text={comment.body} className="whitespace-pre-wrap break-words text-sm text-foreground" />
        </div>
        <div className="mt-1 flex items-center gap-3 px-2 text-[11px] font-semibold text-muted-foreground">
          <ReactionButton
            compact
            value={comment.current_reaction}
            total={comment.like_count}
            breakdown={comment.reaction_breakdown}
            disabled={!currentUserId}
            onChange={(reaction) =>
              reactComment.mutate(
                { commentId: comment.id, postId: comment.post_id, reaction },
                { onError: (error) => toast.error(error instanceof Error ? error.message : "Could not react.") },
              )
            }
          />
          {depth === 0 ? (
            <button type="button" onClick={() => onReply(comment)} className="hover:text-primary">
              {fr ? "Répondre" : "Reply"}
            </button>
          ) : null}
          <span className="font-normal">{new Date(comment.created_at).toLocaleDateString(fr ? "fr-FR" : "en-GB")}</span>
        </div>
        {comment.replies.map((reply) => (
          <div key={reply.id} className="mt-2">
            <CommentRow comment={reply} onReply={onReply} currentUserId={currentUserId} depth={depth + 1} />
          </div>
        ))}
      </div>
    </div>
  );
}
