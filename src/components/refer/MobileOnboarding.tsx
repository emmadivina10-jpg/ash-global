import { useEffect, useState } from "react";
import { Building2, CalendarDays, Sparkles, Store, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

const KEY = "ash-onboarding-v1";

/** True once the first-run onboarding has been completed on this device. */
function onboardingDone(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return true;
  }
}

type Slide = {
  icon: typeof Store;
  title: [string, string];
  body: [string, string];
};

const SLIDES: Slide[] = [
  {
    icon: Sparkles,
    title: ["Where opportunities connect", "Là où les opportunités se rencontrent"],
    body: [
      "One place for services, commerce, freelance, property, events and deals.",
      "Un seul espace pour les services, le commerce, le freelance, l'immobilier, les événements et les offres.",
    ],
  },
  {
    icon: Store,
    title: ["Book trusted pros", "Réservez des pros de confiance"],
    body: [
      "Browse verified providers near you, see their work and book in a few taps.",
      "Parcourez des prestataires vérifiés près de vous, voyez leur travail et réservez en quelques gestes.",
    ],
  },
  {
    icon: Building2,
    title: ["Sell, rent and hire", "Vendez, louez et recrutez"],
    body: [
      "List a service, a home, a product or a project and reach the whole ASH community.",
      "Publiez un service, un logement, un produit ou un projet et touchez toute la communauté ASH.",
    ],
  },
  {
    icon: Wallet,
    title: ["Get paid securely", "Soyez payé en toute sécurité"],
    body: [
      "Mobile money and card payments land in your ASH wallet, ready to withdraw.",
      "Les paiements mobile money et carte arrivent dans votre portefeuille ASH, prêts à être retirés.",
    ],
  },
];

/**
 * First-run onboarding for the mobile experience: a few water-like animated
 * screens shown only once per device, before the member starts using ASH.
 */
export function MobileOnboarding() {
  const { lang } = useI18n();
  const i = lang === "fr" ? 1 : 0;
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (onboardingDone()) return;
    const mobile = typeof window.matchMedia === "function" && window.matchMedia("(max-width: 1023px)").matches;
    if (!mobile) return;
    // Let the launch animation finish first.
    const t = window.setTimeout(() => setShow(true), 1200);
    return () => window.clearTimeout(t);
  }, []);

  if (!show) return null;

  const finish = () => {
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      /* private mode — onboarding may appear again */
    }
    setShow(false);
  };

  const slide = SLIDES[step]!;
  const Icon = slide.icon;
  const last = step === SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col overflow-hidden bg-background">
      <div className="ash-liquid ash-liquid-a" aria-hidden />
      <div className="ash-liquid ash-liquid-b" aria-hidden />
      <div className="ash-liquid ash-liquid-c" aria-hidden />

      <div className="relative flex flex-1 flex-col justify-between px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(3rem+env(safe-area-inset-top))]">
        <div className="flex justify-end">
          {!last ? (
            <button type="button" onClick={finish} className="text-sm font-semibold text-muted-foreground">
              {i ? "Passer" : "Skip"}
            </button>
          ) : null}
        </div>

        <div key={step} className="ash-fade-up flex flex-1 flex-col items-center justify-center text-center">
          <div className="ash-launch-mark brand-gradient flex size-20 items-center justify-center rounded-full text-primary-foreground">
            <Icon className="size-9" aria-hidden />
          </div>
          <h2 className="mt-8 font-display text-2xl font-bold leading-tight text-foreground">{slide.title[i]}</h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">{slide.body[i]}</p>
        </div>

        <div className="space-y-6">
          <div className="flex justify-center gap-2">
            {SLIDES.map((s, idx) => (
              <span
                key={s.title[0]}
                className={
                  idx === step
                    ? "h-1.5 w-6 rounded-full bg-primary transition-all"
                    : "h-1.5 w-1.5 rounded-full bg-muted-foreground/40 transition-all"
                }
              />
            ))}
          </div>
          <Button
            size="lg"
            className="w-full"
            onClick={() => (last ? finish() : setStep((s) => s + 1))}
          >
            {last ? (i ? "Commencer" : "Get started") : i ? "Suivant" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export { CalendarDays };
