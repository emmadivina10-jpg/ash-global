/** A customer assertion is never payment evidence. Booking state remains authoritative. */
export function bookingPaymentAction(status: string): "pay" | "confirm" | "track" | "none" {
  if (["ACCEPTED", "PAYMENT_FAILED"].includes(status)) return "pay";
  if (status === "PAYMENT_PROCESSING") return "confirm";
  if (["CONFIRMED", "IN_PROGRESS"].includes(status)) return "track";
  return "none";
}

export function paymentCheckOutcome(result: { ok: boolean; status?: string }): "paid" | "pending" | "failed" | "unavailable" {
  if (!result.ok) return "unavailable";
  if (result.status === "PAID") return "paid";
  if (["FAILED", "CANCELLED", "EXPIRED"].includes(result.status ?? "")) return "failed";
  return "pending";
}