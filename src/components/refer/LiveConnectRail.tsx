import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { BadgeCheck, MessageCircle, Store } from "lucide-react";
import { Avatar } from "@/components/refer/AvatarUpload";
import { Button } from "@/components/ui/button";
import { useFriendships } from "@/lib/social.queries";
import {
  useLiveConnectVendors,
  useOnlineFriendIds,
  type LiveConnectVendor,
} from "@/lib/live-connect.queries";
import { useRegion } from "@/lib/region-context";
import { trackEvent, useImpression } from "@/lib/activity";
import { categoryLabel } from "@/lib/taxonomy";
import { useI18n } from "@/lib/i18n";
import { PresenceBadge, isShowableVendor } from "@/components/refer/PresenceBadge";
import { playNotificationSound } from "@/lib/sound";
import { openMemberConversation } from "@/lib/contact-vendor";
import { openConversation } from "@/lib/marketplace.queries";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function LiveConnectVendorCard({
  vendor,
  online = vendor.is_online,
}: {
  vendor: LiveConnectVendor;
  online?: boolean;
}) {
  const { tx, lang } = useI18n();
  const navigate = useNavigate();
  const impression = useImpression({
    event_type: "impression",
    surface: "messages",
    target_type: "provider",
    target_id: vendor.provider_id,
  });

  const message = async () => {
    try {
      const conversationId = await openConversation(vendor.provider_id);
      if (!conversationId) throw new Error("The conversation could not be opened.");
      trackEvent({
        event_type: "click",
        surface: "messages",
        target_type: "provider",
        target_id: vendor.provider_id,
        metadata: { action: "message" },
      });
      await navigate({ to: "/messages", search: { c: conversationId } });
    } catch (error) {
      console.error("Could not start vendor conversation", error);
      toast.error(tx("Could not open this vendor chat.", "Impossible d’ouvrir cette discussion."));
    }
  };

  const description = vendor.bio?.trim() || vendor.city?.trim() || "";
  const category = vendor.categories[0];
  return (
    <article
      ref={impression}
      className={cn(
        "live-connect-card w-[min(72vw,15rem)] shrink-0 rounded-2xl border border-border bg-card p-3 shadow-sm",
        !online && "opacity-90",
      )}
      data-vendor-id={vendor.provider_id}
    >
      <div className="flex items-center gap-2.5">
        <Link
          to="/services/$providerId"
          params={{ providerId: vendor.provider_id }}
          onClick={() =>
            trackEvent({
              event_type: "provider_view",
              surface: "messages",
              target_type: "provider",
              target_id: vendor.provider_id,
            })
          }
          aria-label={tx(`View ${vendor.business_name}`, `Voir ${vendor.business_name}`)}
        >
          <Avatar path={vendor.avatar_url} name={vendor.business_name} className="size-11" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <h3 className="truncate text-sm font-bold text-foreground">{vendor.business_name}</h3>
            {vendor.is_verified ? (
              <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Verified" />
            ) : null}
          </div>
          <PresenceBadge online={online} className="mt-0.5" />
        </div>
      </div>
      {description || category ? (
        <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
          {category ? (
            <span className="font-semibold text-primary">{categoryLabel(category, lang)}</span>
          ) : null}
          {category && description ? " · " : null}
          {description}
        </p>
      ) : null}
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <Button
          type="button"
          size="sm"
          className="h-8 rounded-full text-xs"
          onClick={() => void message()}
        >
          <MessageCircle className="size-3.5" aria-hidden />
          {tx("Message", "Écrire")}
        </Button>
        <Button
          asChild
          type="button"
          size="sm"
          variant="outline"
          className="h-8 rounded-full text-xs"
        >
          <Link
            to="/services/$providerId"
            params={{ providerId: vendor.provider_id }}
            onClick={() =>
              trackEvent({
                event_type: "provider_view",
                surface: "messages",
                target_type: "provider",
                target_id: vendor.provider_id,
              })
            }
          >
            <Store className="size-3.5" aria-hidden />
            {tx("Shop", "Boutique")}
          </Link>
        </Button>
      </div>
    </article>
  );
}

export function LiveConnectRail() {
  const { tx } = useI18n();
  const navigate = useNavigate();
  const { country, seesEverything } = useRegion();
  const { data: friendships } = useFriendships();
  const friendIds = useMemo(
    () => (friendships?.friends ?? []).map((friend) => friend.other.id),
    [friendships?.friends],
  );
  const { data: onlineFriendIds } = useOnlineFriendIds(friendIds);
  const friends = (friendships?.friends ?? []).filter((friend) =>
    onlineFriendIds?.has(friend.other.id),
  );
  const vendorsQuery = useLiveConnectVendors(seesEverything ? null : country);
  const vendors = (vendorsQuery.data ?? []).filter(
    (vendor) => vendor.is_online && isShowableVendor(vendor),
  );
  // Soft notification when a vendor newly comes online (never on first load).
  const seenOnline = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (vendorsQuery.isLoading) return;
    const ids = new Set(vendors.map((vendor) => vendor.provider_id));
    const previous = seenOnline.current;
    seenOnline.current = ids;
    if (previous && [...ids].some((id) => !previous.has(id))) playNotificationSound();
  }, [vendors, vendorsQuery.isLoading]);
  const [offset, setOffset] = useState(0);
  const [interacting, setInteracting] = useState(false);

  useEffect(() => {
    if (vendors.length < 2) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && !interacting) {
        setOffset((index) => (index + 1) % vendors.length);
      }
    }, 12_000);
    return () => window.clearInterval(timer);
  }, [interacting, vendors.length]);

  const rotated = vendors.length
    ? Array.from(
        { length: vendors.length },
        (_, index) => vendors[(offset + index) % vendors.length]!,
      )
    : [];

  const startFriendChat = async (friendId: string) => {
    try {
      const conversationId = await openMemberConversation(friendId);
      if (!conversationId) throw new Error("The conversation could not be opened.");
      await navigate({ to: "/messages", search: { c: conversationId } });
    } catch (error) {
      console.error("Could not open friend conversation", error);
      toast.error(tx("Could not open this conversation.", "Impossible d’ouvrir cette discussion."));
    }
  };

  if (!friends.length && !vendors.length && !vendorsQuery.isLoading && !vendorsQuery.isError)
    return null;

  return (
    <section
      aria-label={tx("Online on ASH", "En ligne sur ASH")}
      className="live-connect-section border-b border-border bg-background px-4 pb-3 pt-2"
      onPointerEnter={() => setInteracting(true)}
      onPointerLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setInteracting(false);
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary">
            {tx("Live Connect", "Live Connect")}
          </p>
          <h2 className="mt-1 font-display text-lg font-bold text-foreground">
            {tx("Online on ASH", "En ligne sur ASH")}
          </h2>
        </div>
        <Link to="/discover" className="text-xs font-bold text-primary hover:underline">
          {tx("Discover", "Découvrir")}
        </Link>
      </div>

      {friends.length ? (
        <div className="mb-4">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {tx("Online friends", "Amis en ligne")}
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {friends.map((friend) => (
              <button
                key={friend.other.id}
                type="button"
                onClick={() => void startFriendChat(friend.other.id)}
                className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 rounded-2xl p-1 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="live-connect-avatar">
                  <Avatar
                    path={friend.other.avatar_url}
                    name={friend.other.name}
                    className="size-12"
                  />
                </span>
                <span className="w-full truncate text-[11px] font-semibold text-foreground">
                  {friend.other.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {tx("Available vendors", "Vendeurs disponibles")}
        </h3>
        {vendorsQuery.isLoading ? (
          <div className="flex gap-3" aria-busy="true">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-32 w-[min(72vw,15rem)] shrink-0 animate-pulse rounded-2xl bg-muted"
              />
            ))}
          </div>
        ) : vendorsQuery.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {tx("Available vendors could not be loaded.", "Impossible de charger les vendeurs.")}
          </p>
        ) : vendors.length ? (
          <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {rotated.slice(0, 12).map((vendor: LiveConnectVendor) => (
              <div
                key={vendor.provider_id}
                className={cn("live-connect-card-enter", interacting && "is-interacting")}
              >
                <LiveConnectVendorCard vendor={vendor} />
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl bg-muted/50 px-3 py-3 text-sm text-muted-foreground">
            {tx("No vendors are available right now.", "Aucun vendeur disponible pour le moment.")}
          </p>
        )}
      </div>
    </section>
  );
}
