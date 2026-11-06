import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Gift, History, Send, TicketCheck, WalletCards } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { giftCardMinorUnits, type GiftCardCurrency } from "@/lib/gift-card-amount";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/gift-cards")({
  head: () => ({ meta: [{ title: "ASH Gift Cards — ASH Glo" }] }),
  component: GiftCardsPage,
});

function GiftCardsPage() {
  const { tx } = useI18n();
  const [currency, setCurrency] = useState<GiftCardCurrency>("CAD");
  const [amount, setAmount] = useState("");
  const features = [
    { icon: Send, en: "Send a gift card", fr: "Envoyer une carte cadeau" },
    { icon: TicketCheck, en: "Claim a gift card", fr: "Réclamer une carte cadeau" },
    { icon: WalletCards, en: "My gift cards", fr: "Mes cartes cadeaux" },
    { icon: History, en: "Transaction history", fr: "Historique des transactions" },
  ];
  return (
    <main className="mx-auto max-w-xl space-y-6 pb-8">
      <header className="flex items-center gap-4">
        <Link
          to="/menu"
          aria-label={tx("Back to menu", "Retour au menu")}
          className="grid size-10 place-items-center rounded-full hover:bg-muted"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <h1 className="font-display text-xl font-bold">
          {tx("ASH Gift Cards", "Cartes cadeaux ASH")}
        </h1>
      </header>
      <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/20 via-card to-violet-500/20 p-6">
        <Gift className="absolute right-5 top-5 size-16 text-primary/70" aria-hidden />
        <p className="text-sm font-bold uppercase tracking-widest text-primary">ASH Glo</p>
        <h2 className="mt-4 max-w-[75%] font-display text-3xl font-bold">
          {tx("Give more. Share opportunities.", "Offrez plus. Partagez des opportunités.")}
        </h2>
        <p className="mt-3 max-w-sm text-sm text-muted-foreground">
          {tx(
            "Gift cards are being prepared for use within ASH Glo.",
            "Les cartes cadeaux sont en préparation pour une utilisation sur ASH Glo.",
          )}
        </p>
      </section>
      <div role="status" className="rounded-2xl border border-primary/25 bg-primary/5 p-4 text-sm">
        {tx(
          "Not available yet. Purchasing, sending, claiming and redeeming gift cards are disabled while payment and settlement requirements are reviewed.",
          "Pas encore disponibles. L'achat, l'envoi, la réclamation et l'utilisation des cartes sont désactivés pendant l'examen des exigences de paiement et de règlement.",
        )}
      </div>
      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <h2 className="font-bold">{tx("Explore gift amounts", "Choisir un montant")}</h2>
        <p className="text-xs text-muted-foreground">
          {tx(
            "Preview only; no gift card or payment will be created.",
            "Aperçu uniquement ; aucune carte ni aucun paiement ne sera créé.",
          )}
        </p>
        <div className="flex gap-2">
          {(["CAD", "XAF"] as const).map((item) => (
            <Button
              key={item}
              type="button"
              size="sm"
              variant={currency === item ? "default" : "outline"}
              aria-pressed={currency === item}
              onClick={() => {
                setCurrency(item);
                setAmount("");
              }}
            >
              {item}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(currency === "CAD" ? ["25", "50", "100"] : ["5000", "10000", "25000"]).map((value) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={amount === value ? "default" : "outline"}
              aria-pressed={amount === value}
              onClick={() => setAmount(value)}
            >
              {value} {currency}
            </Button>
          ))}
        </div>
        <label className="block text-sm">
          {tx("Custom amount", "Montant personnalisé")} ({currency})
          <Input
            value={amount}
            maxLength={32}
            inputMode="decimal"
            onChange={(event) => setAmount(event.target.value)}
            aria-invalid={Boolean(amount && giftCardMinorUnits(amount, currency) === null)}
          />
        </label>
        {amount && giftCardMinorUnits(amount, currency) === null ? (
          <p role="alert" className="text-xs text-destructive">
            {currency === "CAD"
              ? tx(
                  "Enter a positive amount with at most two decimal places.",
                  "Saisissez un montant positif avec deux décimales au maximum.",
                )
              : tx("Enter a positive whole number.", "Saisissez un nombre entier positif.")}
          </p>
        ) : null}
      </section>
      <div className="grid grid-cols-2 gap-3">
        {features.map(({ icon: Icon, en, fr }) => (
          <div
            key={en}
            className="min-h-32 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-violet-500/10 p-4"
          >
            <Icon className="size-7 text-primary" aria-hidden />
            <h3 className="mt-3 font-bold">{tx(en, fr)}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {tx("Not available yet", "Pas encore disponible")}
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {tx(
          "Gift cards are intended for eligible purchases on ASH, not withdrawals or currency conversion.",
          "Les cartes cadeaux sont destinées aux achats éligibles sur ASH, sans retrait ni conversion de devise.",
        )}
      </p>
    </main>
  );
}
