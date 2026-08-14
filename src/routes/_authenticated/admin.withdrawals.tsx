import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard } from "@/components/refer/cards";
import { StatusBadge } from "@/components/refer/StatusBadge";
import { ConfirmationModal } from "@/components/refer/ConfirmationModal";
import { EmptyState, SkeletonRows } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAYMENT_METHOD_LABEL, formatDateTime, formatXAF } from "@/lib/format";

type Pending = { id: string; status: "PROCESSING" | "COMPLETED" | "FAILED" } | null;

export const Route = createFileRoute("/_authenticated/admin/withdrawals")({
  component: AdminWithdrawals,
});

function AdminWithdrawals() {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<Pending>(null);
  const [providerRef, setProviderRef] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "withdrawals"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("withdrawals")
        .select("*")
        .order("requested_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return rows ?? [];
    },
  });

  async function settle() {
    if (!pending) return;
    setBusy(true);
    const { data: result, error } = await supabase.rpc("settle_withdrawal", {
      _withdrawal_id: pending.id,
      _status: pending.status,
      ...(providerRef ? { _provider_reference: providerRef } : {}),
    });
    setBusy(false);
    const payload = result as { ok?: boolean; error?: string } | null;
    if (error || !payload?.ok) {
      toast.error("Could not update this withdrawal");
      return;
    }
    toast.success(`Withdrawal marked ${pending.status.toLowerCase()}`);
    setPending(null);
    setProviderRef("");
    await queryClient.invalidateQueries({ queryKey: ["admin"] });
  }

  return (
    <SectionCard title="Withdrawal management" description="Approve, complete or reject mobile money payouts.">
      {isLoading ? (
        <SkeletonRows rows={4} />
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
                    {PAYMENT_METHOD_LABEL[row.payment_method]} · {row.phone_number}
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
        onConfirm={settle}
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
