import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Send, X } from "lucide-react";
import { toast } from "sonner";
import { askAssistant, type ChatTurn } from "@/lib/assistant.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const POS_KEY = "refer.assistant.pos";
const SIZE = 60;

type Pos = { x: number; y: number };

function clamp(pos: Pos): Pos {
  const maxX = Math.max(8, window.innerWidth - SIZE - 8);
  const maxY = Math.max(8, window.innerHeight - SIZE - 8);
  return { x: Math.min(Math.max(8, pos.x), maxX), y: Math.min(Math.max(8, pos.y), maxY) };
}

export function AssistantBubble() {
  const { t } = useI18n();
  const ask = useServerFn(askAssistant);
  const [pos, setPos] = useState<Pos | null>(null);
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const dragRef = useRef<{ dx: number; dy: number; moved: boolean } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let start: Pos = { x: window.innerWidth - SIZE - 16, y: window.innerHeight - SIZE - 96 };
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (raw) start = JSON.parse(raw) as Pos;
    } catch {
      /* ignore */
    }
    setPos(clamp(start));
    const onResize = () => setPos((p) => (p ? clamp(p) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "end" });
  }, [turns.length, busy, open]);

  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (!pos) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y, moved: false };
  }

  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const next = clamp({ x: e.clientX - drag.dx, y: e.clientY - drag.dy });
    if (Math.abs(e.movementX) + Math.abs(e.movementY) > 0) drag.moved = true;
    setPos(next);
  }

  function onPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (pos) {
      try {
        localStorage.setItem(POS_KEY, JSON.stringify(pos));
      } catch {
        /* ignore */
      }
    }
    if (!drag.moved) setOpen((v) => !v);
  }

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

  if (!pos) return null;

  const panelRight = pos.x > window.innerWidth / 2;
  const panelBottom = pos.y > window.innerHeight / 2;

  return (
    <>
      {open ? (
        <div
          className={cn(
            "fixed z-50 flex h-[70vh] max-h-[520px] w-[min(92vw,380px)] flex-col rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-card)]",
          )}
          style={{
            left: panelRight ? undefined : Math.max(8, pos.x),
            right: panelRight ? Math.max(8, window.innerWidth - pos.x - SIZE) : undefined,
            top: panelBottom ? undefined : pos.y + SIZE + 10,
            bottom: panelBottom ? Math.max(8, window.innerHeight - pos.y + 10) : undefined,
          }}
          role="dialog"
          aria-label={t("ai.title")}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-bold text-foreground">{t("ai.title")}</p>
              <p className="truncate text-xs text-muted-foreground">{t("ai.subtitle")}</p>
            </div>
            <Button size="icon" variant="ghost" aria-label={t("ai.close")} onClick={() => setOpen(false)}>
              <X className="size-4" aria-hidden />
            </Button>
          </div>

          <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {turns.length === 0 ? (
              <div className="flex flex-wrap gap-2">
                {(["ai.hint1", "ai.hint2", "ai.hint3"] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => void send(t(key))}
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
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
      ) : null}

      <button
        type="button"
        aria-label={open ? t("ai.close") : t("ai.open")}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ left: pos.x, top: pos.y, width: SIZE, height: SIZE }}
        className="fixed z-50 flex touch-none items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-gold)] ring-2 ring-gold/40 transition-transform active:scale-95"
      >
        <Bot className="size-6" aria-hidden />
      </button>
    </>
  );
}
