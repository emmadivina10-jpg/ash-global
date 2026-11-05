import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Aperture,
  Clapperboard,
  Flame,
  GraduationCap,
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
  { to: "/spotlight", en: "Spotlight", fr: "Spotlight", icon: Aperture },
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
  const { tx, lang } = useI18n();
  const servicesMode = useServicesMode();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [expanded, setExpanded] = useState(false);
  const dockRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!expanded) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (dockRef.current && !dockRef.current.contains(event.target as Node)) {
        setExpanded(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [expanded]);

  const activeTab = GUEST_TABS.findIndex(
    (item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
  );
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
              "app-shell-scroll min-h-0 min-w-0 flex-1 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8 lg:pb-10",
              pathname === "/discover" ? "pt-0" : "pt-5",
            )}
          >
            {children}
          </main>
        </div>
      </div>

      <nav
        ref={dockRef}
        aria-label={tx("Main navigation", "Navigation principale")}
        className={cn("premium-mobile-nav ash-orbit fixed z-40", expanded && "is-expanded")}
        data-expanded={expanded}
      >
        <button
          type="button"
          className="ash-orbit-toggle"
          onClick={() => setExpanded((value) => !value)}
          aria-label={
            expanded
              ? tx("Collapse navigation", "Réduire la navigation")
              : tx("Expand navigation", "Développer la navigation")
          }
          aria-expanded={expanded}
        >
          <span className="ash-orbit-brand-mark">A</span>
          {expanded ? (
            <ChevronRight className="size-4" aria-hidden />
          ) : (
            <ChevronLeft className="size-4" aria-hidden />
          )}
        </button>

        <div className="ash-orbit-divider" />

        <ul className="ash-orbit-list">
          {GUEST_TABS.map((item) => {
            const active = pathname === item.to || pathname.startsWith(`${item.to}/`);

            return (
              <li key={item.to} className="ash-orbit-entry">
                <Link
                  to={item.to}
                  onClick={() => setExpanded(false)}
                  aria-current={active ? "page" : undefined}
                  aria-label={label(item)}
                  title={!expanded ? label(item) : undefined}
                  className={cn("ash-orbit-link", active && "is-active")}
                >
                  <span className="ash-orbit-icon">
                    <item.icon className="size-5" aria-hidden />
                  </span>
                  <span className="ash-orbit-label">{label(item)}</span>
                  {active && <span className="ash-orbit-active-dot" aria-hidden />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
