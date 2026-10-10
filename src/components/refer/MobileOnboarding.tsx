import { useState } from "react";
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
    bodyEn: "Book trusted professionals, talk with your people, and share your moments — all in one place.",
    bodyFr: "Réservez des professionnels de confiance, discutez et partagez vos moments — au même endroit.",
  },
  {
    kickerEn: "Pay your way",
    kickerFr: "Payez à votre façon",
    titleEn: ["Simple.", "Secure.", "Yours."],
    titleFr: ["Simple.", "Sécurisé.", "À vous."],
    bodyEn: "Card with Stripe, MTN MoMo and Orange Money. Every payment protected until the service is done.",
    bodyFr: "Carte via Stripe, MTN MoMo et Orange Money. Chaque paiement protégé jusqu'au service rendu.",
  },
] as const;

/** Two quiet, text-only onboarding screens shown in the app and on phones. */
export function MobileOnboarding() {
  const { tx } = useI18n();
  const [step, setStep] = useState(0);
  const last = step === SLIDES.length - 1;
  const slide = SLIDES[step] ?? SLIDES[0];
  const title = tx(slide.titleEn.join("|"), slide.titleFr.join("|")).split("|");

  return (
    <div className="ash-entry safe-top relative flex min-h-dvh flex-col overflow-hidden bg-background px-7 pb-[calc(1.75rem+env(safe-area-inset-bottom))] pt-[calc(1.25rem+env(safe-area-inset-top))]">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full gold-gradient opacity-20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-24 size-80 rounded-full brand-gradient opacity-15 blur-3xl" />

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

      <main key={step} className="relative flex flex-1 flex-col justify-center animate-in fade-in slide-in-from-right-4 duration-500">
        <p className="mb-6 text-[11px] font-bold uppercase tracking-[0.32em] text-primary">
          {tx(slide.kickerEn, slide.kickerFr)}
        </p>
        <h1 className="font-serif text-[3.1rem] font-normal leading-[1.02] tracking-tight text-foreground">
          {title.map((line, i) => (
            <span key={i} className={i === 1 ? "block italic gold-gradient bg-clip-text text-transparent" : "block"}>
              {line}
            </span>
          ))}
        </h1>
        <div className="my-7 h-px w-16 gold-gradient" />
        <p className="max-w-xs text-[15px] leading-relaxed text-muted-foreground">
          {tx(slide.bodyEn, slide.bodyFr)}
        </p>
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
            onClick={() => setStep(step + 1)}
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
