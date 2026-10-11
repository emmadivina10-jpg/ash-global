/** Display choices only: never enables a payment rail or converts balances. */
export const DISPLAY_CURRENCIES = ["XAF", "CAD", "USD", "EUR", "GBP", "XOF", "NGN", "GHS", "KES", "ZAR", "RWF", "UGX", "TZS", "GNF", "MAD", "EGP", "CHF", "AUD", "NZD", "JPY", "CNY", "INR", "AED", "SAR", "SGD", "HKD", "BRL", "MXN", "SEK", "NOK"] as const;
export function currencyName(currency: string, fr: boolean): string {
  try { return new Intl.DisplayNames([fr ? "fr" : "en"], { type: "currency" }).of(currency) ?? currency; }
  catch { return currency; }
}