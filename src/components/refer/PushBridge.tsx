import { useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { NotificationAvatar } from "@/components/refer/NotificationAvatar";
import { actorIdFor, loadActors } from "@/lib/notification-actor";
import { useNotifications } from "@/lib/notifications";
import { notificationLink, useAppBadge, usePushNotifications, type IncomingNotification } from "@/lib/push";

/**
 * Registers the device for push and mirrors backend notifications (withdrawals,
 * activation, referral commissions, bookings, chat) to the OS: vibration plus a
 * numeric badge (1, 2, 3 …) on the installed / home-screen app icon. While the
 * app is open, each new notification also slides in as a banner showing the
 * sender's photo with a small ASH logo on its bottom-right.
 */
export function PushBridge() {
  const navigate = useNavigate();

  const onIncoming = useCallback(
    (row: IncomingNotification, me: string) => {
      void (async () => {
        const actorId = await actorIdFor(row, me).catch(() => null);
        const actor = actorId ? (await loadActors([actorId]).catch(() => new Map())).get(actorId) : undefined;
        const href = notificationLink(row.category ?? "", row.data ?? {});
        toast.custom(
          (id) => (
            <button
              type="button"
              onClick={() => {
                toast.dismiss(id);
                void navigate({ href });
              }}
              className="flex w-[min(92vw,380px)] items-center gap-3 rounded-2xl border border-border bg-card/95 p-3 text-left shadow-xl backdrop-blur"
            >
              <NotificationAvatar path={actor?.avatar_url} name={actor?.name} className="size-12" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground">
                  {actor?.name ?? "ASH Glo"}
                </span>
                <span className="block truncate text-xs font-medium text-foreground/90">{row.title}</span>
                {row.body ? (
                  <span className="line-clamp-2 text-xs text-muted-foreground">{row.body}</span>
                ) : null}
              </span>
            </button>
          ),
          { duration: 6000, position: "top-center" },
        );
      })();
    },
    [navigate],
  );

  usePushNotifications(true, onIncoming);
  const { data } = useNotifications();
  const unread = (data ?? []).filter((n) => !n.read_at).length;
  useAppBadge(unread);
  return null;
}
