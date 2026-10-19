import { CreditCard } from "lucide-react";

export function CardBankComingSoon({ fr = false }: { fr?: boolean }) {
  return (
    <p className="flex items-center gap-2 border-t border-border pt-3 text-sm text-muted-foreground">
      <CreditCard className="size-4 shrink-0" aria-hidden />
      {fr ? "Carte et banque — bientôt disponibles" : "Card and bank — coming soon"}
    </p>
  );
}