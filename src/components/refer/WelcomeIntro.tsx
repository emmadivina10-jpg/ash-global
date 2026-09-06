import { useEffect, useState } from "react";
import ashLogo from "@/assets/ash-logo.png.asset.json";
import { useI18n } from "@/lib/i18n";
import { isNativeApp } from "@/lib/native";

const KEY = "ash-welcome-v1";

/**
 * True once the launch animation has already played for this visit.
 * The installed app replays it on every launch (WhatsApp-style); the website
 * plays it once per browser tab session so navigation stays instant.
 */
export function welcomeSeen(): boolean {
  try {
    if (isNativeApp()) return false;
    return window.sessionStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

/**
 * ASH launch screen: a soft liquid brand wash behind the rounded ASH mark.
 * Collapses to a plain fade when the device asks for reduced motion.
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
    const hold = reduced ? 800 : 2000;
    const leaveAt = window.setTimeout(() => setLeaving(true), hold);
    const endAt = window.setTimeout(() => {
      try {
        window.sessionStorage.setItem(KEY, "1");
      } catch {
        /* private mode — the intro simply plays again next time */
      }
      setShow(false);
      onDone?.();
    }, hold + 420);
    return () => {
      window.clearTimeout(leaveAt);
      window.clearTimeout(endAt);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-background transition-opacity duration-[420ms]"
      style={{ opacity: leaving ? 0 : 1 }}
      role="status"
      aria-live="polite"
    >
      <span className="ash-liquid ash-liquid-a" aria-hidden />
      <span className="ash-liquid ash-liquid-b" aria-hidden />
      <span className="ash-liquid ash-liquid-c" aria-hidden />

      <span className="ash-launch-mark relative">
        <img
          src={ashLogo.url}
          alt=""
          className="ash-mark-in aspect-square size-28 rounded-full bg-primary-deep object-cover p-1.5 shadow-[var(--shadow-brand)] ring-1 ring-border/50"
        />
      </span>
      <h1 className="ash-fade-up mt-7 text-center font-display text-2xl font-extrabold tracking-tight text-foreground">
        {fr ? "Bienvenue sur ASH" : "Welcome to ASH"}
      </h1>
      <p className="ash-fade-up mt-2 text-center text-sm text-muted-foreground">
        {fr ? "Là où les opportunités se connectent." : "Where opportunities connect."}
      </p>
    </div>
  );
}
