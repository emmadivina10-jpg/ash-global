import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { BadgeCheck, Flame, MessageCircle, Store } from "lucide-react";
import { Avatar } from "@/components/refer/AvatarUpload";
import { Button } from "@/components/ui/button";
import { useFriendships } from "@/lib/social.queries";
import { useOnlineFriendIds, type LiveConnectVendor } from "@/lib/live-connect.queries";
import { useRegion } from "@/lib/region-context";
import { trackEvent, useImpression } from "@/lib/activity";
import { categoryLabel } from "@/lib/taxonomy";
import { useI18n } from "@/lib/i18n";
import { openMemberConversation } from "@/lib/contact-vendor";
import { openConversation } from "@/lib/marketplace.queries";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { playNotificationSound } from "@/lib/sound";
import { useAvailableVendors } from "@/lib/available-vendors.queries";
import { useUser } from "@/lib/queries";
import { PresenceBadge } from "@/components/refer/PresenceBadge";
import { useMemberStates } from "@/lib/social.queries";

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
  const services = Array.isArray(vendor.services)
    ? (vendor.services as { id: string; title: string; price: number }[])
    : [];

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

  return (
    <article
      ref={impression}
      className={cn(
        "live-connect-card w-[min(72vw,16rem)] shrink-0 rounded-2xl border border-border bg-card p-3 shadow-sm",
        !online && "opacity-90",
      )}
      data-vendor-id={vendor.provider_id}
    >
      <div className="flex items-start gap-3">
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
          <span className={cn(online && "live-connect-avatar")}>
            <Avatar path={vendor.avatar_url} name={vendor.business_name} className="size-14" />
          </span>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <h3 className="truncate text-sm font-bold text-foreground">{vendor.business_name}</h3>
            {vendor.is_verified ? (
              <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Verified" />
            ) : null}
          </div>
          <PresenceBadge online={online} className="mt-1" />
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
        {vendor.bio || vendor.city}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {vendor.categories.slice(0, 2).map((category) => (
          <span
            key={category}
            className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary"
          >
            {categoryLabel(category, lang)}
          </span>
        ))}
        {vendor.city ? (
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
            {vendor.city}
          </span>
        ) : null}
      </div>
      {services.length ? (
        <p className="mt-2 truncate text-xs text-muted-foreground">
          {services
            .slice(0, 2)
            .map((service) => service.title)
            .join(" · ")}
        </p>
      ) : null}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button type="button" size="sm" className="rounded-full" onClick={() => void message()}>
          <MessageCircle className="size-4" aria-hidden />
          {tx("Message", "Écrire")}
        </Button>
        <Button asChild type="button" size="sm" variant="outline" className="rounded-full">
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
            <Store className="size-4" aria-hidden />
            {tx("View shop", "Voir la boutique")}
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
  const { user } = useUser();
  const { data: friendships } = useFriendships();
  const friendIds = useMemo(
    () => (friendships?.friends ?? []).map((friend) => friend.other.id),
    [friendships?.friends],
  );
  const { data: onlineFriendIds } = useOnlineFriendIds(friendIds);
  const vendorsQuery = useAvailableVendors(seesEverything ? null : country, user?.id);
  const vendors = (vendorsQuery.data ?? []).filter((vendor) => vendor.business_name?.trim());
  const vendorUserIds = new Set(vendors.map((vendor) => vendor.user_id));
  const friends = (friendships?.friends ?? []).filter(
    (friend) => onlineFriendIds?.has(friend.other.id) && !vendorUserIds.has(friend.other.id),
  );
  const { data: vendorProfiles } = useMemberStates(vendors.map((vendor) => vendor.user_id));
  const { data: onlineVendorIds } = useOnlineFriendIds(vendors.map((vendor) => vendor.user_id));
  // Soft notification when a vendor newly comes online (never on first load).
  const seenOnline = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!vendorsQuery.isSuccess || !onlineVendorIds) return;
    const ids = new Set(vendors.filter((v) => onlineVendorIds.has(v.user_id)).map((v) => v.id));
    const previous = seenOnline.current;
    seenOnline.current = ids;
    if (previous && [...ids].some((id) => !previous.has(id))) playNotificationSound();
  }, [vendors, onlineVendorIds, vendorsQuery.isSuccess]);
  const [interacting, setInteracting] = useState(false);

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

  return (
    <section
      aria-label={tx("Friends and vendors", "Amis et vendeurs")}
      className="live-connect-section bg-background px-4 pb-0 pt-0"
      onPointerEnter={() => setInteracting(true)}
      onPointerLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setInteracting(false);
      }}
    >
      <div>
        <h3 className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {tx("Business Chat", "Discussion entreprise")}
          {vendorsQuery.isSuccess ? (
            <span
              className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-semibold text-primary"
              data-vendor-count={vendors.length}
            >
              {vendors.length + friends.length}
            </span>
          ) : null}
        </h3>
        <div>
          {vendors.length || friends.length ? (
            <div className="flex gap-2 overflow-x-auto px-1 pb-1 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {friends.map((friend) => (
                <button
                  key={`friend:${friend.other.id}`}
                  type="button"
                  onClick={() => void startFriendChat(friend.other.id)}
                  aria-label={tx(
                    `Message ${friend.other.name}, online`,
                    `Écrire à ${friend.other.name}, en ligne`,
                  )}
                  className={cn(
                    "live-connect-card-enter flex w-20 shrink-0 flex-col items-center gap-1.5 rounded-lg p-1 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    interacting && "is-interacting",
                  )}
                >
                  <span className="vendor-presence-avatar is-online relative block size-14 shrink-0 rounded-full p-[2px]">
                    <Avatar
                      path={friend.other.avatar_url}
                      name={friend.other.name}
                      className="size-full rounded-full"
                    />
                    <span
                      className="vendor-flame absolute -bottom-0.5 -right-0.5 z-10 grid size-5 place-items-center rounded-full"
                      aria-hidden
                    >
                      <Flame className="size-3.5" fill="currentColor" />
                    </span>
                  </span>
                  <span className="w-full truncate text-[11px] font-semibold text-foreground">
                    {friend.other.name}
                  </span>
                </button>
              ))}
              {vendors.map((vendor) => (
                <Link
                  key={vendor.id}
                  to="/services/$providerId"
                  params={{ providerId: vendor.id }}
                  aria-label={tx(`View ${vendor.business_name}`, `Voir ${vendor.business_name}`)}
                  data-vendor-id={vendor.id}
                  className={cn(
                    "live-connect-card-enter flex w-20 shrink-0 flex-col items-center gap-1.5 rounded-lg p-1 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    interacting && "is-interacting",
                  )}
                >
                  <span
                    className={cn(
                      "vendor-presence-avatar relative block size-14 shrink-0 rounded-full p-[2px]",
                      (onlineVendorIds?.has(vendor.user_id) ||
                        onlineFriendIds?.has(vendor.user_id)) &&
                        "is-online",
                    )}
                  >
                    <Avatar
                      path={vendor.avatar_url}
                      fallbackPath={vendorProfiles?.get(vendor.user_id)?.avatar_url}
                      name={vendor.business_name}
                      className="size-full rounded-full"
                    />
                    <span
                      className="vendor-flame absolute -bottom-0.5 -right-0.5 z-10 grid size-5 place-items-center rounded-full"
                      aria-label={tx("Provider", "Prestataire")}
                      role="img"
                    >
                      <Flame className="size-3.5" fill="currentColor" aria-hidden />
                    </span>
                  </span>
                  <span className="w-full truncate text-[11px] font-semibold text-foreground">
                    {vendor.business_name}
                  </span>
                </Link>
              ))}
            </div>
          ) : vendorsQuery.isLoading ? (
            <div className="flex items-center gap-3 py-2" aria-busy="true">
              {[0, 1, 2, 3, 4].map((item) => (
                <div key={item} className="size-12 shrink-0 animate-pulse rounded-full bg-muted" />
              ))}
            </div>
          ) : vendorsQuery.isError ? (
            <div className="flex items-center gap-2 py-2" role="alert">
              <p className="text-sm text-muted-foreground">
                {tx("Could not load vendors.", "Impossible de charger les vendeurs.")}
              </p>
              <Button variant="ghost" size="sm" onClick={() => void vendorsQuery.refetch()}>
                {tx("Retry", "Réessayer")}
              </Button>
            </div>
          ) : (
            <p className="py-3 text-sm text-muted-foreground">
              {tx(
                "Discover vendors and services on ASH.",
                "Découvrez les vendeurs et services sur ASH.",
              )}
            </p>
          )}
          {friends.length > 0 && vendorsQuery.isError ? (
            <div className="flex items-center gap-2 py-2" role="alert">
              <p className="text-sm text-muted-foreground">
                {tx("Could not load vendors.", "Impossible de charger les vendeurs.")}
              </p>
              <Button variant="ghost" size="sm" onClick={() => void vendorsQuery.refetch()}>
                {tx("Retry", "Réessayer")}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
