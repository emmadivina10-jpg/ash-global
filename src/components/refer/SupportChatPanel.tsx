import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import {
  getMySupportTickets,
  markMySupportRead,
  sendMySupportMessage,
  submitSupportTicket,
} from "@/lib/support.functions";
import { useUser } from "@/lib/queries";
import { useProfile } from "@/lib/queries";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function SupportChatPanel({ topic }: { topic?: "clean" } = {}) {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const { user } = useUser();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const getTickets = useServerFn(getMySupportTickets);
  const createTicket = useServerFn(submitSupportTicket);
  const sendReply = useServerFn(sendMySupportMessage);
  const markRead = useServerFn(markMySupportRead);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);

  const query = useQuery({
    queryKey: ["support", "mine"],
    queryFn: getTickets,
    refetchInterval: 10_000,
  });
  const ticket = query.data?.[0] ?? null;
  const messages = useMemo(() => ticket?.messages ?? [], [ticket]);

  useEffect(() => {
    if (!ticket) return;
    const latestAdmin = [...messages].reverse().find((message) => message.sender === "ADMIN");
    if (!latestAdmin || (ticket.member_read_at && latestAdmin.created_at <= ticket.member_read_at))
      return;
    void markRead({ data: { ticketId: ticket.id } }).then(() =>
      queryClient.invalidateQueries({ queryKey: ["support", "mine"] }),
    );
  }, [markRead, messages, queryClient, ticket]);

  useEffect(() => {
    const messages = messagesRef.current;
    if (messages) messages.scrollTop = messages.scrollHeight;
  }, [messages.length]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || busy) return;
    setBusy(true);
    try {
      const result = ticket
        ? await sendReply({ data: { ticketId: ticket.id, body } })
        : await createTicket({
            data: {
              name: profile?.full_name ?? user?.user_metadata?.["full_name"] ?? "ASH member",
              email: user?.email ?? "",
              subject: topic === "clean" ? "ASH Clean" : "In-app support chat",
              category: "GENERAL",
              message: body,
            },
          });
      if (!result.ok) throw new Error(result.error);
      setDraft("");
      await queryClient.invalidateQueries({ queryKey: ["support", "mine"] });
    } catch {
      toast.error(fr ? "Message non envoyé. Réessayez." : "Message not sent. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={messagesRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-4"
      >
        <div className="mr-8 rounded-2xl bg-muted px-3.5 py-2.5 text-sm text-foreground">
          {topic === "clean"
            ? tx("Hi, this is ASH Clean. Ask us anything about your laundry, pickup or delivery.", "Bonjour, ici ASH Clean. Posez vos questions sur votre linge, collecte ou livraison.")
            : tx("Hello, you’re connected to ASH Support. Tell us what you need help with.", "Bonjour, vous êtes connecté au support ASH. Expliquez-nous ce dont vous avez besoin.")}
        </div>
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn("flex", message.sender === "CUSTOMER" ? "justify-end" : "justify-start")}
          >
            <p
              className={cn(
                "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm",
                message.sender === "CUSTOMER"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground",
              )}
            >
              {message.body}
            </p>
          </div>
        ))}
        {query.isLoading ? (
          <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" aria-hidden />
        ) : null}
      </div>
      <form
        onSubmit={send}
        className="flex items-center gap-2 border-t border-border bg-background p-3"
      >
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={tx("Message Support…", "Écrivez au support…")}
          aria-label={tx("Message Support", "Message au support")}
        />
        <Button
          type="submit"
          size="icon"
          disabled={busy || !draft.trim()}
          aria-label={tx("Send", "Envoyer")}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Send className="size-4" aria-hidden />
          )}
        </Button>
      </form>
    </div>
  );
}
