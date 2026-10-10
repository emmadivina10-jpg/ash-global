import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Banknote,
  Check,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Copy,
  Download,
  FileText,
  Gauge,
  History,
  Info,
  Loader2,
  MapPin,
  Phone,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  UserRound,
  WalletCards,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { formatXAF } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/electricity")({
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

type PaymentType = "POSTPAID" | "PREPAID";
type FlowStep = "ACCOUNT" | "REVIEW" | "PAYMENT" | "SUCCESS";
type PaymentMethod = "MTN_MOMO" | "ORANGE_MONEY" | "TCHOKOPAY";

const QUICK_AMOUNTS = [5000, 10000, 25000, 50000, 100000];

function ElectricityPage() {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";

  const [flowStep, setFlowStep] = useState<FlowStep>("ACCOUNT");
  const [paymentType, setPaymentType] = useState<PaymentType>("POSTPAID");
  const [provider, setProvider] = useState("eneo");
  const [accountNumber, setAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [saveAccount, setSaveAccount] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("MTN_MOMO");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [transactionId, setTransactionId] = useState("");

  // Frontend demo data only.
  // Replace this section with the real electricity-provider/biller API response.
  const [verifiedAccount, setVerifiedAccount] = useState<{
    customerName: string;
    contractNumber: string;
    meterNumber: string;
    address: string;
    outstanding: number;
    dueDate: string;
    invoiceNumber: string;
    currentBalance: number | undefined;
    estimatedKwh: number | undefined;
  } | null>(null);

  const numericAmount = Number(amount.replace(/\D/g, ""));
  const validAccount = accountNumber.trim().length >= 4;
  const validAmount = paymentType === "POSTPAID" ? true : numericAmount >= 1000;
  const validPhone = phone.replace(/\D/g, "").length >= 9;

  const payableAmount = useMemo(() => {
    if (paymentType === "POSTPAID") {
      return verifiedAccount?.outstanding ?? 0;
    }
    return numericAmount;
  }, [numericAmount, paymentType, verifiedAccount]);

  const serviceFee = paymentMethod === "TCHOKOPAY" ? 0 : 0;
  const total = payableAmount + serviceFee;

  const stepNumber =
    flowStep === "ACCOUNT"
      ? 1
      : flowStep === "REVIEW"
        ? 2
        : flowStep === "PAYMENT"
          ? 3
          : 4;

  const verifyAccount = async () => {
    setIsVerifying(true);

    // Demo delay. Replace with an API call such as:
    // POST /api/electricity/verify
    await new Promise((resolve) => setTimeout(resolve, 700));

    setVerifiedAccount({
      customerName: "Emmanuel Divine",
      contractNumber: accountNumber || "00000000",
      meterNumber: paymentType === "PREPAID" ? accountNumber || "00000000" : "MTR-000000",
      address: "Douala, Cameroon",
      outstanding: 28500,
      dueDate: "15 Sep 2026",
      invoiceNumber: "INV-2026-0915",
      currentBalance: paymentType === "PREPAID" ? 12.4 : undefined,
      estimatedKwh: paymentType === "PREPAID" ? Math.max(1, Math.floor(numericAmount / 100)) : undefined,
    });

    setIsVerifying(false);
    setFlowStep("REVIEW");
  };

  const processPayment = async () => {
    if (!acceptedTerms) return;

    setIsProcessing(true);

    // Demo delay. Production flow should create a pending transaction,
    // redirect/initialize the selected payment provider, then wait for
    // the verified server-side webhook before showing SUCCESS.
    await new Promise((resolve) => setTimeout(resolve, 900));

    setTransactionId(`ASH-ELEC-${Date.now().toString().slice(-10)}`);
    setIsProcessing(false);
    setFlowStep("SUCCESS");
  };

  const resetFlow = () => {
    setFlowStep("ACCOUNT");
    setVerifiedAccount(null);
    setTransactionId("");
    setAcceptedTerms(false);
  };

  return (
    <div className="mx-auto w-full max-w-4xl pb-10">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
          to="/services"
          className="inline-flex items-center gap-2 rounded-full px-2 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {tx("Back to Marketplace", "Retour au Marketplace")}
        </Link>

        {flowStep !== "SUCCESS" ? (
          <Link
            to="/transactions"
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <History className="size-4" aria-hidden />
            {tx("History", "Historique")}
          </Link>
        ) : null}
      </div>

      <header className="mb-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-600 shadow-sm dark:text-amber-400">
          <Zap className="size-3.5" aria-hidden />
          ASH Pay
        </div>

        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-display text-4xl font-black tracking-[-0.035em] text-foreground sm:text-5xl">
              {tx("Electricity", "Électricité")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-[15px]">
              {tx("Verify your account, review your bill, choose how to pay, and receive your ASH receipt.", "Vérifiez votre compte, consultez votre facture, choisissez votre paiement et recevez votre reçu ASH.")}
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-border/70 bg-card px-3.5 py-2.5 text-xs shadow-sm">
            <ShieldCheck className="size-4 text-emerald-500" aria-hidden />
            <span className="font-semibold">
              {tx("Secure payment", "Paiement sécurisé")}
            </span>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500/10">
              <Clock3 className="size-5 text-amber-500" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black text-foreground">
                {tx("Coming soon", "Bientôt disponible")}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {tx("Electricity payments are not yet available on ASH. We are finalizing the provider integration to deliver a secure and reliable service.", "Les paiements d'électricité ne sont pas encore disponibles sur ASH. Nous finalisons l'intégration avec le fournisseur pour vous offrir un service sécurisé et fiable.")}
              </p>
              <div className="mt-3 inline-flex items-center rounded-full border border-amber-500/20 bg-background/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-amber-600 dark:text-amber-400">
                {tx("Service not yet available", "Service non disponible")}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mb-6 grid grid-cols-4 gap-1.5 rounded-[26px] border border-border/70 bg-muted/30 p-1.5 shadow-sm">
        {[
          { number: "1", label: tx("Account", "Compte") },
          { number: "2", label: tx("Review", "Vérification") },
          { number: "3", label: tx("Payment", "Paiement") },
          { number: "4", label: tx("Receipt", "Reçu") },
        ].map((step, index) => {
          const active = index + 1 === stepNumber;
          const complete = index + 1 < stepNumber;

          return (
            <div
              key={step.number}
              className={cn(
                "rounded-[20px] border px-2.5 py-2.5 transition-all sm:px-3",
                active
                  ? "border-primary/30 bg-card shadow-sm ring-1 ring-primary/10"
                  : complete
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : "border-border/70 bg-card",
              )}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-black",
                    active
                      ? "bg-primary text-primary-foreground"
                      : complete
                        ? "bg-emerald-500 text-white"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {complete ? <Check className="size-3.5" /> : step.number}
                </span>
                <span className="truncate text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground sm:text-xs">
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <main className="overflow-hidden rounded-[32px] border border-border/70 bg-card shadow-[var(--shadow-card)]">
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-400/[0.08] via-card to-card p-6 sm:p-10">
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-amber-400/10 blur-3xl" />
          <div className="relative mx-auto max-w-2xl text-center">
            <div className="mx-auto grid size-20 place-items-center rounded-[26px] bg-amber-400/10 ring-1 ring-amber-400/20 shadow-sm">
              <Zap className="size-10 text-amber-500" aria-hidden />
            </div>
            <p className="mt-6 text-[10px] font-black uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">ASH Pay</p>
            <h2 className="mt-2 font-display text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              {tx("Electricity payments are coming soon", "Paiement d'électricité bientôt disponible")}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
              {tx("Soon you will be able to pay Eneo bills and purchase prepaid electricity directly through ASH. The service will be activated once the official integration is ready.", "Vous pourrez bientôt payer vos factures Eneo et acheter du crédit prépayé directement avec ASH. Le service sera activé dès que l'intégration officielle sera prête.")}
            </p>
            <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <div className="flex items-center gap-3">
                  <FileText className="size-5 shrink-0 text-primary" aria-hidden />
                  <div>
                    <p className="text-sm font-bold text-foreground">{tx("Eneo bills", "Factures Eneo")}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{tx("Coming soon", "Bientôt disponible")}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <div className="flex items-center gap-3">
                  <Zap className="size-5 shrink-0 text-amber-500" aria-hidden />
                  <div>
                    <p className="text-sm font-bold text-foreground">{tx("Prepaid electricity", "Électricité prépayée")}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{tx("Coming soon", "Bientôt disponible")}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4 text-left">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-500" aria-hidden />
              <p className="text-xs leading-relaxed text-muted-foreground">
                {tx("No real payment can be made from this page yet. We will never ask you for your Mobile Money PIN.", "Aucun paiement réel ne peut être effectué depuis cette page pour le moment. Nous ne vous demanderons jamais votre code PIN Mobile Money.")}
              </p>
            </div>
          </div>
        </div>
      </main>

      {false && flowStep === "ACCOUNT" ? (
        <main className="overflow-hidden rounded-[32px] border border-border/70 bg-card shadow-[var(--shadow-card)]">
          <div className="relative overflow-hidden border-b border-border/70 bg-gradient-to-br from-amber-400/[0.08] via-card to-card p-5 sm:p-8">
            <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-amber-400/10 blur-3xl" />
            <div className="relative flex items-start gap-4">
              <div className="grid size-14 shrink-0 place-items-center rounded-[20px] bg-amber-400/12 shadow-sm ring-1 ring-amber-400/30 sm:size-16">
                <Gauge className="size-7 text-amber-500 sm:size-8" aria-hidden />
              </div>
              <div>
                <h2 className="font-display text-xl font-black tracking-tight text-foreground sm:text-2xl">
                  {tx("Identify your account", "Identifiez votre compte")}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {tx("Start by selecting your provider and service type.", "Commencez par sélectionner le fournisseur et le type de service.")}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-7 p-5 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                  {tx("Account information", "Informations du compte")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {tx("A few seconds to get started.", "Quelques secondes pour commencer.")}
                </p>
              </div>
              <div className="hidden items-center gap-1.5 rounded-full border border-emerald-500/15 bg-emerald-500/5 px-3 py-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 sm:flex">
                <ShieldCheck className="size-3.5" aria-hidden />
                {tx("Protected", "Vérifié")}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{tx("Electricity provider", "Fournisseur d'électricité")}</Label>
                <Select value={provider} onValueChange={setProvider}>
                  <SelectTrigger className="h-13 rounded-2xl border-border/70 bg-background/80 shadow-sm transition focus-visible:ring-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eneo">Eneo Cameroon</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  {tx("More providers can be added when their services are integrated with ASH.", "D'autres fournisseurs peuvent être ajoutés lorsque leurs services sont intégrés à ASH.")}
                </p>
              </div>

              <div className="space-y-2">
                <Label>{tx("Service type", "Type de service")}</Label>
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted/50 p-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType("POSTPAID");
                      setAmount("");
                      setVerifiedAccount(null);
                    }}
                    className={cn(
                      "rounded-xl px-3 py-3 text-left transition-all",
                      paymentType === "POSTPAID"
                        ? "bg-card shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <p className="text-sm font-bold">{tx("Postpaid", "Postpayé")}</p>
                    <p className="mt-0.5 text-[11px]">{tx("Pay a bill", "Payer une facture")}</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType("PREPAID");
                      setVerifiedAccount(null);
                    }}
                    className={cn(
                      "rounded-xl px-3 py-3 text-left transition-all",
                      paymentType === "PREPAID"
                        ? "bg-card shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <p className="text-sm font-bold">{tx("Prepaid", "Prépayé")}</p>
                    <p className="mt-0.5 text-[11px]">{tx("Buy credit", "Acheter du crédit")}</p>
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="electricity-account">
                {paymentType === "POSTPAID"
                  ? tx("Contract / customer number", "Numéro de contrat / client")
                  : tx("Meter number", "Numéro de compteur")}
              </Label>

              <div className="relative">
                <Input
                  id="electricity-account"
                  inputMode="numeric"
                  autoComplete="off"
                  value={accountNumber}
                  onChange={(event) =>
                    setAccountNumber(event.target.value.replace(/\s/g, ""))
                  }
                  placeholder={
                    paymentType === "POSTPAID"
                      ? tx("Enter your contract number", "Entrez votre numéro de contrat")
                      : tx("Enter your meter number", "Entrez votre numéro de compteur")
                  }
                  className="h-13 rounded-2xl bg-background pr-11"
                />
                <CircleHelp
                  className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
              </div>

              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {paymentType === "POSTPAID"
                  ? tx("ASH will use this identifier to retrieve the available bill information.", "ASH utilisera cet identifiant pour récupérer les informations disponibles de votre facture.")
                  : tx("ASH will use this number to identify your prepaid meter.", "ASH utilisera ce numéro pour identifier votre compteur prépayé.")}
              </p>
            </div>

            {paymentType === "PREPAID" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Label>{tx("Recharge amount", "Montant de recharge")}</Label>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {tx("Displayed minimum: 1,000 XAF*", "Minimum affiché: 1 000 XAF*")}
                  </span>
                </div>

                <div className="relative">
                  <Input
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) =>
                      setAmount(event.target.value.replace(/\D/g, ""))
                    }
                    placeholder="1000"
                    className="h-14 rounded-2xl bg-background pr-16 text-lg font-bold"
                    aria-label={tx("Recharge amount", "Montant de recharge")}
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                    XAF
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {QUICK_AMOUNTS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(String(preset))}
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

                <div className="flex items-start gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] leading-relaxed text-muted-foreground">
                  <Info className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden />
                  <span>
                    {tx("The minimum amount and recharge rules must be validated by the provider before production.", "Le montant minimum et les règles de recharge doivent être validés par le fournisseur avant la mise en production.")}
                  </span>
                </div>
              </div>
            ) : null}

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4">
              <input
                type="checkbox"
                checked={saveAccount}
                onChange={(event) => setSaveAccount(event.target.checked)}
                className="mt-0.5 size-4 accent-primary"
              />
              <span>
                <span className="block text-sm font-bold">
                  {tx("Save this account", "Enregistrer ce compte")}
                </span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
                  {tx("Pay faster next time. You can remove it from your saved accounts.", "Pour payer plus rapidement la prochaine fois. Vous pourrez le supprimer depuis vos comptes enregistrés.")}
                </span>
              </span>
            </label>

            <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-500" aria-hidden />
                <div>
                  <p className="text-sm font-bold">
                    {tx("Your data stays protected", "Vos données restent protégées")}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {tx("Never share your Mobile Money PIN with ASH. Your PIN should only be entered in the secure payment interface.", "Ne partagez jamais votre code PIN Mobile Money avec ASH. Le PIN est saisi uniquement dans l'interface sécurisée du moyen de paiement.")}
                  </p>
                </div>
              </div>
            </div>

            <Button
              type="button"
              disabled={!validAccount || !validAmount || isVerifying}
              className="h-13 w-full rounded-2xl text-sm font-black shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              onClick={verifyAccount}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {tx("Verifying...", "Vérification...")}
                </>
              ) : (
                <>
                  {paymentType === "POSTPAID"
                    ? tx("Verify my bill", "Vérifier ma facture")
                    : tx("Verify meter", "Vérifier le compteur")}
                  <ArrowRight className="ml-2 size-4" aria-hidden />
                </>
              )}
            </Button>
          </div>
        </main>
      ) : null}

      {flowStep === "REVIEW" && verifiedAccount ? (
        <main className="space-y-4">
          <section className="overflow-hidden rounded-[32px] border border-border/70 bg-card shadow-[var(--shadow-card)]">
            <div className="border-b border-border/70 bg-muted/20 p-5 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-500/10">
                    <BadgeCheck className="size-6 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">
                      {tx("Account verified", "Compte vérifié")}
                    </p>
                    <h2 className="mt-1 font-display text-xl font-bold">
                      {verifiedAccount.customerName}
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFlowStep("ACCOUNT")}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  {tx("Change", "Modifier")}
                </button>
              </div>
            </div>

            <div className="border-b border-border/70 p-5 sm:p-7">
              <div className="rounded-[26px] bg-foreground p-5 text-background shadow-lg sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-60">
                      {paymentType === "POSTPAID" ? (tx("Amount due", "Montant dû")) : (tx("Recharge", "Recharge"))}
                    </p>
                    <p className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                      {paymentType === "POSTPAID" ? formatXAF(verifiedAccount.outstanding) : formatXAF(numericAmount)}
                    </p>
                  </div>
                  <div className="grid size-11 place-items-center rounded-2xl bg-background/10 ring-1 ring-background/10">
                    <Zap className="size-5" aria-hidden />
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed opacity-70">
                  {paymentType === "POSTPAID"
                    ? (fr ? `Échéance : ${verifiedAccount.dueDate}` : `Due date: ${verifiedAccount.dueDate}`)
                    : (tx("The amount will be applied to the verified meter.", "Le montant sera appliqué au compteur vérifié."))}
                </p>
              </div>
            </div>

            <div className="grid gap-px bg-border/60 sm:grid-cols-2">
              <InfoRow
                icon={<FileText className="size-4" />}
                label={tx("Contract / customer", "Contrat / client")}
                value={verifiedAccount.contractNumber}
              />
              <InfoRow
                icon={<Gauge className="size-4" />}
                label={tx("Meter", "Compteur")}
                value={verifiedAccount.meterNumber}
              />
              <InfoRow
                icon={<MapPin className="size-4" />}
                label={tx("Address", "Adresse")}
                value={verifiedAccount.address}
              />
              {paymentType === "POSTPAID" ? (
                <>
                  <InfoRow
                    icon={<Clock3 className="size-4" />}
                    label={tx("Due date", "Échéance")}
                    value={verifiedAccount.dueDate}
                  />
                  <InfoRow
                    icon={<ReceiptText className="size-4" />}
                    label={tx("Invoice number", "N° de facture")}
                    value={verifiedAccount.invoiceNumber}
                  />
                  <InfoRow
                    icon={<Banknote className="size-4" />}
                    label={tx("Amount due", "Montant à payer")}
                    value={formatXAF(verifiedAccount.outstanding)}
                    strong
                  />
                </>
              ) : (
                <>
                  <InfoRow
                    icon={<WalletCards className="size-4" />}
                    label={tx("Current balance", "Solde actuel")}
                    value={`${verifiedAccount.currentBalance ?? 0} kWh`}
                  />
                  <InfoRow
                    icon={<Zap className="size-4" />}
                    label={tx("Estimated credit", "Crédit estimé")}
                    value={`${verifiedAccount.estimatedKwh ?? 0} kWh`}
                  />
                </>
              )}
            </div>

            {paymentType === "POSTPAID" ? (
              <div className="border-t border-border/70 p-5 sm:p-7">
                <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 size-5 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold">
                        {tx("Bill summary", "Détail de la facture")}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {tx("The displayed amount comes from the provider response. ASH should never invent or estimate the amount due for a real transaction.", "Le montant affiché vient de la réponse du fournisseur. ASH ne doit jamais inventer ou estimer le montant dû pour une vraie transaction.")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {paymentType === "PREPAID" ? (
              <div className="border-t border-border/70 p-5 sm:p-7">
                <div className="space-y-2">
                  <Label>{tx("Recharge amount", "Montant à recharger")}</Label>
                  <div className="relative">
                    <Input
                      inputMode="decimal"
                      value={amount}
                      onChange={(event) =>
                        setAmount(event.target.value.replace(/\D/g, ""))
                      }
                      className="h-14 rounded-2xl bg-background pr-16 text-lg font-bold"
                    />
                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                      XAF
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="h-12 rounded-2xl sm:flex-1"
              onClick={() => setFlowStep("ACCOUNT")}
            >
              <ArrowLeft className="mr-2 size-4" />
              {tx("Back", "Retour")}
            </Button>
            <Button
              className="h-12 rounded-2xl sm:flex-[2]"
              disabled={paymentType === "PREPAID" && numericAmount < 1000}
              onClick={() => setFlowStep("PAYMENT")}
            >
              {tx("Choose payment", "Choisir le paiement")}
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        </main>
      ) : null}

      {flowStep === "PAYMENT" ? (
        <main className="space-y-4">
          <section className="overflow-hidden rounded-[32px] border border-border/70 bg-card shadow-[var(--shadow-card)]">
            <div className="border-b border-border/70 bg-gradient-to-br from-primary/[0.06] via-card to-card p-5 sm:p-8">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary">
                {tx("Step 3", "Étape 3")}
              </p>
              <h2 className="mt-1 font-display text-xl font-bold">
                {tx("Choose your payment method", "Choisissez votre moyen de paiement")}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {tx("The final amount and any applicable fees must be confirmed before authorization.", "Le montant final et les éventuels frais doivent être confirmés avant l'autorisation.")}
              </p>
            </div>

            <div className="space-y-5 p-5 sm:p-7">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    id: "MTN_MOMO" as const,
                    label: "MTN MoMo",
                    icon: <Smartphone className="size-5" />,
                  },
                  {
                    id: "ORANGE_MONEY" as const,
                    label: "Orange Money",
                    icon: <Smartphone className="size-5" />,
                  },
                  {
                    id: "TCHOKOPAY" as const,
                    label: "TchokoPay",
                    icon: <WalletCards className="size-5" />,
                  },
                ].map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={cn(
                      "rounded-2xl border p-4 text-left transition-all",
                      paymentMethod === method.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border/70 hover:border-primary/30",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="grid size-10 place-items-center rounded-xl bg-muted">
                        {method.icon}
                      </span>
                      {paymentMethod === method.id ? (
                        <CheckCircle2 className="size-5 text-primary" />
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm font-bold">{method.label}</p>
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-phone">
                  {tx("Payment phone number", "Numéro de téléphone de paiement")}
                </Label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="payment-phone"
                    inputMode="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="6XX XXX XXX"
                    className="h-12 rounded-2xl bg-background pl-11"
                  />
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {tx("The number should match the selected payment method.", "Le numéro doit correspondre au moyen de paiement sélectionné.")}
                </p>
              </div>

              <div className="rounded-3xl border border-border/70 bg-muted/20 p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {tx("Payment summary", "Résumé du paiement")}
                </p>

                <div className="mt-4 space-y-3">
                  <SummaryRow
                    label={paymentType === "POSTPAID" ? tx("Bill", "Facture") : tx("Recharge", "Recharge")}
                    value={formatXAF(payableAmount)}
                  />
                  <SummaryRow
                    label={tx("Service fee", "Frais de service")}
                    value={serviceFee ? formatXAF(serviceFee) : tx("To be confirmed", "À confirmer")}
                  />
                  <div className="my-2 h-px bg-border/70" />
                  <SummaryRow
                    label={tx("Total", "Total")}
                    value={formatXAF(total)}
                    strong
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/70 p-4">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                  className="mt-0.5 size-4 accent-primary"
                />
                <span className="text-xs leading-relaxed text-muted-foreground">
                  {tx("I confirm the information above and authorize ASH to initiate this transaction with the selected payment method.", "Je confirme les informations ci-dessus et j'autorise ASH à initier cette transaction auprès du moyen de paiement sélectionné.")}
                </span>
              </label>

              <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-500" />
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {tx("ASH should never ask for your Mobile Money PIN. A payment is only final after server-side confirmation.", "ASH ne doit jamais demander votre code PIN Mobile Money. Le succès affiché dans l'application ne sera définitif qu'après confirmation côté serveur.")}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  className="h-12 rounded-2xl sm:flex-1"
                  onClick={() => setFlowStep("REVIEW")}
                >
                  <ArrowLeft className="mr-2 size-4" />
                  {tx("Back", "Retour")}
                </Button>
                <Button
                  className="h-12 rounded-2xl sm:flex-[2]"
                  disabled={!validPhone || !acceptedTerms || total <= 0 || isProcessing}
                  onClick={processPayment}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      {tx("Processing...", "Traitement...")}
                    </>
                  ) : (
                    <>
                      {tx("Pay now", "Payer maintenant")}
                      <ArrowRight className="ml-2 size-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </section>
        </main>
      ) : null}

      {flowStep === "SUCCESS" ? (
        <main className="space-y-4">
          <section className="overflow-hidden rounded-[30px] border border-emerald-500/20 bg-card shadow-[var(--shadow-card)]">
            <div className="relative p-6 text-center sm:p-10">
              <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 mx-auto size-72 rounded-full bg-emerald-500/10 blur-3xl" />
              <div className="relative mx-auto grid size-20 place-items-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
                <CheckCircle2 className="size-10 text-emerald-500" />
              </div>

              <p className="relative mt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
                {tx("Payment confirmed", "Paiement confirmé")}
              </p>
              <h2 className="relative mt-1 font-display text-3xl font-bold">
                {tx("Payment successful", "Paiement réussi")}
              </h2>
              <p className="relative mx-auto mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground">
                {paymentType === "POSTPAID"
                  ? tx("Your payment has been recorded. Your ASH receipt is available below.", "Votre paiement a été enregistré. Votre reçu ASH est disponible ci-dessous.")
                  : tx("Your recharge has been processed. The token/credit will be provided according to the provider response.", "Votre recharge a été traitée. Le token/crédit sera fourni selon la réponse du fournisseur.")}
              </p>
            </div>

            <div className="grid gap-px bg-border/60 sm:grid-cols-2">
              <InfoRow
                icon={<UserRound className="size-4" />}
                label={tx("Customer", "Client")}
                value={verifiedAccount?.customerName ?? "—"}
              />
              <InfoRow
                icon={<Banknote className="size-4" />}
                label={tx("Amount", "Montant")}
                value={formatXAF(total)}
                strong
              />
              <InfoRow
                icon={<ReceiptText className="size-4" />}
                label={tx("ASH transaction", "Transaction ASH")}
                value={transactionId}
              />
              <InfoRow
                icon={<FileText className="size-4" />}
                label={tx("Bill / meter", "Facture / compteur")}
                value={verifiedAccount?.invoiceNumber ?? verifiedAccount?.meterNumber ?? "—"}
              />
            </div>

            {paymentType === "PREPAID" ? (
              <div className="border-t border-border/70 p-5 sm:p-7">
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-start gap-3">
                    <Zap className="mt-0.5 size-5 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold">
                        {tx("Token / credit", "Token / crédit")}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {tx("The real token must come from the provider's confirmed response. Never generate a token in the frontend.", "Le vrai token doit provenir de la réponse confirmée du fournisseur. Ne générez jamais un token côté frontend.")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-2 border-t border-border/70 p-5 sm:flex-row sm:p-7">
              <Button variant="outline" className="h-12 rounded-2xl sm:flex-1">
                <Download className="mr-2 size-4" />
                {tx("Download receipt", "Télécharger le reçu")}
              </Button>
              <Button variant="outline" className="h-12 rounded-2xl sm:flex-1">
                <Copy className="mr-2 size-4" />
                {tx("Copy reference", "Copier la référence")}
              </Button>
              <Button className="h-12 rounded-2xl sm:flex-1" onClick={resetFlow}>
                <Zap className="mr-2 size-4" />
                {tx("New payment", "Nouveau paiement")}
              </Button>
            </div>
          </section>

          <div className="grid gap-3 sm:grid-cols-3">
            <MiniInfo
              icon={<ReceiptText className="size-5 text-primary" />}
              title={tx("Receipt available", "Reçu disponible")}
            />
            <MiniInfo
              icon={<ShieldCheck className="size-5 text-emerald-500" />}
              title={tx("Secure payment", "Paiement sécurisé")}
            />
            <MiniInfo
              icon={<History className="size-5 text-muted-foreground" />}
              title={tx("Saved in history", "Dans votre historique")}
            />
          </div>
        </main>
      ) : null}

      {flowStep !== "SUCCESS" ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <MiniInfo
            icon={<BadgeCheck className="size-5 text-primary" />}
            title={tx("Verified account", "Compte vérifié")}
            description={tx("Details come from the provider.", "Les informations viennent du fournisseur.")}
          />
          <MiniInfo
            icon={<ShieldCheck className="size-5 text-emerald-500" />}
            title={tx("Secure payment", "Paiement sécurisé")}
            description={tx("Never share your PIN.", "Ne partagez jamais votre PIN.")}
          />
          <MiniInfo
            icon={<ReceiptText className="size-5 text-muted-foreground" />}
            title={tx("Receipt & history", "Reçu & historique")}
            description={tx("Keep your ASH reference.", "Gardez votre référence ASH.")}
          />
        </div>
      ) : null}

      <p className="mt-5 text-center text-[10px] leading-relaxed text-muted-foreground">
        {tx("Electricity payment will be enabled after the official provider integration is finalized.", "Le service de paiement d'électricité sera activé après finalisation de l'intégration officielle avec le fournisseur.")}
      </p>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  strong = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="bg-card p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-muted-foreground">{icon}</span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            {label}
          </p>
          <p className={cn("mt-1 break-words text-sm", strong ? "font-black" : "font-semibold")}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={cn("text-sm", strong ? "font-bold" : "text-muted-foreground")}>{label}</span>
      <span className={cn("text-sm", strong ? "font-black" : "font-bold")}>{value}</span>
    </div>
  );
}

function MiniInfo({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4">
      {icon}
      <p className="mt-2 text-xs font-bold text-foreground">{title}</p>
      {description ? <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{description}</p> : null}
    </div>
  );
}
