/**
 * Smallest price (XAF) a vendor may set and that card checkout accepts.
 * 1,850 XAF ≈ $2.98 USD, the card minimum below which Stripe's fee exceeds
 * ASH's commission. The database trigger enforce_service_min_price mirrors it.
 */
export const MIN_SERVICE_PRICE_XAF = 1850;

export function meetsMinimumPrice(price: number): boolean {
  return Number.isFinite(price) && price >= MIN_SERVICE_PRICE_XAF;
}
