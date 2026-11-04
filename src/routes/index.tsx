import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { isNativeApp } from "@/lib/native";
import ashLogo from "@/assets/ash-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { WelcomeIntro } from "@/components/refer/WelcomeIntro";
import { MobileOnboarding } from "@/components/refer/MobileOnboarding";
import { DesktopLanding } from "@/components/refer/DesktopLanding";

const TITLE = "ASH Global Technologies — Your World, Connected";
const DESCRIPTION =
  "Book services, chat and share moments with ASH Glo. Mobile payments: eligible MTN and Orange Money via TchokoPay; card and bank coming soon.";

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
  const navigate = useNavigate();
  const [isPhone, setIsPhone] = useState(false);
  // Unknown until the stored session is read: signed-in members must never
  // see the onboarding screen flash before they are taken to the Feed.
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

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
        setSignedIn(true);
        void navigate({ to: "/feed", replace: true });
      } else {
        setSignedIn(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (isNativeApp() || isPhone)
    return (
      <>
        <WelcomeIntro />
        {signedIn === false && <MobileOnboarding />}
      </>
    );

  // While the session check runs, show a calm brand screen instead of the
  // landing page, so signed-in members never see marketing content flash.
  if (signedIn !== false)
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background">
        <span className="flex flex-col items-center gap-1">
          <img
            src={ashLogo.url}
            alt="ASH"
            className="mb-2.5 size-12 rounded-[24%] shadow-[0_6px_28px_rgba(0,0,0,0.45)]"
          />
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            from
          </span>
          <span className="font-display text-sm font-extrabold tracking-[0.18em] text-foreground">
            ASH GLO
          </span>
        </span>
      </div>
    );

  return (
    <>
      <WelcomeIntro />
      <DesktopLanding />
    </>
  );
}
