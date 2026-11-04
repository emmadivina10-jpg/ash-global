import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Clapperboard,
  Flame,
  GraduationCap,
  LogIn,
  Search,
  Sparkles,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";
import { MemberNavIcon } from "./MemberNavIcon";
import { LanguageSwitcher, ThemeToggle } from "./Preferences";
import { useI18n } from "@/lib/i18n";
import { useServicesMode } from "@/lib/services-mode";
import { useFeatureFlags } from "@/lib/feature-flags";
import { isTabRemoved, resolveTab } from "@/lib/member-tabs";
import { AutoBackButton } from "@/components/refer/AutoBackButton";
import { cn } from "@/lib/utils";

type GuestNavItem = {
  to: string;
  en: string;
  fr: string;
  icon: typeof Store;
};

const GUEST_NAV: GuestNavItem[] = [
  { to: "/feed", en: "Feed", fr: "Fil", icon: Flame },
  { to: "/services", en: "Services", fr: "Services", icon: Sparkles },
  { to: "/spotlight", en: "Spotlight", fr: "Spotlight", icon: Clapperboard },
  { to: "/campus", en: "Learn", fr: "Apprendre", icon: GraduationCap },
  { to: "/jobs", en: "Jobs", fr: "Emplois", icon: BriefcaseBusiness },
  { to: "/property", en: "Property", fr: "Immobilier", icon: Building2 },
  { to: "/events", en: "Events", fr: "Événements", icon: CalendarDays },
  { to: "/deals", en: "Deals", fr: "Bons plans", icon: Flame },
  { to: "/search", en: "Search", fr: "Rechercher", icon: Search },
];

const GUEST_TABS: GuestNavItem[] = [
  { to: "/feed", en: "Feed", fr: "Fil", icon: Flame },
  { to: "/services", en: "Services", fr: "Services", icon: Sparkles },
  { to: "/spotlight", en: "Spotlight", fr: "Spotlight", icon: Clapperboard },
  { to: "/search", en: "Search", fr: "Rechercher", icon: Search },
];

/** ASH-branded tile colours for the side menu icons, cycled in order. */
const SIDE_TILES = ["gold-gradient", "brand-gradient", "bg-gold", "bg-primary"];

/**
 * Public shell for signed-out visitors: same ASH navigation as members, but
 * the account areas offer Sign in / Create account instead of member tools.
 */
export function GuestShell({ children }: { children: ReactNode }) {
  const { tx, lang } = useI18n();
  const servicesMode = useServicesMode();
  const newNav = useFeatureFlags().new_nav === true;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Same destinations in the same order; the switch only re-points three slots.
  const navItems = GUEST_NAV.filter((item) => !isTabRemoved(item, { newNav })).map((item) => resolveTab(item, { newNav, servicesMode }));
  const tabItems = GUEST_TABS.filter((item) => !isTabRemoved(item, { newNav })).map((item) => resolveTab(item, { newNav, servicesMode }));
  const label = (item: { en?: string; fr?: string }) =>
    (lang === "fr" ? item.fr : item.en) ?? item.en ?? "";

  return (
    <div className="app-shell safe-top min-h-dvh bg-background">
      <div className="app-shell-frame flex w-full">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto overscroll-contain border-r border-border bg-sidebar p-5 lg:flex">
          <Link to="/feed" className="mb-8 inline-flex">
            <Logo />
          </Link>
          <nav className="flex flex-1 flex-col gap-0.5">
            {navItems.map((item, index) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-sidebar-accent",
                  pathname === item.to && "bg-primary/10 font-semibold text-primary",
                )}
              >
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-[0.8rem] text-primary-foreground shadow-sm ring-1 ring-border/40 transition-transform group-hover:scale-105",
                    SIDE_TILES[index % SIDE_TILES.length],
                  )}
                >
                  <item.icon className="size-[18px]" aria-hidden />
                </span>
                <span className="truncate">{label(item)}</span>
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex items-center justify-between gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          <div className="mt-3 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
            <p className="text-sm font-semibold text-foreground">
              {tx("Join ASH Glo", "Rejoignez ASH Glo")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {tx(
                "Create a free account to buy, book, learn and earn.",
                "Créez un compte gratuit pour acheter, réserver, apprendre et gagner.",
              )}
            </p>
            <Link to="/register" className="mt-3 block">
              <Button className="auth-cta h-10 w-full rounded-xl">
                {tx("Create account", "Créer un compte")}
              </Button>
            </Link>
            <Link to="/login" className="mt-2 block">
              <Button variant="outline" className="h-10 w-full rounded-xl">
                {tx("Sign in", "Se connecter")}
              </Button>
            </Link>
          </div>
        </aside>

        <div className="app-shell-column flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl lg:hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-2">
              <Link to="/feed" className="min-w-0">
                <Logo compact />
              </Link>
              <div className="flex items-center gap-1">
                <LanguageSwitcher />
                <ThemeToggle />
                <Link to="/login" className="ml-1">
                  <Button size="sm" className="h-9 rounded-full px-4">
                    <LogIn className="size-4" aria-hidden />
                    {tx("Sign in", "Se connecter")}
                  </Button>
                </Link>
              </div>
            </div>
          </header>

          <main className="app-shell-scroll min-h-0 min-w-0 flex-1 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:px-8 lg:pb-10">
            {!["/", "/feed", "/discover", "/services", "/spotlight", "/search", "/login", "/register"].includes(pathname.replace(/\/$/, "") || "/") ? (
              <AutoBackButton home={newNav ? "/discover" : "/feed"} />
            ) : null}
            {children}
          </main>
        </div>
      </div>

      <nav
        aria-label={tx("Main navigation", "Navigation principale")}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${tabItems.length + 1}, minmax(0, 1fr))` }}>
          {tabItems.map((item) => {
            const active = pathname === item.to;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  aria-label={label(item)}
                  title={label(item)}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2 text-[10px] font-semibold transition-colors",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <MemberNavIcon icon={item.icon} active={active} />
                </Link>
              </li>
            );
          })}
          <li>
            <Link
              to="/login"
              aria-label={tx("Sign in", "Connexion")}
              title={tx("Sign in", "Connexion")}
              className="flex flex-col items-center gap-1 py-2 text-[10px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogIn className="size-5" aria-hidden />

            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
