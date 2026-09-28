/** Client-safe ASH Clean constants shared by customer, worker and console screens. */
export const CLEAN_TIMELINE = [
  { key: "BOOKED", en: "Booking confirmed", fr: "Réservation confirmée" },
  { key: "PICKUP_ASSIGNED", en: "Pickup assigned", fr: "Collecte assignée" },
  { key: "PICKUP_ON_THE_WAY", en: "On the way to you", fr: "En route vers vous" },
  { key: "COLLECTED", en: "Laundry collected", fr: "Linge collecté" },
  { key: "RECEIVED", en: "Received at ASH Clean", fr: "Reçu chez ASH Clean" },
  { key: "WEIGHED", en: "Weighed", fr: "Pesé" },
  { key: "AWAITING_APPROVAL", en: "Awaiting your price approval", fr: "En attente de votre accord" },
  { key: "APPROVED", en: "Price approved & paid", fr: "Prix accepté et payé" },
  { key: "WASHING", en: "Washing", fr: "Lavage" },
  { key: "DRYING", en: "Drying", fr: "Séchage" },
  { key: "IRONING", en: "Ironing", fr: "Repassage" },
  { key: "FOLDING", en: "Folding", fr: "Pliage" },
  { key: "QUALITY_CHECK", en: "Quality check", fr: "Contrôle qualité" },
  { key: "PACKED", en: "Packed", fr: "Emballé" },
  { key: "READY", en: "Ready for delivery", fr: "Prêt à livrer" },
  { key: "DELIVERY_ASSIGNED", en: "Delivery assigned", fr: "Livraison assignée" },
  { key: "DELIVERY_ON_THE_WAY", en: "Out for delivery", fr: "En cours de livraison" },
  { key: "DELIVERED", en: "Delivered", fr: "Livré" },
] as const;

export const CLEAN_EXTRA_STATUS: Record<string, { en: string; fr: string }> = {
  RETURN_REQUESTED: { en: "Return requested", fr: "Retour demandé" },
  CANCELLED: { en: "Cancelled", fr: "Annulé" },
};

export function cleanStatusLabel(status: string, fr = false): string {
  const step = CLEAN_TIMELINE.find((s) => s.key === status);
  const extra = CLEAN_EXTRA_STATUS[status];
  const hit = step ?? extra;
  return hit ? (fr ? hit.fr : hit.en) : status;
}

export function cleanStepIndex(status: string): number {
  return CLEAN_TIMELINE.findIndex((s) => s.key === status);
}

export function methodLabel(method: string, fr = false) {
  return method === "STAFF" ? (fr ? "ASH Staff" : "ASH Staff") : fr ? "ASH Rider" : "ASH Rider";
}

export function fcfa(v: number | string | null | undefined) {
  return `${Math.round(Number(v ?? 0)).toLocaleString("fr-FR")} FCFA`;
}
