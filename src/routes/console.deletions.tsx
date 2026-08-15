import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getConsoleDeletionRequests, reviewDeletionRequest } from "@/lib/console.functions";
import { LoadingState } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/console/deletions")({
  component: DeletionsPage,
});

function DeletionsPage() {
  const queryClient = useQueryClient();
  const list = useServerFn(getConsoleDeletionRequests);
  const review = useServerFn(reviewDeletionRequest);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["console", "deletions"], queryFn: list });

  async function act(id: string, status: "APPROVED" | "REJECTED") {
    setBusy(id);
    try {
      await review({ data: { id, status, note: notes[id] } });
      toast.success(status === "APPROVED" ? "Deletion approved." : "Request declined.");
      await queryClient.invalidateQueries({ queryKey: ["console"] });
    } catch {
      toast.error("Could not update the request.");
    } finally {
      setBusy(null);
    }
  }

  if (isLoading) return <LoadingState label="Loading deletion requests…" />;

  const rows = data ?? [];

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-xl font-extrabold text-foreground">Account deletion requests</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Approving closes the member's account. Settle any pending balance or withdrawal first.
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          No deletion requests.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{row.profile?.full_name ?? "Unknown member"}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.profile?.email} · {row.profile?.phone}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Requested {formatDate(row.created_at)}</p>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
                  {row.status}
                </span>
              </div>

              {row.reason ? (
                <p className="mt-3 rounded-xl bg-muted p-3 text-sm text-foreground">{row.reason}</p>
              ) : null}

              {row.status === "PENDING" ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Input
                    value={notes[row.id] ?? ""}
                    onChange={(event) => setNotes((n) => ({ ...n, [row.id]: event.target.value }))}
                    placeholder="Admin note (optional)"
                    className="max-w-xs"
                  />
                  <Button size="sm" variant="destructive" disabled={busy === row.id} onClick={() => void act(row.id, "APPROVED")}>
                    Approve deletion
                  </Button>
                  <Button size="sm" variant="outline" disabled={busy === row.id} onClick={() => void act(row.id, "REJECTED")}>
                    Decline
                  </Button>
                </div>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  Reviewed {row.reviewed_at ? formatDate(row.reviewed_at) : "—"}
                  {row.admin_note ? ` · ${row.admin_note}` : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
