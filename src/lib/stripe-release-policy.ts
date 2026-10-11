/** Browser-safe rules; amounts here are actual Stripe minor units, never wallet units. */
export function providerMinorShare(gross: number, rate: number): number {
  if (!Number.isSafeInteger(gross) || gross <= 0 || !Number.isFinite(rate) || rate < 0 || rate >= 1) {
    throw new Error("INVALID_TRANSFER_AMOUNT");
  }
  return gross - Math.round(gross * rate);
}

export function releaseBlocker(input: {
  paid: boolean;
  verified: boolean;
  completed: boolean;
  held: boolean;
  destinationCountry: string;
  transfersActive: boolean;
  payoutsEnabled: boolean;
  currency: string;
}): string | null {
  if (!input.paid) return "PAYMENT_NOT_VERIFIED";
  if (!input.completed || !input.verified) return "SERVICE_NOT_VERIFIED";
  if (input.held) return "PAYMENT_HELD";
  // Initial deployment is restricted to Canadian connected bank accounts.
  // Adding countries requires confirmed platform cross-border support.
  if (input.destinationCountry !== "CA") return "UNSUPPORTED_DESTINATION";
  if (!input.transfersActive || !input.payoutsEnabled) return "PROVIDER_NOT_READY";
  if (!["cad", "usd"].includes(input.currency.toLowerCase())) return "UNSUPPORTED_TRANSFER_CURRENCY";
  return null;
}

export function checkoutMatches(input: {
  expectedSession: string;
  actualSession: string;
  expectedReference: string;
  actualReference: string;
  expectedMinor: number;
  actualMinor: number;
  expectedCurrency: string;
  actualCurrency: string;
  live: boolean;
  paid: boolean;
}): boolean {
  return input.live && input.paid && !input.actualReference.startsWith("FLT-") &&
    input.expectedSession === input.actualSession &&
    input.expectedReference === input.actualReference &&
    Number.isSafeInteger(input.expectedMinor) && input.expectedMinor > 0 &&
    input.expectedMinor === input.actualMinor &&
    input.expectedCurrency.toLowerCase() === input.actualCurrency.toLowerCase();
}

export function transferKey(bookingId: string): string {
  return `ash_marketplace_booking_${bookingId}_v1`;
}

/** Explicit release authorization is not supplied by a wallet or UI flag. */
export const LIVE_PROVIDER_TRANSFERS_ENABLED = false;
/** Owner-approved; who may connect is still decided by the server allowlist. */
export const LIVE_PROVIDER_ONBOARDING_ENABLED = true;

export function onboardingAllowed(
  controls: { onboarding_enabled?: boolean | null; onboarding_allowed_user_ids?: string[] | null } | null,
  userId: string,
): boolean {
  if (!LIVE_PROVIDER_ONBOARDING_ENABLED || !controls?.onboarding_enabled) return false;
  return (controls.onboarding_allowed_user_ids ?? []).includes(userId);
}

export function transferFailure(httpStatus: number, code: string): "INSUFFICIENT_FUNDS" | "FAILED" | "UNKNOWN" {
  if (httpStatus === 0 || httpStatus >= 500 || httpStatus === 409 || httpStatus === 429) return "UNKNOWN";
  if (code === "balance_insufficient") return "INSUFFICIENT_FUNDS";
  return "FAILED";
}

export function payoutRoute(input: { country: string; transfersActive: boolean; payoutsEnabled: boolean; detailsSubmitted: boolean }): string {
  if (input.country !== "CA") return "UNSUPPORTED_DESTINATION";
  if (!input.detailsSubmitted || !input.transfersActive || !input.payoutsEnabled) return "VERIFICATION_REQUIRED";
  return "ELIGIBLE_CANADIAN_BANK";
}