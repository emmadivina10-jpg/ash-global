/** ASH booking commission. Only these rates may be chosen; 15% is the default. */
export const ALLOWED_COMMISSION_RATES = [0.12, 0.15] as const;
export const DEFAULT_COMMISSION_RATE = 0.15;

export function isAllowedCommissionRate(rate: number): boolean {
  return ALLOWED_COMMISSION_RATES.some((r) => Math.abs(r - rate) < 1e-9);
}

/** Splits a booking price into ASH commission and provider share (whole units). */
export function splitBooking(
  price: number,
  rate: number,
): { commission: number; provider: number } {
  const commission = Math.round(price * rate);
  return { commission, provider: price - commission };
}

/** Rate shown for a booking: the rate saved at payment, else the current rate for unpaid ones. */
export function effectiveRate(
  savedRate: number | null,
  paid: boolean,
  currentRate: number,
): number | null {
  if (paid) return savedRate;
  return currentRate;
}
