import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarDays,
  Gift,
  Globe2,
  GraduationCap,
  LayoutGrid,
  Lock,
  MessageCircle,
  Newspaper,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { isNativeApp } from "@/lib/native";
import ashLogo from "@/assets/ash-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher, ThemeToggle } from "@/components/refer/Preferences";
import { useI18n } from "@/lib/i18n";
import { ReviewsCarousel } from "@/components/refer/ReviewsCarousel";
import { WelcomeIntro } from "@/components/refer/WelcomeIntro";

const TITLE = "ASH — Where Opportunities Connect.";
const DESCRIPTION =
  "ASH is a digital opportunity, commerce, services, freelance, property, community and events platform — live in 175 countries — that connects people, businesses, freelancers, service providers, communities and event organizers in one ecosystem, with a social feed, stories, Spotlight, friends, groups and secure Mobile Money payments.";

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

const WORLD = [
  { icon: Store, en: "Services", fr: "Services", enHint: "Book verified pros", frHint: "Réservez des pros vérifiés" },
  { icon: ShoppingBag, en: "ASH Hub", fr: "ASH Hub", enHint: "Buy, sell, get paid", frHint: "Achetez, vendez, encaissez" },
  { icon: Briefcase, en: "Freelance", fr: "Freelance", enHint: "Hire talent, send offers", frHint: "Recrutez, proposez" },
  { icon: Building2, en: "Property", fr: "Immobilier", enHint: "Rent, lease, visit", frHint: "Louez, gérez, visitez" },
  { icon: CalendarDays, en: "Events", fr: "Événements", enHint: "Sell and scan tickets", frHint: "Vendez et scannez des billets" },
  { icon: Tag, en: "Deals", fr: "Offres", enHint: "Claim weekly savings", frHint: "Profitez des offres" },
  { icon: Users, en: "Social", fr: "Social", enHint: "Feed, stories & Spotlight", frHint: "Fil, stories et Spotlight" },
  { icon: MessageCircle, en: "Chat", fr: "Chat", enHint: "Friends, groups & DMs", frHint: "Amis, groupes et messages" },
] as const;

const MORE_WORLD = [
  { icon: Gift, en: "Referrals", fr: "Parrainage", enHint: "Invite and earn", frHint: "Invitez et gagnez" },
  { icon: Zap, en: "Electricity", fr: "Électricité", enHint: "Pay your bills in seconds", frHint: "Payez vos factures en secondes" },
  { icon: Send, en: "TchokoPay", fr: "TchokoPay", enHint: "Send money across Africa", frHint: "Envoyez de l’argent en Afrique" },
  { icon: Wallet, en: "Wallet", fr: "Portefeuille", enHint: "Mobile Money in and out", frHint: "Mobile Money entrées et sorties" },
  { icon: LayoutGrid, en: "Other apps", fr: "Autres apps", enHint: "Browse the ASH family", frHint: "Découvrez la famille ASH" },
  { icon: Newspaper, en: "Articles", fr: "Articles", enHint: "Read and publish", frHint: "Lisez et publiez" },
  { icon: GraduationCap, en: "Mentors", fr: "Mentors", enHint: "Learn from doers", frHint: "Apprenez des experts" },
  { icon: BadgeCheck, en: "ASH Verified", fr: "ASH Vérifié", enHint: "Protect your name", frHint: "Protégez votre nom" },
] as const;

const WORLD_PAGES = [WORLD, MORE_WORLD] as const;

function Landing() {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
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
        setPage((p) => (p + 1) % WORLD_PAGES.length);
        setOut(false);
      }, 3400);
    }, 10000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(swapTimer);
    };
  }, [reduced]);

  // Native apps skip this screen and route signed-in members to the feed, visitors to login.
  useEffect(() => {
    if (!isNativeApp()) return;
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      void navigate({ to: data.session?.user ? "/feed" : "/login", replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (isNativeApp()) return <WelcomeIntro />;

  return (
    <div className="safe-top relative min-h-dvh overflow-hidden bg-background">
      <div className="ash-liquid ash-liquid-a" aria-hidden />
      <div className="ash-liquid ash-liquid-b" aria-hidden />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] lg:px-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={ashLogo.url} alt="ASH" className="h-9 w-auto rounded-xl shadow-sm" />
            <span className="hidden rounded-full border border-border/70 bg-card/50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground backdrop-blur sm:inline">
              {fr ? "Mondial" : "Global"}
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
                {fr ? "L’écosystème ASH" : "The ASH ecosystem"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-primary backdrop-blur sm:text-[10px]">
                <Globe2 className="size-3" aria-hidden />
                {fr ? "Présent dans 175 pays" : "Live in 175 countries"}
              </span>
            </div>

            <span className="mt-4 block h-1 w-10 rounded-full bg-primary lg:mt-6" aria-hidden />
            <h1 className="mt-3 font-display text-[1.85rem] font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-4xl lg:mt-5 lg:text-[3.2rem]">
              {fr ? "Bienvenue sur ASH" : "Welcome to ASH"}
            </h1>
            <p className="mt-2 max-w-md text-[12.5px] leading-relaxed text-muted-foreground sm:text-sm lg:mt-4 lg:text-base">
              {fr
                ? "Là où les opportunités se connectent. Réservez des pros vérifiés, vendez, louez, recrutez, partagez avec vos amis, discutez et soyez payé en toute sécurité par Mobile Money."
                : "Where opportunities connect. Book verified pros, sell, rent, hire, share with friends, chat, and get paid securely by Mobile Money."}
            </p>

            <div
              key={page}
              className="mt-4 grid w-full grid-cols-2 gap-1.5 sm:gap-2.5 lg:mt-7 lg:max-w-xl"
            >
              {(WORLD_PAGES[page] ?? WORLD).map((item, i) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.en}
                    style={{ animationDelay: `${i * 160}ms` }}
                    className={`flex items-center gap-2.5 rounded-2xl border border-border/70 bg-card/50 px-3 py-2.5 text-left backdrop-blur-md transition-colors hover:border-primary/40 hover:bg-card/70 ${
                      out ? "ash-tiles-out" : "ash-tiles-in"
                    }`}
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

            <ReviewsCarousel fr={fr} className="mt-3 w-full lg:mt-5 lg:max-w-xl" />
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
                  {fr ? "Rejoignez ASH" : "Join ASH"}
                </p>
                <p className="text-[12px] leading-tight text-muted-foreground">
                  {fr ? "Une minute pour commencer." : "One minute to get started."}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-2.5">
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
                className="h-13 w-full rounded-2xl border-border bg-card/60 text-base font-semibold backdrop-blur transition-transform active:scale-[0.99]"
              >
                <Link to="/login">{fr ? "J’ai déjà un compte" : "I already have an account"}</Link>
              </Button>
            </div>

            <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-border/70 bg-background/40 px-3.5 py-3">
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

            <p className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <Lock className="size-3" aria-hidden />
              <Link to="/support" className="font-semibold text-foreground underline-offset-4 hover:underline">
                {fr ? "Assistance" : "Support"}
              </Link>
              <Link to="/privacy" className="hover:underline">
                {fr ? "Confidentialité" : "Privacy"}
              </Link>
              <Link to="/terms" className="hover:underline">
                {fr ? "Conditions" : "Terms"}
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
