import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import ashLogo from "@/assets/ash-logo.png.asset.json";
import { useI18n } from "@/lib/i18n";

const SLIDES = [
  {
    kickerEn: "Welcome to ASH",
    kickerFr: "Bienvenue sur ASH",
    titleEn: ["Where", "opportunities", "connect."],
    titleFr: ["Là où les", "opportunités", "se rencontrent."],
    bodyEn:
      "Book trusted professionals, chat with friends and family, and share your moments — all in one place.",
    bodyFr:
      "Réservez des professionnels de confiance, discutez avec vos amis et votre famille, et partagez vos moments — au même endroit.",
  },
  {
    kickerEn: "Pay your way",
    kickerFr: "Payez à votre façon",
    titleEn: ["Simple.", "Secure.", "Yours."],
    titleFr: ["Simple.", "Sécurisé.", "À vous."],
    bodyEn:
      "Card with Stripe, MTN MoMo and Orange Money. Every payment protected until the service is done.",
    bodyFr:
      "Carte via Stripe, MTN MoMo et Orange Money. Chaque paiement protégé jusqu'au service rendu.",
  },
] as const;

const SWIPE_THRESHOLD = 55;

/** Two quiet, text-only onboarding screens shown in the app and on phones. */
export function MobileOnboarding() {
  const { tx } = useI18n();
  const [step, setStep] = useState(0);
  const [dragX, setDragX] = useState(0);
  const startX = useRef(0);
  const dragXRef = useRef(0);
  const dragging = useRef(false);
  const last = step === SLIDES.length - 1;

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0]?.clientX ?? 0;
    dragging.current = true;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return;
    const x = (e.touches[0]?.clientX ?? 0) - startX.current;
    dragXRef.current = x;
    setDragX(x);
  };
  const onTouchEnd = () => {
    const x = dragXRef.current;
    if (dragging.current) {
      if (x <= -SWIPE_THRESHOLD && !last) setStep(step + 1);
      else if (x >= SWIPE_THRESHOLD && step > 0) setStep(step - 1);
    }
    dragging.current = false;
    dragXRef.current = 0;
    setDragX(0);
  };

  return (
    <div
      className="ash-entry safe-top relative flex min-h-dvh flex-col overflow-hidden bg-background px-7 pb-[calc(1.75rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))]"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full gold-gradient opacity-20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-24 size-80 rounded-full brand-gradient opacity-15 blur-3xl"
      />

      <header className="relative flex items-center justify-between">
        <img src={ashLogo.url} alt="ASH" className="size-9 rounded-xl shadow-sm" />
        {!last && (
          <button
            type="button"
            onClick={() => setStep(SLIDES.length - 1)}
            className="rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground transition hover:text-foreground"
          >
            {tx("Skip", "Passer")}
          </button>
        )}
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden pt-[min(16vh,110px)]">
        <div
          className="flex min-h-0 flex-1"
          style={{
            width: `${SLIDES.length * 100}%`,
            transform: `translateX(calc(-${step * (100 / SLIDES.length)}% + ${dragX}px))`,
            transition: dragging ? "none" : "transform 500ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {SLIDES.map((s, i) => (
            <section
              key={i}
              className="flex w-full flex-col justify-center pr-7"
              aria-hidden={i !== step}
            >
              <p className="mb-6 text-[11px] font-bold uppercase tracking-[0.32em] text-primary">
                {tx(s.kickerEn, s.kickerFr)}
              </p>
              <h1 className="font-serif text-[3.1rem] font-normal leading-[1.02] tracking-tight text-foreground">
                {tx(s.titleEn.join("|"), s.titleFr.join("|"))
                  .split("|")
                  .map((line, j) => (
                    <span
                      key={j}
                      className={
                        j === 1
                          ? "block italic gold-gradient bg-clip-text text-transparent"
                          : "block"
                      }
                    >
                      {line}
                    </span>
                  ))}
              </h1>
              <div className="my-7 h-px w-16 gold-gradient" />
              <p className="max-w-xs text-[15px] leading-relaxed text-muted-foreground">
                {tx(s.bodyEn, s.bodyFr)}
              </p>
            </section>
          ))}
        </div>
      </main>

      <footer className="relative space-y-5">
        <div className="flex items-center gap-2" aria-label={`${step + 1} / ${SLIDES.length}`}>
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              aria-label={`${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-500 ${i === step ? "w-10 gold-gradient" : "w-3 bg-border"}`}
            />
          ))}
        </div>

        {last ? (
          <div className="space-y-3">
            <Link
              to="/register"
              className="group flex h-14 w-full items-center justify-between rounded-full gold-gradient pl-7 pr-2 text-base font-bold text-primary-foreground shadow-[var(--shadow-brand)] transition active:scale-[0.98]"
            >
              {tx("Create account", "Créer un compte")}
              <span className="grid size-10 place-items-center rounded-full bg-background/20 transition group-hover:translate-x-0.5">
                <ArrowRight className="size-5" />
              </span>
            </Link>
            <Link
              to="/login"
              className="flex h-14 w-full items-center justify-center rounded-full border border-border bg-card/40 text-base font-semibold text-foreground backdrop-blur transition active:scale-[0.98]"
            >
              {tx("I already have an account", "J'ai déjà un compte")}
            </Link>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setStep(Math.min(SLIDES.length - 1, step + 1))}
            className="group ml-auto flex h-16 w-16 items-center justify-center rounded-full gold-gradient text-primary-foreground shadow-[var(--shadow-brand)] transition active:scale-95"
            aria-label={tx("Next", "Suivant")}
          >
            <ArrowRight className="size-6 transition group-hover:translate-x-0.5" />
          </button>
        )}
      </footer>
    </div>
  );
}
