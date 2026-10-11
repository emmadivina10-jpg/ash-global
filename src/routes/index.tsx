import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowDownToLine, ArrowUpRight, CreditCard, Lock, ShieldCheck, Smartphone } from "lucide-react";
import { isNativeApp } from "@/lib/native";
import ashLogo from "@/assets/ash-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher, ThemeToggle } from "@/components/refer/Preferences";
import { useI18n } from "@/lib/i18n";
import { WelcomeIntro } from "@/components/refer/WelcomeIntro";
import { MobileOnboarding } from "@/components/refer/MobileOnboarding";
import { WebsiteAppShowcase } from "@/components/refer/WebsiteAppShowcase";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const TITLE = "ASH Glo — Book Services, Chat & Earn Referral Rewards";
const DESCRIPTION =
  "ASH Glo is the all-in-one app to book trusted local services, chat with friends and family, share your feed and pay securely by card, MTN or Orange Money.";

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
        children: JSON.stringify([
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "ASH Glo",
            alternateName: ["ASH", "ASH Global Technologies"],
            url: "https://ashglogroup.company/",
            logo: "https://ashglogroup.company/favicon.png",
            founder: { "@type": "Person", name: "Emmanuel Tanga Divine", jobTitle: "CEO" },
            areaServed: ["Cameroon", "Nigeria", "Canada", "United States"],
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "ASH Glo",
            url: "https://ashglogroup.company/",
            inLanguage: ["en", "fr"],
          },
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "ASH Glo",
            slogan: "Where Opportunities Connect.",
            url: "https://ashglogroup.company/",
            applicationCategory: "LifestyleApplication",
            operatingSystem: "Web, Android, iOS",
            inLanguage: ["en", "fr"],
            description: DESCRIPTION,
          },
        ]),
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { tx } = useI18n();
  const navigate = useNavigate();
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [isPhone, setIsPhone] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsPhone(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  // Signed-in members enter the product on Feed. Native visitors go to login;
  // signed-out web visitors keep the public landing page.
  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session?.user) {
        void navigate({ to: "/feed", replace: true });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (isNativeApp() || isPhone)
    return (
      <>
        {isNativeApp() && <WelcomeIntro />}
        <MobileOnboarding />
      </>
    );

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

        <main className="flex-1 py-10 lg:py-12">
          <section className="ash-fade-up mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold text-muted-foreground">{tx("YOUR WORLD, CONNECTED", "VOTRE MONDE, CONNECTÉ")}</p>
            <h1 className="ash-entry-title mt-4 font-display text-4xl font-extrabold leading-tight lg:text-5xl">{tx("Welcome to ASH", "Bienvenue sur ASH")}</h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">{tx("Book through the marketplace, chat with friends and family, and share your moments. Take ASH with you.", "Réservez sur le marché, discutez avec vos amis et votre famille, et partagez vos moments. Emportez ASH partout.")}</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" className="gap-2 rounded-lg font-semibold" onClick={() => setDownloadOpen(true)}><ArrowDownToLine className="size-4" />{tx("Get the ASH app", "Obtenir l’application ASH")}</Button>
              <Button asChild size="lg" variant="outline" className="gap-2 rounded-lg"><Link to="/register">{tx("Continue on the web", "Continuer sur le site")}<ArrowUpRight className="size-4" /></Link></Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{tx("Already a member?", "Déjà membre ?")} <Link to="/login" className="font-semibold text-primary hover:underline">{tx("Log in", "Se connecter")}</Link></p>
          </section>
          <div className="mt-10"><WebsiteAppShowcase /></div>
          <section className="mx-auto mt-8 max-w-3xl">
            <div className="mt-5 space-y-2 border-t border-border pt-4">
              <p className="text-xs font-bold text-foreground">{tx("Active payment methods", "Moyens de paiement actifs")}</p>
              <p className="flex items-center gap-2 text-xs text-foreground"><CreditCard className="size-4 text-primary" />{tx("Card payments · Stripe", "Paiements par carte · Stripe")}<ShieldCheck className="ms-auto size-3.5 text-primary" /></p>
              <p className="flex items-center gap-2 text-xs text-foreground"><Smartphone className="size-4 text-gold" />MTN MoMo · Orange Money<ShieldCheck className="ms-auto size-3.5 text-primary" /></p>
              <p className="text-[10px] text-muted-foreground">{tx("Available methods depend on your country and checkout.", "Les moyens disponibles dépendent de votre pays et du paiement.")}</p>
            </div>

            <div className="mt-5 flex items-start gap-2.5 px-1 py-3">
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
        <Dialog open={downloadOpen} onOpenChange={setDownloadOpen}>
          <DialogContent className="rounded-lg">
            <DialogHeader>
              <DialogTitle>{tx("ASH on your phone", "ASH sur votre téléphone")}</DialogTitle>
              <DialogDescription>{tx("Public App Store and Google Play download links are not available yet. You can use ASH in your phone’s browser now.", "Les liens publics de téléchargement App Store et Google Play ne sont pas encore disponibles. Utilisez ASH dans le navigateur de votre téléphone dès maintenant.")}</DialogDescription>
            </DialogHeader>
            <Button asChild><Link to="/register">{tx("Continue with ASH", "Continuer avec ASH")}</Link></Button>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
