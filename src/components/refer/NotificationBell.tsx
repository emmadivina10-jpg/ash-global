import { useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { notificationLink } from "@/lib/push";
import { Avatar } from "./AvatarUpload";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMarkNotificationsRead, useNotifications } from "@/lib/notifications";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export function NotificationBell() {
  const navigate = useNavigate();
  const { lang } = useI18n();
  const fr = lang === "fr";
  const { data } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"ALL" | "UNREAD">("ALL");
  const items = data ?? [];
  const unread = items.filter((n) => !n.read_at);
  const shown = tab === "UNREAD" ? unread : items;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full" aria-label="Notifications">
          <Bell className="size-5" aria-hidden />
          {unread.length > 0 ? (
            <span className="absolute right-0.5 top-0.5 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(24rem,calc(100vw-2rem))] rounded-3xl p-0 shadow-[var(--shadow-card)] lg:w-[26rem]"
      >
        <div className="space-y-3 border-b border-border px-4 pb-3 pt-4">
          <div className="flex items-center justify-between">
            <p className="font-display text-lg font-extrabold text-foreground">Notifications</p>
            {unread.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markRead.mutate(unread.map((n) => n.id))}
                disabled={markRead.isPending}
              >
                <CheckCheck className="size-4" aria-hidden />
                {fr ? "Tout lire" : "Mark all read"}
              </Button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {([
              { id: "ALL" as const, en: "All", fr: "Toutes" },
              { id: "UNREAD" as const, en: "Unread", fr: "Non lues" },
            ]).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setTab(option.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-bold transition-colors",
                  tab === option.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary",
                )}
              >
                {fr ? option.fr : option.en}
              </button>
            ))}
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="ml-auto text-sm font-semibold text-primary hover:underline"
            >
              {fr ? "Tout voir" : "See all"}
            </Link>
          </div>
        </div>

        <div className="max-h-[22rem] overflow-y-auto p-1.5">
          {shown.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {fr ? "Rien pour l’instant." : "Nothing here yet."}
            </p>
          ) : (
            shown.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  if (!n.read_at) markRead.mutate([n.id]);
                  setOpen(false);
                  const [path, qs] = notificationLink(n.category, n.data ?? {}).split("?");
                  void navigate({
                    to: path,
                    search: qs ? Object.fromEntries(new URLSearchParams(qs)) : undefined,
                  } as never);
                }}
                className="flex w-full items-start gap-3 rounded-2xl px-2.5 py-2.5 text-left transition-colors hover:bg-secondary"
              >
                <span className="relative shrink-0">
                  <Avatar
                    path={n.actor?.avatar_url ?? null}
                    name={n.actor?.name ?? (fr ? "Profil" : "Profile")}
                    className="size-11"
                  />
                  <span className="brand-gradient absolute -bottom-0.5 -right-0.5 grid size-5 place-items-center rounded-full border-2 border-card text-primary-foreground">
                    <Bell className="size-2.5" aria-hidden />
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm leading-snug text-foreground">
                    {n.actor?.name ? <span className="font-bold">{n.actor.name} </span> : null}
                    <span className={cn(!n.read_at && "font-semibold")}>{n.title}</span>
                  </span>
                  <span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">{n.body}</span>
                  <span className={cn("mt-1 block text-[11px] font-semibold", !n.read_at ? "text-primary" : "text-muted-foreground")}>
                    {timeAgo(n.created_at)}
                  </span>
                </span>
                {!n.read_at ? (
                  <span className="mt-4 size-2.5 shrink-0 rounded-full bg-primary" aria-hidden />
                ) : null}
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
