import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ReceiptText, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMessages } from "@/lib/marketplace.queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { formatXAF } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ChatThread({
  conversationId,
  currentUserId,
  className,
}: {
  conversationId: string;
  currentUserId: string | undefined;
  className?: string;
}) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data: messages, isLoading } = useMessages(conversationId);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages?.length]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const text = body.trim();
    if (!text || !currentUserId || sending) return;
    setSending(true);
    const { error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: currentUserId, body: text });
    setSending(false);
    if (!error) {
      setBody("");
      void queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    }
  }

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-1">
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">…</p>
        ) : (messages ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("chat.noneCopy")}</p>
        ) : (
          (messages ?? []).map((m) => {
            const kind = (m as { kind?: string }).kind ?? "TEXT";
            if (kind === "INVOICE" || kind === "SYSTEM") {
              return (
                <InvoiceMessage
                  key={m.id}
                  kind={kind}
                  body={m.body}
                  metadata={(m as { metadata?: Record<string, unknown> }).metadata ?? {}}
                />
              );
            }
            const mine = m.sender_id === currentUserId;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <p
                  className={cn(
                    "max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm",
                    mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                  )}
                >
                  {m.body}
                </p>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="mt-3 flex items-center gap-2">
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("chat.placeholder")}
          aria-label={t("chat.placeholder")}
        />
        <Button type="submit" size="icon" disabled={sending || body.trim().length === 0} aria-label={t("chat.send")}>
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
