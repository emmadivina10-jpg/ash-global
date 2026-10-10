import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Heart,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Rocket,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/refer/AvatarUpload";
import { useProfile } from "@/lib/queries";
import {
  FORUM_SPACES,
  useCreateForumComment,
  useCreateForumPost,
  useForumComments,
  useForumFeed,
  useToggleForumLike,
  type ForumPost,
  type ForumSpace,
} from "@/lib/forum.queries";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/incubator/")({
  head: () => ({
    meta: [
      { title: "ASH Incubator Forum — Build in public" },
      {
        name: "description",
        content:
          "The ASH Incubator forum: students, founders and tech builders share what they are building, ask questions and grow together.",
      },
      { property: "og:title", content: "ASH Incubator Forum — Build in public" },
      {
        property: "og:description",
        content:
          "Share what you are building, ask questions and connect with students, founders and tech builders on ASH.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IncubatorForumPage,
});

function timeAgo(iso: string, fr: boolean) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return fr ? "à l’instant" : "just now";
  if (min < 60) return `${min}m`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}${fr ? "j" : "d"}`;
}

function spaceLabel(key: string, fr: boolean) {
  const found = FORUM_SPACES.find((s) => s.key === key);
  return found ? (fr ? found.fr : found.en) : key;
}

function Composer({ space }: { space: ForumSpace }) {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const { data: profile } = useProfile();
  const create = useCreateForumPost();
  const [body, setBody] = useState("");
  const [image, setImage] = useState<File | null>(null);

  async function publish() {
    if (!body.trim()) return;
    try {
      await create.mutateAsync({ body, space, image });
      setBody("");
      setImage(null);
      toast.success(tx("Posted to the forum.", "Publié dans le forum."));
    } catch (error) {
      toast.error(
        error instanceof Error && error.message === "FILE_TOO_LARGE"
          ? tx("Image is too large (50MB max).", "Image trop lourde (50 Mo max).")
          : tx("Could not post right now.", "Publication impossible."),
      );
    }
  }

  return (
    <div className="rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex gap-3">
        <Avatar path={profile?.avatar_url} name={profile?.full_name} className="size-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={2}
            maxLength={2000}
            placeholder={tx("What are you building?", "Que construisez-vous ?")}
            className="min-h-[60px] resize-none border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
          />

          {image ? (
            <div className="relative mt-2 overflow-hidden rounded-2xl border border-border">
              <img src={URL.createObjectURL(image)} alt="" className="max-h-64 w-full object-cover" />
              <button
                type="button"
                onClick={() => setImage(null)}
                className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-background/80 text-foreground backdrop-blur"
                aria-label={tx("Remove image", "Retirer l’image")}
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          ) : null}

          <div className="mt-3 flex items-center justify-between gap-3">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10">
              <ImageIcon className="size-4" aria-hidden />
              {tx("Photo", "Photo")}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => setImage(event.target.files?.[0] ?? null)}
              />
            </label>
            <Button
              size="sm"
              className="touch-manipulation rounded-full px-5 font-bold"
              disabled={!body.trim() || create.isPending}
              onClick={() => void publish()}
            >
              {create.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {tx("Post", "Publier")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Replies({ postId }: { postId: string }) {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const { data: comments, isLoading } = useForumComments(postId);
  const { data: profile } = useProfile();
  const create = useCreateForumComment();
  const [body, setBody] = useState("");

  async function reply() {
    if (!body.trim()) return;
    try {
      await create.mutateAsync({ postId, body });
      setBody("");
    } catch {
      toast.error(tx("Could not reply right now.", "Réponse impossible."));
    }
  }

  return (
    <div className="mt-3 space-y-3 border-t border-border pt-3">
      {isLoading ? (
        <p className="text-xs text-muted-foreground">{tx("Loading…", "Chargement…")}</p>
      ) : null}

      {(comments ?? []).map((comment) => (
        <div key={comment.id} className="flex gap-2.5">
          <Avatar path={comment.author.avatar_url} name={comment.author.name} className="size-8 shrink-0" />
          <div className="min-w-0 flex-1 rounded-2xl bg-muted/50 px-3 py-2">
            <p className="text-xs font-bold text-foreground">
              {comment.author.name}{" "}
              <span className="font-normal text-muted-foreground">· {timeAgo(comment.created_at, fr)}</span>
            </p>
            <p className="mt-0.5 whitespace-pre-wrap text-sm leading-6 text-foreground">{comment.body}</p>
          </div>
        </div>
      ))}

      <div className="flex items-center gap-2">
        <Avatar path={profile?.avatar_url} name={profile?.full_name} className="size-8 shrink-0" />
        <input
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void reply();
            }
          }}
          placeholder={tx("Write a reply…", "Écrire une réponse…")}
          className="h-10 min-w-0 flex-1 rounded-full border border-border bg-background px-4 text-sm text-foreground outline-none focus:border-primary"
        />
        <Button
          size="icon"
          className="size-10 shrink-0 touch-manipulation rounded-full"
          disabled={!body.trim() || create.isPending}
          onClick={() => void reply()}
          aria-label={tx("Reply", "Répondre")}
        >
          <Send className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

function PostCard({ post }: { post: ForumPost }) {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const like = useToggleForumLike();
  const [open, setOpen] = useState(false);

  return (
    <article className="rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex gap-3">
        <Avatar path={post.author.avatar_url} name={post.author.name} className="size-10 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm font-extrabold text-foreground">{post.author.name}</p>
            <span className="text-xs text-muted-foreground">· {timeAgo(post.created_at, fr)}</span>
            <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
              {spaceLabel(post.space, fr)}
            </span>
          </div>

          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-foreground">{post.body}</p>

          {post.image_url ? (
            <img
              src={post.image_url}
              alt=""
              loading="lazy"
              className="mt-3 max-h-96 w-full rounded-2xl border border-border object-cover"
            />
          ) : null}

          <div className="mt-3 flex items-center gap-1">
            <button
              type="button"
              onClick={() => like.mutate({ postId: post.id, liked: post.liked })}
              className={cn(
                "inline-flex touch-manipulation items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                post.liked ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Heart className={cn("size-4", post.liked && "fill-current")} aria-hidden />
              {post.like_count}
            </button>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="inline-flex touch-manipulation items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
            >
              <MessageCircle className="size-4" aria-hidden />
              {post.comment_count}
            </button>
          </div>

          {open ? <Replies postId={post.id} /> : null}
        </div>
      </div>
    </article>
  );
}

function IncubatorForumPage() {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const [space, setSpace] = useState<ForumSpace>("BUILD_IN_PUBLIC");
  const [filter, setFilter] = useState<ForumSpace | "ALL">("ALL");
  const { data: posts, isLoading } = useForumFeed(filter);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 pb-16">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="absolute right-[-10%] top-[-40%] size-48 rounded-full bg-primary/10 blur-3xl" aria-hidden />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
            <Rocket className="size-3 text-primary" aria-hidden />
            ASH Incubator
          </span>
          <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight text-foreground">
            {tx("The ASH builders forum", "Le forum des builders ASH")}
          </h1>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
            {tx("Share what you are building, ask your questions and move forward with students, founders and tech builders.", "Partagez ce que vous construisez, posez vos questions et avancez avec des étudiants, fondateurs et builders tech.")}
          </p>
        </div>
      </section>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setFilter("ALL")}
          className={cn(
            "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors",
            filter === "ALL"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground",
          )}
        >
          {tx("All", "Tout")}
        </button>
        {FORUM_SPACES.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              setFilter(item.key);
              setSpace(item.key);
            }}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors",
              filter === item.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {tx(item.en, item.fr)}
          </button>
        ))}
      </div>

      <Composer space={space} />

      {isLoading ? (
        <p className="px-1 text-sm text-muted-foreground">{tx("Loading the forum…", "Chargement du forum…")}</p>
      ) : (posts ?? []).length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card/60 p-8 text-center">
          <Sparkles className="mx-auto size-5 text-primary" aria-hidden />
          <p className="mt-3 text-sm font-bold text-foreground">
            {tx("Be the first to post.", "Soyez le premier à publier.")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {tx("Introduce yourself or share the project you are working on.", "Présentez-vous ou partagez le projet sur lequel vous travaillez.")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(posts ?? []).map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
