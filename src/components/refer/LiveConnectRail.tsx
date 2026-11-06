import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { BadgeCheck, MessageCircle, Store } from "lucide-react";
import { Avatar } from "@/components/refer/AvatarUpload";
import { Button } from "@/components/ui/button";
import { useFriendships } from "@/lib/social.queries";
import {
  useOnlineFriendIds,
  type LiveConnectVendor,
} from "@/lib/live-connect.queries";
import { useRegion } from "@/lib/region-context";
import { trackEvent, useImpression } from "@/lib/activity";
import { categoryLabel } from "@/lib/taxonomy";
import { useI18n } from "@/lib/i18n";
import { openMemberConversation } from "@/lib/contact-vendor";
import { openConversation } from "@/lib/marketplace.queries";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAvailableVendors } from "@/lib/available-vendors.queries";
import { useUser } from "@/lib/queries";

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
        "live-connect-card w-[min(82vw,19rem)] shrink-0 rounded-3xl border border-border bg-card p-4 shadow-sm",
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
          <p
            className={cn(
              "mt-1 flex items-center gap-1.5 text-xs font-semibold",
              online ? "text-primary" : "text-muted-foreground",
            )}
          >
            {online ? <span className="live-connect-dot" aria-hidden /> : null}
            {online ? tx("Available now", "Disponible") : tx("Offline", "Hors ligne")}
          </p>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 min-h-9 text-xs leading-5 text-muted-foreground">
        {vendor.bio || vendor.city || tx("ASH business", "Entreprise ASH")}
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
  const friends = (friendships?.friends ?? []).filter((friend) =>
    onlineFriendIds?.has(friend.other.id),
  );
  const vendorsQuery = useAvailableVendors(seesEverything ? null : country, user?.id);
  const vendors = vendorsQuery.data ?? [];
  const { data: onlineVendorIds } = useOnlineFriendIds(vendors.map((vendor) => vendor.user_id));
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
      className="live-connect-section bg-background px-4 pt-2 pb-1"
      onPointerEnter={() => setInteracting(true)}
      onPointerLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setInteracting(false);
      }}
    >
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
        <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          {tx("Available vendors", "Vendeurs disponibles")}
          {vendorsQuery.isSuccess ? (
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-semibold text-primary" data-vendor-count={vendors.length}>
              {vendors.length}
            </span>
          ) : null}
        </h3>
        <div className="min-h-[5rem]">
          {vendors.length ? (
            <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {vendors.map((vendor) => (
                <Link
                  key={vendor.id}
                  to="/services/$providerId"
                  params={{ providerId: vendor.id }}
                  aria-label={tx(`View ${vendor.business_name}`, `Voir ${vendor.business_name}`)}
                  data-vendor-id={vendor.id}
                  className={cn("live-connect-card-enter flex w-20 shrink-0 flex-col items-center gap-1.5 rounded-lg p-1 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", interacting && "is-interacting")}
                >
                  <span className="relative block size-14 shrink-0">
                    <Avatar path={vendor.avatar_url} name={vendor.business_name} className="size-14 rounded-full" />
                    {onlineVendorIds?.has(vendor.user_id) ? <span className="absolute -right-0.5 bottom-0 size-3 rounded-full border-2 border-background bg-primary" aria-label={tx("Online", "En ligne")} /> : null}
                  </span>
                  <span className="w-full truncate text-[11px] font-semibold text-foreground">{vendor.business_name}</span>
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
              <p className="text-sm text-muted-foreground">{tx("Could not load vendors.", "Impossible de charger les vendeurs.")}</p>
              <Button variant="ghost" size="sm" onClick={() => void vendorsQuery.refetch()}>{tx("Retry", "Réessayer")}</Button>
            </div>
          ) : (
            <p className="py-3 text-sm text-muted-foreground">
              {tx(
                "Discover vendors and services on ASH.",
                "Découvrez les vendeurs et services sur ASH.",
              )}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
