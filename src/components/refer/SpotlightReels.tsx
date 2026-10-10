import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BadgeCheck, Loader2, MessageCircle, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "./AvatarUpload";
import { Button } from "@/components/ui/button";
import { contactVendor, openMemberConversation, sendOpeningMessage } from "@/lib/contact-vendor";
import { useDeleteSpotlight, useSetSpotlightReaction, type SpotlightEntry } from "@/lib/spotlight.queries";
import { useI18n } from "@/lib/i18n";
import { trackEvent } from "@/lib/activity";
import { ReactionButton } from "./ReactionButton";
import { VerifiedBadge } from "./VerifiedBadge";
import { SafetyMenu } from "./SafetyMenu";
import { ExpandableSocialText } from "./ExpandableSocialText";

/**
 * Full-screen, reels-style Spotlight browser: one highlight per screen,
 * vertical snap scrolling, with a "Contact vendor" action under each one that
 * opens the vendor's chat with a ready-written availability enquiry.
 */
export function SpotlightReels({
  entries,
  startIndex = 0,
  currentUserId,
  onClose,
}: {
  entries: SpotlightEntry[];
  startIndex?: number;
  currentUserId: string | null;
  onClose: () => void;
}) {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const navigate = useNavigate();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const remove = useDeleteSpotlight();
  const react = useSetSpotlightReaction();

  useEffect(() => {
    const node = scrollerRef.current;
    const target = node?.children[startIndex] as HTMLElement | undefined;
    if (target) target.scrollIntoView({ block: "start" });
  }, [startIndex]);

  // One spotlight_view per highlight that actually reaches the screen, and only
  // the highlight on screen is allowed to keep playing.
  useEffect(() => {
    const node = scrollerRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const seen = new Set<string>();
    const observer = new IntersectionObserver(
      (items) => {
        for (const item of items) {
          const element = item.target as HTMLElement;
          const video = element.querySelector("video");

          if (!item.isIntersecting) {
            if (video) {
              video.pause();
              video.currentTime = 0;
            }
            continue;
          }

          if (video) void video.play().catch(() => undefined);

          const id = element.dataset["spotlightId"];
          if (!id || seen.has(id)) continue;
          seen.add(id);
          trackEvent({
            event_type: "spotlight_view",
            surface: "spotlight",
            target_type: "spotlight",
            target_id: id.replace("post:", ""),
            author_id: element.dataset["authorId"] || null,
          });
        }
      },
      { threshold: 0.6 },
    );
    for (const child of Array.from(node.children)) observer.observe(child);
    return () => {
      observer.disconnect();
      for (const video of Array.from(node.querySelectorAll("video"))) video.pause();
    };
  }, [entries]);


  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.dataset["mediaViewerOpen"] = "true";
    return () => {
      document.body.style.overflow = previous;
      delete document.documentElement.dataset["mediaViewerOpen"];
    };
  }, []);

  async function contact(entry: SpotlightEntry) {
    setBusy(entry.id);
    try {
      const item = entry.caption?.trim() || entry.provider.business_name;
      const name = entry.provider.business_name;
      const message = fr
        ? `Bonjour ${name} ! J’ai vu « ${item} » dans votre Spotlight sur ASH. Est-ce toujours disponible ? Quel est le prix et comment puis-je l’obtenir ?`
        : `Hi ${name}! I saw "${item}" in your Spotlight on ASH. Is it still available? What's the price and how can I get it?`;

      let conversationId: string | null = null;
      if (entry.provider.id) {
        conversationId = await contactVendor({
          providerId: entry.provider.id,
          businessName: name,
          subject: item,
          fr,
          source: "spotlight_reels",
          message,
        });
      } else if (entry.author_id) {
        conversationId = await openMemberConversation(entry.author_id);
        if (conversationId) await sendOpeningMessage(conversationId, message);
      }

      if (!conversationId) {
        toast.error(tx("Chat is not available for this post.", "Discussion indisponible."));
        return;
      }
      onClose();
      void navigate({ to: "/messages", search: { c: conversationId } });
    } catch {
      toast.error(tx("Could not open the chat.", "Impossible d’ouvrir la discussion."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] h-[100dvh] w-screen bg-black">
      <button
        type="button"
        onClick={onClose}
        aria-label={tx("Close", "Fermer")}
        className="absolute right-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-20 grid size-10 place-items-center rounded-full bg-black/55 text-white backdrop-blur"
      >
        <X className="size-5" aria-hidden />
      </button>

      <div
        ref={scrollerRef}
        className="h-full snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {entries.map((entry) => {
          const mine = entry.source === "post" && Boolean(currentUserId && entry.author_id === currentUserId);
          return (
          <section
            key={entry.id}
            data-spotlight-id={entry.id}
            data-author-id={entry.author_id ?? ""}
            className="relative h-full w-full snap-start snap-always"
          >
            {entry.media_type === "video" ? (
              <video
                src={entry.url}
                controls
                playsInline
                loop
                className="size-full bg-black object-contain"
              />
            ) : (
              <img src={entry.url} alt="" className="size-full bg-black object-contain" />
            )}

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black via-black/70 to-transparent" />

            <div className="absolute inset-x-0 bottom-0 space-y-3 px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white backdrop-blur">
                <Sparkles className="size-3" aria-hidden />
                Spotlight
              </span>

              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar
                    path={entry.provider.avatar_url}
                    name={entry.provider.business_name}
                    online={entry.provider.online}
                    className="size-10 shrink-0 ring-2 ring-white/70"
                  />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 text-sm font-bold text-white">
                      <span className="truncate">{entry.provider.business_name}</span>
                      {entry.provider.is_verified ? <BadgeCheck className="size-4 shrink-0 text-primary" aria-hidden /> : <VerifiedBadge tier={entry.provider.verified_tier} until={entry.provider.verified_until} size={15}/>} 
                    </p>
                    {entry.provider.city ? (
                      <p className="truncate text-[11px] text-white/70">{entry.provider.city}</p>
                    ) : null}
                  </div>
                </div>
                {!mine && currentUserId ? (
                  <SafetyMenu
                    targetType={entry.source === "post" ? "SPOTLIGHT" : "PORTFOLIO"}
                    targetId={entry.id.replace(/^(post|portfolio):/, "")}
                    targetUserId={entry.author_id}
                    targetName={entry.provider.business_name}
                    triggerClassName="size-10 bg-white/15 text-white hover:bg-white/25 hover:text-white"
                  />
                ) : null}
                {mine ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={remove.isPending}
                    aria-label={tx("Delete Spotlight", "Supprimer le Spotlight")}
                    className="shrink-0 rounded-full bg-white/15 text-white hover:bg-white/25 hover:text-white"
                    onClick={() => {
                      if (!window.confirm(tx("Delete this Spotlight?", "Supprimer ce Spotlight ?"))) return;
                      remove.mutate(entry, {
                        onSuccess: () => {
                          toast.success(tx("Spotlight deleted", "Spotlight supprimé"));
                          onClose();
                        },
                        onError: (error) =>
                          toast.error(error instanceof Error ? error.message : tx("Could not delete Spotlight.", "Suppression impossible.")),
                      });
                    }}
                  >
                    {remove.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Trash2 aria-hidden />}
                  </Button>
                ) : null}
              </div>

              {entry.caption ? (
                <ExpandableSocialText
                  text={entry.caption}
                  className="whitespace-pre-wrap break-words text-sm leading-relaxed text-white/90"
                  buttonClassName="text-white/80 hover:text-white"
                />
              ) : null}

              {entry.source === "post" ? <div className="w-fit rounded-full bg-background/85 backdrop-blur"><ReactionButton value={entry.current_reaction} total={entry.reaction_count} breakdown={entry.reaction_breakdown} disabled={!currentUserId || react.isPending} onChange={(reaction) => react.mutate({ spotlightId: entry.id.replace("post:", ""), reaction })} /></div> : null}

              <Button
                onClick={() => void contact(entry)}
                disabled={busy === entry.id}
                size="lg"
                className="h-12 w-full rounded-2xl text-base font-bold shadow-[var(--shadow-brand)]"
              >
                {busy === entry.id ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <MessageCircle className="size-4" aria-hidden />
                )}
                {tx("Contact vendor", "Contacter le vendeur")}
              </Button>
            </div>
          </section>
          );
        })}
      </div>
    </div>
  );
}
