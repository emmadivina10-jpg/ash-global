import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send, UserRound } from "lucide-react";
import {
  getStaffInbox,
  markDirectMessagesRead,
  sendDirectMessage,
} from "@/lib/staff-ops.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/** Direct employee-to-employee messages. */
export function StaffDirectMessages() {
  const queryClient = useQueryClient();
  const load = useServerFn(getStaffInbox);
  const send = useServerFn(sendDirectMessage);
  const markRead = useServerFn(markDirectMessagesRead);
  const [peer, setPeer] = useState<string | null>(null);
  const [body, setBody] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["console", "staff-inbox"],
    queryFn: () => load(),
    refetchInterval: 20000,
  });

  const sendMut = useMutation({
    mutationFn: async () => send({ data: { toStaffId: peer!, body } }),
    onSuccess: async () => {
      setBody("");
      await queryClient.invalidateQueries({ queryKey: ["console", "staff-inbox"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const me = data?.me ?? null;
  const colleagues = data?.colleagues ?? [];
  const messages = data?.messages ?? [];

  if (!me) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Direct messages are available on employee seats.
      </p>
    );
  }

  const unreadFrom = new Map<string, number>();
  for (const m of messages) {
    if (m.to_staff_id === me && !m.read_at && m.from_staff_id) {
      unreadFrom.set(m.from_staff_id, (unreadFrom.get(m.from_staff_id) ?? 0) + 1);
    }
  }

  const thread = messages
    .filter(
      (m) =>
        (m.from_staff_id === peer && m.to_staff_id === me) ||
        (m.from_staff_id === me && m.to_staff_id === peer),
    )
    .slice()
    .reverse();

  const openPeer = async (id: string) => {
    setPeer(id);
    if (unreadFrom.get(id)) {
      await markRead({ data: { fromStaffId: id } });
      await queryClient.invalidateQueries({ queryKey: ["console", "staff-inbox"] });
    }
  };

  const peerInfo = colleagues.find((c) => c.id === peer);

  return (
    <section className="rounded-3xl border border-border/60 bg-card/70 p-5 shadow-lg backdrop-blur-xl">
      <h2 className="mb-3 text-sm font-bold">Direct Messages</h2>
      <div className="grid gap-4 md:grid-cols-[14rem_1fr]">
        <div className="max-h-80 space-y-1 overflow-y-auto">
          {colleagues.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => openPeer(c.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition",
                peer === c.id
                  ? "border-primary/50 bg-primary/5"
                  : "border-transparent hover:bg-accent/60",
              )}
            >
              <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">{c.employee_name ?? c.username}</span>
              {(unreadFrom.get(c.id) ?? 0) > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {unreadFrom.get(c.id)}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex min-h-64 flex-col rounded-2xl border border-border/50 bg-background/60 p-3">
          {!peer ? (
            <p className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Choose a colleague to message.
            </p>
          ) : (
            <>
              <p className="mb-2 border-b border-border/40 pb-2 text-xs font-semibold text-muted-foreground">
                {peerInfo?.employee_name ?? peerInfo?.username} · {peerInfo?.department}
              </p>
              <div className="flex-1 space-y-2 overflow-y-auto pb-2">
                {thread.length === 0 && (
                  <p className="py-6 text-center text-xs text-muted-foreground">No messages yet.</p>
                )}
                {thread.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                      m.from_staff_id === me
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "bg-muted",
                    )}
                  >
                    <p>{m.body}</p>
                    <p
                      className={cn(
                        "mt-0.5 text-[10px]",
                        m.from_staff_id === me
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground",
                      )}
                    >
                      {new Date(m.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Textarea
                  className="min-h-10 flex-1 text-sm"
                  placeholder="Write a message…"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
                <Button
                  size="icon"
                  disabled={!body.trim() || sendMut.isPending}
                  onClick={() => sendMut.mutate()}
                >
                  {sendMut.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
