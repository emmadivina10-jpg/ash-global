import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useProfile } from "@/lib/queries";
import { startActivation } from "@/lib/payments.functions";
import { syncMyActivation } from "@/lib/activation.functions";
import { SectionCard } from "@/components/refer/cards";
import { Button } from "@/components/ui/button";
import { formatXAF, ACTIVATION_FEE, COMMISSIONS } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/activate")({
  head: () => ({
    meta: [
      { title: "Activate your account — ASH Glo REFER" },
      { name: "description", content: "Pay the one-time 5,000 XAF activation fee to unlock referral earnings." },
    ],
  }),
  component: ActivatePage,
});

type Phase = "idle" | "creating" | "awaiting" | "verifying" | "active" | "error";

function ActivatePage() {
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const sync = useServerFn(syncMyActivation);
  const [phase, setPhase] = useState<Phase>("idle");
  const [reference, setReference] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const celebrated = useRef(false);

  const alreadyActive = profile?.account_status === "ACTIVE";

  // The server is the source of truth: on load (and while a payment is in
  // flight) we ask it to re-check the provider and activate when it confirms.
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
      }
    }

    void check();
    const id = setInterval(() => void check(), 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [alreadyActive, sync, queryClient]);

  async function pay() {
    setPhase("creating");
    setMessage(null);
    const result = await startActivation({ data: undefined });

    if (!result.ok) {
      setPhase("error");
      if (result.error === "ALREADY_ACTIVE") {
        setMessage("Your account is already active.");
        return;
      }
      if (result.error === "PAYMENT_PROVIDER_NOT_CONFIGURED") {
        setMessage(
          "Payments are not connected yet. TchokoPay credentials must be added before activation payments can be created. No payment has been taken.",
        );
        return;
      }
      if (result.error === "Invalid or revoked API key" || result.error === "PROVIDER_HTTP_401") {
        setMessage(
          "The payment provider rejected our credentials. The TchokoPay API key needs to be updated. No payment has been taken.",
        );
        return;
      }
      setMessage(
        result.error
          ? `We could not start the payment: ${result.error}`
          : "We could not start the payment. Please try again in a moment.",
      );
      return;
    }

    setReference(result.reference);
    setPhase("awaiting");
    if (result.checkoutUrl) {
      window.location.href = result.checkoutUrl;
    }
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
        ? "The payment provider reports this payment as unsuccessful. Please start a new payment."
        : "We have not received a confirmed payment for this reference yet. If you just paid, wait a moment and check again.",
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
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Activate Your ASH Glo REFER Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A single payment unlocks referral participation on your account.
        </p>
      </header>

      <div className="brand-gradient rounded-3xl p-6 text-primary-foreground shadow-[var(--shadow-raised)]">
        <p className="text-sm opacity-85">One-time activation fee</p>
        <p className="tabular mt-1 text-5xl font-bold">{formatXAF(ACTIVATION_FEE)}</p>
        <p className="mt-4 text-sm opacity-85">
          Paid securely through TchokoPay. Your account activates only after the payment is verified.
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

      <div className="space-y-3">
        <Button className="h-12 w-full" onClick={pay} disabled={phase === "creating" || phase === "verifying"}>
          {phase === "creating" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {phase === "creating" ? "Payment processing…" : `Pay ${formatXAF(ACTIVATION_FEE)}`}
        </Button>

        {reference ? (
          <div className="surface-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Payment reference</p>
            <p className="tabular mt-1 font-semibold text-foreground">{reference}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              We re-check this payment with the provider automatically every 15 seconds.
            </p>
            <Button variant="outline" className="mt-3 w-full" onClick={verify} disabled={phase === "verifying"}>
              {phase === "verifying" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {phase === "verifying" ? "Verifying payment…" : "I have paid — check payment now"}
            </Button>
          </div>
        ) : null}

        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          Activation is granted by our servers only after the payment provider confirms the payment. Clicking
          pay never activates an account on its own.
        </p>
      </div>
    </div>
  );
}
