import { useEffect, useState } from "react";
import ashLogo from "@/assets/ash-logo.png.asset.json";
import { isNativeApp } from "@/lib/native";

const KEY = "ash-welcome-v1";

/** Set once the launch screen has played during this app session. */
let played = false;

/**
 * True once the launch screen has already played for this visit.
 * It plays exactly once per launch — the installed app replays it on a cold
 * start, the website once per browser tab session.
 */
export function welcomeSeen(): boolean {
  try {
    if (played) return true;
    if (isNativeApp()) return false;
    return window.sessionStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

/**
 * WhatsApp-style launch screen: the ASH mark centred on the brand background
 * with a small wordmark at the bottom. It holds only for as long as the app
 * needs to be ready — a very short minimum so members never wait.
 */
export function WelcomeIntro({ onDone }: { onDone?: () => void }) {
  const [show, setShow] = useState(() => !welcomeSeen());
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!show) {
      onDone?.();
      return;
    }
    // Leave as soon as the first frame is painted, with a tiny minimum hold so
    // the mark does not flicker.
    const hold = 420;
    const leaveAt = window.setTimeout(() => setLeaving(true), hold);
    const endAt = window.setTimeout(() => {
      try {
        window.sessionStorage.setItem(KEY, "1");
      } catch {
        /* private mode — the screen simply plays again next time */
      }
      setShow(false);
      onDone?.();
    }, hold + 220);
    return () => {
      window.clearTimeout(leaveAt);
      window.clearTimeout(endAt);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-between bg-background pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-[calc(2.5rem+env(safe-area-inset-top))] transition-opacity duration-200"
      style={{ opacity: leaving ? 0 : 1 }}
      role="status"
      aria-live="polite"
    >
      <span />

      <img
        src={ashLogo.url}
        alt="ASH"
        className="size-24 rounded-[28px] bg-primary-deep object-cover p-1.5 shadow-[var(--shadow-brand)] ring-1 ring-border/50"
      />

      <span className="flex flex-col items-center gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          from
        </span>
        <span className="font-display text-sm font-extrabold tracking-[0.18em] text-foreground">
          ASH GLO
        </span>
      </span>
    </div>
  );
}
