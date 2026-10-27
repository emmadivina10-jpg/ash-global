import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
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
  Plane,
  Clapperboard,
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
import { MobileNav } from "./MobileNav";
import { UnreadMessageBadge } from "./UnreadMessageBadge";
import { useUnreadMessageCount } from "@/lib/message-unread";
import { LocationNudge } from "./LocationNudge";
import { StatusBadge } from "./StatusBadge";
import { NotificationBell } from "./NotificationBell";
import { PushBridge } from "./PushBridge";
import { WelcomeIntro } from "./WelcomeIntro";
import { ScrollToTop } from "./ScrollToTop";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAvatarUrl } from "./AvatarUpload";
import { VerifiedBadge } from "./VerifiedBadge";
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
import { PayoutSetupReminder } from "./PayoutSetupReminder";
import { SecurityAlertBanner } from "./SecurityAlertBanner";
import { useServicesMode } from "@/lib/services-mode";
import { PRESENCE_HEARTBEAT_MS } from "@/lib/member-insights";

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
  { to: "/spotlight", en: "Spotlight", fr: "Spotlight", icon: Clapperboard },
  { to: "/messages", key: "nav.messages" as TKey, icon: MessageCircle, tour: "messages" },
];

const DESKTOP_NAV: NavItem[] = [
  { to: "/services", key: "nav.services" as TKey, icon: Store, tour: "market" },
  { to: "/feed", en: "Feed", fr: "Fil", icon: Flame, tour: "feed" },
  { to: "/spotlight", en: "Spotlight", fr: "Spotlight", icon: Clapperboard },
  { to: "/flights", en: "Flights", fr: "Vols", icon: Plane },
  { to: "/search", key: "nav.search" as TKey, label: "Search", icon: Search, tour: "search" },
  { to: "/campus", en: "Learn", fr: "Apprendre", label: "Learn", icon: GraduationCap },
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
      {
        to: "/campus",
        en: "ASH Campus",
        fr: "ASH Campus",
        label: "ASH Campus",
        icon: GraduationCap,
      },
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
      { to: "/withdraw", key: "nav.withdraw" as TKey, icon: ArrowDownToLine },
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

/** How many side links show before "See more". */
const SIDE_PREVIEW = 8;
/** ASH-branded tile colours for the web side menu icons, cycled in order. */
const SIDE_TILES = ["gold-gradient", "brand-gradient", "bg-gold", "bg-primary"];

const SIDE_EXTRA: NavItem[] = MORE_GROUPS.flatMap((group) => group.items).filter(
  (item, index, list) => list.findIndex((other) => other.to === item.to) === index,
);

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const { data: unreadMessages = 0 } = useUnreadMessageCount(profile?.user_id);
  const { data: isAdmin } = useIsAdmin();
  const { t, tx, lang } = useI18n();
  const region = useRegion();
  const servicesMode = useServicesMode();
  const visible = (items: NavItem[]): NavItem[] =>
    items
      .filter((item) => !item.referralOnly || region.referralEnabled)
      .map((item) => {
        if (item.to !== "/services" || servicesMode !== "market") return item;
        const marketItem: NavItem = { ...item, en: "Market", fr: "Market", icon: Store };
        delete marketItem.key;
        return marketItem;
      });
  const navLabel = (item: NavItem) =>
    item.key ? t(item.key) : ((lang === "fr" ? item.fr : item.en) ?? item.label ?? "");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const onFeed = pathname === "/feed" || pathname === "/feed/";
  // Member profiles opened from the feed get a back arrow instead of the logo bar.
  const onMemberProfile = /^\/u\/.+/.test(pathname);
  // Every screen that isn't a main tab gets a Back button to where the member came from.
  const topLevel = ["/feed", "/services", "/services/extras", "/spotlight", "/messages", "/menu"].includes(
    pathname.replace(/\/$/, "") || "/",
  );
  const showBack = onMemberProfile || !topLevel;
  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
    else void navigate({ to: "/feed" });
  };
  const logoOnlyHeader = true; // Keep existing non-feed header controls unchanged.
  const pageOwnsHeader = ["/messages", "/services", "/flights", "/spotlight", "/menu"].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const roomyMemberTab = ["/feed", "/services", "/spotlight", "/menu"].some(
    (path) => pathname === path || pathname === `${path}/` || pathname === `${path}/extras`,
  );

  useEffect(() => {
    if (!profile?.user_id) return;
    let stopped = false;
    let inFlight = false;
    const touch = async () => {
      if (stopped || inFlight || document.visibilityState !== "visible" || !navigator.onLine)
        return;
      inFlight = true;
      try {
        // PostgREST builders are lazy: awaiting executes the heartbeat request.
        const { error } = await supabase.rpc("touch_member_presence");
        if (error) console.warn("Member presence update failed", error.code);
      } catch {
        console.warn("Member presence update unavailable");
      } finally {
        inFlight = false;
      }
    };
    void touch();
    const timer = window.setInterval(() => void touch(), PRESENCE_HEARTBEAT_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void touch();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onVisibility);
    window.addEventListener("focus", onVisibility);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onVisibility);
      window.removeEventListener("focus", onVisibility);
    };
  }, [profile?.user_id]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  // Some destinations appear in both lists — show each one once.
  const [sideExpanded, setSideExpanded] = useState(false);
  const links = visible([...DESKTOP_NAV, ...SIDE_EXTRA]).filter(
    (item, index, all) => all.findIndex((other) => other.to === item.to) === index,
  );

  return (
    <div className="app-shell safe-top min-h-dvh bg-background">
      <PushBridge />
      <WelcomeIntro />
      <div className="app-shell-frame flex w-full">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col overflow-y-auto overscroll-contain border-r border-border bg-sidebar p-5 lg:flex">
          <Link to="/services" className="mb-8 inline-flex">
            <Logo />
          </Link>
          <nav className="flex flex-1 flex-col gap-0.5">
            <Link
              to="/profile"
              className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-sidebar-accent"
            >
              <ProfileAvatar name={profile?.full_name} url={profile?.avatar_url} />
              <span className="truncate">{profile?.full_name || t("shell.member")}</span>
            </Link>
            {(sideExpanded ? links : links.slice(0, SIDE_PREVIEW)).map((item, index) => (
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
                <span className="truncate">{navLabel(item)}</span>
                {item.to === "/messages" && (
                  <UnreadMessageBadge count={unreadMessages} className="ml-auto" />
                )}
              </Link>
            ))}
            {links.length > SIDE_PREVIEW ? (
              <button
                type="button"
                onClick={() => setSideExpanded((v) => !v)}
                aria-expanded={sideExpanded}
                className="flex items-center gap-3 rounded-xl px-2 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-sidebar-accent"
              >
                <span className="grid size-9 place-items-center rounded-full bg-secondary">
                  <ChevronDown
                    className={cn("size-5 transition-transform", sideExpanded && "rotate-180")}
                    aria-hidden
                  />
                </span>
                {sideExpanded ? tx("See less", "Voir moins") : tx("See more", "Voir plus")}
              </button>
            ) : null}
            {isAdmin ? (
              <a
                href="/console"
                className="relative mt-1 flex items-center gap-3 rounded-xl px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-sidebar-accent"
              >
                <span className="grid size-9 place-items-center rounded-[0.8rem] bg-foreground text-background">
                  <Shield className="size-[18px]" aria-hidden />
                </span>
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
              <p className="flex min-w-0 items-center gap-1 text-sm font-semibold text-foreground">
                <span className="truncate">{profile?.full_name || t("shell.member")}</span>
                <VerifiedBadge
                  tier={profile?.verified_tier}
                  until={profile?.verified_until}
                  size={13}
                />
              </p>
            </div>
            <StatusBadge
              status={profile?.account_status ?? "PENDING"}
              label={profile?.account_status === "ACTIVE" ? t("shell.active") : t("shell.pending")}
              className="mt-2"
            />
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 w-full justify-start"
              onClick={signOut}
            >
              <LogOut className="size-4" aria-hidden />
              {t("shell.signOut")}
            </Button>
          </div>
        </aside>

        <div className="app-shell-column flex min-w-0 flex-1 flex-col">
          {/* Web-only top bar: menu panel, notifications and the member photo. */}
          {!pageOwnsHeader && (
            <header
              className={cn(
                "sticky top-0 z-30 hidden bg-background/85 backdrop-blur-xl lg:block",
                !onFeed && "border-b border-border",
              )}
            >
              <div className="flex items-center justify-end gap-1.5 px-6 py-2.5">
                {showBack && (
                  <button
                    type="button"
                    aria-label={t("shell.back")}
                    onClick={goBack}
                    className="mr-auto inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                  >
                    <ArrowLeft className="size-4" aria-hidden />
                    {lang === "fr" ? "Retour" : "Back"}
                  </button>
                )}
                {onFeed && (
                  <Link to="/feed" className="mr-auto text-xl font-bold text-foreground">
                    {lang === "fr" ? "Fil" : "Feed"}
                  </Link>
                )}
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
                    <DropdownMenuItem
                      onSelect={() => navigate({ to: "/profile" })}
                      className="gap-3 py-2.5"
                    >
                      <ProfileAvatar name={profile?.full_name} url={profile?.avatar_url} />
                      <span className="min-w-0">
                        <span className="flex items-center gap-1 text-sm font-bold">
                          <span className="truncate">
                            {profile?.full_name || t("shell.member")}
                          </span>
                          <VerifiedBadge
                            tier={profile?.verified_tier}
                            until={profile?.verified_until}
                            size={13}
                          />
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
          )}

          {!pageOwnsHeader && (
            <header
              className={cn(
                "sticky top-0 z-30 bg-background/80 backdrop-blur-xl lg:hidden",
                !onFeed && "border-b border-border",
              )}
            >
              <div
                className={cn(
                  "grid items-center gap-3 px-4 py-2",
                  logoOnlyHeader
                    ? "grid-cols-[minmax(0,1fr)_auto]"
                    : "grid-cols-[auto_minmax(0,1fr)_auto]",
                )}
              >
                {logoOnlyHeader ? null : (
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
                        <p className="flex items-center gap-1 text-sm font-semibold">
                          <span className="truncate">
                            {profile?.full_name || t("shell.member")}
                          </span>
                          <VerifiedBadge
                            tier={profile?.verified_tier}
                            until={profile?.verified_until}
                            size={13}
                          />
                        </p>
                        <StatusBadge
                          status={profile?.account_status ?? "PENDING"}
                          label={
                            profile?.account_status === "ACTIVE"
                              ? t("shell.active")
                              : t("shell.pending")
                          }
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
                )}
                {showBack ? (
                  <button
                    type="button"
                    aria-label={t("shell.back")}
                    onClick={goBack}
                    className="grid size-10 shrink-0 place-items-center justify-self-start rounded-full text-foreground transition-colors hover:bg-muted active:opacity-80"
                  >
                    <ArrowLeft className="size-5" aria-hidden />
                  </button>
                ) : (
                  <Link to={onFeed ? "/feed" : "/services"} className="min-w-0">
                    {onFeed ? (
                      <span className="text-xl font-bold text-foreground">
                        {lang === "fr" ? "Fil" : "Feed"}
                      </span>
                    ) : (
                      <Logo compact />
                    )}
                  </Link>
                )}
                <div className="flex items-center gap-1">
                  <NotificationBell />
                  <LanguageSwitcher />
                  <ThemeToggle />
                </div>
              </div>
            </header>
          )}

          {pageOwnsHeader && showBack && (
            <div className="sticky top-0 z-30 flex items-center bg-background/85 px-2 py-1.5 backdrop-blur-xl">
              <button
                type="button"
                aria-label={t("shell.back")}
                onClick={goBack}
                className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                <ArrowLeft className="size-5" aria-hidden />
                {lang === "fr" ? "Retour" : "Back"}
              </button>
            </div>
          )}

          {profile && <SecurityAlertBanner />}
          {profile && (
            <PayoutSetupReminder
              userId={profile.user_id}
              connected={Boolean(profile.stripe_account_id)}
            />
          )}

          <div className="flex min-h-0 min-w-0 flex-1">
            <main
              className={cn(
                "app-shell-scroll min-h-0 min-w-0 flex-1 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:px-8 lg:pb-10",
                roomyMemberTab && "member-roomy-tab",
                onFeed && "pt-1",
              )}
            >
              {children}
            </main>
            {pathname !== "/messages" && <RightRail />}
          </div>
        </div>
      </div>

      {!pathname.startsWith("/post/") ? (
        <MobileNav items={visible(MOBILE_NAV)} profile={profile} unreadMessages={unreadMessages} />
      ) : null}
      <ScrollToTop />

      <LocationNudge />
    </div>
  );
}

/** Small round avatar with the member's initials as the fallback. */
function ProfileAvatar({
  name,
  url,
}: {
  name: string | null | undefined;
  url: string | null | undefined;
}) {
  const initials = (name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const resolved = useAvatarUrl(url);
  return (
    <Avatar className="aspect-square size-9 shrink-0 overflow-hidden rounded-full border border-border">
      {resolved ? (
        <AvatarImage
          src={resolved}
          alt=""
          className="size-full rounded-full object-cover object-center"
        />
      ) : null}
      <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
        {initials || "A"}
      </AvatarFallback>
    </Avatar>
  );
}
