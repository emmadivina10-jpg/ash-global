/** Presentation-only release policy; never changes settlement or funding rails. */
export const CARD_BANK_ENABLED = false;
export const MOBILE_PAYMENT_QUERY = "(max-width: 767px)";

export function cardBankAvailable(native: boolean, phonePreview: boolean): boolean {
  void native; void phonePreview;
  return CARD_BANK_ENABLED; // Card and bank blocked everywhere for now
}

export function visibleWithdrawalMethods(currency: string, cardBank: boolean): Array<"MTN_MOMO" | "ORANGE_MONEY" | "STRIPE_BANK"> {
  if (currency.toUpperCase() === "XAF") return ["MTN_MOMO", "ORANGE_MONEY"];
  return cardBank ? ["STRIPE_BANK"] : [];
}