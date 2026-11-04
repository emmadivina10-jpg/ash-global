import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, MessageCircle, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthGate } from "@/lib/guest-gate";
import { trackEvent } from "@/lib/activity";
import { useI18n } from "@/lib/i18n";
import { useAddComment, useComments, useSetPostReaction, type FeedPost } from "@/lib/social.queries";
import { cn } from "@/lib/utils";

export function DiscoverVideoEngagement({ post }: { post: FeedPost }) {
  const { tx } = useI18n();
  const { requireAuth } = useAuthGate();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [body, setBody] = useState("");
  const react = useSetPostReaction();
  const addComment = useAddComment();
  const { data: comments, isLoading } = useComments(commentsOpen ? post.id : null);
  const liked = post.current_reaction === "like";

  function toggleLike() {
    if (!requireAuth({ en: "Sign in to like this video.", fr: "Connectez-vous pour aimer cette vidéo." })) return;
    trackEvent({ event_type: liked ? "unlike" : "like", surface: "feed", target_type: "post", target_id: post.id, author_id: post.author_id });
    react.mutate({ postId: post.id, reaction: liked ? null : "like" }, {
      onError: () => toast.error(tx("Could not save your like.", "Impossible d’enregistrer votre réaction.")),
    });
  }

  function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = body.trim();
    if (!text || !requireAuth({ en: "Sign in to join the conversation.", fr: "Connectez-vous pour participer à la conversation." })) return;
    addComment.mutate({ postId: post.id, body: text, screen: post.filter_comments }, {
      onSuccess: () => setBody(""),
      onError: (error) => toast.error(error instanceof Error ? error.message : tx("Could not comment.", "Impossible de commenter.")),
    });
  }

  return (
    <>
      <Button type="button" variant="ghost" size="sm" aria-label={tx("Like video", "Aimer la vidéo")} aria-pressed={liked} disabled={react.isPending} onClick={toggleLike} className={cn("h-9 rounded-full px-3", liked && "text-primary")}>
        <ThumbsUp className={cn("size-4", liked && "fill-current")} aria-hidden />{post.like_count}
      </Button>
      <Button asChild type="button" variant="ghost" size="sm" className="h-9 rounded-full px-3">
        <Link to="/post/$postId" params={{ postId: post.id }} aria-label={tx("Watch video", "Regarder la vidéo")}>
          <Eye className="size-4" aria-hidden />{tx("Watch", "Voir")}
        </Link>
      </Button>
      <Button type="button" variant="ghost" size="sm" aria-expanded={commentsOpen} onClick={() => setCommentsOpen((open) => !open)} className="h-9 rounded-full px-3">
        <MessageCircle className="size-4" aria-hidden />{post.comment_count}
      </Button>
      {commentsOpen ? (
        <section className="basis-full border-t border-border/60 pt-3" aria-label={tx("Comments", "Commentaires")}>
          <div className="max-h-52 space-y-3 overflow-y-auto pb-3">
            {isLoading ? <p className="text-xs text-muted-foreground">{tx("Loading comments…", "Chargement des commentaires…")}</p> : null}
            {!isLoading && (comments ?? []).length === 0 ? <p className="text-xs text-muted-foreground">{tx("Be the first to comment.", "Soyez le premier à commenter.")}</p> : null}
            {(comments ?? []).map((comment) => (
              <div key={comment.id} className="rounded-xl bg-muted/50 px-3 py-2">
                <p className="text-xs font-bold text-foreground">{comment.author.name}</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground">{comment.body}</p>
              </div>
            ))}
          </div>
          <form onSubmit={submitComment} className="flex gap-2">
            <Input value={body} onChange={(event) => setBody(event.target.value.slice(0, 600))} placeholder={tx("Write a comment…", "Écrire un commentaire…")} aria-label={tx("Write a comment", "Écrire un commentaire")} className="h-10 min-w-0 rounded-full" />
            <Button type="submit" size="sm" disabled={!body.trim() || addComment.isPending} className="rounded-full px-4">{tx("Send", "Envoyer")}</Button>
          </form>
        </section>
      ) : null}
    </>
  );
}
