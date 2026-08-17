import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  CalendarDays,
  Home,
  LogOut,
  MessageCircle,
  Receipt,
  Scissors,
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
import { AssistantBubble } from "./AssistantBubble";
import { AshCardBubble } from "./AshCardBubble";
import { StatusBadge } from "./StatusBadge";
import { NotificationBell } from "./NotificationBell";
import { Logo } from "./Logo";
import { LanguageSwitcher, ThemeToggle } from "./Preferences";
import { useI18n, type TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", key: "nav.home" as TKey, icon: Home },
  { to: "/services", key: "nav.services" as TKey, icon: Scissors },
  { to: "/network", key: "nav.network" as TKey, icon: Users },
  { to: "/profile", key: "nav.profile" as TKey, icon: UserIcon },
] as const;

const SIDE_EXTRA = [
  { to: "/wallet", key: "nav.wallet" as TKey, icon: Wallet },
  { to: "/bookings", key: "nav.bookings" as TKey, icon: CalendarDays },
  { to: "/messages", key: "nav.messages" as TKey, icon: MessageCircle },
  { to: "/studio", key: "nav.pro" as TKey, icon: Sparkles },
  { to: "/transactions", key: "nav.transactions" as TKey, icon: Receipt },
  { to: "/withdraw", key: "nav.withdraw" as TKey, icon: ArrowDownToLine },
  { to: "/settings", key: "nav.settings" as TKey, icon: SettingsIcon },
] as const;


export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const { data: isAdmin } = useIsAdmin();
  const { t } = useI18n();
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  const links = [...NAV, ...SIDE_EXTRA];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-sidebar p-5 lg:flex">
          <Link to="/dashboard" className="mb-8 inline-flex">
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
          <div className="mt-4 flex items-center justify-between gap-2">
            <LanguageSwitcher />
            <div className="flex items-center gap-1">
              <NotificationBell />
              <ThemeToggle />
            </div>
          </div>
          <div className="mt-3 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]">
            <p className="truncate text-sm font-semibold text-foreground">{profile?.full_name || t("shell.member")}</p>
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
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
              <Link to="/dashboard" className="min-w-0">
                <Logo compact />
              </Link>
              <div className="flex items-center gap-1">
                <NotificationBell />
                <LanguageSwitcher />
                <ThemeToggle />
              <Button variant="ghost" size="icon" aria-label={t("shell.signOut")} onClick={signOut}>
                <LogOut className="size-4" aria-hidden />
              </Button>
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10">{children}</main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/90 backdrop-blur-xl lg:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {NAV.map((item) => {
            const active = pathname === item.to;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "relative flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold transition-colors",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {active ? (
                    <span
                      className="gold-gradient absolute top-0 h-0.5 w-10 rounded-full"
                      aria-hidden
                    />
                  ) : null}
                  <item.icon className="size-5" aria-hidden />
                  {t(item.key)}
                </Link>
              </li>
            );
          })}
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
                  {SIDE_EXTRA.map((item) => (
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
      </nav>

      <AshCardBubble />
      <AssistantBubble />
    </div>
  );
}
