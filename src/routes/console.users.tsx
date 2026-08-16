import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getConsoleUsers } from "@/lib/console.functions";
import { SectionCard } from "@/components/refer/cards";
import { StatusBadge } from "@/components/refer/StatusBadge";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/refer/states";
import { Input } from "@/components/ui/input";
import { formatDate, formatXAF } from "@/lib/format";

export const Route = createFileRoute("/console/users")({
  component: ConsoleUsers,
});

function ConsoleUsers() {
  const fetchUsers = useServerFn(getConsoleUsers);
  const [term, setTerm] = useState("");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["console", "users"],
    queryFn: fetchUsers,
  });

  const q = term.trim().toLowerCase();
  const rows = (data ?? []).filter(
    (u) =>
      q === "" ||
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone.includes(q) ||
      u.referral_code.toLowerCase().includes(q),
  );

  return (
    <SectionCard title="Members" description="All ASH Glo REFER accounts, balances and roles.">
      <div className="mb-4">
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search name, email, phone or referral code"
        />
      </div>

      {isLoading ? (
        <SkeletonRows rows={6} />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="No members found" />
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((u) => (
            <li key={u.user_id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 py-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {u.full_name || "—"}
                  {u.roles.includes("admin") ? (
                    <span className="ml-2 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                      admin
                    </span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {u.email} · {u.phone || "no phone"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {u.referral_code} · joined {formatDate(u.created_at)}
                </p>
              </div>
              <div className="text-right">
                <StatusBadge status={u.account_status} />
                <p className="tabular mt-1.5 text-xs font-semibold text-foreground">{formatXAF(u.balance)}</p>
                <p className="tabular text-[11px] text-muted-foreground">earned {formatXAF(u.earned)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
