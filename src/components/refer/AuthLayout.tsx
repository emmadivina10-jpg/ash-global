import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, Sparkles, Users } from "lucide-react";
import { Logo } from "./Logo";
import { LanguageSwitcher, ThemeToggle } from "./Preferences";
import ashLogo from "@/assets/ash-logo.png.asset.json";
import { useI18n } from "@/lib/i18n";

/**
 * Two-panel auth shell: a cinematic brand panel on large screens and a clean,
 * card-free form column that stays comfortable on the smallest phones.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";

  const points = [
    {
      icon: Users,
      en: "One account for services, hiring, property and social",
      fr: "Un compte pour les services, l'emploi, l'immobilier et le social",
    },
    {
      icon: Sparkles,
      en: "Referral rewards in eligible Cameroon and Nigeria accounts",
      fr: "Récompenses de parrainage pour les comptes éligibles au Cameroun et au Nigeria",
    },
    {
      icon: ShieldCheck,
      en: "MTN and Orange Money in supported payment flows",
      fr: "MTN et Orange Money selon les paiements disponibles",
    },
  ];

  return (
    <div className="ash-entry min-h-dvh bg-background lg:grid lg:grid-cols-[1.05fr_minmax(0,1fr)]">
      {/* Brand panel — desktop only */}
      <aside className="ash-entry-brand relative hidden overflow-hidden border-r border-border lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="relative">
          <Link to="/" className="inline-flex">
            <Logo />
          </Link>
        </div>

        <div className="relative max-w-md">
          <img
            src={ashLogo.url}
            alt=""
            aria-hidden
            className="size-20 rounded-2xl object-cover shadow-raised"
          />
          <h2 className="ash-entry-title mt-6 font-display text-4xl font-extrabold leading-tight">
            {tx("Where opportunities connect.", "Là où les opportunités se connectent.")}
          </h2>
          <ul className="mt-8 space-y-4">
            {points.map((p) => (
              <li key={p.en} className="flex items-start gap-3 text-sm text-foreground">
                <span className="member-dual-wash mt-0.5 grid size-8 shrink-0 place-items-center rounded-full text-primary">
                  <p.icon className="size-4" aria-hidden />
                </span>
                <span>{fr ? p.fr : p.en}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-muted-foreground">
          {tx("ASH Glo — Where Opportunities Connect.", "ASH Glo — Là où les opportunités se connectent.")}
        </p>
      </aside>

      {/* Form column */}
      <div className="safe-top flex min-h-dvh flex-col">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 py-5 sm:px-8">
          <Link to="/" className="min-w-0 lg:invisible">
            <Logo />
          </Link>
          <div className="flex items-center gap-1.5">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex flex-1 items-start justify-center px-5 pb-16 sm:px-8 sm:items-center">
          <div className="w-full max-w-[26rem]">
            <div className="mb-7">
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
