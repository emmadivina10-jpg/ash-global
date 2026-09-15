import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Banknote,
  Bell,
  CalendarCheck,
  CheckCheck,
  Heart,
  MessageSquare,
  Settings2,
  UserPlus,
} from "lucide-react";
import { Avatar } from "@/components/refer/AvatarUpload";
import { Button } from "@/components/ui/button";
import { useMarkNotificationsRead, useNotifications, type AppNotification } from "@/lib/notifications";
import { notificationLink } from "@/lib/push";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — ASH" },
      { name: "description", content: "Everything happening across your ASH world, sorted and easy to scan." },
      { property: "og:title", content: "Notifications — ASH" },
      { property: "og:description", content: "Likes, comments, friends, bookings and payouts in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotificationsPage,
});

type Bucket = "all" | "social" | "messages" | "bookings" | "money" | "system";

const GROUPS: Record<Exclude<Bucket, "all">, string[]> = {
  social: ["SOCIAL_LIKE", "SOCIAL_REPOST", "SOCIAL_COMMENT", "SOCIAL_REPLY", "FRIEND_REQUEST", "FRIEND_ACCEPTED"],
  messages: ["MESSAGE", "GROUP_ADDED"],
  bookings: ["BOOKING", "REVIEW"],
  money: ["WITHDRAWAL", "COMMISSION", "ACTIVATION"],
  system: [],
};

function bucketOf(category: string): Exclude<Bucket, "all"> {
  for (const [bucket, list] of Object.entries(GROUPS)) {
    if (list.includes(category)) return bucket as Exclude<Bucket, "all">;
  }
  return "system";
}

function iconFor(category: string) {
  const bucket = bucketOf(category);
  if (category === "FRIEND_REQUEST" || category === "FRIEND_ACCEPTED") return UserPlus;
  if (bucket === "social") return Heart;
  if (bucket === "messages") return MessageSquare;
  if (bucket === "bookings") return CalendarCheck;
  if (bucket === "money") return Banknote;
  return Bell;
}

function timeAgo(iso: string, fr: boolean) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return fr ? "à l'instant" : "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

function sectionOf(iso: string, fr: boolean) {
  const days = (Date.now() - new Date(iso).getTime()) / 86_400_000;
  if (days < 1) return fr ? "Aujourd'hui" : "Today";
  if (days < 7) return fr ? "Cette semaine" : "This week";
  return fr ? "Plus tôt" : "Earlier";
}

function NotificationsPage() {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const navigate = useNavigate();
  const { data, isLoading } = useNotifications(60);
  const markRead = useMarkNotificationsRead();
  const [bucket, setBucket] = useState<Bucket>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);

  const items = data ?? [];
  const unread = items.filter((n) => !n.read_at);

  const filtered = useMemo(
    () =>
      items.filter((n) => {
        if (unreadOnly && n.read_at) return false;
        if (bucket === "all") return true;
        return bucketOf(n.category) === bucket;
      }),
    [items, bucket, unreadOnly],
  );

  const sections = useMemo(() => {
    const map = new Map<string, AppNotification[]>();
    for (const item of filtered) {
      const key = sectionOf(item.created_at, fr);
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return Array.from(map.entries());
  }, [filtered, fr]);

  const chips: { id: Bucket; label: string }[] = [
    { id: "all", label: fr ? "Tout" : "All" },
    { id: "social", label: fr ? "Social" : "Social" },
    { id: "messages", label: fr ? "Messages" : "Messages" },
    { id: "bookings", label: fr ? "Réservations" : "Bookings" },
    { id: "money", label: fr ? "Argent" : "Money" },
    { id: "system", label: fr ? "Système" : "System" },
  ];

  function open(item: AppNotification) {
    if (!item.read_at) markRead.mutate([item.id]);
    const [path, qs] = notificationLink(item.category, item.data ?? {}).split("?");
    void navigate({
      to: path,
      search: qs ? Object.fromEntries(new URLSearchParams(qs)) : undefined,
    } as never);
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unread.length > 0
              ? fr
                ? `${unread.length} non lue(s)`
                : `${unread.length} unread`
              : fr
                ? "Vous êtes à jour."
                : "You're all caught up."}
          </p>
        </div>
        {unread.length > 0 ? (
          <Button variant="outline" size="sm" onClick={() => markRead.mutate(unread.map((n) => n.id))}>
            <CheckCheck className="size-4" aria-hidden />
            {fr ? "Tout lire" : "Mark all read"}
          </Button>
        ) : null}
      </header>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setBucket(chip.id)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-xs font-bold transition-colors",
              bucket === chip.id
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {chip.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setUnreadOnly((value) => !value)}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold transition-colors",
            unreadOnly
              ? "border-transparent bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:bg-muted",
          )}
        >
          <Settings2 className="size-3.5" aria-hidden />
          {fr ? "Non lues" : "Unread"}
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : sections.length === 0 ? (
        <div className="tile grid place-items-center gap-2 p-10 text-center">
          <Bell className="size-8 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            {fr ? "Aucune notification ici." : "Nothing here yet."}
          </p>
        </div>
      ) : (
        sections.map(([title, list]) => (
          <section key={title} className="space-y-2">
            <h2 className="px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</h2>
            <div className="tile divide-y divide-border overflow-hidden p-0">
              {list.map((item) => {
                const Icon = iconFor(item.category);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => open(item)}
                    className={cn(
                      "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
                      !item.read_at && "bg-primary/5",
                    )}
                  >
                    <span className="relative shrink-0">
                      {item.actor ? (
                        <Avatar path={item.actor.avatar_url} name={item.actor.name} className="size-11" />
                      ) : (
                        <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
                          <Icon className="size-5" aria-hidden />
                        </span>
                      )}
                      <span className="absolute -bottom-0.5 -right-0.5 grid size-5 place-items-center rounded-full border-2 border-background bg-primary text-primary-foreground">
                        <Icon className="size-2.5" aria-hidden />
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-3">
                        <span className="text-sm font-semibold text-foreground">{item.title}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {timeAgo(item.created_at, fr)}
                        </span>
                      </span>
                      {item.body ? (
                        <span className="mt-0.5 block text-xs text-muted-foreground">{item.body}</span>
                      ) : null}
                    </span>
                    {!item.read_at ? <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" /> : null}
                  </button>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
