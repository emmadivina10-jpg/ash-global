/**
 * Stripe fee and minimum-charge policy (browser-safe).
 *
 * Rates are MEASURED on ASH's live account, not invented: the Oct 2026 audit
 * of real balance transactions showed 2.9% + 30¢ processing per charge, plus
 * 2% when the charge currency converts into the platform's CAD balance.
 * Re-measure if Stripe reprices the account.
 */
export const STRIPE_PERCENT_FEE = 0.029;
export const STRIPE_FIXED_FEE_MINOR = 30;
export const STRIPE_FX_PERCENT = 0.02;
export const PLATFORM_COMMISSION = 0.15;

/** The platform balance is CAD; any other charge currency pays the FX fee. */
export function chargeConverts(currency: string): boolean {
  return currency.toLowerCase() !== "cad";
}

/**
 * Smallest gross (minor units) where ASH's 15% commission still covers the
 * Stripe fee. Below this the platform loses money on every payment.
 * CAD: ceil(30 / (0.15 - 0.029)) = 248. USD (with FX): ceil(30 / 0.101) = 298.
 */
export function minimumChargeMinor(currency: string): number {
  const margin =
    PLATFORM_COMMISSION -
    STRIPE_PERCENT_FEE -
    (chargeConverts(currency) ? STRIPE_FX_PERCENT : 0);
  if (margin <= 0) throw new Error("UNSUPPORTED_CURRENCY_ECONOMICS");
  return Math.ceil(STRIPE_FIXED_FEE_MINOR / margin);
}

/** True when the commission on `grossMinor` covers the Stripe fee. */
export function chargeIsViable(currency: string, grossMinor: number): boolean {
  return Number.isSafeInteger(grossMinor) && grossMinor >= minimumChargeMinor(currency);
}
