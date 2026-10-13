import { useEffect, useLayoutEffect, useState } from "react";
import ashLogo from "@/assets/ash-logo.png.asset.json";

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
    return window.sessionStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

const useIsoLayoutEffect = typeof document === "undefined" ? useEffect : useLayoutEffect;

/**
 * WhatsApp-style launch screen on the brand background: the little ASH logo
 * with the small "from ASH GLO" writing below it. It is the app's opening
 * paint (rendered on the server too, so it never flashes) and holds only for
 * as long as the app needs to be ready — a very short minimum so members
 * never wait. The large glossy mark is never used here.
 */
export function WelcomeIntro({ onDone }: { onDone?: () => void }) {
  // The opening is part of the server-rendered first paint; sessions that
  // have already seen it are hidden before the browser paints.
  const [show, setShow] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useIsoLayoutEffect(() => {
    if (welcomeSeen()) {
      setShow(false);
      onDone?.();
      return;
    }
    played = true;
    // Leave as soon as the first frame is painted, with a tiny minimum hold so
    // the mark does not flicker.
    const hold = 800;
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
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-200"
      style={{ opacity: leaving ? 0 : 1 }}
      role="status"
      aria-live="polite"
    >
      <span className="flex flex-col items-center gap-1">
        <img
          src={ashLogo.url}
          alt="ASH"
          className="mb-2.5 size-12 rounded-[24%] shadow-[0_6px_28px_rgba(0,0,0,0.45)]"
          draggable={false}
        />
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
