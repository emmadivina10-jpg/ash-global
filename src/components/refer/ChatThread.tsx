import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMessages } from "@/lib/marketplace.queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
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
