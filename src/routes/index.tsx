import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { isNativeApp } from "@/lib/native";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Sparkles, Store, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher, ThemeToggle } from "@/components/refer/Preferences";
import { useI18n } from "@/lib/i18n";

const TITLE = "ASH — Where Opportunities Connect.";
const DESCRIPTION =
  "ASH is a digital opportunity, commerce, services, freelance, property, community and events platform that connects people, businesses, freelancers, service providers, communities and event organizers in one ecosystem.";

const OG_IMAGE = "https://ashglogroup.company/ash-social.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://ashglogroup.company/" },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "ASH — Where Opportunities Connect." },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: "https://ashglogroup.company/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "ASH",
          alternateName: "ASH Glo",
          slogan: "Where Opportunities Connect.",
          url: "https://ashglogroup.company/",
          applicationCategory: "FinanceApplication",
          operatingSystem: "Web, Android, iOS",
          inLanguage: ["en", "fr"],
          description: DESCRIPTION,
        }),
      },
    ],
  }),
  component: Landing,
});

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

function Landing() {
  const { lang } = useI18n();
  const i = lang === "fr" ? 1 : 0;
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // The installed app skips straight in: members go to services, visitors to sign-in.
  useEffect(() => {
    if (!isNativeApp()) return;
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      void navigate({ to: data.session?.user ? "/services" : "/login", replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (isNativeApp()) return <div className="min-h-dvh bg-background" />;

  const slide = SLIDES[step]!;
  const Icon = slide.icon;
  const last = step === SLIDES.length - 1;

  return (
    <div className="safe-top relative flex min-h-dvh flex-col overflow-hidden bg-background">
      <div className="ash-liquid ash-liquid-a" aria-hidden />
      <div className="ash-liquid ash-liquid-b" aria-hidden />
      <div className="ash-liquid ash-liquid-c" aria-hidden />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-1 flex-col px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
        <div className="flex items-center justify-between gap-2">
          <span className="font-display text-xl font-extrabold tracking-[0.22em] text-foreground">ASH</span>
          <div className="flex items-center gap-1.5">
            <LanguageSwitcher />
            <ThemeToggle />
            {!last ? (
              <button
                type="button"
                onClick={() => setStep(SLIDES.length - 1)}
                className="text-sm font-semibold text-muted-foreground"
              >
                {i ? "Passer" : "Skip"}
              </button>
            ) : null}
          </div>
        </div>

        <div key={step} className="ash-fade-up flex flex-1 flex-col items-center justify-center text-center">
          {step === 0 ? (
            <div className="ash-launch-mark brand-gradient flex size-20 items-center justify-center rounded-full font-display text-2xl font-extrabold tracking-widest text-primary-foreground">
              ASH
            </div>
          ) : (
            <div className="ash-launch-mark brand-gradient flex size-20 items-center justify-center rounded-full text-primary-foreground">
              <Icon className="size-9" aria-hidden />
            </div>
          )}
          {step === 0 ? (
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              {i ? "Bienvenue sur ASH" : "Welcome to ASH"}
            </p>
          ) : null}
          <h1 className="mt-4 font-display text-2xl font-bold leading-tight text-foreground">{slide.title[i]}</h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">{slide.body[i]}</p>
        </div>

        <div className="space-y-4">
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
          {last ? (
            <div className="space-y-3">
              <Button asChild size="lg" className="w-full">
                <Link to="/register">{i ? "Commencer" : "Get started"}</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full">
                <Link to="/login">{i ? "J'ai déjà un compte" : "I already have an account"}</Link>
              </Button>
            </div>
          ) : (
            <Button size="lg" className="w-full" onClick={() => setStep((s) => s + 1)}>
              {i ? "Suivant" : "Next"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
