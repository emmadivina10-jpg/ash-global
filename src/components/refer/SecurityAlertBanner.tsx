import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ShieldAlert, X } from "lucide-react";
import { useMarkNotificationsRead, useNotifications } from "@/lib/notifications";
import { ALERT_BANNER_MS } from "@/lib/cyber-rules";

/** Shows the newest unread security update for 20 seconds; it stays in Notifications until opened. */
export function SecurityAlertBanner() {
  const { data } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const alert = (data ?? []).find(
    (n) => n.category === "SECURITY_UPDATE" && !n.read_at && !dismissed.has(n.id),
  );

  useEffect(() => {
    if (!alert) return;
    const id = alert.id;
    const t = setTimeout(() => setDismissed((s) => new Set(s).add(id)), ALERT_BANNER_MS);
    return () => clearTimeout(t);
  }, [alert]);

  if (!alert) return null;
  const bulletinId =
    typeof alert.data["bulletin_id"] === "string" ? alert.data["bulletin_id"] : null;
  return (
    <div
      role="alert"
      className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[70] mx-auto flex max-w-md animate-in fade-in slide-in-from-top-2 items-start gap-3 rounded-2xl border border-destructive/30 bg-card p-3 shadow-lg"
    >
      <ShieldAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={() => {
          markRead.mutate([alert.id]);
          if (bulletinId)
            void navigate({ to: "/security-update/$bulletinId", params: { bulletinId } });
        }}
      >
        <p className="text-xs font-bold uppercase tracking-wide text-destructive">
          Security update
        </p>
        <p className="truncate text-sm font-semibold">{alert.title}</p>
        <p className="line-clamp-2 text-xs text-muted-foreground">{alert.body}</p>
      </button>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setDismissed((s) => new Set(s).add(alert.id))}
        className="rounded-full p-1 text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
