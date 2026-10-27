import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronUp,
  Heart,
  Loader2,
  MessageCircle,
  PanelRight,
  Send,
  Share2,
  Ban,
  CalendarCheck,
  MoreHorizontal,
  ShoppingBag,
  Trash2,
  UtensilsCrossed,
  Pause,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  useAddSpotlightComment,
  useDeleteSpotlightComment,
  useSetSpotlightReaction,
  useToggleSpotlightCommentLike,
  type SpotlightComment,
  useSpotlightComments,
  useSpotlightFeed,
  type SpotlightEntry,
} from "@/lib/spotlight.queries";
import { BlockUserDialog } from "@/components/refer/BlockUserDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUser } from "@/lib/queries";
import { vendorAction } from "@/lib/vendor-action";
import { SpotlightComposer } from "@/components/refer/SpotlightComposer";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/refer/AvatarUpload";
import { VerifiedBadge } from "@/components/refer/VerifiedBadge";
import { ShareSheet, shareLink } from "@/components/refer/ShareSheet";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";

type Search = { open?: string | undefined };

export const Route = createFileRoute("/_authenticated/spotlight")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    open: typeof s["open"] === "string" ? s["open"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Spotlight — ASH Glo" },
      { name: "description", content: "Watch Spotlight photos and videos from ASH members and vendors." },
      { property: "og:title", content: "Spotlight — ASH Glo" },
      { property: "og:description", content: "Spotlight photos and videos from ASH members and vendors." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SpotlightPage,
});

function useIsDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return desktop;
}

function SpotlightPage() {
  const { tx } = useI18n();
  const navigate = useNavigate();
  const { open } = Route.useSearch();
  const { data, isLoading } = useSpotlightFeed(40);
  const desktop = useIsDesktop();
  const scroller = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [mobileComments, setMobileComments] = useState<SpotlightEntry | null>(null);

  const items = useMemo(() => {
    const list = (data ?? []).filter((e) => Boolean(e.url));
    if (!open) return list;
    const want = open.startsWith("post:") || open.startsWith("portfolio:") ? open : `post:${open}`;
    const first = list.find((e) => e.id === want);
    return first ? [first, ...list.filter((e) => e.id !== want)] : list;
  }, [data, open]);
  const active = items.find((e) => e.id === activeId) ?? items[0] ?? null;

  const step = (dir: 1 | -1) => {
    const el = scroller.current;
    if (el) el.scrollBy({ top: dir * el.clientHeight, behavior: "smooth" });
  };

  useEffect(() => {
    if (!desktop) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "ArrowDown") step(1);
      if (e.key === "ArrowUp") step(-1);
      if (e.key === "Escape") void navigate({ to: "/feed" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [desktop, navigate]);

  const showPanel = desktop && panelOpen && active;

  return (
    <div
      className={cn(
        "spotlight-stage fixed inset-x-0 top-0 z-30 flex bg-media-backdrop text-on-dark",
        "bottom-[calc(3.75rem+env(safe-area-inset-bottom))] lg:bottom-0 lg:z-50",
      )}
    >
      <h1 className="sr-only">Spotlight</h1>
      <button
        type="button"
        onClick={() => setComposerOpen(true)}
        aria-label={tx("Post a Spotlight", "Publier un Spotlight")}
        className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-40 grid size-11 place-items-center rounded-full gold-gradient text-primary-foreground shadow-lg ring-2 ring-on-dark/40 lg:left-20 lg:right-auto"
      >
        <Plus className="size-6" />
      </button>
      <SpotlightComposer open={composerOpen} onOpenChange={setComposerOpen} hideTrigger />
      <div className="relative min-w-0 flex-1">
        <button
          type="button"
          onClick={() => void navigate({ to: "/feed" })}
          aria-label={tx("Close", "Fermer")}
          className="absolute left-4 top-4 z-20 hidden size-10 place-items-center rounded-full bg-on-dark/15 hover:bg-on-dark/25 lg:grid"
        >
          <X className="size-5" />
        </button>
        {desktop && !panelOpen && active ? (
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            aria-label={tx("Show comments", "Afficher les commentaires")}
            className="absolute right-4 top-4 z-20 grid size-10 place-items-center rounded-full bg-on-dark/15 hover:bg-on-dark/25"
          >
            <PanelRight className="size-5" />
          </button>
        ) : null}

        {isLoading ? (
          <div className="grid h-full place-items-center">
            <Loader2 className="size-6 animate-spin opacity-70" aria-hidden />
          </div>
        ) : items.length === 0 ? (
          <p className="grid h-full place-items-center p-8 text-center text-sm opacity-80">
            {tx("No Spotlights yet.", "Aucun Spotlight pour le moment.")}
          </p>
        ) : (
          <div ref={scroller} className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain">
            {items.map((entry) => (
              <SpotlightSlide
                key={entry.id}
                entry={entry}
                root={scroller}
                onActive={() => setActiveId(entry.id)}
                onComments={() => (desktop ? setPanelOpen(true) : setMobileComments(entry))}
              />
            ))}
          </div>
        )}

        {desktop && items.length > 1 ? (
          <div className="absolute right-6 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-4">
            <button
              type="button"
              aria-label={tx("Previous", "Précédent")}
              onClick={() => step(-1)}
              className="grid size-12 place-items-center rounded-full border-2 border-on-dark/50 hover:bg-on-dark/10"
            >
              <ChevronUp className="size-6" />
            </button>
            <button
              type="button"
              aria-label={tx("Next", "Suivant")}
              onClick={() => step(1)}
              className="grid size-12 place-items-center rounded-full border-2 border-on-dark/50 hover:bg-on-dark/10"
            >
              <ChevronDown className="size-6" />
            </button>
          </div>
        ) : null}
      </div>

      {showPanel ? (
        <aside className="flex w-[22rem] shrink-0 flex-col border-l border-border bg-card text-foreground xl:w-[24rem]">
          <div className="flex justify-end p-3">
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              aria-label={tx("Hide comments", "Masquer les commentaires")}
              className="grid size-9 place-items-center rounded-full hover:bg-muted"
            >
              <PanelRight className="size-5" />
            </button>
          </div>
          <AuthorBlock entry={active} />
          <CommentsPanel key={active.id} entry={active} />
        </aside>
      ) : null}

      <Sheet open={Boolean(mobileComments)} onOpenChange={(o) => !o && setMobileComments(null)}>
        <SheetContent side="bottom" className="flex h-[75dvh] flex-col gap-0 rounded-t-2xl p-0">
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle className="text-center text-base">{tx("Comments", "Commentaires")}</SheetTitle>
          </SheetHeader>
          {mobileComments ? <CommentsPanel entry={mobileComments} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function AuthorBlock({ entry }: { entry: SpotlightEntry }) {
  return (
    <div className="space-y-2 border-b border-border px-4 pb-4">
      <p className="flex items-center gap-2 font-bold">
        <Avatar path={entry.provider.avatar_url} name={entry.provider.business_name} className="size-10" />
        <span className="truncate">{entry.provider.business_name}</span>
        <VerifiedBadge tier={entry.provider.verified_tier} until={entry.provider.verified_until} size={14} />
      </p>
      {entry.caption ? <p className="whitespace-pre-line text-sm">{entry.caption}</p> : null}
    </div>
  );
}

function timeAgo(iso: string, fr: boolean) {
  const m = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h`;
  return `${Math.round(h / 24)} ${fr ? "j" : "d"}`;
}

type CommentSort = "relevant" | "newest";

function CommentsPanel({ entry }: { entry: SpotlightEntry }) {
  const { tx, lang } = useI18n();
  const { user } = useUser();
  const canComment = entry.source === "post";
  const { data: comments, isLoading } = useSpotlightComments(canComment ? entry.id : null);
  const add = useAddSpotlightComment(entry.id);
  const del = useDeleteSpotlightComment(entry.id);
  const like = useToggleSpotlightCommentLike(entry.id);
  const [text, setText] = useState("");
  const [sort, setSort] = useState<CommentSort>("relevant");
  const [replyTo, setReplyTo] = useState<SpotlightComment | null>(null);
  const [blockTarget, setBlockTarget] = useState<SpotlightComment | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSpotlightOwner = Boolean(user && entry.author_id === user.id);

  const { roots, replies } = useMemo(() => {
    const all = comments ?? [];
    const top = all.filter((c) => !c.parent_id);
    const byParent = new Map<string, SpotlightComment[]>();
    for (const c of all)
      if (c.parent_id) byParent.set(c.parent_id, [...(byParent.get(c.parent_id) ?? []), c]);
    const sorted = [...top].sort((x, y) =>
      sort === "newest"
        ? Date.parse(y.created_at) - Date.parse(x.created_at)
        : y.like_count +
            (byParent.get(y.id)?.length ?? 0) -
            (x.like_count + (byParent.get(x.id)?.length ?? 0)) ||
          Date.parse(y.created_at) - Date.parse(x.created_at),
    );
    return { roots: sorted, replies: byParent };
  }, [comments, sort]);

  function submit() {
    const body = text.trim();
    if (!body || add.isPending) return;
    add.mutate(
      { body, parentId: replyTo ? (replyTo.parent_id ?? replyTo.id) : null },
      {
        onSuccess: () => {
          setText("");
          setReplyTo(null);
        },
        onError: () => toast.error(tx("Could not post comment", "Commentaire impossible")),
      },
    );
  }

  if (!canComment)
    return (
      <p className="p-4 text-sm text-muted-foreground">
        {tx("Comments are off for shop photos.", "Les commentaires sont désactivés pour les photos de boutique.")}
      </p>
    );

  const renderComment = (c: SpotlightComment, nested = false) => {
    const canDelete = c.author_id === user?.id || isSpotlightOwner;
    const canBlock = Boolean(user && c.author_id !== user.id);
    return (
      <div key={c.id} className={cn("flex gap-2", nested && "ml-10")}>
        <Link to="/u/$userId" params={{ userId: c.author_id }} className="shrink-0">
          <Avatar path={c.author?.avatar_url} name={c.author?.full_name} className={nested ? "size-7" : "size-8"} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1">
            <div className="min-w-0 rounded-2xl bg-muted px-3 py-2">
              <Link to="/u/$userId" params={{ userId: c.author_id }} className="text-xs font-bold hover:underline">
                {c.author?.full_name ?? "Member"}
              </Link>
              <p className="whitespace-pre-line break-words text-sm">{c.body}</p>
            </div>
            {canDelete || canBlock ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={tx("Comment options", "Options du commentaire")}
                  className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                >
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canDelete ? (
                    <DropdownMenuItem onClick={() => del.mutate(c.id)} className="text-destructive">
                      <Trash2 className="size-4" />
                      {tx("Delete comment", "Supprimer le commentaire")}
                    </DropdownMenuItem>
                  ) : null}
                  {canBlock ? (
                    <DropdownMenuItem onClick={() => setBlockTarget(c)}>
                      <Ban className="size-4" />
                      {tx("Block", "Bloquer")} {c.author?.full_name ?? ""}
                    </DropdownMenuItem>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
          <p className="mt-0.5 flex items-center gap-3 px-2 text-[11px] font-semibold text-muted-foreground">
            <span className="font-normal">{timeAgo(c.created_at, lang === "fr")}</span>
            <button
              type="button"
              onClick={() => like.mutate({ commentId: c.id, like: !c.liked })}
              className={cn("hover:text-foreground", c.liked && "text-destructive")}
            >
              {tx("Like", "J'aime")}
              {c.like_count ? ` · ${c.like_count}` : ""}
            </button>
            <button
              type="button"
              onClick={() => {
                setReplyTo(c);
                inputRef.current?.focus();
              }}
              className="hover:text-foreground"
            >
              {tx("Reply", "Répondre")}
            </button>
          </p>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex shrink-0 items-center justify-between px-4 pt-3">
        <Select value={sort} onValueChange={(v) => setSort(v as CommentSort)}>
          <SelectTrigger className="h-8 w-auto gap-1 border-0 bg-transparent px-1 text-sm font-bold shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relevant">{tx("Most relevant", "Les plus pertinents")}</SelectItem>
            <SelectItem value="newest">{tx("Newest", "Les plus récents")}</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{comments?.length ?? 0}</span>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {isLoading ? (
          <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
        ) : !roots.length ? (
          <p className="text-center text-sm text-muted-foreground">
            {tx("No comments yet. Be the first.", "Aucun commentaire. Soyez le premier.")}
          </p>
        ) : (
          roots.map((c) => (
            <div key={c.id} className="space-y-3">
              {renderComment(c)}
              {(replies.get(c.id) ?? []).map((r) => renderComment(r, true))}
            </div>
          ))
        )}
      </div>
      {replyTo ? (
        <div className="flex shrink-0 items-center justify-between border-t border-border px-4 py-1.5 text-xs text-muted-foreground">
          <span className="truncate">
            {tx("Replying to", "Réponse à")} <b>{replyTo.author?.full_name ?? "Member"}</b>
          </span>
          <button type="button" onClick={() => setReplyTo(null)} aria-label={tx("Cancel reply", "Annuler")}>
            <X className="size-4" />
          </button>
        </div>
      ) : null}
      <form
        className="flex shrink-0 items-center gap-2 border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Input
          ref={inputRef}
          value={text}
          maxLength={1000}
          onChange={(e) => setText(e.target.value)}
          placeholder={replyTo ? tx("Write a reply…", "Écrire une réponse…") : tx("Write a comment…", "Écrire un commentaire…")}
          className="h-10 rounded-full"
        />
        <button
          type="submit"
          disabled={!text.trim() || add.isPending}
          aria-label={tx("Send", "Envoyer")}
          className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
        >
          {add.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </form>
      {blockTarget ? (
        <BlockUserDialog
          open
          onOpenChange={(o) => !o && setBlockTarget(null)}
          targetUserId={blockTarget.author_id}
          targetName={blockTarget.author?.full_name}
          source="spotlight_comment"
          onDone={() => setBlockTarget(null)}
        />
      ) : null}
    </>
  );
}

function SpotlightSlide({
  entry,
  root,
  onActive,
  onComments,
}: {
  entry: SpotlightEntry;
  root: React.RefObject<HTMLDivElement | null>;
  onActive: () => void;
  onComments: () => void;
}) {
  const { tx } = useI18n();
  const navigate = useNavigate();
  const react = useSetSpotlightReaction();
  const [liked, setLiked] = useState(Boolean(entry.current_reaction));
  const [count, setCount] = useState(entry.reaction_count);
  const [shareOpen, setShareOpen] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const activeRef = useRef(onActive);
  activeRef.current = onActive;

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([e]) => {
        const video = videoRef.current;
        if (e?.isIntersecting) {
          activeRef.current();
          void video?.play().catch(() => undefined);
        } else video?.pause();
      },
      { threshold: 0.6, root: root.current },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [root]);

  const canReact = entry.source === "post";
  function toggleLike() {
    if (!canReact || react.isPending) return;
    const next = !liked;
    setLiked(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    react.mutate(
      { spotlightId: entry.id, reaction: next ? "like" : null },
      {
        onError: () => {
          setLiked(!next);
          setCount((c) => Math.max(0, c + (next ? -1 : 1)));
          toast.error(tx("Could not save your like", "Impossible d’enregistrer votre j’aime"));
        },
      },
    );
  }

  const action = vendorAction(entry.provider.category);
  const actionLabel =
    action === "order" ? tx("Order", "Commander") : action === "book" ? tx("Book", "Réserver") : tx("Buy", "Acheter");
  const ActionIcon = action === "order" ? UtensilsCrossed : action === "book" ? CalendarCheck : ShoppingBag;

  const rawId = entry.id.replace(/^post:/, "");
  const shareUrl =
    entry.source === "post"
      ? shareLink("spotlight", rawId)
      : entry.provider.slug
        ? shareLink("store", entry.provider.slug)
        : shareLink("spotlight", rawId);

  return (
    <section
      ref={sectionRef}
      className="relative flex h-full snap-start items-center justify-center lg:py-4"
    >
      <div className="relative h-full w-full overflow-hidden lg:aspect-[9/16] lg:w-auto lg:rounded-xl">
        {entry.media_type === "video" ? (
          <SpotlightVideo videoRef={videoRef} src={entry.url} />
        ) : (
          <img src={entry.url} alt={entry.caption ?? entry.provider.business_name} className="size-full object-cover" />
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-media-backdrop/90 to-transparent" />
        <div className={cn("absolute left-4 right-20 space-y-2 lg:right-4", entry.media_type === "video" ? "bottom-10" : "bottom-4")}>
          <p className="flex items-center gap-2 text-sm font-bold">
            <Avatar path={entry.provider.avatar_url} name={entry.provider.business_name} className="size-9 ring-2 ring-on-dark/70" />
            <span className="truncate">{entry.provider.business_name}</span>
            <VerifiedBadge tier={entry.provider.verified_tier} until={entry.provider.verified_until} size={14} />
          </p>
          {entry.caption ? <p className="line-clamp-3 text-sm opacity-90">{entry.caption}</p> : null}
        </div>
      </div>

      <div className="absolute bottom-4 right-3 flex flex-col items-center gap-4 lg:static lg:ml-4 lg:self-end lg:pb-4">
        <RailButton label={tx("Like", "J'aime")} onClick={toggleLike} disabled={!canReact} count={count}>
          <Heart className={cn("size-7", liked && "fill-current text-destructive")} />
        </RailButton>
        <RailButton
          label={tx("Comment", "Commenter")}
          onClick={onComments}
          count={canReact ? (entry.comment_count ?? 0) : undefined}
        >
          <MessageCircle className="size-7" />
        </RailButton>
        <RailButton label={tx("Share", "Partager")} onClick={() => setShareOpen(true)}>
          <Share2 className="size-7" />
        </RailButton>
        {entry.provider.id ? (
          <button
            type="button"
            aria-label={actionLabel}
            title={actionLabel}
            onClick={() =>
              void navigate({ to: "/services/$providerId", params: { providerId: entry.provider.id } })
            }
            className="flex flex-col items-center gap-0.5 transition-transform active:scale-90"
          >
            <span className="grid size-12 place-items-center rounded-full bg-gradient-to-br from-gold to-primary text-gold-foreground shadow-lg ring-2 ring-on-dark/50">
              <ActionIcon className="size-6" aria-hidden />
            </span>
            <span className="text-xs font-bold drop-shadow">{actionLabel}</span>
          </button>
        ) : null}
      </div>

      <ShareSheet
        open={shareOpen}
        onOpenChange={setShareOpen}
        url={shareUrl}
        title={`${entry.provider.business_name}${entry.caption ? ` — ${entry.caption}` : ""}`.slice(0, 120)}
        targetType="spotlight"
        targetId={rawId}
      />
    </section>
  );
}

function RailButton({
  label,
  onClick,
  disabled,
  count,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  count?: number | undefined;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-0.5 drop-shadow transition-transform active:scale-90 disabled:opacity-60"
    >
      {children}
      {typeof count === "number" ? <span className="text-xs font-semibold">{count}</span> : null}
    </button>
  );
}

function fmt(t: number) {
  if (!Number.isFinite(t)) return "0:00";
  const m = Math.floor(t / 60);
  const sec = Math.floor(t % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/** Tap to pause/play, double-tap sides to skip 10s, drag the bar to seek. */
function SpotlightVideo({
  videoRef,
  src,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  src: string;
}) {
  const { tx } = useI18n();
  const [paused, setPaused] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(true);
  const [flash, setFlash] = useState<string | null>(null);
  const lastTap = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const skip = (delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.min(Math.max(0, v.currentTime + delta), v.duration || v.currentTime + delta);
    setFlash(delta > 0 ? "+10s" : "-10s");
    setTimeout(() => setFlash(null), 600);
  };
  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => undefined);
    else v.pause();
  };

  return (
    <div className="relative size-full">
      <video
        ref={videoRef}
        src={src}
        loop
        muted={muted}
        playsInline
        className="size-full object-cover"
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />
      <button
        type="button"
        aria-label={paused ? tx("Play", "Lecture") : tx("Pause", "Pause")}
        className="absolute inset-0 z-[1]"
        onClick={(e) => {
          const now = Date.now();
          const rect = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - rect.left;
          if (now - lastTap.current < 280) {
            if (tapTimer.current) clearTimeout(tapTimer.current);
            lastTap.current = 0;
            if (x < rect.width / 3) skip(-10);
            else if (x > (rect.width * 2) / 3) skip(10);
            else toggle();
            return;
          }
          lastTap.current = now;
          tapTimer.current = setTimeout(toggle, 280);
        }}
      />
      {paused ? (
        <span className="pointer-events-none absolute left-1/2 top-1/2 z-[2] grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-media-backdrop/50">
          <Play className="size-8 fill-current" />
        </span>
      ) : null}
      {flash ? (
        <span className="pointer-events-none absolute left-1/2 top-1/3 z-[2] -translate-x-1/2 rounded-full bg-media-backdrop/60 px-3 py-1 text-sm font-bold">
          {flash}
        </span>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 z-[3] flex items-center gap-2 px-3 pb-1">
        <button type="button" onClick={() => skip(-10)} aria-label={tx("Back 10 seconds", "Reculer de 10 s")} className="p-1">
          <RotateCcw className="size-4" />
        </button>
        <button type="button" onClick={toggle} aria-label={paused ? tx("Play", "Lecture") : tx("Pause", "Pause")} className="p-1">
          {paused ? <Play className="size-4 fill-current" /> : <Pause className="size-4 fill-current" />}
        </button>
        <button type="button" onClick={() => skip(10)} aria-label={tx("Forward 10 seconds", "Avancer de 10 s")} className="p-1">
          <RotateCw className="size-4" />
        </button>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={time}
          aria-label={tx("Seek", "Position")}
          onChange={(e) => {
            const v = videoRef.current;
            if (v) v.currentTime = Number(e.target.value);
          }}
          className="h-1 min-w-0 flex-1 cursor-pointer accent-primary"
        />
        <span className="text-[10px] tabular-nums opacity-90">
          {fmt(time)} / {fmt(duration)}
        </span>
        <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? tx("Unmute", "Activer le son") : tx("Mute", "Couper le son")} className="p-1">
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
      </div>
    </div>
  );
}
