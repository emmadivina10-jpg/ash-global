import { useState } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Lock, LogOut, ShieldCheck } from "lucide-react";
import { consoleStatus, lockConsole, unlockConsole } from "@/lib/console.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/refer/states";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/console", label: "Overview" },
  { to: "/console/payments", label: "Payments" },
  { to: "/console/users", label: "Users" },
  { to: "/console/providers", label: "Providers" },
  { to: "/console/bookings", label: "Bookings" },
  { to: "/console/withdrawals", label: "Withdrawals" },
  { to: "/console/ledger", label: "Ledger" },
  { to: "/console/deletions", label: "Deletions" },
] as const;

export const Route = createFileRoute("/console")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ASH Console — Platform Operations" },
      { name: "description", content: "Private operations console for ASH Glo REFER platform finance and payouts." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ConsoleLayout,
});

function ConsoleLayout() {
  const queryClient = useQueryClient();
  const status = useServerFn(consoleStatus);
  const lock = useServerFn(lockConsole);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const { data, isLoading } = useQuery({ queryKey: ["console", "status"], queryFn: status });

  if (isLoading) return <LoadingState label="Checking console access…" />;
  if (!data?.unlocked) return <UnlockScreen />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
              <ShieldCheck className="size-4.5" aria-hidden />
            </span>
            <div>
              <p className="font-display text-lg font-extrabold leading-none text-foreground">ASH Console</p>
              <p className="mt-1 text-xs text-muted-foreground">Platform operations</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await lock();
              await queryClient.invalidateQueries({ queryKey: ["console"] });
            }}
          >
            <LogOut className="size-4" aria-hidden />
            Lock
          </Button>
        </div>
        <nav className="mx-auto -mb-px flex w-full max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6">
          {TABS.map((tab) => (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                "shrink-0 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors",
                pathname === tab.to
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>
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
          <span className="grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary">
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
