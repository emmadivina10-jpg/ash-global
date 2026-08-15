import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getConsoleWithdrawals, settleWithdrawal } from "@/lib/console.functions";
import { SectionCard } from "@/components/refer/cards";
import { StatusBadge } from "@/components/refer/StatusBadge";
import { ConfirmationModal } from "@/components/refer/ConfirmationModal";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAYMENT_METHOD_LABEL, formatDateTime, formatXAF } from "@/lib/format";

type Pending = { id: string; status: "PROCESSING" | "COMPLETED" | "FAILED" } | null;

export const Route = createFileRoute("/console/withdrawals")({
  component: ConsoleWithdrawals,
});

function ConsoleWithdrawals() {
  const queryClient = useQueryClient();
  const fetchWithdrawals = useServerFn(getConsoleWithdrawals);
  const settle = useServerFn(settleWithdrawal);
  const [pending, setPending] = useState<Pending>(null);
  const [providerRef, setProviderRef] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["console", "withdrawals"],
    queryFn: fetchWithdrawals,
  });

  async function confirm() {
    if (!pending) return;
    setBusy(true);
    const result = await settle({
      data: { id: pending.id, status: pending.status, providerReference: providerRef || undefined },
    });
    setBusy(false);
    if (!result.ok) {
      toast.error("Could not update this withdrawal");
      return;
    }
    toast.success(`Withdrawal marked ${pending.status.toLowerCase()}`);
    setPending(null);
    setProviderRef("");
    await queryClient.invalidateQueries({ queryKey: ["console"] });
  }

  return (
    <SectionCard title="Withdrawals" description="Approve, complete or reject mobile money payouts.">
      {isLoading ? (
        <SkeletonRows rows={4} />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState title="No withdrawal requests" />
      ) : (
        <ul className="space-y-3">
          {(data ?? []).map((row) => (
            <li key={row.id} className="rounded-2xl border border-border p-4">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="tabular text-base font-bold text-foreground">{formatXAF(row.amount)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {PAYMENT_METHOD_LABEL[row.payment_method] ?? row.payment_method} · {row.phone_number}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDateTime(row.requested_at)} · {row.reference}
                  </p>
                  {row.provider_reference ? (
                    <p className="truncate text-xs text-muted-foreground">Provider ref: {row.provider_reference}</p>
                  ) : null}
                </div>
                <StatusBadge status={row.status} />
              </div>

              {row.status === "PENDING" || row.status === "PROCESSING" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {row.status === "PENDING" ? (
                    <Button size="sm" variant="outline" onClick={() => setPending({ id: row.id, status: "PROCESSING" })}>
                      Mark processing
                    </Button>
                  ) : null}
                  <Button size="sm" onClick={() => setPending({ id: row.id, status: "COMPLETED" })}>
                    Mark completed
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={() => setPending({ id: row.id, status: "FAILED" })}
                  >
                    Reject
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <ConfirmationModal
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title="Update withdrawal"
        description={
          pending?.status === "FAILED"
            ? "Rejecting returns the amount to the member's available balance."
            : "This action updates the member's wallet and ledger."
        }
        loading={busy}
        confirmLabel="Confirm"
        onConfirm={confirm}
        details={
          <div className="space-y-2 text-left">
            <Label htmlFor="providerRef">Provider reference (optional)</Label>
            <Input
              id="providerRef"
              value={providerRef}
              onChange={(event) => setProviderRef(event.target.value)}
              placeholder="MoMo transaction ID"
            />
          </div>
        }
      />
    </SectionCard>
  );
}
