import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard } from "@/components/refer/cards";
import { StatusBadge } from "@/components/refer/StatusBadge";
import { EmptyState, SkeletonRows } from "@/components/refer/states";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const [term, setTerm] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return profiles ?? [];
    },
  });

  const query = term.trim().toLowerCase();
  const rows = (data ?? []).filter(
    (row) =>
      !query ||
      row.full_name?.toLowerCase().includes(query) ||
      row.email?.toLowerCase().includes(query) ||
      row.phone?.toLowerCase().includes(query) ||
      row.referral_code?.toLowerCase().includes(query),
  );

  return (
    <SectionCard title="User management" description="Search members and review their account state.">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search by name, email, phone or referral code"
          className="h-11 pl-9"
        />
      </div>

      {isLoading ? (
        <SkeletonRows rows={5} />
      ) : rows.length === 0 ? (
        <EmptyState title="No users found" description="Try a different search term." />
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{row.full_name || "Unnamed member"}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {row.email} · {row.phone || "no phone"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {row.referral_code} · joined {formatDate(row.created_at)}
                </p>
              </div>
              <StatusBadge status={row.account_status} />
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
