export type HistoryState = "ARCHIVED" | "DELETED";
export type HistoryView = "CURRENT" | "ARCHIVED";
export function historyMatches(state: HistoryState | undefined, view: HistoryView) {
  return view === "ARCHIVED" ? state === "ARCHIVED" : !state;
}
export function canRemoveBookingHistory(status: string) {
  return ["COMPLETED", "SETTLED", "CANCELLED", "DECLINED", "NO_SHOW", "REFUNDED", "PAYMENT_FAILED", "PAYMENT_EXPIRED"].includes(status);
}
export function bookingSearch(input: { tab?: unknown; booking?: unknown }) {
  return { tab: input.tab === "provider" ? "provider" as const : "client" as const,
    booking: typeof input.booking === "string" ? input.booking : undefined };
}