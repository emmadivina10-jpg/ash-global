import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

type Tone = "success" | "warning" | "danger" | "neutral" | "info";

const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-success/12 text-success border-success/25",
  warning: "bg-gold/20 text-gold-foreground border-gold/40",
  danger: "bg-destructive/10 text-destructive border-destructive/25",
  neutral: "bg-muted text-muted-foreground border-border",
  info: "bg-primary/10 text-primary border-primary/25",
};

const STATUS_TONE: Record<string, Tone> = {
  ACTIVE: "success",
  COMPLETED: "success",
  PAID: "success",
  PENDING: "warning",
  "PENDING ACTIVATION": "warning",
  PROCESSING: "info",
  FAILED: "danger",
  CANCELLED: "danger",
  SUSPENDED: "danger",
  REVERSED: "neutral",
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  const { lang } = useI18n();
  const french: Record<string, string> = {
    ACTIVE: "Actif",
    COMPLETED: "Terminé",
    PAID: "Payé",
    PENDING: "En attente",
    "PENDING ACTIVATION": "Activation en attente",
    PROCESSING: "En cours",
    FAILED: "Échoué",
    CANCELLED: "Annulé",
    SUSPENDED: "Suspendu",
    REVERSED: "Annulé",
    CONFIRMED: "Confirmé",
    DECLINED: "Refusé",
    SUCCESS: "Réussi",
    APPROVED: "Approuvé",
    REJECTED: "Refusé",
    REFUNDED: "Remboursé",
  };
  const tone = STATUS_TONE[status.toUpperCase()] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
        TONE_CLASSES[tone],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {label ??
        (lang === "fr" ? french[status.toUpperCase().replace(/_/g, " ")] : undefined) ??
        status.replace(/_/g, " ")}
    </span>
  );
}
