import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, CheckCheck, ReceiptText, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMessages } from "@/lib/marketplace.queries";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n";
import { formatXAF } from "@/lib/format";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at?: string | null;
  kind?: string;
  metadata?: Record<string, unknown>;
};

function dayKey(iso: string) {
  return new Date(iso).toDateString();
}

function dayLabel(iso: string, fr: boolean) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);
  if (date.toDateString() === today.toDateString()) return fr ? "Aujourd'hui" : "Today";
  if (date.toDateString() === yesterday.toDateString()) return fr ? "Hier" : "Yesterday";
  return date.toLocaleDateString(fr ? "fr-FR" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function timeLabel(iso: string, fr: boolean) {
  return new Date(iso).toLocaleTimeString(fr ? "fr-FR" : "en-GB", { hour: "2-digit", minute: "2-digit" });
}

export function ChatThread({
  conversationId,
  currentUserId,
  className,
  quickReplies = [],
}: {
  conversationId: string;
  currentUserId: string | undefined;
  className?: string;
  quickReplies?: string[];
}) {
  const { t, lang } = useI18n();
  const fr = lang === "fr";
  const queryClient = useQueryClient();
  const { data, isLoading } = useMessages(conversationId);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const messages = (data ?? []) as unknown as ChatMessage[];

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  // Mark the other side's messages as read once the thread is open.
  useEffect(() => {
    if (!currentUserId || messages.length === 0) return;
    const unread = messages.filter((m) => m.sender_id !== currentUserId && !m.read_at).map((m) => m.id);
    if (unread.length === 0) return;
    void supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unread)
      .then(() => queryClient.invalidateQueries({ queryKey: ["messages", conversationId] }));
  }, [messages, currentUserId, conversationId, queryClient]);

  const grouped = useMemo(() => {
    const out: { day: string; items: ChatMessage[] }[] = [];
    for (const m of messages) {
      const key = dayKey(m.created_at);
      const last = out[out.length - 1];
      if (last && last.day === key) last.items.push(m);
      else out.push({ day: key, items: [m] });
    }
    return out;
  }, [messages]);

  async function submit(text: string) {
    const value = text.trim();
    if (!value || !currentUserId || sending) return;
    setSending(true);
    const { error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: currentUserId, body: value });
    setSending(false);
    if (!error) {
      setBody("");
      void queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    }
  }

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-1 py-2">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">…</p>
        ) : messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("chat.noneCopy")}</p>
        ) : (
          grouped.map((group) => (
            <div key={group.day} className="space-y-2">
              <p className="sticky top-0 z-10 mx-auto w-fit rounded-full bg-muted px-3 py-0.5 text-[11px] font-semibold text-muted-foreground">
                {dayLabel(group.items[0]!.created_at, fr)}
              </p>
              {group.items.map((m) => {
                const kind = m.kind ?? "TEXT";
                if (kind === "INVOICE" || kind === "SYSTEM") {
                  return <InvoiceMessage key={m.id} kind={kind} body={m.body} metadata={m.metadata ?? {}} />;
                }
                const mine = m.sender_id === currentUserId;
                return (
                  <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[82%] rounded-2xl px-3.5 py-2 shadow-sm",
                        mine
                          ? "rounded-br-md bg-primary text-primary-foreground"
                          : "rounded-bl-md bg-muted text-foreground",
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
                      <span
                        className={cn(
                          "mt-1 flex items-center justify-end gap-1 text-[10px]",
                          mine ? "text-primary-foreground/75" : "text-muted-foreground",
                        )}
                      >
                        {timeLabel(m.created_at, fr)}
                        {mine ? (
                          m.read_at ? (
                            <CheckCheck className="size-3" aria-hidden />
                          ) : (
                            <Check className="size-3" aria-hidden />
                          )
                        ) : null}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {quickReplies.length > 0 ? (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          {quickReplies.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => void submit(q)}
              className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
            >
              {q}
            </button>
          ))}
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(body);
        }}
        className="flex items-end gap-2 border-t border-border pt-3"
      >
        <Textarea
          rows={1}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit(body);
            }
          }}
          placeholder={t("chat.placeholder")}
          aria-label={t("chat.placeholder")}
          className="max-h-32 min-h-10 resize-none rounded-2xl"
        />
        <Button
          type="submit"
          size="icon"
          className="size-10 shrink-0 rounded-full"
          disabled={sending || body.trim().length === 0}
          aria-label={t("chat.send")}
        >
          <Send className="size-4" aria-hidden />
        </Button>
      </form>
    </div>
  );
}

/** ASH invoice / system event rendered inline in the booking thread. */
function InvoiceMessage({
  kind,
  body,
  metadata,
}: {
  kind: string;
  body: string;
  metadata: Record<string, unknown>;
}) {
  const { lang } = useI18n();
  const fr = lang === "fr";
  if (kind === "SYSTEM") {
    return (
      <p className="mx-auto max-w-[90%] rounded-full bg-muted px-3 py-1 text-center text-[11px] text-muted-foreground">
        {body}
      </p>
    );
  }

  const invoice = String(metadata["invoice_number"] ?? "");
  const total = Number(metadata["total"] ?? metadata["price"] ?? 0);
  const fee = Number(metadata["platform_fee"] ?? 0);
  const net = Number(metadata["provider_amount"] ?? 0);
  const service = String(metadata["service_title"] ?? "");

  return (
    <article className="mx-auto w-full max-w-[92%] rounded-2xl border border-primary/30 bg-primary/5 p-3">
      <header className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-primary">
          <ReceiptText className="size-4" aria-hidden />
          {fr ? "Facture ASH" : "ASH invoice"}
        </span>
        {invoice ? <span className="tabular text-[11px] font-semibold text-muted-foreground">{invoice}</span> : null}
      </header>
      {service ? <p className="mt-1 truncate text-sm font-semibold text-foreground">{service}</p> : null}
      <dl className="mt-2 space-y-1 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{fr ? "Total payé" : "Total paid"}</dt>
          <dd className="tabular font-bold text-foreground">{formatXAF(total)}</dd>
        </div>
        {fee > 0 ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{fr ? "Frais ASH" : "ASH fee"}</dt>
            <dd className="tabular text-foreground">{formatXAF(fee)}</dd>
          </div>
        ) : null}
        {net > 0 ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{fr ? "Reçu par le pro" : "Provider receives"}</dt>
            <dd className="tabular text-foreground">{formatXAF(net)}</dd>
          </div>
        ) : null}
      </dl>
      {body ? <p className="mt-2 text-[11px] text-muted-foreground">{body}</p> : null}
    </article>
  );
}
