import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck, Smartphone, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useProfile, useWallet } from "@/lib/queries";
import { useRegion } from "@/lib/region-context";
import { startActivation } from "@/lib/payments.functions";
import { activateWithWallet, syncMyActivation } from "@/lib/activation.functions";
import { paymentErrorMessage } from "@/lib/payment-errors";
import { MomoCharge } from "@/components/refer/MomoCharge";
import { SectionCard } from "@/components/refer/cards";
import { Button } from "@/components/ui/button";
import { formatXAF, ACTIVATION_FEE, COMMISSIONS } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/activate")({
  head: () => ({
    meta: [
      { title: "Activate your account — ASH Glo" },
      { name: "description", content: "Pay the one-time 5,000 XAF activation fee to unlock referral earnings." },
    ],
  }),
  component: ActivatePage,
});

type Phase = "idle" | "charging" | "awaiting" | "verifying" | "active" | "error";

function ActivatePage() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const { data: wallet } = useWallet();
  const { country } = useRegion();
  const charge = useServerFn(startActivation);
  const payFromWallet = useServerFn(activateWithWallet);
  const sync = useServerFn(syncMyActivation);
  const [phase, setPhase] = useState<Phase>("idle");
  const [reference, setReference] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const celebrated = useRef(false);

  const walletBalance = Number(wallet?.available_balance ?? 0);
  const walletCanCover = walletBalance >= ACTIVATION_FEE;

  const alreadyActive = profile?.account_status === "ACTIVE";
  const awaiting = phase === "awaiting" || phase === "verifying";

  // The server is the source of truth: while a prompt is in flight we ask it to
  // re-read the collection from TchokoPay and activate only when it confirms.
  useEffect(() => {
    if (alreadyActive) return;
    let cancelled = false;

    async function check() {
      const state = await sync({ data: undefined });
      if (cancelled) return;
      if (state.reference) setReference(state.reference);
      if (state.accountStatus === "ACTIVE" || state.status === "PAID") {
        setPhase("active");
        if (!celebrated.current) {
          celebrated.current = true;
          toast.success("Payment confirmed. Your account is now active.");
        }
        await queryClient.invalidateQueries();
        return;
      }
      if (state.status === "FAILED" || state.status === "CANCELLED") {
        setPhase("error");
        setMessage("The payment did not go through. You can send a new prompt below.");
      }
    }

    void check();
    const id = setInterval(() => void check(), awaiting ? 5000 : 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [alreadyActive, sync, queryClient, awaiting]);

  async function pay(provider: string, phone: string) {
    setPhase("charging");
    setMessage(null);
    const result = await charge({ data: { provider, phone, country } });

    if (!result.ok) {
      setPhase("error");
      if (result.error === "ALREADY_ACTIVE") {
        setMessage("Your account is already active.");
        return;
      }
      setMessage(paymentErrorMessage(result.error, false, result.message));
      return;
    }

    setReference(result.reference);
    setPhase("awaiting");
    toast.message("Check your phone and approve the payment prompt.");
  }

  async function payWithWallet() {
    setPhase("charging");
    setMessage(null);
    const result = await payFromWallet({ data: undefined });
    if (!result.ok) {
      setPhase("error");
      setMessage(
        result.error === "INSUFFICIENT_BALANCE"
          ? `Your wallet balance (${formatXAF(result.balance ?? 0)}) is below the ${formatXAF(ACTIVATION_FEE)} fee. Top up your wallet first, or pay with Mobile Money below.`
          : result.error === "ALREADY_ACTIVE"
            ? "Your account is already active."
            : "We could not complete the wallet payment. Please try again.",
      );
      return;
    }
    setPhase("active");
    toast.success("Payment confirmed. Your account is now active.");
    await queryClient.invalidateQueries();
  }

  async function verify() {
    setPhase("verifying");
    setMessage(null);
    const state = await sync({ data: undefined });

    if (state.accountStatus === "ACTIVE" || state.status === "PAID") {
      setPhase("active");
      toast.success("Payment confirmed. Your account is now active.");
      await queryClient.invalidateQueries();
      return;
    }

    setPhase("error");
    setMessage(
      state.status === "FAILED" || state.status === "CANCELLED"
        ? "The payment provider reports this payment as unsuccessful. Please send a new prompt."
        : "The payment hasn't cleared yet. If you just approved it, give it a few seconds.",
    );
  }

  if (alreadyActive || phase === "active") {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <SectionCard>
          <div className="flex flex-col items-center py-6 text-center">
            <CheckCircle2 className="size-12 text-success" aria-hidden />
            <h1 className="mt-4 text-2xl font-bold text-foreground">Account activated</h1>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Your account is active. Share your referral link and start earning on three levels.
            </p>
            <Button asChild className="mt-6">
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Activate Your ASH Glo Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A single payment unlocks referral participation on your account.
        </p>
      </header>

      <div className="brand-gradient rounded-3xl p-6 text-primary-foreground shadow-[var(--shadow-raised)]">
        <p className="text-sm opacity-85">One-time activation fee</p>
        <p className="tabular mt-1 text-5xl font-bold">{formatXAF(ACTIVATION_FEE)}</p>
        <p className="mt-4 text-sm opacity-85">
          Paid with Mobile Money through TchokoPay. Your account activates only after the payment clears.
        </p>
      </div>

      <SectionCard title="What you unlock">
        <ul className="space-y-3 text-sm">
          {[1, 2, 3].map((level) => (
            <li key={level} className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
              <span className="font-medium text-foreground">Level {level} referral commission</span>
              <span className="tabular font-bold text-primary">
                {formatXAF(COMMISSIONS[level as 1 | 2 | 3])}
              </span>
            </li>
          ))}
        </ul>
      </SectionCard>

      {message ? (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-foreground"
        >
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden />
          <p>{message}</p>
        </div>
      ) : null}

      <SectionCard title="Pay from your wallet">
        <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Wallet className="size-4 text-primary" aria-hidden />
            Wallet balance
          </span>
          <span className="tabular font-bold text-foreground">{formatXAF(walletBalance)}</span>
        </div>
        <Button
          className="mt-3 w-full"
          onClick={payWithWallet}
          disabled={phase === "charging" || !walletCanCover}
        >
          {phase === "charging" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Pay {formatXAF(ACTIVATION_FEE)} from wallet
        </Button>
        {!walletCanCover ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Your balance is below the fee. Top up your wallet by card or Mobile Money first, or pay directly
            with Mobile Money below.
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            Instant — the fee leaves your wallet and your account activates right away.
          </p>
        )}
      </SectionCard>

      <SectionCard title="Pay with Mobile Money">
        <MomoCharge
          country={country}
          busy={phase === "charging"}
          submitLabel={phase === "charging" ? "Sending prompt…" : `Pay ${formatXAF(ACTIVATION_FEE)}`}
          onCharge={pay}
        />
      </SectionCard>

      {reference ? (
        <div className="surface-card p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Smartphone className="size-4 text-primary" aria-hidden />
            Approve the prompt on your phone
          </p>
          <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">Payment reference</p>
          <p className="tabular mt-1 font-semibold text-foreground">{reference}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            We re-check this payment with TchokoPay automatically every few seconds.
          </p>
          <Button variant="outline" className="mt-3 w-full" onClick={verify} disabled={phase === "verifying"}>
            {phase === "verifying" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {phase === "verifying" ? "Checking payment…" : "I have approved — check now"}
          </Button>
        </div>
      ) : null}

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        Activation is granted by our servers only after TchokoPay confirms the money cleared. Sending a prompt
        never activates an account on its own.
      </p>
    </div>
  );
}
