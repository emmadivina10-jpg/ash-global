import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronUp,
  Heart,
  Loader2,
  MessageCircle,
  PanelRight,
  Send,
  Share2,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  useAddSpotlightComment,
  useDeleteSpotlightComment,
  useSetSpotlightReaction,
  useSpotlightComments,
  useSpotlightFeed,
  type SpotlightEntry,
} from "@/lib/spotlight.queries";
import { contactVendor, openMemberConversation } from "@/lib/contact-vendor";
import { useUser } from "@/lib/queries";
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

function CommentsPanel({ entry }: { entry: SpotlightEntry }) {
  const { tx, lang } = useI18n();
  const { user } = useUser();
  const canComment = entry.source === "post";
  const { data: comments, isLoading } = useSpotlightComments(canComment ? entry.id : null);
  const add = useAddSpotlightComment(entry.id);
  const del = useDeleteSpotlightComment(entry.id);
  const [text, setText] = useState("");

  function submit() {
    const body = text.trim();
    if (!body || add.isPending) return;
    add.mutate(body, {
      onSuccess: () => setText(""),
      onError: () => toast.error(tx("Could not post comment", "Commentaire impossible")),
    });
  }

  if (!canComment)
    return (
      <p className="p-4 text-sm text-muted-foreground">
        {tx("Comments are off for shop photos.", "Les commentaires sont désactivés pour les photos de boutique.")}
      </p>
    );

  return (
    <>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {isLoading ? (
          <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
        ) : !comments?.length ? (
          <p className="text-center text-sm text-muted-foreground">
            {tx("No comments yet. Be the first.", "Aucun commentaire. Soyez le premier.")}
          </p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <Avatar path={c.author?.avatar_url} name={c.author?.full_name} className="size-8 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="rounded-2xl bg-muted px-3 py-2">
                  <p className="text-xs font-bold">{c.author?.full_name ?? "Member"}</p>
                  <p className="whitespace-pre-line break-words text-sm">{c.body}</p>
                </div>
                <p className="mt-0.5 flex gap-3 px-2 text-[11px] text-muted-foreground">
                  {timeAgo(c.created_at, lang === "fr")}
                  {c.author_id === user?.id ? (
                    <button type="button" onClick={() => del.mutate(c.id)} className="inline-flex items-center gap-1 hover:text-destructive">
                      <Trash2 className="size-3" />
                      {tx("Delete", "Supprimer")}
                    </button>
                  ) : null}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
      <form
        className="flex shrink-0 items-center gap-2 border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Input
          value={text}
          maxLength={1000}
          onChange={(e) => setText(e.target.value)}
          placeholder={tx("Write a comment…", "Écrire un commentaire…")}
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
  const { tx, lang } = useI18n();
  const navigate = useNavigate();
  const react = useSetSpotlightReaction();
  const [liked, setLiked] = useState(Boolean(entry.current_reaction));
  const [count, setCount] = useState(entry.reaction_count);
  const [shareOpen, setShareOpen] = useState(false);
  const [busy, setBusy] = useState(false);
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

  async function contact() {
    if (busy) return;
    setBusy(true);
    try {
      const id = entry.author_id
        ? await openMemberConversation(entry.author_id)
        : await contactVendor({
            providerId: entry.provider.id,
            businessName: entry.provider.business_name,
            subject: entry.caption ?? "Spotlight",
            fr: lang === "fr",
            source: "spotlight_contact",
          });
      if (id) void navigate({ to: "/messages", search: { c: id } } as never);
      else toast.message(tx("This is your own Spotlight.", "C'est votre propre Spotlight."));
    } catch {
      toast.error(tx("Could not open the chat.", "Impossible d'ouvrir la discussion."));
    } finally {
      setBusy(false);
    }
  }

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
          <video ref={videoRef} src={entry.url} loop muted playsInline className="size-full object-cover" />
        ) : (
          <img src={entry.url} alt={entry.caption ?? entry.provider.business_name} className="size-full object-cover" />
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-media-backdrop/90 to-transparent" />
        <div className="absolute bottom-4 left-4 right-20 space-y-2 lg:right-4">
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
        <button
          type="button"
          aria-label={tx("Contact vendor", "Contacter le vendeur")}
          title={tx("Contact vendor", "Contacter le vendeur")}
          onClick={() => void contact()}
          className="relative grid size-12 place-items-center rounded-2xl bg-gold text-gold-foreground shadow-lg ring-2 ring-on-dark/40 transition-transform active:scale-90"
        >
          <Store className="size-6" aria-hidden />
          <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground ring-2 ring-media-backdrop">
            <MessageCircle className="size-3" aria-hidden />
          </span>
        </button>
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
