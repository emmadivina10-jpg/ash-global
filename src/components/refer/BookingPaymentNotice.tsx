import { AlertCircle, Clock3, RefreshCw } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export type PaymentCheckFeedback = "pending" | "failed" | "unavailable";

export function BookingPaymentNotice({ provider, checking, feedback, onCheck }: {
  provider?: string | null;
  checking: boolean;
  feedback?: PaymentCheckFeedback | undefined;
  onCheck: () => void;
}) {
  const { lang } = useI18n();
  const fr = lang === "fr";
  const bank = provider === "BANK";
  const text = feedback === "unavailable"
    ? fr ? "Vérification indisponible. Votre paiement n’a pas été confirmé dans ASH. Contactez l’assistance si vous avez été débité." : "Confirmation is unavailable. ASH has not confirmed this payment. Contact support if you were charged."
    : feedback === "failed"
      ? fr ? "Ce paiement n’a pas abouti. Le statut de la réservation est en cours d’actualisation." : "This payment did not complete. Your booking status is being refreshed."
      : feedback === "pending"
        ? fr ? "Statut actualisé : la confirmation n’est pas encore arrivée. Si vous avez été débité, ne payez pas à nouveau et contactez l’assistance." : "Status checked: confirmation has not arrived yet. If you were charged, do not pay again; contact support."
        : bank
          ? fr ? "Votre virement attend la confirmation bancaire. Ne payez pas à nouveau si vous avez déjà envoyé les fonds." : "Your transfer is awaiting bank confirmation. Do not pay again if you have already sent the funds."
          : fr ? "ASH attend la confirmation du service de paiement. Si vous avez été débité, ne payez pas à nouveau." : "ASH is waiting for confirmation from the payment service. If you were charged, do not pay again.";
  return <div className="mt-3 border-l-2 border-gold bg-muted/40 px-3 py-3">
    <div className="flex items-start gap-2">
      {feedback === "unavailable" || feedback === "failed" ? <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden /> : <Clock3 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />}
      <div className="min-w-0 flex-1" role="status" aria-live="polite">
        <p className="text-sm font-semibold text-foreground">{checking ? fr ? "Actualisation…" : "Checking status…" : fr ? "En attente de confirmation" : "Awaiting confirmation"}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p>
      </div>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <Button size="sm" variant="outline" disabled={checking} onClick={onCheck}><RefreshCw className={checking ? "size-3.5 animate-spin" : "size-3.5"} aria-hidden />{fr ? "Actualiser le statut" : "Check status"}</Button>
      <Link to="/support" className="text-xs font-semibold text-primary underline underline-offset-4">{fr ? "Assistance paiement" : "Payment support"}</Link>
    </div>
  </div>;
}