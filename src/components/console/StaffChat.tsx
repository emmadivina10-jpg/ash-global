import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessagesSquare, Send, X } from "lucide-react";
import { getStaffChat, postStaffMessage } from "@/lib/ops.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const CHANNELS = [
  { id: "GENERAL", label: "General" },
  { id: "LEADERSHIP", label: "Leadership" },
  { id: "SUPPORT", label: "Support" },
  { id: "REVENUE", label: "Revenue" },
  { id: "GROWTH", label: "Growth" },
  { id: "TRUST", label: "Trust" },
  { id: "CYBERSECURITY", label: "Security" },
] as const;

/** Internal team chat, available from every console dashboard. */
export function StaffChat() {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<string>("GENERAL");
  const [body, setBody] = useState("");
  const queryClient = useQueryClient();
  const load = useServerFn(getStaffChat);
  const post = useServerFn(postStaffMessage);
  const endRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ["console", "staff-chat", channel],
    queryFn: () => load({ data: { channel } }),
    refetchInterval: open ? 8000 : false,
    enabled: open,
  });

  const send = useMutation({
    mutationFn: async (text: string) => post({ data: { channel, body: text } }),
    onSuccess: async () => {
      setBody("");
      await queryClient.invalidateQueries({ queryKey: ["console", "staff-chat", channel] });
    },
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [data?.messages.length, open]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
        aria-label="Open team chat"
      >
        <MessagesSquare className="size-4" aria-hidden />
        <span className="hidden sm:inline">Team chat</span>
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Close team chat"
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex h-dvh w-full max-w-md flex-col border-l border-border bg-card shadow-raised">
            <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <p className="font-display text-base font-extrabold text-foreground">Team chat</p>
                <p className="text-[11px] text-muted-foreground">Internal only — members never see this.</p>
              </div>
              <Button size="icon" variant="ghost" aria-label="Close" onClick={() => setOpen(false)}>
                <X className="size-4" aria-hidden />
              </Button>
            </header>

            <div className="flex gap-1.5 overflow-x-auto border-b border-border px-4 py-2">
              {CHANNELS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setChannel(item.id)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                    channel === item.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  #{item.label}
                </button>
              ))}
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {(data?.messages ?? []).map((message) => {
                const mine = message.author_name === data?.me;
                return (
                  <div key={message.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-3 py-2",
                        mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                      )}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">
                        {message.author_name} · {message.author_department.replace(/_/g, " ")}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm">{message.body}</p>
                      <p className="mt-1 text-[10px] opacity-60">
                        {new Date(message.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
              {data && data.messages.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No messages in #{channel.toLowerCase()} yet. Start the conversation.
                </p>
              ) : null}
              <div ref={endRef} />
            </div>

            <form
              className="flex items-end gap-2 border-t border-border p-3"
              onSubmit={(event) => {
                event.preventDefault();
                const text = body.trim();
                if (text) send.mutate(text);
              }}
            >
              <Textarea
                rows={2}
                value={body}
                onChange={(event) => setBody(event.target.value.slice(0, 4000))}
                placeholder={`Message #${channel.toLowerCase()}`}
                className="min-h-11 resize-none"
              />
              <Button type="submit" size="icon" disabled={send.isPending || body.trim().length === 0} aria-label="Send">
                <Send className="size-4" aria-hidden />
              </Button>
            </form>
          </aside>
        </div>
      ) : null}
    </>
  );
}
