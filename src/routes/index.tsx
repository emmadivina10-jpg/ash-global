import { createFileRoute, Link } from "@tanstack/react-router";
import marketHero from "@/assets/market-hero.jpg";
import marketBeauty from "@/assets/market-beauty.jpg";
import marketHome from "@/assets/market-home.jpg";
import marketHealth from "@/assets/market-health.jpg";
import marketTech from "@/assets/market-tech.jpg";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  Layers,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import { Logo } from "@/components/refer/Logo";
import { PaymentMethods } from "@/components/refer/PaymentMethods";
import { RegionSwitcher } from "@/components/refer/RegionSwitcher";
import { useRegion } from "@/lib/region-context";
import { LanguageSwitcher, ThemeToggle } from "@/components/refer/Preferences";
import { Button } from "@/components/ui/button";
import { ACTIVATION_FEE, COMMISSIONS, MIN_WITHDRAWAL, formatXAF } from "@/lib/format";
import { useI18n, type TKey } from "@/lib/i18n";

const TITLE = "ASH Glo Cameroon — Digital marketplace, referral rewards & verified services";
const DESCRIPTION =
  "Earn 3 levels of referral commissions in Cameroon and withdraw to MTN Mobile Money or Orange Money. Discover verified beauty, tech, home and wellness providers on ASH Glo.";
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
      { property: "og:image:height", content: "640" },
      { property: "og:image:alt", content: "ASH Glo" },
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
          name: "ASH Glo",
          url: "https://ashglogroup.company/",
          applicationCategory: "FinanceApplication",
          operatingSystem: "Web, Android, iOS",
          inLanguage: ["en", "fr"],
          areaServed: { "@type": "Country", name: "Cameroon" },
          offers: {
            "@type": "Offer",
            price: "5000",
            priceCurrency: "XAF",
            description: "One-time account activation fee",
          },
          description: DESCRIPTION,
        }),
      },
    ],
  }),
  component: Landing,
});

const LEVELS = [
  { level: 1, amount: COMMISSIONS[1], label: "landing.level1.label" as TKey, copy: "landing.level1.copy" as TKey, members: 18 },
  { level: 2, amount: COMMISSIONS[2], label: "landing.level2.label" as TKey, copy: "landing.level2.copy" as TKey, members: 42 },
  { level: 3, amount: COMMISSIONS[3], label: "landing.level3.label" as TKey, copy: "landing.level3.copy" as TKey, members: 96 },
];

const FEATURES = [
  { icon: Smartphone, title: "landing.f1.title" as TKey, copy: "landing.f1.copy" as TKey },
  { icon: Layers, title: "landing.f2.title" as TKey, copy: "landing.f2.copy" as TKey },
  { icon: Wallet, title: "landing.f3.title" as TKey, copy: "landing.f3.copy" as TKey },
  { icon: ShieldCheck, title: "landing.f4.title" as TKey, copy: "landing.f4.copy" as TKey },
  { icon: Users, title: "landing.f5.title" as TKey, copy: "landing.f5.copy" as TKey },
  { icon: Banknote, title: "landing.f6.title" as TKey, copy: "landing.f6.copy" as TKey },
];

const CATEGORY_TILES = [
  {
    image: marketBeauty,
    title: "landing.cat.beauty.title" as TKey,
    copy: "landing.cat.beauty.copy" as TKey,
    alt: "landing.cat.beauty.title" as TKey,
  },
  {
    image: marketHome,
    title: "landing.cat.home.title" as TKey,
    copy: "landing.cat.home.copy" as TKey,
    alt: "landing.cat.home.title" as TKey,
  },
  {
    image: marketHealth,
    title: "landing.cat.health.title" as TKey,
    copy: "landing.cat.health.copy" as TKey,
    alt: "landing.cat.health.title" as TKey,
  },
  {
    image: marketTech,
    title: "landing.cat.tech.title" as TKey,
    copy: "landing.cat.tech.copy" as TKey,
    alt: "landing.cat.tech.title" as TKey,
  },
];

const STEPS = [
  { title: "landing.step1.title" as TKey, copy: "landing.step1.copy" as TKey },
  { title: "landing.step2.title" as TKey, copy: "landing.step2.copy" as TKey },
  { title: "landing.step3.title" as TKey, copy: "landing.step3.copy" as TKey },
  { title: "landing.step4.title" as TKey, copy: "landing.step4.copy" as TKey },
];

function Landing() {
  const { t } = useI18n();
  const region = useRegion();
  const fee = formatXAF(ACTIVATION_FEE);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-1.5 sm:gap-2">
            <RegionSwitcher className="hidden sm:inline-flex" />
            <LanguageSwitcher />
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/login">{t("landing.signIn")}</Link>
            </Button>
            <Button asChild size="sm" className="shadow-[var(--shadow-card)]">
              <Link to="/register">{t("landing.getStarted")}</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero bento */}
        <section className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 sm:pt-12 lg:pb-16">
          <div className="grid gap-4 lg:grid-cols-12">
            {/* Cinematic marketplace hero */}
            <div className="tile relative col-span-full overflow-hidden p-0">
              <div className="relative min-h-[30rem] sm:min-h-[34rem] lg:min-h-[38rem]">
                <img
                  src={marketHero}
                  alt="Verified beauty, tech, home and health professionals on the ASH marketplace"
                  className="absolute inset-0 h-full w-full object-cover object-center"
                  width={1600}
                  height={1008}
                  fetchPriority="high"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.12_0.02_320)] via-[oklch(0.12_0.02_320_/_0.72)] to-[oklch(0.12_0.02_320_/_0.25)]" />
                <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.12_0.02_320_/_0.85)] to-transparent lg:to-[oklch(0.12_0.02_320_/_0.05)]" />

                <div className="relative flex min-h-[30rem] flex-col justify-end p-6 sm:min-h-[34rem] sm:p-10 lg:min-h-[38rem] lg:p-14">
                  <span className="hairline-gold inline-flex w-fit items-center gap-2 rounded-full bg-on-dark/10 px-3 py-1 text-xs font-semibold text-on-dark/90 backdrop-blur-sm">
                    <Store className="size-3.5" aria-hidden />
                    {t("landing.services.eyebrow")}
                  </span>
                  <h2 className="mt-4 max-w-2xl font-display text-3xl font-extrabold leading-[1.05] text-on-dark sm:text-5xl lg:text-[3.25rem]">
                    {t("landing.services.title")}
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-on-dark/80 sm:text-base">
                    {t("landing.services.copy")}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-on-dark/10 px-3 py-1 text-xs font-medium text-on-dark/85 backdrop-blur-sm">
                      <Star className="size-3.5 text-gold" aria-hidden />
                      {t("landing.services.reviews")}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-on-dark/10 px-3 py-1 text-xs font-medium text-on-dark/85 backdrop-blur-sm">
                      <Smartphone className="size-3.5" aria-hidden />
                      {t("landing.services.chat")}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-on-dark/10 px-3 py-1 text-xs font-medium text-on-dark/85 backdrop-blur-sm">
                      <ShieldCheck className="size-3.5" aria-hidden />
                      {t("landing.services.secure")}
                    </span>
                  </div>

                  <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                    <Button
                      asChild
                      size="lg"
                      className="h-12 w-full shadow-[var(--shadow-card)] sm:w-auto"
                    >
                      <Link to="/services">
                        {t("landing.services.cta")}
                        <ArrowRight className="size-4" aria-hidden />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="h-12 w-full border-on-dark/30 bg-transparent text-on-dark hover:bg-on-dark/10 hover:text-on-dark sm:w-auto"
                    >
                      <Link to="/register">{t("landing.services.sell")}</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Premium category strip */}
            <div className="col-span-full grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {CATEGORY_TILES.map((tile) => (
                <Link
                  key={tile.title}
                  to="/services"
                  className="tile group relative overflow-hidden p-0"
                >
                  <div className="relative aspect-[4/5] w-full sm:aspect-[3/4]">
                    <img
                      src={tile.image}
                      alt={t(tile.alt)}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                      width={912}
                      height={1104}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.12_0.02_320_/_0.9)] via-[oklch(0.12_0.02_320_/_0.35)] to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <p className="font-display text-base font-bold text-on-dark sm:text-lg">{t(tile.title)}</p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-on-dark/75 sm:text-xs">
                        {t(tile.copy)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>


            {/* Primary hero tile */}
            <div className="tile-dark grain relative col-span-full flex flex-col justify-between p-7 sm:p-10 lg:col-span-7 lg:min-h-[26rem]">
              <div className="relative">
                <span className="hairline-gold inline-flex items-center gap-2 rounded-full bg-on-dark/10 px-3 py-1 text-xs font-semibold text-on-dark/90">
                  <BadgeCheck className="size-3.5" aria-hidden />
                  {t("landing.badge")}
                </span>
                <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.02] sm:text-5xl lg:text-[3.5rem]">
                  {t("landing.h1a")}
                  <br />
                  {t("landing.h1b")} <span className="gold-text">{t("landing.h1c")}</span>.
                </h1>
                <p className="mt-5 max-w-md text-base leading-relaxed text-on-dark/80">
                  {t("landing.hero.copy")}
                </p>
                <PaymentMethods className="relative mt-7" />
              </div>
              <div className="relative mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="gold-gradient h-12 border-0 text-gold-foreground shadow-[var(--shadow-gold)] hover:opacity-90"
                >
                  <Link to="/register">
                    {t("landing.cta.signup")}
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 border-on-dark/30 bg-transparent text-on-dark hover:bg-on-dark/10 hover:text-on-dark"
                >
                  <Link to="/login">{t("landing.cta.haveAccount")}</Link>
                </Button>
              </div>
            </div>

            {region.referralEnabled ? (
              <>
            {/* Wallet preview tile */}
            <div className="tile col-span-full flex flex-col p-5 sm:p-6 lg:col-span-5">
              <div className="virtual-card grain p-5">
                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="eyebrow opacity-60">{t("landing.balance")}</p>
                    <p className="tabular mt-2 font-display text-[2rem] font-extrabold leading-none">
                      {formatXAF(48750)}
                    </p>
                  </div>
                  <span className="grid size-8 place-items-center rounded-full bg-[color:oklch(1_0_0_/_0.14)]">
                    <Sparkles className="size-4" aria-hidden />
                  </span>
                </div>
                <div className="relative mt-6 flex items-center gap-3">
                  <span className="card-chip block h-7 w-10 rounded-[6px]" aria-hidden />
                  <span className="tabular text-base font-semibold tracking-[0.2em]">•••• 8412</span>
                </div>
                <div className="relative mt-4 flex items-end justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-70">ASH Member</p>
                  <p className="font-display text-sm font-extrabold tracking-[0.22em]">ASH</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                {LEVELS.map((item) => (
                  <div key={item.level} className="rounded-2xl border border-border bg-muted/60 p-3">
                    <p className="text-[11px] font-semibold text-muted-foreground">L{item.level}</p>
                    <p className="tabular font-display text-base font-bold text-foreground">{item.members}</p>
                  </div>
                ))}
              </div>
              <ul className="mt-5 space-y-3 border-t border-border pt-4">
                {[
                  { key: "landing.row.l1" as TKey, amount: 1500 },
                  { key: "landing.row.l2" as TKey, amount: 750 },
                  { key: "landing.row.withdrawal" as TKey, amount: -10000 },
                ].map((row) => (
                  <li key={row.key} className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate text-muted-foreground">{t(row.key)}</span>
                    <span
                      className={`tabular font-semibold ${row.amount > 0 ? "text-primary" : "text-foreground"}`}
                    >
                      {row.amount > 0 ? "+" : ""}
                      {formatXAF(row.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Commission tiles */}
            {LEVELS.map((item) => (
              <div key={item.level} className="tile col-span-full p-6 sm:col-span-1 lg:col-span-4">
                <div className="flex items-center justify-between">
                  <span className="hairline-gold grid size-10 place-items-center rounded-2xl bg-gold-soft font-display text-sm font-bold text-gold-foreground">
                    L{item.level}
                  </span>
                  <ArrowUpRight className="size-4 text-muted-foreground" aria-hidden />
                </div>
                <p className="tabular mt-5 font-display text-3xl font-extrabold text-foreground">
                  {formatXAF(item.amount)}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">{t(item.label)}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t(item.copy)}</p>
              </div>
            ))}
              </>
            ) : null}
          </div>
        </section>

        {/* Steps */}
        {region.referralEnabled ? (
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <div className="max-w-2xl">
            <p className="eyebrow text-primary">{t("landing.how.eyebrow")}</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold text-foreground sm:text-4xl">
              {t("landing.how.title")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t("landing.how.copy", { fee })}
            </p>
          </div>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="tile p-6">
                <span className="tabular font-display text-2xl font-extrabold text-gold">
                  0{index + 1}
                </span>
                <p className="mt-4 font-semibold text-foreground">{t(step.title, { fee })}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(step.copy)}</p>
              </li>
            ))}
          </ol>
        </section>

        ) : null}

        {/* Features bento */}
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <div className="max-w-2xl">
            <p className="eyebrow text-primary">{t("landing.platform.eyebrow")}</p>
            <h2 className="mt-3 font-display text-3xl font-extrabold text-foreground sm:text-4xl">
              {t("landing.platform.title")}
            </h2>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {FEATURES.map((feature, index) => (
              <div
                key={feature.title}
                className={`tile p-6 ${index < 2 ? "lg:col-span-3" : "lg:col-span-2"}`}
              >
                <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <feature.icon className="size-5" aria-hidden />
                </span>
                <p className="mt-5 font-semibold text-foreground">{t(feature.title)}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {t(feature.copy, { min: formatXAF(MIN_WITHDRAWAL) })}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="tile-dark grain px-6 py-14 text-center sm:px-10">
            <p className="eyebrow relative text-gold">{t("landing.final.eyebrow")}</p>
            <h2 className="relative mt-3 font-display text-3xl font-extrabold sm:text-4xl">
              {t("landing.final.title")}
            </h2>
            <p className="relative mx-auto mt-3 max-w-xl text-sm text-on-dark/80 sm:text-base">
              {t("landing.final.copy")}
            </p>
            <Button
              asChild
              size="lg"
              className="gold-gradient relative mt-7 h-12 border-0 text-gold-foreground shadow-[var(--shadow-gold)] hover:opacity-90"
            >
              <Link to="/register">
                {t("landing.final.cta")}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-3 px-4 py-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6">
          <Logo compact />
          <div className="flex flex-col gap-1 sm:items-end">
            <p className="text-xs text-muted-foreground">
              {t("landing.footer", { year: new Date().getFullYear() })}
            </p>
            <Link to="/privacy" className="text-xs font-medium text-primary hover:underline">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
