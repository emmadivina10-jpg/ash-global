import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Heart, Loader2, MessageCircle, Share2, Store } from "lucide-react";
import { toast } from "sonner";
import { useSetSpotlightReaction, useSpotlightFeed, type SpotlightEntry } from "@/lib/spotlight.queries";
import { contactVendor, openMemberConversation } from "@/lib/contact-vendor";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/refer/AvatarUpload";
import { VerifiedBadge } from "@/components/refer/VerifiedBadge";
import { ShareSheet, shareLink } from "@/components/refer/ShareSheet";

type Search = { open?: string };

export const Route = createFileRoute("/_authenticated/spotlight")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    open: typeof s.open === "string" ? s.open : undefined,
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

function SpotlightPage() {
  const { tx } = useI18n();
  const { open } = Route.useSearch();
  const { data, isLoading } = useSpotlightFeed(40);
  const items = useMemo(() => {
    const list = (data ?? []).filter((e) => Boolean(e.url));
    if (!open) return list;
    const first = list.find((e) => e.id === open);
    return first ? [first, ...list.filter((e) => e.id !== open)] : list;
  }, [data, open]);

  if (isLoading)
    return (
      <div className="grid h-[60dvh] place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );

  return (
    <div className="-mx-4 -mt-5 sm:mx-auto sm:max-w-md">
      <h1 className="sr-only">Spotlight</h1>
      {items.length === 0 ? (
        <p className="p-8 text-center text-sm text-muted-foreground">
          {tx("No Spotlights yet.", "Aucun Spotlight pour le moment.")}
        </p>
      ) : (
        <div className="h-[calc(100dvh-7rem)] snap-y snap-mandatory overflow-y-auto overscroll-contain">
          {items.map((entry) => (
            <SpotlightSlide key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

function SpotlightSlide({ entry }: { entry: SpotlightEntry }) {
  const { tx, lang } = useI18n();
  const navigate = useNavigate();
  const react = useSetSpotlightReaction();
  const [liked, setLiked] = useState(Boolean(entry.current_reaction));
  const [count, setCount] = useState(entry.reaction_count);
  const [shareOpen, setShareOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([e]) => (e?.isIntersecting ? void video.play().catch(() => undefined) : video.pause()),
      { threshold: 0.7 },
    );
    io.observe(video);
    return () => io.disconnect();
  }, []);

  const canReact = entry.source === "post";
  function toggleLike() {
    if (!canReact) return;
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    react.mutate(
      { spotlightId: entry.id, reaction: next ? "like" : null },
      {
        onError: () => {
          setLiked(!next);
          setCount((c) => c + (next ? -1 : 1));
        },
      },
    );
  }

  async function openChat(source: string) {
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
            source,
          });
      if (id) void navigate({ to: "/messages", search: { c: id } } as never);
      else toast.message(tx("This is your own Spotlight.", "C'est votre propre Spotlight."));
    } catch {
      toast.error(tx("Could not open the chat.", "Impossible d'ouvrir la discussion."));
    } finally {
      setBusy(false);
    }
  }

  const shareUrl =
    entry.source === "post"
      ? shareLink("spotlight", entry.id)
      : entry.provider.slug
        ? shareLink("store", entry.provider.slug)
        : shareLink("spotlight", entry.id);

  return (
    <section className="relative h-[calc(100dvh-7rem)] snap-start overflow-hidden bg-media-backdrop">
      {entry.media_type === "video" ? (
        <video ref={videoRef} src={entry.url} loop muted playsInline className="size-full object-cover" />
      ) : (
        <img src={entry.url} alt={entry.caption ?? entry.provider.business_name} className="size-full object-cover" />
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-media-backdrop/90 to-transparent" />

      <div className="absolute bottom-6 left-4 right-20 space-y-2 text-on-dark">
        <p className="flex items-center gap-2 text-sm font-bold">
          <Avatar path={entry.provider.avatar_url} name={entry.provider.business_name} className="size-9" />
          <span className="truncate">{entry.provider.business_name}</span>
          <VerifiedBadge tier={entry.provider.verified_tier} until={entry.provider.verified_until} size={14} />
        </p>
        {entry.caption ? <p className="line-clamp-3 text-sm opacity-90">{entry.caption}</p> : null}
      </div>

      <div className="absolute bottom-6 right-3 flex flex-col items-center gap-4 text-on-dark">
        <RailButton label={tx("Like", "J'aime")} onClick={toggleLike} disabled={!canReact} count={count}>
          <Heart className={cn("size-7", liked && "fill-current text-destructive")} />
        </RailButton>
        <RailButton label={tx("Comment", "Commenter")} onClick={() => void openChat("spotlight_comment")}>
          <MessageCircle className="size-7" />
        </RailButton>
        <RailButton label={tx("Share", "Partager")} onClick={() => setShareOpen(true)}>
          <Share2 className="size-7" />
        </RailButton>
        <button
          type="button"
          aria-label={tx("Contact vendor", "Contacter le vendeur")}
          title={tx("Contact vendor", "Contacter le vendeur")}
          onClick={() => void openChat("spotlight_contact")}
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
        targetId={entry.id}
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
  count?: number;
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
