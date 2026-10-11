import { useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { playRefreshDoneSound, playRefreshSound } from "@/lib/sound";

const THRESHOLD = 70;
const MAX = 84;
const DEAD_ZONE = 12;

/** Facebook-style pull-down-to-refresh for the app's scroll pane (or the window). */
export function PullToRefresh({ onRefresh, children, label }: { onRefresh: () => Promise<unknown>; children: ReactNode; label: string }) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const start = useRef<number | null>(null);
  const pullRef = useRef(0);
  const busy = useRef(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const surface = root.current;
    if (!surface) return;
    let startX = 0;
    let vertical = false;
    let scrollParents: HTMLElement[] = [];
    const atTop = () => scrollParents.every((el) => el.scrollTop <= 0) && window.scrollY <= 0;
    const reset = () => {
      start.current = null;
      pullRef.current = 0;
      if (!busy.current) setPull(0);
    };
    const onStart = (e: TouchEvent) => {
      reset();
      const target = e.target;
      const touch = e.touches[0];
      if (busy.current || e.touches.length !== 1 || !touch || !(target instanceof Element)) return;
      if (target.closest("[data-pull-refresh-ignore], .touch-none, button, input, textarea, select, [role='slider'], [role='dialog']")) return;
      scrollParents = [];
      for (let el: HTMLElement | null = target instanceof HTMLElement ? target : target.parentElement; el; el = el.parentElement) {
        if (el.scrollHeight > el.clientHeight) scrollParents.push(el);
      }
      if (!atTop()) return;
      start.current = touch.clientY;
      startX = touch.clientX;
      vertical = false;
    };
    const onMove = (e: TouchEvent) => {
      if (start.current == null) return;
      const touch = e.touches[0];
      if (e.touches.length !== 1 || !touch || !atTop()) {
        reset();
        return;
      }
      const dy = touch.clientY - start.current;
      const dx = Math.abs(touch.clientX - startX);
      if (!vertical) {
        if (Math.hypot(dx, dy) < DEAD_ZONE) return;
        if (dy <= 0 || dy < dx * 1.5) {
          reset();
          return;
        }
        vertical = true;
      }
      if (dy <= 0) {
        reset();
        return;
      }
      const eased = Math.min(MAX, Math.max(0, dy - DEAD_ZONE) * 0.35);
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
        } catch {
          /* The refresh owner displays read errors; always release the gesture. */
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
    surface.addEventListener("touchstart", onStart, { passive: true });
    surface.addEventListener("touchmove", onMove, { passive: false });
    surface.addEventListener("touchend", onEnd);
    surface.addEventListener("touchcancel", reset);
    return () => {
      surface.removeEventListener("touchstart", onStart);
      surface.removeEventListener("touchmove", onMove);
      surface.removeEventListener("touchend", onEnd);
      surface.removeEventListener("touchcancel", reset);
    };
  }, [onRefresh]);

  const ready = pull >= THRESHOLD;
  return (
    <div ref={root} className="relative">
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
      <div style={{ transform: pull > 0 ? `translateY(${pull}px)` : "none", transition: start.current == null ? "transform 220ms ease" : "none" }}>{children}</div>
    </div>
  );
}
