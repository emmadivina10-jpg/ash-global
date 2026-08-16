import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useWallet, useWithdrawals } from "@/lib/queries";
import { SectionCard } from "@/components/refer/cards";
import { StatusBadge } from "@/components/refer/StatusBadge";
import { ConfirmationModal } from "@/components/refer/ConfirmationModal";
import { EmptyState, SkeletonRows } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CM_PHONE_REGEX,
  MIN_WITHDRAWAL,
  PAYMENT_METHOD_LABEL,
  formatDateTime,
  formatXAF,
  normalizePhone,
} from "@/lib/format";
import { cn } from "@/lib/utils";

const ERRORS: Record<string, string> = {
  ACCOUNT_NOT_ACTIVE: "Activate your account before requesting a withdrawal.",
  INVALID_METHOD: "Choose a valid mobile money provider.",
  INVALID_PHONE: "Enter a valid Cameroon mobile money number.",
  MIN_AMOUNT_1000: `The minimum withdrawal is ${formatXAF(MIN_WITHDRAWAL)}.`,
  INSUFFICIENT_BALANCE: "You do not have enough available balance.",
  PENDING_WITHDRAWAL_EXISTS: "You already have a withdrawal being processed.",
  UNAUTHENTICATED: "Please sign in again.",
};

export const Route = createFileRoute("/_authenticated/withdraw")({
  head: () => ({
    meta: [
      { title: "Withdraw — ASH Glo REFER" },
      { name: "description", content: "Withdraw your ASH Glo REFER earnings to MTN Mobile Money or Orange Money." },
    ],
  }),
  component: WithdrawPage,
});

function WithdrawPage() {
  const queryClient = useQueryClient();
  const { data: wallet } = useWallet();
  const { data: profile } = useProfile();
  const { data: withdrawals, isLoading } = useWithdrawals();

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"MTN_MOMO" | "ORANGE_MONEY">("MTN_MOMO");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const active = profile?.account_status === "ACTIVE";
  const available = Number(wallet?.available_balance ?? 0);

  function review(event: React.FormEvent) {
    event.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value < MIN_WITHDRAWAL) {
      setError(ERRORS["MIN_AMOUNT_1000"] ?? null);
      return;
    }
    if (value > available) {
      setError(ERRORS["INSUFFICIENT_BALANCE"] ?? null);
      return;
    }
    if (!CM_PHONE_REGEX.test(normalizePhone(phone))) {
      setError(ERRORS["INVALID_PHONE"] ?? null);
      return;
    }
    setError(null);
    setConfirming(true);
  }

  async function submit() {
    setSubmitting(true);
    const { data, error: rpcError } = await supabase.rpc("request_withdrawal", {
      _amount: Number(amount),
      _method: method,
      _phone: normalizePhone(phone),
    });
    setSubmitting(false);
    setConfirming(false);

    const result = data as { ok?: boolean; error?: string } | null;
    if (rpcError || !result?.ok) {
      const key = result?.error ?? "";
      setError(ERRORS[key] ?? "We could not submit your withdrawal. Please try again.");
      toast.error("Withdrawal request failed");
      return;
    }

    toast.success("Withdrawal request submitted successfully.");
    setAmount("");
    setError(null);
    await queryClient.invalidateQueries();
  }

  if (!active) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <EmptyState
          title="Account not active"
          description="Withdrawals unlock once your account is activated."
          action={
            <Button asChild>
              <Link to="/activate">Activate for 5,000 XAF</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Withdraw</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Available balance: <span className="tabular font-semibold text-foreground">{formatXAF(available)}</span>
        </p>
      </header>

      <SectionCard title="Request a payout">
        <form onSubmit={review} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (XAF)</Label>
            <Input
              id="amount"
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ""))}
              placeholder={String(MIN_WITHDRAWAL)}
              className="h-12 text-lg"
            />
            <p className="text-xs text-muted-foreground">Minimum {formatXAF(MIN_WITHDRAWAL)}.</p>
          </div>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium">Mobile money provider</legend>
            <div className="grid grid-cols-2 gap-3">
              {(["MTN_MOMO", "ORANGE_MONEY"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMethod(option)}
                  className={cn(
                    "min-h-14 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors",
                    method === option
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-muted",
                  )}
                >
                  {PAYMENT_METHOD_LABEL[option]}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="phone">Mobile money number</Label>
            <Input
              id="phone"
              inputMode="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="6XX XXX XXX"
              className="h-12"
            />
          </div>

          {error ? (
            <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button type="submit" className="h-12 w-full">
            Review withdrawal
          </Button>
        </form>
      </SectionCard>

      <SectionCard title="Withdrawal history">
        {isLoading ? (
          <SkeletonRows rows={3} />
        ) : (withdrawals ?? []).length === 0 ? (
          <EmptyState title="No withdrawals yet" description="Your payout requests will appear here." />
        ) : (
          <ul className="divide-y divide-border">
            {(withdrawals ?? []).map((item) => (
              <li key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-3.5">
                <div className="min-w-0">
                  <p className="tabular text-sm font-bold text-foreground">{formatXAF(item.amount)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {PAYMENT_METHOD_LABEL[item.payment_method]} · {item.phone_number}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDateTime(item.requested_at)} · {item.reference}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <ConfirmationModal
        open={confirming}
        onOpenChange={setConfirming}
        title="Confirm withdrawal"
        description="Please check these details. Payouts are reviewed before being sent."
        loading={submitting}
        confirmLabel="Submit request"
        onConfirm={submit}
        details={
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Amount</dt>
              <dd className="tabular font-bold">{formatXAF(Number(amount || 0))}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Provider</dt>
              <dd className="font-semibold">{PAYMENT_METHOD_LABEL[method]}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Number</dt>
              <dd className="font-semibold">{normalizePhone(phone)}</dd>
            </div>
          </dl>
        }
      />
    </div>
  );
}
