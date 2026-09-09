import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  FileText,
  Gauge,
  ShieldCheck,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { formatXAF } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/electricity/")({
  head: () => ({
    meta: [
      { title: "Electricity — ASH Pay" },
      {
        name: "description",
        content: "Pay and manage your electricity bill through ASH Pay.",
      },
    ],
  }),
  component: ElectricityPage,
});

const AMOUNT_PRESETS = [5000, 10000, 25000, 50000, 100000];

type PaymentType = "PREPAID" | "POSTPAID";

function ElectricityPage() {
  const { lang } = useI18n();
  const fr = lang === "fr";

  const [paymentType, setPaymentType] = useState<PaymentType>("POSTPAID");
  const [accountNumber, setAccountNumber] = useState("");
  const [amount, setAmount] = useState("5200");
  const [showCustomAmount, setShowCustomAmount] = useState(true);

  const numericAmount = Number(amount.replace(/\D/g, ""));
  const validAccount = accountNumber.trim().length >= 4;
  const validAmount = numericAmount > 0;

  return (
    <div className="mx-auto w-full max-w-3xl pb-8">
      <div className="mb-5">
        <Link
          to="/services"
          className="inline-flex items-center gap-2 rounded-full px-2 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {fr ? "Retour" : "Back"}
        </Link>
      </div>

      <header className="mb-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-600 dark:text-amber-400">
          <Zap className="size-3.5" aria-hidden />
          ASH Pay
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {fr ? "Électricité" : "Electricity"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {fr
            ? "Gérez votre paiement d'électricité depuis un seul endroit."
            : "Manage your electricity payment from one place."}
        </p>
      </header>

      <div className="mb-5 grid grid-cols-3 gap-2">
        {[
          { number: "1", label: fr ? "Compte" : "Account", active: true },
          { number: "2", label: fr ? "Paiement" : "Payment", active: false },
          { number: "3", label: fr ? "Reçu" : "Receipt", active: false },
        ].map((step) => (
          <div
            key={step.number}
            className={cn(
              "rounded-2xl border px-3 py-2.5",
              step.active ? "border-primary/25 bg-primary/5" : "border-border/70 bg-card",
            )}
          >
            <p className={cn("text-[10px] font-bold uppercase tracking-[0.12em]", step.active ? "text-primary" : "text-muted-foreground")}>
              {step.number}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-foreground">{step.label}</p>
          </div>
        ))}
      </div>

      <main className="overflow-hidden rounded-[30px] border border-border/70 bg-card shadow-[var(--shadow-card)]">
        <div className="relative overflow-hidden border-b border-border/70 p-5 sm:p-7">
          <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="relative flex items-start gap-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-amber-400/12 ring-1 ring-amber-400/30">
              <Gauge className="size-7 text-amber-500" aria-hidden />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">
                {fr ? "Identifiez votre compte" : "Identify your account"}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {fr
                  ? "Choisissez le type de paiement et entrez votre identifiant."
                  : "Choose your payment type and enter your identifier."}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-5 sm:p-7">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted/50 p-1.5">
            <button
              type="button"
              onClick={() => setPaymentType("POSTPAID")}
              className={cn(
                "rounded-xl px-3 py-3 text-left transition-all",
                paymentType === "POSTPAID" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <p className="text-sm font-bold">{fr ? "Postpayé" : "Postpaid"}</p>
              <p className="mt-0.5 text-[11px]">{fr ? "Payer une facture" : "Pay a bill"}</p>
            </button>
            <button
              type="button"
              onClick={() => setPaymentType("PREPAID")}
              className={cn(
                "rounded-xl px-3 py-3 text-left transition-all",
                paymentType === "PREPAID" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <p className="text-sm font-bold">{fr ? "Prépayé" : "Prepaid"}</p>
              <p className="mt-0.5 text-[11px]">{fr ? "Acheter du crédit" : "Buy electricity credit"}</p>
            </button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="electricity-account">
              {paymentType === "POSTPAID"
                ? fr ? "Numéro de contrat / client" : "Contract / customer number"
                : fr ? "Numéro de compteur" : "Meter number"}
            </Label>
            <div className="relative">
              <Input
                id="electricity-account"
                inputMode="numeric"
                value={accountNumber}
                onChange={(event) => setAccountNumber(event.target.value.replace(/\s/g, ""))}
                placeholder={
                  paymentType === "POSTPAID"
                    ? fr ? "Entrez votre numéro de contrat" : "Enter your contract number"
                    : fr ? "Entrez votre numéro de compteur" : "Enter your meter number"
                }
                className="h-13 rounded-2xl bg-background pr-11"
              />
              <CircleHelp className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {paymentType === "POSTPAID"
                ? fr ? "Cet identifiant servira à retrouver les informations de votre facture." : "This identifier will be used to retrieve your bill information."
                : fr ? "Ce numéro servira à identifier votre compteur." : "This number will be used to identify your meter."}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label>{fr ? "Montant" : "Amount"}</Label>
              <button
                type="button"
                onClick={() => setShowCustomAmount((value) => !value)}
                className="text-xs font-bold text-primary hover:underline"
              >
                {showCustomAmount ? fr ? "Masquer" : "Hide" : fr ? "Montant personnalisé" : "Custom amount"}
              </button>
            </div>

            {showCustomAmount ? (
              <div className="relative">
                <Input
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value.replace(/\D/g, ""))}
                  placeholder="5200"
                  className="h-14 rounded-2xl bg-background pr-16 text-lg font-bold"
                  aria-label={fr ? "Montant" : "Amount"}
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">XAF</span>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {AMOUNT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    setAmount(String(preset));
                    setShowCustomAmount(true);
                  }}
                  className={cn(
                    "rounded-full border px-3.5 py-2 text-xs font-bold transition-all",
                    amount === String(preset)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground",
                  )}
                >
                  {formatXAF(preset)}
                </button>
              ))}
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {fr
                ? "Les montants proposés sont des raccourcis. Vous pouvez saisir un montant personnalisé."
                : "The suggested amounts are shortcuts. You can enter a custom amount."}
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-500" aria-hidden />
              <div>
                <p className="text-sm font-bold text-foreground">{fr ? "Paiement sécurisé" : "Secure payment"}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {fr
                    ? "Après vérification, vous choisirez votre méthode de paiement avant la confirmation."
                    : "After verification, you will choose your payment method before confirmation."}
                </p>
              </div>
            </div>
          </div>

          <Button
            type="button"
            disabled={!validAccount || !validAmount}
            className="h-13 w-full rounded-2xl text-sm font-bold"
            onClick={() => {
              // Frontend design phase.
              // Next: verify account/bill, then payment method and confirmation.
            }}
          >
            {paymentType === "POSTPAID"
              ? fr ? "Vérifier ma facture" : "Verify my bill"
              : fr ? "Continuer" : "Continue"}
            <ArrowRight className="ml-2 size-4" aria-hidden />
          </Button>
        </div>
      </main>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <FileText className="size-5 text-primary" aria-hidden />
          <p className="mt-2 text-xs font-bold text-foreground">{fr ? "Facture vérifiée" : "Verified bill"}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <ShieldCheck className="size-5 text-emerald-500" aria-hidden />
          <p className="mt-2 text-xs font-bold text-foreground">{fr ? "Paiement sécurisé" : "Secure payment"}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-4">
          <CheckCircle2 className="size-5 text-primary" aria-hidden />
          <p className="mt-2 text-xs font-bold text-foreground">{fr ? "Reçu disponible" : "Receipt available"}</p>
        </div>
      </div>
    </div>
  );
}
