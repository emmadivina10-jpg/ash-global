import { type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Aperture,
  Clapperboard,
  Flame,
  GraduationCap,
  House,
  Menu,
  MessageCircle,
  Search,
  Sparkles,
  Store,
} from "lucide-react";
import { Logo } from "./Logo";
import { LanguageSwitcher, ThemeToggle } from "./Preferences";
import { useI18n } from "@/lib/i18n";
import { useServicesMode } from "@/lib/services-mode";
import { cn } from "@/lib/utils";

type GuestNavItem = {
  to: string;
  en: string;
  fr: string;
  icon: typeof Store;
};

const GUEST_NAV: GuestNavItem[] = [
  { to: "/feed", en: "Feed", fr: "Fil", icon: Flame },
  { to: "/discover", en: "Discover", fr: "Découvrir", icon: Clapperboard },
  { to: "/services", en: "Services", fr: "Services", icon: Sparkles },
  { to: "/spotlight", en: "Spotlight", fr: "Spotlight", icon: Aperture },
  { to: "/campus", en: "Learn", fr: "Apprendre", icon: GraduationCap },
  { to: "/jobs", en: "Jobs", fr: "Emplois", icon: BriefcaseBusiness },
  { to: "/property", en: "Property", fr: "Immobilier", icon: Building2 },
  { to: "/events", en: "Events", fr: "Événements", icon: CalendarDays },
  { to: "/deals", en: "Deals", fr: "Bons plans", icon: Flame },
  { to: "/search", en: "Search", fr: "Rechercher", icon: Search },
];

const GUEST_TABS: GuestNavItem[] = [
  { to: "/discover", en: "Discover", fr: "Découvrir", icon: Clapperboard },
  { to: "/services", en: "Services", fr: "Services", icon: Sparkles },
  { to: "/feed", en: "Home", fr: "Accueil", icon: House },
  { to: "/messages", en: "Messages", fr: "Messages", icon: MessageCircle },
  { to: "/menu", en: "Menu", fr: "Menu", icon: Menu },
];

/** ASH-branded tile colours for the side menu icons, cycled in order. */
const SIDE_TILES = ["gold-gradient", "brand-gradient", "bg-gold", "bg-primary"];

/**
 * Public shell for signed-out visitors; account prompts are shown when an
 * action requires authentication rather than blocking browsing.
 */
export function GuestShell({ children }: { children: ReactNode }) {
  const { lang } = useI18n();
  const servicesMode = useServicesMode();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const label = (item: GuestNavItem) =>
    item.to === "/services" && servicesMode === "market"
      ? "Shop"
      : lang === "fr"
        ? item.fr
        : item.en;

  return (
    <div className="app-shell safe-top min-h-dvh bg-background">
      <div className="app-shell-frame flex w-full">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto overscroll-contain border-r border-border bg-sidebar p-5 lg:flex">
          <Link to="/feed" className="mb-8 inline-flex">
            <Logo />
          </Link>
          <nav className="flex flex-1 flex-col gap-0.5">
            {GUEST_NAV.map((item, index) => (
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
                    "icon-luxe-surface grid size-9 shrink-0 place-items-center rounded-[0.8rem] text-primary-foreground shadow-sm ring-1 ring-border/40 transition-transform group-hover:scale-105",
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
        </aside>

        <div className="app-shell-column flex min-w-0 flex-1 flex-col">
          {pathname !== "/discover" ? (
            <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl lg:hidden">
              <div className="flex items-center justify-between gap-3 px-4 py-2">
                <Link to="/feed" className="min-w-0">
                  <Logo compact />
                </Link>
                <div className="flex items-center gap-1">
                  <LanguageSwitcher />
                  <ThemeToggle />
                </div>
              </div>
            </header>
          ) : null}

          <main
            className={cn(
              "app-shell-scroll min-h-0 min-w-0 flex-1 px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:pb-10",
              pathname === "/discover" ? "px-0 pt-0 sm:px-0" : "pt-5",
            )}
          >
            {children}
          </main>
        </div>
      </div>

      <nav
        className="premium-mobile-nav fixed inset-x-0 z-40 lg:hidden"
        aria-label={lang === "fr" ? "Navigation principale" : "Main navigation"}
      >
        <ul className="premium-nav-pill nav-bar-fill grid h-[3.75rem] grid-cols-5 border-t border-border">
          {GUEST_TABS.map((item) => {
            const active = pathname === item.to || pathname.startsWith(`${item.to}/`);

            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  aria-label={label(item)}
                  className="premium-nav-item flex h-full flex-col items-center justify-center gap-1 pt-1 text-[10px] font-semibold"
                >
                  <span className="relative grid size-7 place-items-center">
                    <item.icon className="size-5" aria-hidden />
                  </span>
                  <span className="truncate leading-none">{label(item)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
