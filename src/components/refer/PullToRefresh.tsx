import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { playRefreshDoneSound, playRefreshSound } from "@/lib/sound";

const THRESHOLD = 70;
const MAX = 110;

/** Facebook-style pull-down-to-refresh for the app's scroll pane (or the window). */
export function PullToRefresh({ onRefresh, children, label }: { onRefresh: () => Promise<unknown>; children: ReactNode; label: string }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const start = useRef<number | null>(null);
  const pullRef = useRef(0);
  const busy = useRef(false);

  useEffect(() => {
    const scroller = () => document.querySelector<HTMLElement>(".app-shell-scroll");
    const atTop = () => {
      const el = scroller();
      const elTop = !el || el.scrollTop <= 0;
      return elTop && window.scrollY <= 0;
    };
    const onStart = (e: TouchEvent) => {
      if (busy.current || !atTop()) return;
      start.current = e.touches[0]?.clientY ?? null;
    };
    const onMove = (e: TouchEvent) => {
      if (start.current == null) return;
      const dy = (e.touches[0]?.clientY ?? 0) - start.current;
      if (dy <= 0 || !atTop()) {
        pullRef.current = 0;
        setPull(0);
        return;
      }
      const eased = Math.min(MAX, dy * 0.5);
      pullRef.current = eased;
      setPull(eased);
      if (e.cancelable && eased > 4) e.preventDefault();
    };
    const onEnd = async () => {
      if (start.current == null) return;
      start.current = null;
      if (pullRef.current >= THRESHOLD) {
        busy.current = true;
        setRefreshing(true);
        setPull(56);
        navigator.vibrate?.(10);
        playRefreshSound();
        try {
          await onRefresh();
          playRefreshDoneSound();
        } finally {
          busy.current = false;
          setRefreshing(false);
          setPull(0);
          pullRef.current = 0;
        }
      } else {
        setPull(0);
        pullRef.current = 0;
      }
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [onRefresh]);

  const ready = pull >= THRESHOLD;
  return (
    <div className="relative">
      <div
        aria-live="polite"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center"
        style={{ transform: `translateY(${pull - 44}px)`, opacity: Math.min(1, pull / 40), transition: start.current == null ? "transform 220ms ease, opacity 220ms ease" : "none" }}
      >
        <span className="grid size-10 place-items-center rounded-full border border-border bg-card text-primary shadow-lg">
          {refreshing ? (
            <Loader2 className="size-5 animate-spin" aria-label={label} />
          ) : (
            <ArrowDown className={cn("size-5 transition-transform", ready && "rotate-180")} aria-hidden />
          )}
        </span>
      </div>
      <div style={{ transform: `translateY(${pull}px)`, transition: start.current == null ? "transform 220ms ease" : "none" }}>{children}</div>
    </div>
  );
}
