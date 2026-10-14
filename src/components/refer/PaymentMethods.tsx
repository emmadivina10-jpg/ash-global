import { CreditCard, Smartphone } from "lucide-react";
import { CARD_BANK_ENABLED } from "@/components/refer/PaymentMethodPicker";
import { useRegion } from "@/lib/region-context";
import { countryMeta } from "@/lib/region";
import { cn } from "@/lib/utils";

/**
 * Shows the payment rails available where the visitor is browsing from.
 * Mobile money only appears in markets that actually support it.
 */
export function PaymentMethods({ className }: { className?: string }) {
  const { country, mobileMoneyEnabled, seesEverything } = useRegion();
  const meta = countryMeta(country);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground">
        <span aria-hidden>{seesEverything ? "🌍" : meta.flag}</span>
        {seesEverything ? "All regions" : meta.name}
      </span>
      {mobileMoneyEnabled ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground">
          <Smartphone className="size-3.5 text-primary" aria-hidden />
          MTN MoMo &amp; Orange Money
        </span>
      ) : null}
      {CARD_BANK_ENABLED ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground">
          <CreditCard className="size-3.5 text-gold" aria-hidden />
          Card &amp; wallets via Stripe
        </span>
      ) : null}
    </div>
  );
}
