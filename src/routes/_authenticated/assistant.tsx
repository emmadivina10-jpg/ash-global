import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { askAssistant, type ChatTurn } from "@/lib/assistant.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({
    meta: [
      { title: "ASH Assistant — AI coach for your earnings" },
      {
        name: "description",
        content: "Ask the ASH Assistant about commissions, bookings and how to grow your studio and network.",
      },
      { property: "og:title", content: "ASH Assistant — AI coach for your earnings" },
      { property: "og:description", content: "Personalized analytics and growth advice powered by AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssistantPage,
});

function AssistantPage() {
  const { t } = useI18n();
  const ask = useServerFn(askAssistant);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [turns.length, busy]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    const next: ChatTurn[] = [...turns, { role: "user", content: message }];
    setTurns(next);
    setInput("");
    setBusy(true);
    try {
      const result = await ask({ data: { messages: next } });
      const reply = typeof result === "string" ? result : (result?.reply ?? "");
      if (!reply) throw new Error("empty");
      setTurns([...next, { role: "assistant", content: reply }]);
    } catch {
      toast.error(t("ai.err"));
      setTurns(next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{t("ai.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("ai.subtitle")}</p>
      </header>

      <div className="tile flex h-[62vh] flex-col p-4">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {turns.length === 0 ? (
            <div className="flex flex-wrap gap-2">
              {(["ai.hint1", "ai.hint2", "ai.hint3"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => void send(t(key))}
                  className="rounded-full border border-border px-3.5 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
                >
                  {t(key)}
                </button>
              ))}
            </div>
          ) : null}

          {turns.map((turn, index) => (
            <div key={index} className={cn("flex", turn.role === "user" ? "justify-end" : "justify-start")}>
              <p
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm",
                  turn.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                )}
              >
                {turn.content}
              </p>
            </div>
          ))}

          {busy ? <p className="text-sm text-muted-foreground">{t("ai.busy")}</p> : null}
          <div ref={endRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="mt-3 flex items-center gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("ai.placeholder")}
            aria-label={t("ai.placeholder")}
          />
          <Button type="submit" size="icon" disabled={busy || input.trim().length === 0} aria-label={t("chat.send")}>
            <Send className="size-4" aria-hidden />
          </Button>
        </form>
      </div>
    </div>
  );
}
