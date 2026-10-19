import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, CreditCard, ArrowUpRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PayoutAccountCard } from "./PayoutAccountCard";
import { getPayoutSetupVisibility } from "@/lib/payouts.functions";
import { useCardBankAvailable } from "./PaymentMethodPicker";
import { CardBankComingSoon } from "./CardBankComingSoon";

export function WalletPayoutSetup({ country }: { country: string }) {
  const { tx, lang } = useI18n();
  const cardBank = useCardBankAvailable();
  const [mode, setMode] = useState<"bank" | "card" | null>(null);
  const visibility = useServerFn(getPayoutSetupVisibility);
  // Option A: bank payout setup is entirely hidden for anyone who is not an
  // approved provider — customers never see the option, not even disabled.
  const { data: gate } = useQuery({
    queryKey: ["payout-setup-visibility"],
    queryFn: () => visibility({ data: undefined as never }),
    enabled: cardBank,
    staleTime: 60_000,
  });
  if (!cardBank) return <section id="payout-setup" className="py-3"><CardBankComingSoon fr={lang === "fr"} /></section>;
  if (!gate) return null;
  if (!gate.canSetUpBank) return null;
  return (
    <section id="payout-setup" className="scroll-mt-5 border-y border-border py-5">
      <h2 className="text-base font-bold text-foreground">
        {tx("Payout accounts", "Comptes de versement")}
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Button
          variant="outline"
          className="h-auto justify-start gap-3 whitespace-normal p-4 text-start"
          onClick={() => setMode("bank")}
        >
          <Building2 className="size-5 shrink-0 text-primary" />
          <span className="flex-1">
            <span className="block font-semibold">
              {tx("Set up a bank for payouts", "Configurer une banque pour les versements")}
            </span>
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              {tx("Stripe · check availability", "Stripe · vérifier la disponibilité")}
            </span>
          </span>
          <ArrowUpRight className="size-4 shrink-0" />
        </Button>
        <Button
          variant="outline"
          className="h-auto justify-start gap-3 whitespace-normal p-4 text-start"
          onClick={() => setMode("card")}
        >
          <CreditCard className="size-5 shrink-0 text-gold" />
          <span className="flex-1">
            <span className="block font-semibold">
              {tx("Card payout setup", "Configuration des versements par carte")}
            </span>
            <span className="mt-1 block text-xs font-normal text-muted-foreground">
              {tx("Not available yet", "Pas encore disponible")}
            </span>
          </span>
          <ArrowUpRight className="size-4 shrink-0" />
        </Button>
      </div>
      <Dialog
        open={mode !== null}
        onOpenChange={(open) => {
          if (!open) setMode(null);
        }}
      >
        <DialogContent className="max-h-[85dvh] max-w-[calc(100%-2rem)] overflow-y-auto rounded-lg sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {mode === "bank"
                ? tx("Bank payout setup", "Configuration des versements bancaires")
                : tx("Card payout setup", "Configuration des versements par carte")}
            </DialogTitle>
            <DialogDescription>
              {mode === "bank"
                ? tx(
                    "Bank details are entered securely on Stripe when onboarding is available.",
                    "Les coordonnées bancaires sont saisies sur Stripe lorsque l’inscription est disponible.",
                  )
                : tx(
                    "Card payments are active. Withdrawals to a card are separate and are not enabled yet. No card details are collected here.",
                    "Les paiements par carte sont actifs. Les retraits vers une carte sont distincts et ne sont pas encore activés. Aucune donnée de carte n’est collectée ici.",
                  )}
            </DialogDescription>
          </DialogHeader>
          {mode === "bank" ? (
            <PayoutAccountCard country={country} />
          ) : (
            <Button variant="outline" onClick={() => setMode("bank")}>
              <Building2 className="size-4" />
              {tx("View bank payout setup", "Voir la configuration bancaire")}
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
