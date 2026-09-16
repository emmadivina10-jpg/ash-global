import { useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";

const TRIGGER = 72;
const MAX = 110;

/**
 * Pull the screen down to reload whatever it is showing. Works both when the
 * page itself scrolls (web) and when the shell's pane scrolls (installed app).
 */
export function PullToRefresh({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const host = useRef<HTMLDivElement | null>(null);
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);

  function atTop() {
    const pane = host.current?.closest<HTMLElement>(".app-shell-scroll");
    if (pane && pane.scrollHeight > pane.clientHeight + 1) return pane.scrollTop <= 0;
    return (window.scrollY || document.documentElement.scrollTop || 0) <= 0;
  }

  function onTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    if (busy || !atTop()) {
      startY.current = null;
      return;
    }
    startY.current = event.touches[0]?.clientY ?? null;
  }

  function onTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    if (startY.current === null || busy) return;
    const y = event.touches[0]?.clientY ?? 0;
    const delta = y - startY.current;
    if (delta <= 0) {
      setPull(0);
      return;
    }
    if (!atTop()) {
      startY.current = null;
      setPull(0);
      return;
    }
    setPull(Math.min(MAX, delta * 0.55));
  }

  async function onTouchEnd() {
    const distance = pull;
    startY.current = null;
    setPull(0);
    if (distance < TRIGGER || busy) return;
    setBusy(true);
    try {
      await queryClient.refetchQueries({ type: "active" });
    } finally {
      setBusy(false);
    }
  }

  const showing = busy || pull > 4;

  return (
    <div
      ref={host}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <div
        aria-hidden={!showing}
        className="pointer-events-none flex items-center justify-center overflow-hidden transition-[height] duration-200"
        style={{ height: busy ? 44 : pull }}
      >
        {showing ? (
          <span className="grid size-9 place-items-center rounded-full border border-border bg-card shadow-sm">
            {busy ? (
              <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
            ) : (
              <RefreshCw
                className="size-4 text-muted-foreground"
                style={{ transform: `rotate(${pull * 3}deg)` }}
                aria-hidden
              />
            )}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}
