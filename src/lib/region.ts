/** Browser-safe region rules. No server imports here. */

export type CountryCode = string;

export const REFERRAL_COUNTRIES = ["CM", "NG"] as const;

/** Mobile money is only meaningful in these markets. */
export const MOMO_COUNTRIES = ["CM"] as const;

/** Providers charged a higher take rate (Stripe markets in North America). */
export const HIGH_FEE_COUNTRIES = ["US", "CA"] as const;

export const COUNTRIES: { code: string; name: string; flag: string; currency: string }[] = [
  { code: "CM", name: "Cameroon", flag: "🇨🇲", currency: "XAF" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", currency: "NGN" },
  { code: "US", name: "United States", flag: "🇺🇸", currency: "USD" },
  { code: "CA", name: "Canada", flag: "🇨🇦", currency: "CAD" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", currency: "GBP" },
  { code: "FR", name: "France", flag: "🇫🇷", currency: "EUR" },
  { code: "DE", name: "Germany", flag: "🇩🇪", currency: "EUR" },
  { code: "BR", name: "Brazil", flag: "🇧🇷", currency: "BRL" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", currency: "ZAR" },
  { code: "GH", name: "Ghana", flag: "🇬🇭", currency: "GHS" },
];

export function countryMeta(code: string | null | undefined) {
  const upper = (code ?? "").toUpperCase();
  return COUNTRIES.find((c) => c.code === upper) ?? { code: upper || "??", name: upper || "Unknown", flag: "🌍", currency: "USD" };
}

export function showsReferral(country: string | null | undefined) {
  return (REFERRAL_COUNTRIES as readonly string[]).includes((country ?? "").toUpperCase());
}

export function showsMobileMoney(country: string | null | undefined) {
  return (MOMO_COUNTRIES as readonly string[]).includes((country ?? "").toUpperCase());
}

/** Platform take rate on a provider's sales, by the provider's country. */
export function platformRate(country: string | null | undefined) {
  return (HIGH_FEE_COUNTRIES as readonly string[]).includes((country ?? "").toUpperCase()) ? 0.02 : 0.01;
}
