import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BriefcaseBusiness,
  GraduationCap,
  CalendarDays,
  House,
  Users,
  Lightbulb,
  FlaskConical,
  Tag,
  CreditCard,
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { AppLauncher } from "@capacitor/app-launcher";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { playTabSound } from "@/lib/sound";
import ashLogo from "@/assets/ash-logo.png.asset.json";

export const Route = createFileRoute("/_authenticated/services/extras")({
  head: () => ({
    meta: [
      { title: "Market Extras — ASH Glo" },
      {
        name: "description",
        content: "Your ASH apps, learning, work, events and connected services in one place.",
      },
      { property: "og:title", content: "Market Extras — ASH Glo" },
      { property: "og:description", content: "Explore ASH apps and your connected services." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExtrasPage,
});
const apps = [
  { to: "/freelance", en: "Freelance", fr: "Freelance", icon: BriefcaseBusiness },
  { to: "/electricity", en: "Eneo Bills", fr: "Factures Eneo", icon: Lightbulb, thirdParty: true },
  { href: "https://www.tchokopay.com/", en: "TchokoPay", fr: "TchokoPay", icon: CreditCard },
  { href: "https://www.netflix.com/", en: "Netflix", fr: "Netflix", wordmark: "N" },
  { to: "/campus/instructors", en: "Learn", fr: "Apprendre", icon: GraduationCap },
  { href: "https://www.tiktok.com/", en: "TikTok", fr: "TikTok", wordmark: "♪" },
  { to: "/freelance", en: "Jobs", fr: "Missions", icon: BriefcaseBusiness },
  { to: "/deals", en: "Deals", fr: "Offres", icon: Tag },
  { to: "/events", en: "Events", fr: "Événements", icon: CalendarDays },
  { to: "/property", en: "Property", fr: "Immobilier", icon: House },
  { to: "/network", en: "People", fr: "Personnes", icon: Users },
  { to: "/incubator", en: "ASH Incubator", fr: "ASH Incubateur", icon: FlaskConical },
] as const;
async function openExternal(url: string) {
  if (!Capacitor.isNativePlatform()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  try {
    const result = await AppLauncher.openUrl({ url });
    if (result.completed) return;
  } catch {
    /* native browser fallback */
  }
  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url });
}
function ExtrasPage() {
  const { lang } = useI18n();
  const fr = lang === "fr";
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="flex items-center gap-3 border-b border-border pb-5">
        <Button asChild size="icon" variant="secondary" className="rounded-full">
          <Link to="/services" aria-label={fr ? "Retour à Market" : "Back to Market"}>
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Extras</h1>
        <img src={ashLogo.url} alt="ASH" className="ml-auto size-11 rounded-lg" />
      </header>
      <nav
        aria-label={fr ? "Applications" : "Apps"}
        className="grid grid-cols-3 gap-x-3 gap-y-8 sm:grid-cols-4 lg:grid-cols-6"
      >
        {apps.map((app) => {
          const owned = "to" in app && !("thirdParty" in app);
          const content = (
            <>
              <span
                className={`relative grid size-[72px] place-items-center rounded-[22px] border border-border shadow-card transition-transform group-hover:-translate-y-1 group-active:scale-95 motion-reduce:transform-none [&_svg]:size-8 ${owned ? "brand-gradient text-on-dark" : "bg-card text-foreground"}`}
              >
                {"icon" in app ? (
                  <app.icon className="size-8" strokeWidth={1.7} aria-hidden />
                ) : (
                  <span
                    className={`text-4xl font-black ${app.en === "Netflix" ? "text-destructive" : "text-foreground"}`}
                  >
                    {app.wordmark}
                  </span>
                )}
                {owned && (
                  <img
                    src={ashLogo.url}
                    alt=""
                    className="absolute -bottom-1 -right-1 size-6 rounded-lg ring-2 ring-background"
                  />
                )}
              </span>
              <span className="w-full whitespace-normal text-center text-sm font-semibold leading-5">
                {fr ? app.fr : app.en}
              </span>
            </>
          );
          return "to" in app ? (
            <Button
              asChild
              key={app.en}
              variant="ghost"
              className="group h-auto flex-col gap-3 p-0 hover:bg-transparent"
              onClick={playTabSound}
            >
              <Link to={app.to}>{content}</Link>
            </Button>
          ) : (
            <Button
              key={app.en}
              variant="ghost"
              className="group h-auto flex-col gap-3 p-0 hover:bg-transparent"
              onClick={() => {
                playTabSound();
                void openExternal(app.href);
              }}
            >
              {content}
            </Button>
          );
        })}
      </nav>
    </div>
  );
}
