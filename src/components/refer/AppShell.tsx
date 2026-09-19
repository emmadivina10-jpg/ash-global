import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
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
  BookOpen,
  BriefcaseBusiness,
  GraduationCap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, useProfile } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AshOrb } from "./AshOrb";
import { MobileNav } from "./MobileNav";
import { LocationNudge } from "./LocationNudge";
import { StatusBadge } from "./StatusBadge";
import { NotificationBell } from "./NotificationBell";
import { PushBridge } from "./PushBridge";
import { WelcomeIntro } from "./WelcomeIntro";
import { SwipeBack } from "./SwipeBack";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAvatarUrl } from "./AvatarUpload";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Logo } from "./Logo";
import { RightRail } from "./RightRail";
import { DesktopMenu, WEB_MENU_CREATE, WEB_MENU_GROUPS } from "./DesktopMenu";
import { LanguageSwitcher, ThemeToggle } from "./Preferences";
import { useI18n, type TKey } from "@/lib/i18n";
import { useRegion } from "@/lib/region-context";
import { RegionSwitcher } from "./RegionSwitcher";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  key?: TKey;
  en?: string;
  fr?: string;
  label?: string;
  icon: typeof Store;
  referralOnly?: boolean;
  tour?: string;
};

const MOBILE_NAV: NavItem[] = [
  { to: "/feed", en: "Feed", fr: "Fil", icon: Flame, tour: "feed" },
  { to: "/services", en: "Services", fr: "Services", icon: Sparkles, tour: "market" },
  { to: "/wallet", en: "Earn", fr: "Gagner", icon: Wallet, tour: "wallet" },
  { to: "/messages", key: "nav.messages" as TKey, icon: MessageCircle, tour: "messages" },
];

const DESKTOP_NAV: NavItem[] = [
  { to: "/services", key: "nav.services" as TKey, icon: Store, tour: "market" },
  { to: "/feed", en: "Feed", fr: "Fil", icon: Flame, tour: "feed" },
  { to: "/search", key: "nav.search" as TKey, label: "Search", icon: Search, tour: "search" },
  { to: "/create", key: "nav.create" as TKey, label: "Create", icon: PlusCircle, tour: "create" },
  { to: "/messages", key: "nav.messages" as TKey, icon: MessageCircle, tour: "messages" },
  { to: "/notifications", en: "Notifications", fr: "Notifications", icon: Bell },
  { to: "/wallet", key: "nav.wallet" as TKey, icon: Wallet, tour: "wallet" },
];

/** The More sheet, nested into small groups so it stays easy to scan. */
const MORE_GROUPS: { en: string; fr: string; items: NavItem[] }[] = [
  {
    en: "Community",
    fr: "Communauté",
    items: [
      { to: "/feed", en: "Feed", fr: "Fil", icon: Flame },
      { to: "/friends", en: "Friends", fr: "Amis", icon: Users },
      { to: "/groups", en: "Groups", fr: "Groupes", icon: MessageCircle },
      { to: "/articles", key: "nav.articles" as TKey, label: "Articles", icon: BookOpen },
      { to: "/mentors", key: "nav.mentors" as TKey, label: "Mentors", icon: GraduationCap },
      { to: "/incubator", en: "Incubator", fr: "Incubateur", icon: Sparkles },
    ],
  },
  {
    en: "Marketplace",
    fr: "Marché",
    items: [
      { to: "/property", key: "nav.property" as TKey, label: "Property", icon: Building2 },
      { to: "/deals", key: "nav.deals" as TKey, label: "Deals", icon: Flame },
      { to: "/events", key: "nav.events" as TKey, label: "Events", icon: CalendarDays },
      { to: "/freelance", key: "nav.freelance" as TKey, label: "Freelance", icon: Briefcase },
      { to: "/jobs", key: "nav.jobs" as TKey, label: "Jobs", icon: BriefcaseBusiness },
      { to: "/create", key: "nav.create" as TKey, label: "Create", icon: PlusCircle },
    ],
  },
  {
    en: "Earnings",
    fr: "Revenus",
    items: [
      { to: "/wallet", key: "nav.wallet" as TKey, icon: Wallet },
      { to: "/dashboard", key: "nav.home" as TKey, icon: TrendingUp, referralOnly: true },
      { to: "/network", key: "nav.network" as TKey, icon: Users, referralOnly: true },
      { to: "/transactions", key: "nav.transactions" as TKey, icon: Receipt },
      { to: "/withdraw", key: "nav.withdraw" as TKey, icon: ArrowDownToLine, referralOnly: true },
      { to: "/analytics", key: "nav.analytics" as TKey, label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    en: "You",
    fr: "Vous",
    items: [
      { to: "/profile", key: "nav.profile" as TKey, icon: UserIcon },
      { to: "/bookings", key: "nav.bookings" as TKey, icon: CalendarDays },
      { to: "/studio", key: "nav.pro" as TKey, icon: Sparkles },
      { to: "/settings", key: "nav.settings" as TKey, icon: SettingsIcon },
    ],
  },
];

const SIDE_EXTRA: NavItem[] = MORE_GROUPS.flatMap((group) => group.items).filter(
  (item, index, list) => list.findIndex((other) => other.to === item.to) === index,
);


export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const { data: isAdmin } = useIsAdmin();
  const { t, lang } = useI18n();
  const region = useRegion();
  const visible = (items: NavItem[]) =>
    items.filter((item) => !item.referralOnly || region.referralEnabled);
  const navLabel = (item: NavItem) =>
    item.key ? t(item.key) : ((lang === "fr" ? item.fr : item.en) ?? item.label ?? "");
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    let stopped = false;
    const touch = () => {
      if (!stopped) void supabase.rpc("touch_member_presence");
    };
    touch();
    const timer = window.setInterval(touch, 2 * 60_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") touch();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  // Some destinations appear in both lists — show each one once.
  const links = visible([...DESKTOP_NAV, ...SIDE_EXTRA]).filter(
    (item, index, all) => all.findIndex((other) => other.to === item.to) === index,
  );

  return (
    <div className="app-shell safe-top min-h-dvh bg-background">
      <PushBridge />
      <WelcomeIntro />
      <SwipeBack />
      <div className="app-shell-frame mx-auto flex w-full max-w-7xl">

        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-sidebar p-5 lg:flex">
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
                {navLabel(item)}
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

        <div className="app-shell-column flex min-w-0 flex-1 flex-col">
          {/* Web-only top bar: menu panel, notifications and the member photo. */}
          <header className="sticky top-0 z-30 hidden border-b border-border bg-background/85 backdrop-blur-xl lg:block">
            <div className="flex items-center justify-end gap-1.5 px-6 py-2.5">
              <DesktopMenu groups={WEB_MENU_GROUPS} create={WEB_MENU_CREATE} />
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={t("nav.profile")}
                    className="ml-1 rounded-full ring-offset-background transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:opacity-90"
                  >
                    <ProfileAvatar name={profile?.full_name} url={profile?.avatar_url} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 rounded-2xl">
                  <DropdownMenuItem onSelect={() => navigate({ to: "/profile" })} className="gap-3 py-2.5">
                    <ProfileAvatar name={profile?.full_name} url={profile?.avatar_url} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold">
                        {profile?.full_name || t("shell.member")}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {lang === "fr" ? "Voir votre profil" : "See your profile"}
                      </span>
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => navigate({ to: "/settings" })}>
                    <SettingsIcon className="size-4" aria-hidden />
                    {t("nav.settings")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => navigate({ to: "/notifications" })}>
                    <Bell className="size-4" aria-hidden />
                    {lang === "fr" ? "Notifications" : "Notifications"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => void signOut()}>
                    <LogOut className="size-4" aria-hidden />
                    {t("shell.signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

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
                <LanguageSwitcher />
                <ThemeToggle />
              </div>
            </div>
          </header>

          <div className="flex min-h-0 min-w-0 flex-1">
            <main className="app-shell-scroll min-h-0 min-w-0 flex-1 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:px-8 lg:pb-10">{children}</main>
            <RightRail />
          </div>
        </div>
      </div>

      <MobileNav
        items={visible(MOBILE_NAV)}
        moreGroups={MORE_GROUPS.map((group) => ({ ...group, items: visible(group.items) }))}
        isAdmin={Boolean(isAdmin)}
      />

      <LocationNudge />
      <AshOrb />
    </div>
  );
}

/** Small round avatar with the member's initials as the fallback. */
function ProfileAvatar({ name, url }: { name: string | null | undefined; url: string | null | undefined }) {
  const initials = (name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const resolved = useAvatarUrl(url);
  return (
    <Avatar className="aspect-square size-9 shrink-0 overflow-hidden rounded-full border border-border">
      {resolved ? <AvatarImage src={resolved} alt="" className="size-full rounded-full object-cover object-center" /> : null}
      <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
        {initials || "A"}
      </AvatarFallback>
    </Avatar>
  );
}
