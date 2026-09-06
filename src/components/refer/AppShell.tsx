import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  ArrowDownToLine,
  BarChart3,
  Briefcase,
  CalendarDays,
  Flame,
  PlusCircle,
  Store,
  TrendingUp,
  LogOut,
  MessageCircle,
  Receipt,
  Search,
  Settings as SettingsIcon,
  Shield,
  Sparkles,
  Menu,
  Users,
  User as UserIcon,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, useProfile } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AshOrb } from "./AshOrb";
import { StatusBadge } from "./StatusBadge";
import { NotificationBell } from "./NotificationBell";
import { PushBridge } from "./PushBridge";
import { WelcomeIntro, welcomeSeen } from "./WelcomeIntro";
import { OnboardingTips } from "./OnboardingTips";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Logo } from "./Logo";
import { LanguageSwitcher, ThemeToggle } from "./Preferences";
import { useI18n, type TKey } from "@/lib/i18n";
import { useRegion } from "@/lib/region-context";
import { RegionSwitcher } from "./RegionSwitcher";
import { cn } from "@/lib/utils";

type NavItem = { to: string; key: TKey; label?: string; icon: typeof Store; referralOnly?: boolean };

const NAV: NavItem[] = [
  { to: "/services", key: "nav.services" as TKey, icon: Store },
  { to: "/search", key: "nav.search" as TKey, label: "Search", icon: Search },
  { to: "/create", key: "nav.create" as TKey, label: "Create", icon: PlusCircle },
  { to: "/messages", key: "nav.messages" as TKey, icon: MessageCircle },
  { to: "/wallet", key: "nav.wallet" as TKey, icon: Wallet },
];

const SIDE_EXTRA: NavItem[] = [
  { to: "/property", key: "nav.property" as TKey, label: "Property", icon: Building2 },
  { to: "/deals", key: "nav.deals" as TKey, label: "Deals", icon: Flame },
  { to: "/events", key: "nav.events" as TKey, label: "Events", icon: CalendarDays },
  { to: "/freelance", key: "nav.freelance" as TKey, label: "Freelance", icon: Briefcase },
  { to: "/dashboard", key: "nav.home" as TKey, icon: TrendingUp, referralOnly: true },
  { to: "/network", key: "nav.network" as TKey, icon: Users, referralOnly: true },
  { to: "/analytics", key: "nav.analytics" as TKey, label: "Analytics", icon: BarChart3 },
  { to: "/profile", key: "nav.profile" as TKey, icon: UserIcon },
  { to: "/bookings", key: "nav.bookings" as TKey, icon: CalendarDays },
  { to: "/studio", key: "nav.pro" as TKey, icon: Sparkles },
  { to: "/transactions", key: "nav.transactions" as TKey, icon: Receipt },
  { to: "/withdraw", key: "nav.withdraw" as TKey, icon: ArrowDownToLine, referralOnly: true },
  { to: "/settings", key: "nav.settings" as TKey, icon: SettingsIcon },
];


export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const { data: isAdmin } = useIsAdmin();
  const { t } = useI18n();
  const region = useRegion();
  const visible = (items: NavItem[]) =>
    items.filter((item) => !item.referralOnly || region.referralEnabled);
  const [moreOpen, setMoreOpen] = useState(false);
  const [introDone, setIntroDone] = useState(() => (typeof window === "undefined" ? false : welcomeSeen()));
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  const links = visible([...NAV, ...SIDE_EXTRA]);

  return (
    <div className="min-h-screen bg-background">
      <PushBridge />
      <div className="mx-auto flex w-full max-w-7xl">

        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-sidebar p-5 lg:flex">
          <Link to="/services" className="mb-8 inline-flex">
            <Logo />
          </Link>
          <nav className="flex flex-1 flex-col gap-1">
            {links.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  pathname === item.to &&
                    "bg-primary/10 font-semibold text-primary before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-gold",
                )}
              >
                <item.icon className="size-4 shrink-0" aria-hidden />
                {t(item.key)}
              </Link>
            ))}
            {isAdmin ? (
              <a
                href="/console"
                className="relative mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent"
              >
                <Shield className="size-4 shrink-0" aria-hidden />
                {t("nav.admin")}
              </a>
            ) : null}

          </nav>
          <RegionSwitcher className="mt-4 w-full justify-start" />
          <div className="mt-3 flex items-center justify-between gap-2">
            <LanguageSwitcher />
            <div className="flex items-center gap-1">
              <NotificationBell />
              <ThemeToggle />
            </div>
          </div>
          <div className="mt-3 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2">
              <ProfileAvatar name={profile?.full_name} url={profile?.avatar_url} />
              <p className="min-w-0 truncate text-sm font-semibold text-foreground">
                {profile?.full_name || t("shell.member")}
              </p>
            </div>
            <StatusBadge
              status={profile?.account_status ?? "PENDING"}
              label={profile?.account_status === "ACTIVE" ? t("shell.active") : t("shell.pending")}
              className="mt-2"
            />
            <Button variant="ghost" size="sm" className="mt-3 w-full justify-start" onClick={signOut}>
              <LogOut className="size-4" aria-hidden />
              {t("shell.signOut")}
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl lg:hidden">
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 py-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    data-tour="profile"
                    aria-label={t("nav.profile")}
                    className="rounded-full ring-offset-background transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:opacity-80"
                  >
                    <ProfileAvatar name={profile?.full_name} url={profile?.avatar_url} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-60">
                  <DropdownMenuLabel className="space-y-1">
                    <p className="truncate text-sm font-semibold">{profile?.full_name || t("shell.member")}</p>
                    <StatusBadge
                      status={profile?.account_status ?? "PENDING"}
                      label={profile?.account_status === "ACTIVE" ? t("shell.active") : t("shell.pending")}
                    />
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => navigate({ to: "/profile" })}>
                    <UserIcon className="size-4" aria-hidden />
                    {t("nav.profile")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate({ to: "/settings" })}>
                    <SettingsIcon className="size-4" aria-hidden />
                    {t("nav.settings")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void signOut()}>
                    <LogOut className="size-4" aria-hidden />
                    {t("shell.signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Link to="/services" className="min-w-0">
                <Logo compact />
              </Link>
              <div className="flex items-center gap-1">
                <NotificationBell />
                <ThemeToggle />
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10">{children}</main>
        </div>
      </div>

      {(() => {
        const items = visible(NAV);
        const centerItem = items.find((item) => item.to === "/create");
        const sideItems = items.filter((item) => item.to !== "/create");
        const left = sideItems.slice(0, Math.ceil(sideItems.length / 2));
        const right = sideItems.slice(Math.ceil(sideItems.length / 2));
        const renderTab = (item: NavItem) => {
          const active = pathname === item.to;
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold transition-all duration-300",
                  active ? "-translate-y-0.5 text-primary" : "text-muted-foreground",
                )}
              >
                {active ? (
                  <span
                    className="brand-gradient absolute top-0 h-1 w-10 rounded-full transition-all duration-300"
                    aria-hidden
                  />
                ) : null}
                <item.icon className="size-5" aria-hidden />
                {t(item.key)}
              </Link>
            </li>
          );
        };
        return (
          <nav className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
            {centerItem ? (
              <Link
                to={centerItem.to}
                aria-label={t(centerItem.key)}
                className="brand-gradient absolute left-1/2 top-0 z-10 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-primary-foreground shadow-[var(--shadow-brand)] ring-4 ring-background transition-transform duration-300 active:scale-95"
              >
                <centerItem.icon className="size-6" aria-hidden />
              </Link>
            ) : null}
            <div className="ash-glass nav-cutout border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)]">
              <ul className="mx-auto grid max-w-lg grid-cols-6">
                {left.map(renderTab)}
                <li aria-hidden>{centerItem ? <span className="block min-h-14" /> : null}</li>
                {right.map(renderTab)}
                <li>
            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="relative flex min-h-14 w-full flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold text-muted-foreground transition-colors"
                >
                  <Menu className="size-5" aria-hidden />
                  {t("nav.more")}
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-3xl">
                <SheetHeader>
                  <SheetTitle>{t("nav.more")}</SheetTitle>
                </SheetHeader>
                <div className="grid grid-cols-3 gap-3 px-4 pb-8">
                  {visible(SIDE_EXTRA).map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center text-xs font-semibold text-foreground",
                        pathname === item.to && "border-primary/50 text-primary",
                      )}
                    >
                      <item.icon className="size-5" aria-hidden />
                      {t(item.key)}
                    </Link>
                  ))}
                  {isAdmin ? (
                    <a
                      href="/console"
                      className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center text-xs font-semibold text-foreground"
                    >
                      <Shield className="size-5" aria-hidden />
                      {t("nav.admin")}
                    </a>
                  ) : null}
                </div>
              </SheetContent>
            </Sheet>
                </li>
              </ul>
            </div>
          </nav>
        );
      })()}

      <AshOrb />
    </div>
  );
}
