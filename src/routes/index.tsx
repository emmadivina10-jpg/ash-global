import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  Briefcase,
  Building2,
  CalendarDays,
  Globe2,
  Lock,
  MessageCircle,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
  Users,
} from "lucide-react";
import { isNativeApp } from "@/lib/native";
import ashLogo from "@/assets/ash-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher, ThemeToggle } from "@/components/refer/Preferences";
import { useI18n } from "@/lib/i18n";

const TITLE = "ASH — Where Opportunities Connect.";
const DESCRIPTION =
  "ASH is a digital opportunity, commerce, services, freelance, property, community and events platform that connects people, businesses, freelancers, service providers, communities and event organizers in one ecosystem.";

const OG_IMAGE = "https://ashglogroup.company/ash-social.png";
const SUPPORT_URL = "https://ash-glo-support.base44.app";

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

const WORLD = [
  { icon: Store, en: "Services", fr: "Services", enHint: "Book trusted pros", frHint: "Réservez des pros" },
  { icon: ShoppingBag, en: "ASH Hub", fr: "ASH Hub", enHint: "Buy and sell", frHint: "Achetez et vendez" },
  { icon: Briefcase, en: "Freelance", fr: "Freelance", enHint: "Hire talent", frHint: "Recrutez des talents" },
  { icon: Building2, en: "Property", fr: "Immobilier", enHint: "Rent and lease", frHint: "Louez et gérez" },
  { icon: CalendarDays, en: "Events", fr: "Événements", enHint: "Sell tickets", frHint: "Vendez des billets" },
  { icon: Tag, en: "Deals", fr: "Offres", enHint: "Save every week", frHint: "Économisez chaque semaine" },
  { icon: Users, en: "Social", fr: "Social", enHint: "Feed, stories & Spotlight", frHint: "Fil, stories et Spotlight" },
  { icon: MessageCircle, en: "Chat", fr: "Chat", enHint: "Friends, groups & DMs", frHint: "Amis, groupes et messages" },
] as const;

function Landing() {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const navigate = useNavigate();

  // Native apps skip this screen and route signed-in members to services, visitors to login.
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

  return (
    <div className="safe-top relative flex min-h-dvh flex-col overflow-hidden bg-background">
      <div className="ash-liquid ash-liquid-a" aria-hidden />
      <div className="ash-liquid ash-liquid-b" aria-hidden />
      <div className="ash-liquid ash-liquid-c" aria-hidden />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-1 flex-col px-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
        <header className="flex items-center justify-between">
          <img src={ashLogo.url} alt="ASH" className="h-9 w-auto rounded-xl shadow-sm" />
          <div className="flex items-center gap-1.5">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex flex-1 flex-col justify-center py-8">
          <div className="ash-fade-up flex flex-col items-center text-center">
            <img
              src={ashLogo.url}
              alt="ASH"
              className="size-24 rounded-[2rem] shadow-[var(--shadow-brand)] ring-1 ring-border/60"
            />

            <span className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground backdrop-blur">
              <Sparkles className="size-3 text-primary" aria-hidden />
              {fr ? "L’écosystème ASH" : "The ASH ecosystem"}
            </span>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary backdrop-blur">
              <Globe2 className="size-3" aria-hidden />
              {fr ? "Présent dans 175 pays" : "Live in 175 countries"}
            </span>

            <h1 className="mt-4 font-display text-[2rem] font-extrabold leading-tight tracking-tight text-foreground">
              {fr ? "Bienvenue sur ASH" : "Welcome to ASH"}
            </h1>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {fr
                ? "Là où les opportunités se connectent. Réservez des pros de confiance, vendez, louez, recrutez, partagez avec vos amis et soyez payé en toute sécurité."
                : "Where opportunities connect. Book trusted pros, sell, rent, hire, share with friends and get paid securely."}
            </p>
          </div>

          <div className="ash-fade-up mt-8 grid grid-cols-2 gap-2">
            {WORLD.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.en}
                  className="flex items-center gap-2.5 rounded-2xl border border-border/80 bg-card/70 px-3 py-2.5 backdrop-blur-sm"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12px] font-bold leading-tight text-foreground">
                      {fr ? item.fr : item.en}
                    </span>
                    <span className="block truncate text-[10px] leading-tight text-muted-foreground">
                      {fr ? item.frHint : item.enHint}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </main>

        <footer className="space-y-4">
          <div className="space-y-2.5">
            <Button
              asChild
              size="lg"
              className="h-13 w-full rounded-2xl text-base font-bold shadow-[var(--shadow-brand)] transition-transform active:scale-[0.99]"
            >
              <Link to="/register">{fr ? "Commencer" : "Get started"}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-13 w-full rounded-2xl border-border bg-card/70 text-base font-semibold backdrop-blur transition-transform active:scale-[0.99]"
            >
              <Link to="/login">{fr ? "J’ai déjà un compte" : "I already have an account"}</Link>
            </Button>
          </div>

          <div className="flex items-start gap-2.5 rounded-2xl border border-border bg-card/70 px-3.5 py-3 backdrop-blur">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="size-4" aria-hidden />
            </span>
            <p className="text-[11px] leading-5 text-muted-foreground">
              <span className="font-bold text-foreground">
                {fr ? "Paiements sécurisés." : "Secure payments."}
              </span>{" "}
              {fr
                ? "Les paiements et retraits se font par Mobile Money (MTN & Orange), traités par nos partenaires agréés. Les virements bancaires ne sont pas encore disponibles — ils arrivent bientôt."
                : "Payments and withdrawals run on Mobile Money (MTN & Orange), handled by our licensed payment partners. Bank transfers are not available yet — coming soon."}
            </p>
          </div>

          <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <Lock className="size-3" aria-hidden />
            <a
              href={SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-foreground underline-offset-4 hover:underline"
            >
              {fr ? "Confidentialité & aide" : "Privacy & support"}
            </a>
            <Link to="/privacy" className="hover:underline">
              {fr ? "Confidentialité" : "Privacy"}
            </Link>
            <Link to="/terms" className="hover:underline">
              {fr ? "Conditions" : "Terms"}
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
