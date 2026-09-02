import { useState } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Banknote,
  BarChart3,
  CalendarCheck,
  CreditCard,
  Lock,
  LogOut,
  Menu,
  Moon,
  ReceiptText,
  LifeBuoy,
  ShieldAlert,
  ShieldCheck,
  Store,
  Sun,
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { consoleStatus, lockConsole, unlockConsole } from "@/lib/console.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/refer/states";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/console", label: "Overview", icon: BarChart3, group: "Insights" },
  { to: "/console/payments", label: "Payments", icon: CreditCard, group: "Money" },
  { to: "/console/withdrawals", label: "Withdrawals", icon: Wallet, group: "Money" },
  { to: "/console/payout", label: "Payout", icon: Banknote, group: "Money" },
  { to: "/console/ledger", label: "Ledger", icon: ReceiptText, group: "Money" },
  { to: "/console/users", label: "Users", icon: Users, group: "People" },
  { to: "/console/providers", label: "Providers", icon: Store, group: "People" },
  { to: "/console/bookings", label: "Bookings", icon: CalendarCheck, group: "People" },
  { to: "/console/deletions", label: "Deletions", icon: Trash2, group: "People" },
  { to: "/console/support", label: "Support", icon: LifeBuoy, group: "People" },
  { to: "/console/security", label: "Security", icon: ShieldAlert, group: "Insights" },
] as const;

const GROUPS = ["Insights", "Money", "People"] as const;

export const Route = createFileRoute("/console")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ASH Console — Platform Operations" },
      { name: "description", content: "Private operations console for ASH Glo platform finance and payouts." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ConsoleLayout,
});

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
      {theme === "dark" ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
    </Button>
  );
}

function SidebarNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="space-y-6">
      {GROUPS.map((group) => (
        <div key={group}>
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{group}</p>
          <div className="space-y-0.5">
            {NAV.filter((item) => item.group === group).map((item) => {
              const active = pathname === item.to;
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function ConsoleLayout() {
  const queryClient = useQueryClient();
  const status = useServerFn(consoleStatus);
  const lock = useServerFn(lockConsole);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["console", "status"], queryFn: status });

  if (isLoading) return <LoadingState label="Checking console access…" />;
  if (!data?.unlocked) return <UnlockScreen />;

  const current = NAV.find((item) => item.to === pathname)?.label ?? "Overview";

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        <div className="flex items-center gap-2.5 px-2 pb-6">
          <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-primary to-gold text-primary-foreground">
            <ShieldCheck className="size-4.5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-display text-base font-extrabold leading-none text-sidebar-foreground">ASH Console</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Platform operations</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <SidebarNav pathname={pathname} />
        </div>

        <Button
          variant="outline"
          size="sm"
          className="mt-4 w-full"
          onClick={async () => {
            await lock();
            await queryClient.invalidateQueries({ queryKey: ["console"] });
          }}
        >
          <LogOut className="size-4" aria-hidden />
          Lock console
        </Button>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-5" aria-hidden />
            </Button>
            <div className="min-w-0">
              <h1 className="truncate font-display text-lg font-extrabold text-foreground">{current}</h1>
              <p className="hidden text-xs text-muted-foreground sm:block">Live data, synced automatically</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={async () => {
                await lock();
                await queryClient.invalidateQueries({ queryKey: ["console"] });
              }}
            >
              <LogOut className="size-4" aria-hidden />
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile drawer */}
      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-sidebar p-4 shadow-raised">
            <div className="flex items-center justify-between pb-6">
              <span className="font-display text-base font-extrabold text-sidebar-foreground">ASH Console</span>
              <Button variant="ghost" size="icon" onClick={() => setMenuOpen(false)} aria-label="Close">
                <X className="size-5" aria-hidden />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarNav pathname={pathname} onNavigate={() => setMenuOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function UnlockScreen() {
  const queryClient = useQueryClient();
  const unlock = useServerFn(unlockConsole);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(false);
    const result = await unlock({ data: { password } });
    setBusy(false);
    if (!result.ok) {
      setError(true);
      return;
    }
    setPassword("");
    await queryClient.invalidateQueries({ queryKey: ["console"] });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-5 rounded-3xl border border-border bg-card p-7 shadow-xl"
      >
        <div className="flex flex-col items-center text-center">
          <span className="grid size-12 place-items-center rounded-full bg-gradient-to-br from-primary to-gold text-primary-foreground">
            <Lock className="size-5" aria-hidden />
          </span>
          <h1 className="mt-3 font-display text-xl font-extrabold text-foreground">ASH Console</h1>
          <p className="mt-1 text-sm text-muted-foreground">Restricted operations area.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="console-password">Console password</Label>
          <Input
            id="console-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error ? <p className="text-xs font-medium text-destructive">Incorrect password.</p> : null}
        </div>

        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Unlocking…" : "Enter console"}
        </Button>
      </form>
    </div>
  );
}
