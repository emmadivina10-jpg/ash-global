import { useEffect, useState } from "react";
import ashLogo from "@/assets/ash-logo.png.asset.json";
import { useI18n } from "@/lib/i18n";
import { isNativeApp } from "@/lib/native";

const KEY = "ash-welcome-v1";

/** True once the first-launch welcome has already played on this device. */
export function welcomeSeen(): boolean {
  try {
    if (isNativeApp()) return false;
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

/**
 * First-launch only: a short (~2.4s) cinematic ASH welcome. Returning members
 * never see it again, and it collapses to a plain fade when the device asks
 * for reduced motion.
 */
export function WelcomeIntro({ onDone }: { onDone?: () => void }) {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (welcomeSeen()) {
      onDone?.();
      return;
    }
    setShow(true);
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hold = reduced ? 900 : 2100;
    const leaveAt = window.setTimeout(() => setLeaving(true), hold);
    const endAt = window.setTimeout(() => {
      try {
        window.localStorage.setItem(KEY, "1");
      } catch {
        /* private mode — the intro simply plays again next time */
      }
      setShow(false);
      onDone?.();
    }, hold + 320);
    return () => {
      window.clearTimeout(leaveAt);
      window.clearTimeout(endAt);
    };
  }, [onDone]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-300"
      style={{ opacity: leaving ? 0 : 1 }}
      role="status"
      aria-live="polite"
    >
      
      <span className="ash-launch-mark">
        <img
          src={ashLogo.url}
          alt=""
          className="ash-mark-in size-24 rounded-full bg-primary-deep object-cover p-1 ring-1 ring-border/50 shadow-[var(--shadow-brand)]"
        />
      </span>
      <h1 className="ash-fade-up mt-6 text-center font-display text-2xl font-extrabold tracking-tight text-foreground">
        {fr ? "Bienvenue sur ASH" : "Welcome to ASH"}
      </h1>
      <p className="ash-fade-up mt-2 text-center text-sm text-muted-foreground">
        {fr ? "Là où les opportunités se connectent." : "Where opportunities connect."}
      </p>
    </div>
  );
}
