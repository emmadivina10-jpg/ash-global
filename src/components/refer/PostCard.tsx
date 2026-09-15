import { useState } from "react";
import { Heart, MessageCircle, Repeat2, ShieldCheck, Trash2 } from "lucide-react";
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
  useToggleLike,
  useToggleRepost,
  type FeedPost,
  type PostComment,
} from "@/lib/social.queries";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function timeAgo(iso: string, fr: boolean) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return fr ? "à l'instant" : "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export function PostCard({ post, currentUserId }: { post: FeedPost; currentUserId: string | null }) {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const [commentsOpen, setCommentsOpen] = useState(false);
  const like = useToggleLike();
  const repost = useToggleRepost();
  const setFilter = useSetCommentFilter();
  const remove = useDeletePost();
  const mine = currentUserId === post.author_id;

  return (
    <article className="tile overflow-hidden">
      <header className="flex items-center gap-3 p-4 pb-3">
        <Avatar path={post.author.avatar_url} name={post.author.name} className="size-10" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">{post.author.name}</p>
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
        <p className="whitespace-pre-wrap break-words px-4 pb-3 text-sm leading-relaxed text-foreground">
          {post.caption}
        </p>
      ) : null}

      {post.images.length > 0 ? (
        <div className={cn("grid gap-0.5", post.images.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
          {post.images.map((src, index) => (
            <img
              key={index}
              src={src}
              alt=""
              loading="lazy"
              className="max-h-[70vh] w-full bg-muted object-cover"
            />
          ))}
        </div>
      ) : null}

      <div className="flex items-center gap-1 px-2 py-2">
        <Button
          variant="ghost"
          size="sm"
          className={cn(post.liked && "text-primary")}
          onClick={() => like.mutate({ postId: post.id, liked: post.liked })}
        >
          <Heart className={cn("size-4", post.liked && "fill-current")} aria-hidden />
          {post.like_count}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setCommentsOpen((v) => !v)}>
          <MessageCircle className="size-4" aria-hidden />
          {post.comment_count}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(post.reposted && "text-primary")}
          onClick={() =>
            repost.mutate(
              { postId: post.id, reposted: post.reposted },
              { onError: (error) => toast.error(error instanceof Error ? error.message : "Could not repost.") },
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

      {commentsOpen ? <Comments post={post} currentUserId={currentUserId} /> : null}
    </article>
  );
}

function Comments({ post, currentUserId }: { post: FeedPost; currentUserId: string | null }) {
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

      <div className="flex items-center gap-2">
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
  return (
    <div className={cn("flex gap-2.5", depth > 0 && "ml-8")}>
      <Avatar path={comment.author.avatar_url} name={comment.author.name} className="size-8" />
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl bg-muted px-3 py-2">
          <p className="text-xs font-bold text-foreground">{comment.author.name}</p>
          <p className="whitespace-pre-wrap break-words text-sm text-foreground">{comment.body}</p>
        </div>
        <div className="mt-1 flex items-center gap-3 px-2 text-[11px] font-semibold text-muted-foreground">
          <button
            type="button"
            onClick={() =>
              likeComment.mutate({ commentId: comment.id, liked: comment.liked, postId: comment.post_id })
            }
            disabled={!currentUserId || likeComment.isPending}
            className={cn("transition-colors hover:text-primary", comment.liked && "text-primary")}
          >
            {fr ? "J'aime" : "Like"}
            {comment.like_count > 0 ? ` · ${comment.like_count}` : ""}
          </button>
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
