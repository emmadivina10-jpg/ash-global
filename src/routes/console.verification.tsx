import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { consoleSetVerification, consoleVerificationOverview } from "@/lib/verification.functions";
import { LoadingState } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatXAF } from "@/lib/format";

export const Route = createFileRoute("/console/verification")({
  ssr: false,
  component: VerificationConsole,
});

function VerificationConsole() {
  const load = useServerFn(consoleVerificationOverview);
  const setVerification = useServerFn(consoleSetVerification);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["console", "verification"], queryFn: load });
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function act(userId: string, tier: string | null) {
    setBusy(userId);
    try {
      const result = await setVerification({ data: { userId, tier, days: 30, note: note || undefined } });
      if (!result.ok) {
        toast.error(result.error === "FORBIDDEN" ? "Admins only." : (result.error ?? "Could not update."));
        return;
      }
      toast.success(tier ? "Badge granted." : "Badge revoked.");
      setNote("");
      await queryClient.invalidateQueries({ queryKey: ["console", "verification"] });
    } finally {
      setBusy(null);
    }
  }

  if (isLoading) return <LoadingState label="Loading verification…" />;
  if (!data?.ok) return <p className="text-sm text-muted-foreground">Admins only.</p>;

  const activeCount = data.verified.filter(
    (row) => !row.verified_until || new Date(row.verified_until) > new Date(),
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-extrabold text-foreground">Verification</h2>
        <p className="text-sm text-muted-foreground">
          ASH Verified badges, verification revenue and blocked impersonation attempts.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Active badges", value: String(activeCount) },
          { label: "Total purchases", value: String(data.purchases.length) },
          { label: "Verification revenue", value: formatXAF(data.revenue) },
        ].map((tile) => (
          <div key={tile.label} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{tile.label}</p>
            <p className="mt-1 font-display text-2xl font-extrabold text-foreground">{tile.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-bold text-foreground">Grant or revoke</p>
        <p className="text-xs text-muted-foreground">Reason is stored on the verification record.</p>
        <Input
          className="mt-3"
          placeholder="Reason / note (optional)"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <ul className="mt-3 divide-y divide-border">
          {data.verified.length === 0 ? (
            <li className="py-3 text-xs text-muted-foreground">No verified members yet.</li>
          ) : (
            data.verified.map((row) => {
              const live = !row.verified_until || new Date(row.verified_until) > new Date();
              return (
                <li key={row.user_id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                      <BadgeCheck className="size-4 text-[#1877F2]" aria-hidden />
                      <span className="truncate">{row.full_name ?? row.email ?? row.user_id}</span>
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {row.verified_tier} ·{" "}
                      {row.verified_until
                        ? `${live ? "paid until" : "expired"} ${new Date(row.verified_until).toLocaleDateString("en-GB")}`
                        : "no expiry"}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge className="rounded-full border-0 bg-muted text-[10px] text-muted-foreground">
                      {live ? "ACTIVE" : "EXPIRED"}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === row.user_id}
                      onClick={() => void act(row.user_id, row.verified_tier)}
                    >
                      +30 days
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy === row.user_id}
                      onClick={() => void act(row.user_id, null)}
                    >
                      Revoke
                    </Button>
                  </span>
                </li>
              );
            })
          )}
        </ul>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-bold text-foreground">Recent purchases</p>
        <ul className="mt-3 divide-y divide-border">
          {data.purchases.length === 0 ? (
            <li className="py-3 text-xs text-muted-foreground">No verification payments yet.</li>
          ) : (
            data.purchases.slice(0, 25).map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="truncate text-foreground">
                  {row.tier} · {formatXAF(Number(row.amount ?? 0))}
                </span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {new Date(row.created_at).toLocaleDateString("en-GB")}
                  <Badge className="rounded-full border-0 bg-muted text-[10px] text-muted-foreground">{row.status}</Badge>
                </span>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-foreground">
          <ShieldAlert className="size-4 text-destructive" aria-hidden />
          Blocked impersonation attempts
        </p>
        <ul className="mt-3 divide-y divide-border">
          {data.attempts.length === 0 ? (
            <li className="py-3 text-xs text-muted-foreground">Nobody has tried to copy a verified identity.</li>
          ) : (
            data.attempts.map((row) => (
              <li key={row.id} className="py-2 text-sm">
                <span className="block truncate text-foreground">
                  {row.kind}: “{row.attempted_value ?? "—"}”
                </span>
                <span className="block text-xs text-muted-foreground">
                  actor {row.actor_id?.slice(0, 8) ?? "—"} · protected {row.protected_user_id?.slice(0, 8) ?? "—"} ·{" "}
                  {new Date(row.created_at).toLocaleString("en-GB")}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
