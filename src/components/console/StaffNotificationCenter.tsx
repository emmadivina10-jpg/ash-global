import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import {
  getStaffNotifications,
  markAllStaffNotificationsRead,
  markStaffNotificationRead,
} from "@/lib/staff-ops.functions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Global staff notification bell + dropdown, shown on every console dashboard. */
export function StaffNotificationCenter() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const load = useServerFn(getStaffNotifications);
  const markOne = useServerFn(markStaffNotificationRead);
  const markAll = useServerFn(markAllStaffNotificationsRead);

  const { data } = useQuery({
    queryKey: ["console", "staff-notifications"],
    queryFn: () => load(),
    refetchInterval: 30000,
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["console", "staff-notifications"] });
  };

  const readOne = useMutation({
    mutationFn: async (id: string) => markOne({ data: { id } }),
    onSuccess: invalidate,
  });
  const readAll = useMutation({
    mutationFn: async () => markAll(),
    onSuccess: invalidate,
  });

  const unread = data?.unread ?? 0;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card/70 backdrop-blur transition hover:bg-accent"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unread > 0 && (
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => readAll.mutate()} disabled={readAll.isPending}>
                {readAll.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCheck className="h-3 w-3" />}
                Mark all read
              </Button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {(data?.notifications ?? []).length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet.</p>
            )}
            {(data?.notifications ?? []).map((n) => {
              const inner = (
                <div
                  className={cn(
                    "border-b border-border/40 px-4 py-3 text-left transition hover:bg-accent/50",
                    !n.read_at && "bg-primary/5",
                  )}
                  onClick={() => {
                    if (!n.read_at) readOne.mutate(n.id);
                  }}
                >
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>}
                  <p className="mt-1 text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              );
              return n.link ? (
                <Link key={n.id} to={n.link} onClick={() => setOpen(false)}>
                  {inner}
                </Link>
              ) : (
                <div key={n.id}>{inner}</div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
