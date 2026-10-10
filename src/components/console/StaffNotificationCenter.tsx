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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

/** Global staff notification bell + dropdown, shown on every console dashboard. */
export function StaffNotificationCenter() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const load = useServerFn(getStaffNotifications);
  const markOne = useServerFn(markStaffNotificationRead);
  const markAll = useServerFn(markAllStaffNotificationsRead);

  const { data, isError, isLoading } = useQuery({
    queryKey: ["console", "staff-notifications"],
    queryFn: () => load(),
    refetchInterval: 10000,
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["console", "staff-notifications"] });
  };

  const readOne = useMutation({
    mutationFn: async (id: string) => markOne({ data: { id } }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["console", "staff-notifications"] });
      const previous = queryClient.getQueryData<typeof data>(["console", "staff-notifications"]);
      if (previous)
        queryClient.setQueryData(["console", "staff-notifications"], {
          ...previous,
          unread: Math.max(
            0,
            previous.unread -
              (previous.notifications.some((n) => n.id === id && !n.read_at) ? 1 : 0),
          ),
          notifications: previous.notifications.map((n) =>
            n.id === id ? { ...n, read_at: new Date().toISOString() } : n,
          ),
        });
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous)
        queryClient.setQueryData(["console", "staff-notifications"], context.previous);
      toast.error("Could not mark the notification as read.");
    },
    onSettled: invalidate,
  });
  const readAll = useMutation({
    mutationFn: async () => markAll(),
    onSuccess: invalidate,
    onError: () => toast.error("Could not mark notifications as read."),
  });

  const unread = data?.unread ?? 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card/70 backdrop-blur transition hover:bg-accent"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-lg border-border bg-card p-0"
      >
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => readAll.mutate()}
              disabled={readAll.isPending}
            >
              {readAll.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCheck className="h-3 w-3" />
              )}
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading notifications…</p>
          ) : null}
          {isError ? (
            <div role="alert" className="p-4 text-sm">
              <p>Notifications could not be refreshed.</p>
              <Button size="sm" variant="ghost" onClick={() => void invalidate()}>
                Try again
              </Button>
            </div>
          ) : null}
          {!isLoading && !isError && (data?.notifications ?? []).length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </p>
          )}
          {(data?.notifications ?? []).map((n) => {
            const inner = (
              <div
                className={cn(
                  "border-b border-border/40 px-4 py-3 text-left transition hover:bg-accent/50",
                  !n.read_at && "bg-primary/5",
                )}
              >
                <p className="break-words text-sm font-medium">{n.title}</p>
                {n.body && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                )}
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
            );
            return n.link ? (
              <Link
                key={n.id}
                to={n.link}
                className="block"
                onClick={() => {
                  if (!n.read_at) readOne.mutate(n.id);
                  setOpen(false);
                }}
              >
                {inner}
              </Link>
            ) : (
              <Button
                key={n.id}
                variant="ghost"
                className="h-auto w-full justify-start whitespace-normal rounded-none p-0 [&>div]:w-full"
                disabled={readOne.isPending}
                onClick={() => {
                  if (!n.read_at) readOne.mutate(n.id);
                }}
              >
                {inner}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
