import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  startWalletTopup,
  syncLedgerPayment,
  type BankDetails,
} from "@/lib/payments-ledger.functions";
import { paymentErrorMessage } from "@/lib/payment-errors";
import {
  PaymentMethodPicker,
  BankInstructions,
  BANK_UNAVAILABLE_TEXT,
} from "@/components/refer/PaymentMethodPicker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatXAF } from "@/lib/format";
import { useRegion } from "@/lib/region-context";

/** Wallet top-up. The balance changes only after the provider/Finance confirms. */
export function WalletTopupDialog({
  open,
  onOpenChange,
  fr,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  fr: boolean;
}) {
  const queryClient = useQueryClient();
  const { country } = useRegion();
  const start = useServerFn(startWalletTopup);
  const sync = useServerFn(syncLedgerPayment);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [bank, setBank] = useState<BankDetails | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  // Returning from Stripe checkout: ?ref=TOP-…
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const r = p.get("ref");
    if (r?.startsWith("TOP-")) {
      setReference(r);
      setStatus(p.get("card") === "cancel" ? "CANCELLED" : "PROCESSING");
      onOpenChange(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!reference || bank || !status || !["PENDING", "PROCESSING"].includes(status)) return;
    let cancelled = false;
    async function check() {
      const r = await sync({ data: { reference: reference! } });
      if (cancelled) return;
      setStatus(r.status);
      if (r.status === "SUCCESS") {
        toast.success(
          fr
            ? "Paiement confirmé, portefeuille crédité."
            : "Payment confirmed. Your wallet has been credited.",
        );
        void queryClient.invalidateQueries();
      }
    }
    void check();
    const id = setInterval(() => void check(), 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [reference, status, bank, sync, queryClient, fr]);

  const value = Math.floor(Number(amount));
  const valid = Number.isFinite(value) && value >= 500;

  async function run(method: "MOMO" | "CARD" | "BANK", provider?: string, phone?: string) {
    if (!valid) {
      setError(fr ? "Montant minimum 500 XAF." : "Minimum amount is 500 XAF.");
      return;
    }
    setBusy(true);
    setError(null);
    const r = await start({
      data: { method, amount: value, provider, phone, country, origin: window.location.origin },
    });
    setBusy(false);
    if (!r.ok) {
      setError(
        r.error === "BANK_UNAVAILABLE"
          ? BANK_UNAVAILABLE_TEXT
          : r.error === "CARD_UNAVAILABLE"
            ? fr
              ? "Le paiement par carte est indisponible. Choisissez un autre moyen."
              : "Card payment is currently unavailable. Please choose another payment method."
            : paymentErrorMessage(r.error, false, r.message),
      );
      return;
    }
    setReference(r.reference);
    setStatus(r.status);
    if (r.bank) setBank(r.bank);
    else if (r.checkoutUrl) window.location.href = r.checkoutUrl;
    else
      toast.message(
        fr
          ? "Approuvez la demande sur votre téléphone."
          : "Check your phone and approve the payment prompt.",
      );
  }

  function reset() {
    setReference(null);
    setBank(null);
    setStatus(null);
    setError(null);
  }

  const final = status && ["FAILED", "CANCELLED", "EXPIRED"].includes(status);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v && (final || status === "SUCCESS")) reset();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{fr ? "Ajouter de l'argent" : "Add money"}</DialogTitle>
        </DialogHeader>
        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-destructive/25 bg-destructive/5 p-3 text-sm"
          >
            {error}
          </p>
        ) : null}
        {status === "SUCCESS" ? (
          <p className="rounded-2xl border border-primary/40 bg-primary/10 p-4 text-sm font-semibold">
            {fr
              ? "Paiement confirmé. Portefeuille crédité."
              : "Payment confirmed. Your wallet has been credited."}
          </p>
        ) : reference && bank ? (
          <BankInstructions
            bank={bank}
            reference={reference}
            amountLabel={formatXAF(value)}
            fr={fr}
          />
        ) : reference && !final ? (
          <div className="rounded-2xl border border-border bg-muted/50 p-4 text-sm">
            <p className="font-semibold">
              {fr ? "Paiement en cours de vérification" : "Waiting for payment confirmation"}
            </p>
            <p className="tabular mt-1 text-xs text-muted-foreground">Ref {reference}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {fr
                ? "Votre solde change uniquement après confirmation."
                : "Your balance changes only after the payment is confirmed."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {final ? (
              <div className="rounded-xl bg-muted p-3 text-sm">
                {fr ? "Le paiement n'a pas abouti." : "The payment did not go through."}
                <Button variant="outline" size="sm" className="ml-2" onClick={reset}>
                  {fr ? "Choisir un autre moyen" : "Choose another method"}
                </Button>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="topup-amount">{fr ? "Montant (XAF)" : "Amount (XAF)"}</Label>
              <Input
                id="topup-amount"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                placeholder="5000"
              />
            </div>
            <PaymentMethodPicker
              country={country}
              fr={fr}
              busy={busy}
              amountLabel={`${fr ? "Payer" : "Pay"} ${valid ? formatXAF(value) : ""}`}
              onMomo={(p, ph) => run("MOMO", p, ph)}
              onCard={() => run("CARD")}
              onBank={() => run("BANK")}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
