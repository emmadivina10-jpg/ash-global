import { useEffect, useState } from "react";
import { isNativeApp } from "@/lib/native";
import { ArrowLeft, Building2, CreditCard, Loader2, Smartphone } from "lucide-react";
import { MomoCharge } from "@/components/refer/MomoCharge";
import { Button } from "@/components/ui/button";
import type { BankDetails } from "@/lib/payments-ledger.functions";
import { cn } from "@/lib/utils";
import { cardBankAvailable, MOBILE_PAYMENT_QUERY } from "@/lib/mobile-payment-policy";
import { CardBankComingSoon } from "./CardBankComingSoon";

type Choice = "MTN" | "ORANGE" | "BANK" | "CARD";

/**
 * Card (Stripe) and bank transfer are temporarily disabled in the member app;
 * only MTN and Orange Mobile Money are offered. Flip to true to re-enable.
 */
export { CARD_BANK_ENABLED } from "@/lib/mobile-payment-policy";

/**
 * Card and bank stay on the desktop website; native and phone previews share
 * the mobile coming-soon gate. Fail closed until hydration.
 */
export function useCardBankAvailable(): boolean {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(MOBILE_PAYMENT_QUERY);
    const update = () => setAvailable(cardBankAvailable(isNativeApp(), media.matches));
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return available;
}

/**
 * "Choose payment method": MTN and Orange open the existing mobile money form
 * unchanged; Bank and Card hand off to the caller's handlers.
 */
export function PaymentMethodPicker({
  country = "CM",
  busy,
  amountLabel,
  onMomo,
  onCard,
  onBank,
  children,
  fr = false,
  showMomo = true,
}: {
  country?: string;
  busy: boolean;
  amountLabel: string;
  onMomo: (provider: string, phone: string) => void | Promise<void>;
  onCard: () => void | Promise<void>;
  onBank: () => void | Promise<void>;
  children?: React.ReactNode;
  fr?: boolean;
  showMomo?: boolean;
}) {
  const [choice, setChoice] = useState<Choice | null>(null);
  const cardBank = useCardBankAvailable();
  const options: { id: Choice; label: string; icon: React.ReactNode; tone: string }[] = [
    ...(showMomo
      ? [
          {
            id: "MTN" as const,
            label: "MTN Mobile Money",
            icon: <Smartphone className="size-5" aria-hidden />,
            tone: "bg-yellow-400/15 text-yellow-600 dark:text-yellow-300",
          },
          {
            id: "ORANGE" as const,
            label: "Orange Money",
            icon: <Smartphone className="size-5" aria-hidden />,
            tone: "bg-orange-500/15 text-orange-600 dark:text-orange-300",
          },
        ]
      : []),
    ...(cardBank
      ? [
          {
            id: "BANK" as const,
            label: fr ? "Virement bancaire" : "Bank",
            icon: <Building2 className="size-5" aria-hidden />,
            tone: "bg-primary/10 text-primary",
          },
          {
            id: "CARD" as const,
            label: fr ? "Carte / Stripe" : "Card / Stripe",
            icon: <CreditCard className="size-5" aria-hidden />,
            tone: "bg-accent text-accent-foreground",
          },
        ]
      : []),
  ];

  if (choice === "MTN" || choice === "ORANGE") {
    return (
      <div className="space-y-3">
        <BackButton fr={fr} onClick={() => setChoice(null)} />
        <MomoCharge
          country={country}
          busy={busy}
          submitLabel={busy ? (fr ? "Envoi…" : "Sending prompt…") : amountLabel}
          onCharge={onMomo}
          fr={fr}
        >
          {children}
        </MomoCharge>
      </div>
    );
  }

  if (cardBank && (choice === "BANK" || choice === "CARD")) {
    return (
      <div className="space-y-3">
        <BackButton fr={fr} onClick={() => setChoice(null)} />
        {children}
        <Button
          className="w-full"
          disabled={busy}
          onClick={() => void (choice === "BANK" ? onBank() : onCard())}
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {choice === "BANK"
            ? fr
              ? "Obtenir les coordonnées bancaires"
              : "Get bank transfer details"
            : fr
              ? `Payer par carte — ${amountLabel}`
              : `Pay by card — ${amountLabel}`}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground">
        {fr ? "Choisir un moyen de paiement" : "Choose payment method"}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <Button
            key={o.id}
            type="button"
            onClick={() => setChoice(o.id)}
            variant="outline"
            className="h-auto justify-start gap-3 whitespace-normal p-3 text-left"
          >
            <span className={cn("grid size-9 place-items-center rounded-xl", o.tone)}>
              {o.icon}
            </span>
            {o.label}
          </Button>
        ))}
      </div>
      {!cardBank && <CardBankComingSoon fr={fr} />}
    </div>
  );
}

function BackButton({ onClick, fr }: { onClick: () => void; fr: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden />
      {fr ? "Choisir un autre moyen" : "Choose another method"}
    </button>
  );
}

export const BANK_UNAVAILABLE_TEXT =
  "Bank transfer is currently unavailable. Please choose another payment method.";

export function BankInstructions({
  bank,
  reference,
  amountLabel,
  fr = false,
}: {
  bank: BankDetails;
  reference: string;
  amountLabel: string;
  fr?: boolean;
}) {
  const rows: [string, string | null][] = [
    [fr ? "Banque" : "Bank", bank.bank_name],
    [fr ? "Titulaire" : "Account name", bank.account_name],
    [fr ? "Numéro de compte" : "Account number", bank.account_number],
    ["IBAN", bank.iban],
    ["SWIFT/BIC", bank.swift],
    [fr ? "Agence" : "Branch", bank.branch],
    [fr ? "Montant" : "Amount", amountLabel],
  ];
  return (
    <div className="rounded-2xl border border-border bg-muted/50 p-4 text-sm">
      <p className="flex items-center gap-2 font-semibold text-foreground">
        <Building2 className="size-4 text-primary" aria-hidden />
        {fr ? "Effectuez le virement" : "Make your bank transfer"}
      </p>
      <dl className="mt-3 space-y-1.5">
        {rows
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="tabular text-right font-medium text-foreground">{v}</dd>
            </div>
          ))}
      </dl>
      <div className="mt-3 rounded-xl bg-primary/10 p-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {fr ? "Référence obligatoire" : "Required payment reference"}
        </p>
        <p className="tabular mt-1 font-bold text-foreground">{reference}</p>
      </div>
      {bank.instructions ? (
        <p className="mt-3 text-xs text-muted-foreground">{bank.instructions}</p>
      ) : null}
      <p className="mt-3 text-xs text-muted-foreground">
        {fr
          ? "Statut : en attente. Le paiement est validé uniquement après confirmation par l'équipe Finance ASH."
          : "Status: pending. This payment is marked successful only after ASH Finance confirms the transfer has arrived."}
      </p>
    </div>
  );
}
