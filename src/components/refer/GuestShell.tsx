import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BriefcaseBusiness, Building2, CalendarDays, Clapperboard, Flame, GraduationCap, LogIn, Search, Sparkles, Store,
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
import { DesktopSidebar } from "./DesktopSidebar";

type GuestNavItem = { to: string; en: string; fr: string; icon: typeof Store };
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

export function GuestShell({ children }: { children: ReactNode }) {
  const { tx, lang } = useI18n();
  const servicesMode = useServicesMode();
  const newNav = useFeatureFlags().new_nav === true;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navItems = GUEST_NAV.filter((item) => !isTabRemoved(item, { newNav })).map((item) => resolveTab(item, { newNav, servicesMode }));
  const tabItems = GUEST_TABS.filter((item) => !isTabRemoved(item, { newNav })).map((item) => resolveTab(item, { newNav, servicesMode }));
  const label = (item: { en?: string; fr?: string }) => (lang === "fr" ? item.fr : item.en) ?? item.en ?? "";
  const tabs = [...tabItems, { to: "/login", en: "Sign in", fr: "Connexion", icon: LogIn }];
  const activeTab = Math.max(0, tabs.findIndex((item) => pathname === item.to || pathname.startsWith(`${item.to}/`)));
  const gridRef = useRef<HTMLUListElement>(null);
  const [heldIndex, setHeldIndex] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gesture = useRef<{ id: number; x: number; y: number; held: boolean; index: number } | null>(null);
  const suppressClick = useRef(false);
  const clearTimer = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
  useEffect(() => () => clearTimer(), []);
  const indexAt = (x: number) => {
    const rect = gridRef.current?.getBoundingClientRect();
    return rect ? Math.max(0, Math.min(tabs.length - 1, Math.floor((x - rect.left) / (rect.width / tabs.length)))) : 0;
  };
  const startHold = (event: React.PointerEvent<HTMLUListElement>) => {
    if (event.button !== 0) return;
    const index = indexAt(event.clientX);
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, held: false, index };
    timer.current = setTimeout(() => {
      if (!gesture.current) return;
      gesture.current.held = true;
      suppressClick.current = true;
      gridRef.current?.setPointerCapture(event.pointerId);
      setHeldIndex(index);
    }, 380);
  };
  const moveHold = (event: React.PointerEvent<HTMLUListElement>) => {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    if (!current.held && Math.hypot(event.clientX - current.x, event.clientY - current.y) > 12) {
      clearTimer();
      gesture.current = null;
    } else if (current.held) {
      current.index = indexAt(event.clientX);
      setHeldIndex(current.index);
    }
  };
  const endHold = (event: React.PointerEvent<HTMLUListElement>, cancelled = false) => {
    clearTimer();
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    gesture.current = null;
    setHeldIndex(null);
    if (!current.held) return;
    if (gridRef.current?.hasPointerCapture(event.pointerId)) gridRef.current.releasePointerCapture(event.pointerId);
    const rect = gridRef.current?.getBoundingClientRect();
    if (cancelled || !rect || event.clientY < rect.top - 100 || event.clientY > rect.bottom + 60) return;
    const target = tabs[indexAt(event.clientX)];
    if (target && target.to !== pathname) window.location.assign(target.to);
  };
  const heldTab = heldIndex === null ? null : tabs[heldIndex];

  return (
    <div className="app-shell safe-top min-h-dvh bg-background">
      <div className="app-shell-frame flex w-full">
        <DesktopSidebar compactFooter={<><ThemeToggle /><Button asChild variant="ghost" size="icon"><Link to="/login" title={tx("Sign in", "Se connecter")} aria-label={tx("Sign in", "Se connecter")}><LogIn /></Link></Button></>}>
          <div className="flex items-center justify-between gap-2"><LanguageSwitcher /><ThemeToggle /></div>
          <div className="mt-3 border-t border-border pt-3"><p className="text-sm font-semibold text-foreground">{tx("Join ASH Glo", "Rejoignez ASH Glo")}</p><Button asChild className="mt-3 h-10 w-full"><Link to="/register">{tx("Create account", "Créer un compte")}</Link></Button><Button asChild variant="outline" className="mt-2 h-10 w-full"><Link to="/login">{tx("Sign in", "Se connecter")}</Link></Button></div>
          <nav className="flex flex-1 flex-col gap-0.5" aria-label={tx("Browse", "Parcourir")}>{navItems.map((item) => <Link key={item.to} to={item.to} title={label(item)} aria-label={label(item)} aria-current={pathname === item.to ? "page" : undefined} className={cn("desktop-nav-link group relative flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium text-foreground transition-colors hover:bg-sidebar-accent", pathname === item.to && "bg-primary/10 font-semibold text-primary")}><span className="grid size-9 shrink-0 place-items-center text-primary"><MemberNavIcon icon={item.icon} active={pathname === item.to} /></span><span className="desktop-nav-label truncate">{label(item)}</span></Link>)}</nav>
        </DesktopSidebar>
        <div className="app-shell-column flex min-w-0 flex-1 flex-col">
          {pathname !== "/discover" ? <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl lg:hidden"><div className="flex items-center justify-between gap-3 px-4 py-2"><Link to="/feed" className="min-w-0"><Logo compact /></Link><div className="flex items-center gap-1"><LanguageSwitcher /><ThemeToggle /><Link to="/login" className="ml-1"><Button size="sm" className="h-9 rounded-full px-4"><LogIn className="size-4" aria-hidden />{tx("Sign in", "Se connecter")}</Button></Link></div></div></header> : null}
          <main className="app-shell-scroll min-h-0 min-w-0 flex-1 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:px-8 lg:pb-10">{! ["/", "/feed", "/discover", "/services", "/spotlight", "/search", "/login", "/register"].includes(pathname.replace(/\/$/, "") || "/") ? <AutoBackButton home={newNav ? "/discover" : "/feed"} /> : null}{children}</main>
        </div>
      </div>
      <nav aria-label={tx("Main navigation", "Navigation principale")} className="premium-mobile-nav fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <ul ref={gridRef} className="premium-nav-grid relative mx-auto grid h-[3.75rem] max-w-lg items-stretch" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }} onPointerDown={startHold} onPointerMove={moveHold} onPointerUp={(event) => endHold(event)} onPointerCancel={(event) => endHold(event, true)} onLostPointerCapture={() => { clearTimer(); gesture.current = null; setHeldIndex(null); }} onContextMenu={(event) => event.preventDefault()} onClickCapture={(event) => { if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false; } }}>
          <span aria-hidden="true" className="member-tab-indicator" style={{ width: `${100 / tabs.length}%`, transform: `translateX(${activeTab * 100}%)` }} />
          {heldTab ? <li className="member-tab-bubble" aria-hidden="true"><span className="member-tab-bubble-icon"><MemberNavIcon icon={heldTab.icon} active /></span></li> : null}
          {tabItems.map((item) => {
            const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
            return <li key={item.to} className="min-w-0"><Link to={item.to} aria-label={label(item)} title={label(item)} aria-current={active ? "page" : undefined} onClick={(event) => { if (suppressClick.current) { event.preventDefault(); return; } }} className={cn("premium-nav-item relative flex h-[3.75rem] min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 pt-1 text-[10px] font-semibold", active ? "text-primary" : "text-muted-foreground")}><span className="nav-tab-icon grid size-7 place-items-center"><MemberNavIcon icon={item.icon} active={active} /></span></Link></li>;
          })}
          <li className="min-w-0"><Link to="/login" aria-label={tx("Sign in", "Connexion")} title={tx("Sign in", "Connexion")} aria-current={pathname === "/login" ? "page" : undefined} className={cn("premium-nav-item relative flex h-[3.75rem] min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 pt-1 text-[10px] font-semibold", pathname === "/login" ? "text-primary" : "text-muted-foreground")}><LogIn className="size-5" aria-hidden /></Link></li>
        </ul>
      </nav>
    </div>
  );
}
