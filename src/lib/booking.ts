import { baseLang } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

/** Full ASH booking lifecycle. Values match the database `booking_status` enum. */
export const BOOKING_LIFECYCLE = [
  "PENDING",
  "ACCEPTED",
  "PAYMENT_PROCESSING",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "SETTLED",
  "DECLINED",
  "CANCELLED",
  "PAYMENT_FAILED",
  "PAYMENT_EXPIRED",
  "NO_SHOW",
  "REFUNDED",
  "DISPUTED",
] as const;

export type BookingLifecycle = (typeof BOOKING_LIFECYCLE)[number];

const LABELS: Record<string, { en: string; fr: string }> = {
  PENDING: { en: "Requested", fr: "Demandée" },
  ACCEPTED: { en: "Payment required", fr: "Paiement requis" },
  PAYMENT_PROCESSING: { en: "Payment processing", fr: "Paiement en cours" },
  CONFIRMED: { en: "Confirmed", fr: "Confirmée" },
  IN_PROGRESS: { en: "In progress", fr: "En cours" },
  COMPLETED: { en: "Completed", fr: "Terminée" },
  SETTLED: { en: "Settled", fr: "Réglée" },
  DECLINED: { en: "Declined", fr: "Refusée" },
  CANCELLED: { en: "Cancelled", fr: "Annulée" },
  PAYMENT_FAILED: { en: "Payment failed", fr: "Paiement échoué" },
  PAYMENT_EXPIRED: { en: "Payment expired", fr: "Paiement expiré" },
  NO_SHOW: { en: "No show", fr: "Absence" },
  REFUNDED: { en: "Refunded", fr: "Remboursée" },
  DISPUTED: { en: "Disputed", fr: "Litige" },
};

export function bookingStatusLabel(status: string, lang: Lang): string {
  return LABELS[status]?.[baseLang(lang)] ?? status.replace(/_/g, " ").toLowerCase();
}

export function bookingStatusTone(status: string): "positive" | "warning" | "danger" | "neutral" {
  if (status === "COMPLETED" || status === "SETTLED" || status === "CONFIRMED") return "positive";
  if (status === "ACCEPTED" || status === "PAYMENT_PROCESSING" || status === "IN_PROGRESS")
    return "warning";
  if (
    [
      "DECLINED",
      "CANCELLED",
      "PAYMENT_FAILED",
      "PAYMENT_EXPIRED",
      "NO_SHOW",
      "REFUNDED",
      "DISPUTED",
    ].includes(status)
  )
    return "danger";
  return "neutral";
}

export const PAYABLE_STATUSES = ["ACCEPTED", "PAYMENT_PROCESSING", "PAYMENT_FAILED"];

/** Remaining time (ms) before a deadline, or null when there is none. */
export function timeLeft(deadline: string | null | undefined): number | null {
  if (!deadline) return null;
  return new Date(deadline).getTime() - Date.now();
}

export function formatCountdown(ms: number, lang: Lang): string {
  if (ms <= 0) return lang === "fr" ? "expiré" : "expired";
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
