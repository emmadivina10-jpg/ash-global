import type { ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  Home,
  LogOut,
  Receipt,
  Shield,
  Users,
  User as UserIcon,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, useProfile } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/network", label: "Network", icon: Users },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/profile", label: "Profile", icon: UserIcon },
] as const;

const SIDE_EXTRA = [
  { to: "/transactions", label: "Transactions", icon: Receipt },
  { to: "/withdraw", label: "Withdraw", icon: ArrowDownToLine },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const { data: isAdmin } = useIsAdmin();
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
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  pathname === item.to && "bg-primary/10 text-primary",
                )}
              >
                <item.icon className="size-4 shrink-0" aria-hidden />
                {item.label}
              </Link>
            ))}
            {isAdmin ? (
              <Link
                to="/admin"
                className={cn(
                  "mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent",
                  pathname.startsWith("/admin") && "bg-primary/10 text-primary",
                )}
              >
                <Shield className="size-4 shrink-0" aria-hidden />
                Admin
              </Link>
            ) : null}
          </nav>
          <div className="mt-4 rounded-xl border border-border p-3">
            <p className="truncate text-sm font-semibold text-foreground">{profile?.full_name || "Member"}</p>
            <StatusBadge
              status={profile?.account_status ?? "PENDING"}
              label={profile?.account_status === "ACTIVE" ? "Active" : "Pending activation"}
              className="mt-2"
            />
            <Button variant="ghost" size="sm" className="mt-3 w-full justify-start" onClick={signOut}>
              <LogOut className="size-4" aria-hidden />
              Sign out
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur lg:hidden">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
              <Link to="/dashboard" className="min-w-0">
                <Logo compact />
              </Link>
              <Button variant="ghost" size="icon" aria-label="Sign out" onClick={signOut}>
                <LogOut className="size-4" aria-hidden />
              </Button>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10">{children}</main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur lg:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {NAV.map((item) => {
            const active = pathname === item.to;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <item.icon className="size-5" aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
