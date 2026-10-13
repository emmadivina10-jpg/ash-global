import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getConsoleWithdrawals,
  reconcilePaidWithdrawal,
  settleWithdrawal,
} from "@/lib/console.functions";
import { SectionCard } from "@/components/refer/cards";
import { StatusBadge } from "@/components/refer/StatusBadge";
import { ConfirmationModal } from "@/components/refer/ConfirmationModal";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAYMENT_METHOD_LABEL, formatDateTime, formatXAF } from "@/lib/format";
import { useState } from "react";
import { Loader2, RefreshCw, ShieldCheck } from "lucide-react";

type WithdrawalStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "REVERSED";

type WithdrawalRow = {
  id: string;
  amount: number;
  currency: string;
  payment_method: string;
  phone_number: string;
  status: WithdrawalStatus;
  reference: string;
  provider_reference: string | null;
  requested_at: string;
  processed_at: string | null;
  admin_note: string | null;
};

type PendingAction = {
  id: string;
  status: "FAILED";
  providerReference?: string;
} | null;

type PendingReconcile = {
  id: string;
  providerReference: string;
} | null;

export const Route = createFileRoute("/console/withdrawals")({
  component: ConsoleWithdrawals,
});

function ConsoleWithdrawals() {
  const fetchWithdrawals = useServerFn(getConsoleWithdrawals);
  const settle = useServerFn(settleWithdrawal);
  const reconcile = useServerFn(reconcilePaidWithdrawal);

  const [pending, setPending] = useState<PendingAction>(null);
  const [pendingReconcile, setPendingReconcile] = useState<PendingReconcile>(null);

  const [providerRef, setProviderRef] = useState("");

  const [busy, setBusy] = useState(false);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["console", "withdrawals"],
    queryFn: async () => (await fetchWithdrawals()) as WithdrawalRow[],
  });

  async function confirmReconcilePaid() {
    if (!pendingReconcile) {
      return;
    }

    setBusy(true);

    try {
      const result = await reconcile({
        data: {
          id: pendingReconcile.id,
          providerReference: pendingReconcile.providerReference,
        },
      });

      if (!result.ok) {
        toast.error(
          result.error === "WITHDRAWAL_NOT_PROCESSING"
            ? "This withdrawal is no longer in processing. Refresh the console."
            : result.error === "PROVIDER_REFERENCE_MISMATCH"
              ? "The TchokoPay reference does not match this withdrawal."
              : "Could not reconcile this payout.",
        );
        return;
      }

      toast.success(`Payout ${result.reference ?? ""} was reconciled as completed.`);

      setPendingReconcile(null);
      await refetch();
    } catch {
      toast.error("Could not reconcile this payout.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmException() {
    if (!pending) {
      return;
    }

    setBusy(true);

    try {
      const result = await settle({
        data: {
          id: pending.id,
          status: pending.status,
          ...(providerRef.trim()
            ? {
                providerReference: providerRef.trim(),
              }
            : {}),
        },
      });

      if (!result.ok) {
        toast.error(
          result.error === "AUTO_SETTLEMENT_ONLY"
            ? "This withdrawal is controlled automatically by TchokoPay."
            : "Could not update this withdrawal.",
        );
        return;
      }

      toast.success("Withdrawal marked as failed and funds returned.");

      setPending(null);
      setProviderRef("");

      await refetch();
    } catch {
      toast.error("Could not update this withdrawal.");
    } finally {
      setBusy(false);
    }
  }

  function isMobileMoney(row: WithdrawalRow) {
    return row.payment_method === "MTN_MOMO" || row.payment_method === "ORANGE_MONEY";
  }

  function hasProviderReference(row: WithdrawalRow) {
    return Boolean(row.provider_reference);
  }

  return (
    <SectionCard
      title="Withdrawals"
      description="Mobile-money withdrawals are processed automatically through TchokoPay. The console is for monitoring and exceptional intervention only."
    >
      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="size-4" aria-hidden />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Automatic payout system</p>
            <p className="text-xs text-muted-foreground">
              TchokoPay determines the final payment result.
            </p>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="shrink-0"
        >
          {isFetching ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="mr-1.5 size-3.5" aria-hidden />
          )}
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <SkeletonRows rows={4} />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState title="No withdrawal requests" />
      ) : (
        <ul className="space-y-3">
          {(data ?? []).map((row) => {
            const mobileMoney = isMobileMoney(row);

            const linked = hasProviderReference(row);

            const isFinal =
              row.status === "COMPLETED" || row.status === "FAILED" || row.status === "REVERSED";

            /*
             * A mobile-money payout with a provider reference is
             * completely controlled by the provider webhook.
             */
            const automatic = mobileMoney && linked && !isFinal;

            /*
             * A pending mobile-money withdrawal without a provider
             * reference is an exceptional state. It can be rejected
             * manually to safely release the reserved balance.
             */
            const exceptionalPending = mobileMoney && row.status === "PENDING" && !linked;

            return (
              <li key={row.id} className="rounded-2xl border border-border p-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="tabular text-base font-bold text-foreground">
                        {formatXAF(row.amount)}
                      </p>

                      {mobileMoney ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                          <ShieldCheck className="size-3" aria-hidden />
                          Automatic
                        </span>
                      ) : null}
                    </div>

                    <p className="truncate text-xs text-muted-foreground">
                      {PAYMENT_METHOD_LABEL[row.payment_method] ?? row.payment_method} ·{" "}
                      {row.phone_number}
                    </p>

                    <p className="truncate text-xs text-muted-foreground">
                      {formatDateTime(row.requested_at)} · {row.reference}
                    </p>

                    {row.provider_reference ? (
                      <p className="truncate text-xs font-medium text-primary/80">
                        TchokoPay ref: {row.provider_reference}
                      </p>
                    ) : null}

                    {row.admin_note ? (
                      <p className="mt-1 text-xs text-muted-foreground">Note: {row.admin_note}</p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <StatusBadge status={row.status} />

                    {automatic ? (
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          Awaiting TchokoPay
                        </span>
                        {row.status === "PROCESSING" && row.provider_reference ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 text-[11px]"
                            onClick={() =>
                              setPendingReconcile({
                                id: row.id,
                                providerReference: row.provider_reference as string,
                              })
                            }
                          >
                            <ShieldCheck className="mr-1.5 size-3.5" aria-hidden />
                            Reconcile PAID payout
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                {row.status === "COMPLETED" ? (
                  <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Payment completed automatically.
                    </p>

                    {row.processed_at ? (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Completed {formatDateTime(row.processed_at)}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {row.status === "FAILED" || row.status === "REVERSED" ? (
                  <div className="mt-3 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2">
                    <p className="text-xs font-semibold text-destructive">
                      Withdrawal failed. Reserved funds were returned to the member.
                    </p>
                  </div>
                ) : null}

                {automatic ? (
                  <div className="mt-3 rounded-xl border border-border bg-muted/30 px-3 py-2">
                    <p className="text-xs text-muted-foreground">
                      This payout cannot be manually completed from the console. TchokoPay will send
                      the final signed result automatically.
                    </p>
                  </div>
                ) : null}

                {exceptionalPending ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                        Exceptional pending request
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        No TchokoPay provider reference has been recorded yet.
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      onClick={() => {
                        setProviderRef("");
                        setPending({
                          id: row.id,
                          status: "FAILED",
                        });
                      }}
                    >
                      Reject & return funds
                    </Button>
                  </div>
                ) : null}

                {row.status === "PROCESSING" && !linked && !mobileMoney ? (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground">
                      Processing is being handled manually.
                    </p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmationModal
        open={pendingReconcile !== null}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setPendingReconcile(null);
          }
        }}
        title="Reconcile paid payout?"
        description="Use this only when the TchokoPay dashboard already shows this exact payout as PAID. No new payout will be sent."
        loading={busy}
        confirmLabel="Reconcile as completed"
        onConfirm={() => void confirmReconcilePaid()}
        details={
          pendingReconcile ? (
            <div className="space-y-2 text-left">
              <p className="text-xs text-muted-foreground">Provider reference</p>
              <p className="break-all rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs font-semibold text-foreground">
                {pendingReconcile.providerReference}
              </p>
              <p className="text-[11px] text-muted-foreground">
                This exceptional recovery only updates the existing ASH withdrawal and wallet
                ledger. It does not call TchokoPay to create another disbursement.
              </p>
            </div>
          ) : null
        }
      />

      <ConfirmationModal
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setPending(null);
            setProviderRef("");
          }
        }}
        title="Reject withdrawal?"
        description="This is an exceptional administrative action. The reserved withdrawal amount will be returned to the member's available balance."
        loading={busy}
        confirmLabel="Reject & return funds"
        onConfirm={() => void confirmException()}
        details={
          <div className="space-y-2 text-left">
            <Label htmlFor="providerRef">Provider reference (optional)</Label>

            <Input
              id="providerRef"
              value={providerRef}
              onChange={(event) => setProviderRef(event.target.value)}
              placeholder="TchokoPay transaction ID"
              disabled={busy}
            />

            <p className="text-[11px] text-muted-foreground">
              Leave this blank when no provider reference was created.
            </p>
          </div>
        }
      />
    </SectionCard>
  );
}
