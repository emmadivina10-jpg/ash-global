import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CreditCard, Globe2, Lock, MessageCircle, Plane, ShieldCheck, Smartphone, Sparkles, Store, Flame } from "lucide-react";
import marketImage from "@/assets/market-beauty.jpg";
import feedImage from "@/assets/hero-events.jpg";
import flightImage from "@/assets/feed-flight-banner.jpg";
import { isNativeApp } from "@/lib/native";
import ashLogo from "@/assets/ash-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher, ThemeToggle } from "@/components/refer/Preferences";
import { useI18n } from "@/lib/i18n";
import { WelcomeIntro } from "@/components/refer/WelcomeIntro";

const TITLE = "ASH — Where Opportunities Connect.";
const DESCRIPTION =
  "ASH Glo is a digital opportunity, commerce, services, freelance, property, community and events platform that connects people, businesses, freelancers, service providers, communities and event organizers in one ecosystem, with a social feed, stories, Spotlight, friends, groups and supported payments.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://ashglogroup.company/" },
      { name: "twitter:card", content: "summary" },
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

const SNAPSHOTS = [
  { icon: Store, en: "Marketplace bookings", fr: "Réservations du marché", enHint: "Find a service. Book a professional.", frHint: "Trouvez un service. Réservez un professionnel.", image: marketImage, alt: "Beauty service", kind: "market" },
  { icon: MessageCircle, en: "Text messaging", fr: "Messagerie", enHint: "Your conversations, together.", frHint: "Vos conversations, réunies.", image: null, alt: "", kind: "messages" },
  { icon: Flame, en: "Feed", fr: "Fil", enHint: "Stories and moments from your community.", frHint: "Stories et moments de votre communauté.", image: feedImage, alt: "Community gathering", kind: "feed" },
  { icon: Plane, en: "Flights", fr: "Vols", enHint: "Travel with ASH · coming soon", frHint: "Voyagez avec ASH · bientôt", image: flightImage, alt: "Airplane", kind: "flights" },
] as const;

function Landing() {
  const { tx } = useI18n();
  const navigate = useNavigate();
  const [out, setOut] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  // Every ten seconds the tiles melt into the next set: each tile fades over
  // two seconds, staggered so the fade starts at the top and rolls slowly
  // down, then the new set fades back in the same gentle way.
  useEffect(() => {
    if (reduced) return;
    let swapTimer: number | undefined;
    const id = window.setInterval(() => {
      setOut(true);
      swapTimer = window.setTimeout(() => {
        setOut(false);
      }, 3400);
    }, 10000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(swapTimer);
    };
  }, [reduced]);

  // Signed-in members enter the product on Feed. Native visitors go to login;
  // signed-out web visitors keep the public landing page.
  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session?.user) {
        void navigate({ to: "/feed", replace: true });
      } else if (isNativeApp()) {
        void navigate({ to: "/login", replace: true });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (isNativeApp()) return <WelcomeIntro />;

  return (
    <div className="ash-entry safe-top relative min-h-dvh overflow-hidden bg-background">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] lg:px-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={ashLogo.url} alt="ASH" className="h-9 w-auto rounded-xl shadow-sm" />
            <span className="hidden rounded-full border border-border/70 bg-card/50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground backdrop-blur sm:inline">
              {tx("Global", "Mondial")}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>

        <main className="grid flex-1 items-center gap-5 py-5 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12 lg:py-8">
          {/* Story side */}
          <section className="ash-fade-up flex flex-col items-center text-center lg:items-start lg:text-left">
            <div className="flex flex-wrap items-center justify-center gap-1.5 lg:justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground backdrop-blur sm:text-[10px]">
                <Sparkles className="size-3 text-primary" aria-hidden />
                {tx("The ASH ecosystem", "L’écosystème ASH")}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-primary backdrop-blur sm:text-[10px]">
                <Globe2 className="size-3" aria-hidden />
                {tx("Opportunities, services and community", "Opportunités, services et communauté")}
              </span>
            </div>

            <span className="mt-4 block h-1 w-10 rounded-full bg-primary lg:mt-6" aria-hidden />
            <h1 className="ash-entry-title mt-3 font-display text-[1.85rem] font-extrabold leading-[1.05] sm:text-4xl lg:mt-5 lg:text-[3.2rem]">
              {tx("Welcome to ASH", "Bienvenue sur ASH")}
            </h1>
            <p className="mt-2 max-w-md text-[12.5px] leading-relaxed text-muted-foreground sm:text-sm lg:mt-4 lg:text-base">
              {tx("Book through the marketplace, message friends and share your moments. Pay securely by card with Stripe or MTN / Orange Money.", "Réservez sur le marché, discutez avec vos amis et partagez vos moments. Payez par carte avec Stripe ou MTN / Orange Money.")}
            </p>

            <div
              className="mt-4 grid w-full grid-cols-2 gap-1.5 sm:gap-2.5 lg:mt-7 lg:max-w-xl"
            >
              {SNAPSHOTS.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.en}
                    style={{ animationDelay: `${i * 160}ms` }}
                    className={`overflow-hidden rounded-lg border border-border/70 bg-card/60 text-left transition-colors ${out ? "ash-tiles-out" : "ash-tiles-in"}`}
                  >
                    <div className="relative aspect-[16/9] overflow-hidden bg-muted" aria-label={tx("Preview", "Aperçu")}>
                      {item.image ? <img src={item.image} alt={item.alt} className="size-full object-cover" /> : (
                        <div className="flex h-full flex-col justify-center gap-2 p-3 sm:p-4">
                          <div className="flex items-center gap-2 text-xs font-semibold text-foreground"><MessageCircle className="size-4 text-primary" />{tx("Messages", "Messages")}</div>
                          <span className="w-fit rounded-lg bg-primary/15 px-3 py-1.5 text-[11px] text-foreground">{tx("Hello! How are you?", "Salut ! Comment vas-tu ?")}</span>
                          <span className="ms-auto w-fit rounded-lg bg-secondary px-3 py-1.5 text-[11px] text-secondary-foreground">{tx("See you soon!", "À bientôt !")}</span>
                        </div>
                      )}
                      <span className="absolute start-2 top-2 rounded-md bg-background/90 px-2 py-1 text-[9px] font-semibold text-foreground">{tx("Preview", "Aperçu")}</span>
                      {item.kind === "market" && <span className="absolute bottom-2 start-2 rounded-md bg-background/90 px-2 py-1 text-[10px] font-semibold text-foreground">{tx("Services · Bookings", "Services · Réservations")}</span>}
                      {item.kind === "feed" && <span className="absolute bottom-2 start-2 rounded-md bg-background/90 px-2 py-1 text-[10px] font-semibold text-foreground">{tx("Stories · Feed", "Stories · Fil")}</span>}
                    </div>
                    <div className="flex items-start gap-2 p-3">
                      <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="text-xs font-bold leading-snug text-foreground">{tx(item.en, item.fr)}</span>
                        <span className="text-[10px] leading-snug text-muted-foreground">{tx(item.enHint, item.frHint)}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Action side */}
          <section className="ash-fade-up w-full rounded-[1.5rem] border border-border/70 bg-card/60 p-4 shadow-[var(--shadow-brand)] backdrop-blur-xl sm:p-6">
            <div className="flex items-center gap-3">
              <img
                src={ashLogo.url}
                alt="ASH"
                className="size-12 rounded-2xl ring-1 ring-border/60"
              />
              <div className="min-w-0">
                <p className="text-base font-extrabold leading-tight text-foreground">
                  {tx("Join ASH", "Rejoignez ASH")}
                </p>
                <p className="text-[12px] leading-tight text-muted-foreground">
                  {tx("One minute to get started.", "Une minute pour commencer.")}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2.5">
              <Button
                asChild
                size="lg"
                className="h-13 w-full rounded-2xl text-base font-bold shadow-[var(--shadow-brand)] transition-transform active:scale-[0.99]"
              >
                <Link to="/register">{tx("Get started", "Commencer")}</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-13 w-full rounded-2xl border-border bg-card/60 text-base font-semibold backdrop-blur transition-transform active:scale-[0.99]"
              >
                <Link to="/login">{tx("I already have an account", "J’ai déjà un compte")}</Link>
              </Button>
            </div>

            <div className="mt-5 space-y-2 border-t border-border pt-4">
              <p className="text-xs font-bold text-foreground">{tx("Active payment methods", "Moyens de paiement actifs")}</p>
              <p className="flex items-center gap-2 text-xs text-foreground"><CreditCard className="size-4 text-primary" />{tx("Card payments · Stripe", "Paiements par carte · Stripe")}<ShieldCheck className="ms-auto size-3.5 text-primary" /></p>
              <p className="flex items-center gap-2 text-xs text-foreground"><Smartphone className="size-4 text-gold" />MTN MoMo · Orange Money<ShieldCheck className="ms-auto size-3.5 text-primary" /></p>
              <p className="text-[10px] text-muted-foreground">{tx("Available methods depend on your country and checkout.", "Les moyens disponibles dépendent de votre pays et du paiement.")}</p>
            </div>

            <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-border/70 bg-background/40 px-3.5 py-3">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="size-4" aria-hidden />
              </span>
              <p className="text-[11px] leading-5 text-muted-foreground">
                <span className="font-bold text-foreground">
                  {tx("Secure payments.", "Paiements sécurisés.")}
                </span>{" "}
                {tx("Supported payments and withdrawals use the method and provider shown in the relevant flow. ASH Glo never asks for your Mobile Money PIN.", "Les paiements et retraits disponibles utilisent le moyen et le prestataire indiqués dans chaque parcours. ASH Glo ne demande jamais votre code PIN Mobile Money.")}
              </p>
            </div>

            <p className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <Lock className="size-3" aria-hidden />
              <Link
                to="/support"
                className="font-semibold text-foreground underline-offset-4 hover:underline"
              >
                {tx("Support", "Assistance")}
              </Link>
              <Link to="/privacy" className="hover:underline">
                {tx("Privacy", "Confidentialité")}
              </Link>
              <Link to="/terms" className="hover:underline">
                {tx("Terms", "Conditions")}
              </Link>
              <Link to="/contact" className="hover:underline">
                Contact
              </Link>
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
