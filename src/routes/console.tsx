import { useState } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Banknote,
  Building2,
  BarChart3,
  CalendarCheck,
  CreditCard,
  Lock,
  LogOut,
  Menu,
  Moon,
  ReceiptText,
  LifeBuoy,
  Megaphone,
  Handshake,
  Video,
  Send,
  Rocket,
  Map,
  Target,
  UserCog,
  Unlock,
  ShieldAlert,
  ShieldCheck,
  Store,
  Sun,
  Trash2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { consoleStatus, lockConsole, setElevatedMode, unlockConsole } from "@/lib/console.functions";
import { StaffChat } from "@/components/console/StaffChat";
import { DailyTickets } from "@/components/console/DailyTickets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/refer/states";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/console", label: "Overview", icon: BarChart3, group: "Insights", dept: "SUPER_ADMIN" },
  { to: "/console/revenue", label: "Revenue", icon: Target, group: "Insights", dept: "REVENUE" },
  { to: "/console/security", label: "Cybersecurity", icon: ShieldAlert, group: "Insights", dept: "CYBERSECURITY" },
  { to: "/console/payments", label: "Payments", icon: CreditCard, group: "Money", dept: "REVENUE" },
  { to: "/console/withdrawals", label: "Withdrawals", icon: Wallet, group: "Money", dept: "REVENUE" },
  { to: "/console/payout", label: "Payout", icon: Banknote, group: "Money", dept: "REVENUE" },
  { to: "/console/ledger", label: "Ledger", icon: ReceiptText, group: "Money", dept: "REVENUE" },
  { to: "/console/users", label: "Users", icon: Users, group: "People", dept: "SUPER_ADMIN" },
  { to: "/console/providers", label: "Providers", icon: Store, group: "People", dept: "TRUST" },
  { to: "/console/bookings", label: "Bookings", icon: CalendarCheck, group: "People", dept: "MARKETPLACE_OPS" },
  { to: "/console/deletions", label: "Deletions", icon: Trash2, group: "People", dept: "SUPER_ADMIN" },
  { to: "/console/support", label: "Support", icon: LifeBuoy, group: "People", dept: "SUPPORT" },
  { to: "/console/outreach", label: "Outreach", icon: Send, group: "People", dept: "SUPPORT" },
  { to: "/console/growth", label: "Growth", icon: Rocket, group: "Workforce", dept: "GROWTH" },
  { to: "/console/sales", label: "Sales", icon: Target, group: "Workforce", dept: "SALES" },
  { to: "/console/marketplace", label: "Marketplace Ops", icon: Store, group: "Workforce", dept: "MARKETPLACE_OPS" },
  { to: "/console/advertising", label: "Advertising", icon: Megaphone, group: "Workforce", dept: "ADVERTISING" },
  { to: "/console/partnerships", label: "Partnerships", icon: Handshake, group: "Workforce", dept: "PARTNERSHIPS" },
  { to: "/console/content", label: "Content & Creators", icon: Video, group: "Workforce", dept: "CONTENT" },
  { to: "/console/merchant", label: "Merchants", icon: Store, group: "Workforce", dept: "MERCHANT" },
  { to: "/console/expansion", label: "Expansion", icon: Map, group: "Workforce", dept: "EXPANSION" },
  { to: "/console/property", label: "Property", icon: Building2, group: "Workforce", dept: "TRUST" },
  { to: "/console/reports", label: "Safety reports", icon: ShieldCheck, group: "Workforce", dept: "TRUST" },
  { to: "/console/trust", label: "Trust & Verification", icon: ShieldCheck, group: "Workforce", dept: "TRUST" },
  { to: "/console/staff", label: "Staff & departments", icon: UserCog, group: "Admin", dept: "SUPER_ADMIN" },
] as const;

const GROUPS = ["Insights", "Money", "People", "Workforce", "Admin"] as const;


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

/** CEO sees everything; every other seat sees only its own department. */
function allowedNav(superAdmin: boolean, department: string) {
  if (superAdmin) return NAV.slice();
  return NAV.filter((item) => item.dept === department);
}

function SidebarNav({
  pathname,
  onNavigate,
  superAdmin,
  department,
}: {
  pathname: string;
  onNavigate?: () => void;
  superAdmin: boolean;
  department: string;
}) {
  const items = allowedNav(superAdmin, department);
  return (
    <nav className="space-y-6">
      {GROUPS.filter((group) => items.some((item) => item.group === group)).map((group) => (
        <div key={group}>
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{group}</p>
          <div className="space-y-0.5">
            {items.filter((item) => item.group === group).map((item) => {
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
  const elevate = useServerFn(setElevatedMode);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["console", "status"], queryFn: status });

  if (isLoading) return <LoadingState label="Checking console access…" />;
  if (!data?.unlocked) return <UnlockScreen />;

  const actor = data.actor;
  const superAdmin = Boolean(actor?.superAdmin);
  const department = actor?.department ?? "";
  const allowed = allowedNav(superAdmin, department);
  const hasAccess = allowed.some((item) => item.to === pathname);
  const current = NAV.find((item) => item.to === pathname)?.label ?? "Overview";

  return (
    <div className="safe-top min-h-dvh bg-background lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-sidebar-border bg-sidebar p-4 lg:flex">
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
          <SidebarNav pathname={pathname} superAdmin={superAdmin} department={department} />
        </div>

        <div className="mt-4 rounded-xl border border-sidebar-border bg-card p-3">
          <p className="truncate text-sm font-bold text-foreground">{actor?.name}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {actor?.department.replace(/_/g, " ")}
            {actor?.elevated ? " · elevated" : ""}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
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
            <div className="hidden text-right sm:block">
              <p className="text-xs font-bold text-foreground">{actor?.name}</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {actor?.department.replace(/_/g, " ")}
              </p>
            </div>
            {actor?.superAdmin ? (
              <Button
                variant={actor.elevated ? "default" : "outline"}
                size="sm"
                onClick={async () => {
                  await elevate({ data: { elevated: !actor.elevated } });
                  await queryClient.invalidateQueries({ queryKey: ["console"] });
                }}
              >
                <Unlock className="size-4" aria-hidden />
                <span className="hidden sm:inline">
                  {actor.elevated ? "Privileges on" : "Elevate privilege"}
                </span>
              </Button>
            ) : null}
            <StaffChat />
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

        <main className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6">
          {hasAccess ? (
            <>
              <DailyTickets superAdmin={superAdmin} />
              <Outlet />
            </>
          ) : (
            <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-8 text-center">
              <Lock className="mx-auto size-6 text-muted-foreground" aria-hidden />
              <h2 className="mt-3 font-display text-lg font-extrabold text-foreground">Section restricted</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your seat covers {department.replace(/_/g, " ").toLowerCase()} only. Ask the CEO for access.
              </p>
              {allowed[0] ? (
                <Button asChild size="sm" className="mt-4">
                  <Link to={allowed[0].to}>Go to {allowed[0].label}</Link>
                </Button>
              ) : null}
            </div>
          )}
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
              <SidebarNav
                pathname={pathname}
                onNavigate={() => setMenuOpen(false)}
                superAdmin={superAdmin}
                department={department}
              />
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
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(false);
    const result = await unlock({ data: { username, password } });
    setBusy(false);
    if (!result.ok) {
      setError(true);
      return;
    }
    setPassword("");
    await queryClient.invalidateQueries({ queryKey: ["console"] });
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4">
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
          <Label htmlFor="console-username">Staff username</Label>
          <Input
            id="console-username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Leave empty for the master password"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="console-password">Password</Label>
          <Input
            id="console-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error ? (
            <p className="text-xs font-medium text-destructive">Incorrect username or password.</p>
          ) : null}
        </div>

        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Unlocking…" : "Enter console"}
        </Button>
      </form>
    </div>
  );
}
