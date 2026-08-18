import { useCallback, useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import ashLogo from "@/assets/ash-logo.png.asset.json";

const KEY = "ash.onboarding.v1";

const COPY = {
  en: {
    title: "ASH Glo",
    subtitle: "Cameroon's Digital Marketplace",
    tagline: "Refer. Earn. Discover. Grow.",
    skip: "Skip",
    next: "Next",
    start: "Get Started",
    slides: [
      { title: "REFER. EARN. GROW.", body: "Build your network and earn through ASH." },
      { title: "DISCOVER MORE.", body: "Find trusted services and professionals around you." },
      { title: "YOUR WORLD. ONE ECOSYSTEM.", body: "Connect. Book. Earn. Grow." },
    ],
  },
  fr: {
    title: "ASH Glo",
    subtitle: "Le marché numérique du Cameroun",
    tagline: "Parrainez. Gagnez. Découvrez. Grandissez.",
    skip: "Passer",
    next: "Suivant",
    start: "Commencer",
    slides: [
      { title: "PARRAINEZ. GAGNEZ.", body: "Développez votre réseau et gagnez avec ASH." },
      { title: "DÉCOUVREZ PLUS.", body: "Trouvez des services et professionnels de confiance près de vous." },
      { title: "VOTRE MONDE. UN ÉCOSYSTÈME.", body: "Connectez. Réservez. Gagnez. Grandissez." },
    ],
  },
} as const;

function hasSession() {
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) return true;
    }
  } catch {
    return false;
  }
  return false;
}

export function SplashOnboarding() {
  const { lang } = useI18n();
  const copy = COPY[lang === "fr" ? "fr" : "en"];
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [phase, setPhase] = useState<"hidden" | "splash" | "onboarding" | "leaving">("hidden");
  const [slide, setSlide] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const blocked = /^\/(console|auth|api)/.test(pathname);
    if (blocked) return;
    let done = false;
    try {
      done = localStorage.getItem(KEY) === "true";
    } catch {
      done = true;
    }
    if (done || hasSession()) return;
    setPhase("splash");
    const t = setTimeout(() => setPhase("onboarding"), 2400);
    return () => clearTimeout(t);
    // Only evaluated on first mount for the current entry point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === "hidden") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [phase]);

  const finish = useCallback(
    (goRegister: boolean) => {
      try {
        localStorage.setItem(KEY, "true");
      } catch {
        /* ignore */
      }
      setPhase("leaving");
      setTimeout(() => {
        setPhase("hidden");
        if (goRegister) navigate({ to: "/register" });
      }, 380);
    },
    [navigate],
  );

  if (phase === "hidden") return null;

  const isSplash = phase === "splash";
  const last = slide === copy.slides.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ASH Glo"
      className={cn(
        "fixed inset-0 z-[120] overflow-hidden bg-[oklch(0.1404_0.022_283.2)] text-on-dark",
        "transition-opacity duration-300 motion-reduce:transition-none",
        phase === "leaving" ? "pointer-events-none opacity-0" : "opacity-100",
      )}
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Liquid gradient field */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="ash-liquid ash-liquid-a" />
        <div className="ash-liquid ash-liquid-b" />
        <div className="ash-liquid ash-liquid-c" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,transparent_10%,oklch(0.1404_0.022_283.2/0.75)_100%)]" />
      </div>

      {isSplash ? (
        <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
          <div className="ash-splash-mark brand-gradient grid size-24 place-items-center overflow-hidden rounded-[32px] shadow-[var(--shadow-brand)]">
            <img src={ashLogo.url} alt="ASH Glo" className="size-16 object-contain" />
          </div>
          <h1 className="ash-fade-up mt-7 font-display text-5xl font-extrabold tracking-tight [animation-delay:420ms]">
            {copy.title}
          </h1>
          <p className="ash-fade-up mt-2 text-base font-semibold tracking-wide text-on-dark/90 [animation-delay:600ms]">
            {copy.subtitle}
          </p>
          <p className="ash-fade-up mt-3 text-sm font-medium tracking-[0.18em] uppercase text-on-dark/70 [animation-delay:760ms]">
            {copy.tagline}
          </p>
        </div>
      ) : (
        <div
          className="relative flex h-full flex-col px-6 pb-8 pt-6 sm:px-10"
          onTouchStart={(e) => setTouchX(e.touches[0]?.clientX ?? null)}
          onTouchEnd={(e) => {
            if (touchX === null) return;
            const dx = (e.changedTouches[0]?.clientX ?? touchX) - touchX;
            if (dx < -50 && !last) setSlide((s) => s + 1);
            if (dx > 50 && slide > 0) setSlide((s) => s - 1);
            setTouchX(null);
          }}
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2">
              <span className="brand-gradient grid size-8 place-items-center overflow-hidden rounded-xl">
                <img src={ashLogo.url} alt="ASH Glo" className="size-6 object-contain" />
              </span>
              <span className="font-display text-sm font-bold">ASH Glo</span>
            </span>
            <button
              type="button"
              onClick={() => finish(false)}
              className="rounded-full px-4 py-2 text-sm font-semibold text-on-dark/75 transition-colors hover:text-on-dark"
            >
              {copy.skip}
            </button>
          </div>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center text-center">
            <div className="ash-splash-mark brand-gradient grid size-28 place-items-center overflow-hidden rounded-[36px] shadow-[var(--shadow-brand)]">
              <img src={ashLogo.url} alt="ASH Glo" className="size-20 object-contain" />
            </div>
            <h2
              key={`t-${slide}`}
              className="ash-fade-up mt-10 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl"
            >
              {copy.slides[slide]!.title}
            </h2>
            <p key={`b-${slide}`} className="ash-fade-up mt-4 max-w-sm text-base text-on-dark/80 [animation-delay:120ms]">
              {copy.slides[slide]!.body}
            </p>
          </div>

          <div className="mx-auto w-full max-w-md">
            <div className="flex justify-center gap-2" role="tablist" aria-label="Onboarding progress">
              {copy.slides.map((s, i) => (
                <button
                  key={s.title}
                  type="button"
                  role="tab"
                  aria-selected={i === slide}
                  aria-label={`${i + 1}`}
                  onClick={() => setSlide(i)}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300 motion-reduce:transition-none",
                    i === slide ? "w-8 bg-on-dark" : "w-2 bg-on-dark/35",
                  )}
                />
              ))}
            </div>
            <Button
              size="lg"
              className="brand-gradient mt-7 min-h-12 w-full rounded-2xl text-base font-bold text-on-dark shadow-[var(--shadow-brand)] hover:opacity-95"
              onClick={() => (last ? finish(true) : setSlide((s) => s + 1))}
            >
              {last ? copy.start : copy.next}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
