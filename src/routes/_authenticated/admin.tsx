import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useIsAdmin } from "@/lib/queries";
import { EmptyState, LoadingState } from "@/components/refer/states";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/admin", label: "Overview" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/withdrawals", label: "Withdrawals" },
  { to: "/admin/transactions", label: "Transactions" },
] as const;

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { data: isAdmin, isLoading } = useIsAdmin();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (isLoading) return <LoadingState label="Checking permissions…" />;

  if (!isAdmin) {
    return (
      <EmptyState
        icon={<ShieldAlert className="size-5" aria-hidden />}
        title="Admin access required"
        description="You do not have permission to view this area."
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">Platform operations and payout management.</p>
      </header>

      <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {TABS.map((tab) => (
          <Link
            key={tab.to}
            to={tab.to}
            className={cn(
              "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
              pathname === tab.to
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <Outlet />
    </div>
  );
}
