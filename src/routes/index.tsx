import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { isNativeApp } from "@/lib/native";
import { supabase } from "@/integrations/supabase/client";
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

function Landing() {
  const { lang, t } = useI18n();
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

      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-1 flex-col items-center justify-center px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
        <div className="absolute left-4 right-4 top-[calc(1rem+env(safe-area-inset-top))] flex items-center justify-between">
          <span className="font-display text-xl font-extrabold tracking-[0.22em] text-foreground">ASH</span>
          <div className="flex items-center gap-1.5">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>

        <div className="ash-fade-up flex flex-col items-center text-center">
          <div className="ash-launch-mark brand-gradient flex size-24 items-center justify-center rounded-full font-display text-3xl font-extrabold tracking-widest text-primary-foreground">
            ASH
          </div>
          <h1 className="mt-8 font-display text-3xl font-bold leading-tight text-foreground">
            {fr ? "Bienvenue sur ASH" : "Welcome to ASH"}
          </h1>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
            {fr
              ? "Là où les opportunités se connectent."
              : "Where opportunities connect."}
          </p>
        </div>

        <div className="w-full max-w-xs space-y-3">
          <Button asChild size="lg" className="w-full">
            <Link to="/register">{fr ? "Commencer" : "Get started"}</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="w-full">
            <Link to="/login">{fr ? "J'ai déjà un compte" : "I already have an account"}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
