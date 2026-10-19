import { describe, expect, it } from "vitest";
import { CARD_BANK_ENABLED, cardBankAvailable, visibleWithdrawalMethods } from "../src/lib/mobile-payment-policy";

describe("mobile card and bank release gate", () => {
  it("keeps the card/bank release switch off", () => expect(CARD_BANK_ENABLED).toBe(false));
  it("blocks card/bank in native apps even at desktop width", () => {
    expect(cardBankAvailable(true, false)).toBe(false);
    expect(cardBankAvailable(true, true)).toBe(false);
  });
  it("blocks card/bank in phone-sized web previews", () => expect(cardBankAvailable(false, true)).toBe(false));
  it("preserves desktop website card/bank availability", () => expect(cardBankAvailable(false, false)).toBe(true));
  it("preserves MTN and Orange XAF withdrawal destinations", () => {
    expect(visibleWithdrawalMethods("XAF", false)).toEqual(["MTN_MOMO", "ORANGE_MONEY"]);
    expect(visibleWithdrawalMethods("XAF", true)).toEqual(["MTN_MOMO", "ORANGE_MONEY"]);
  });
  it("blocks mobile bank withdrawals without rerouting card currencies to Mobile Money", () => {
    expect(visibleWithdrawalMethods("CAD", false)).toEqual([]);
    expect(visibleWithdrawalMethods("USD", false)).toEqual([]);
  });
  it("preserves website bank withdrawal destinations", () => {
    expect(visibleWithdrawalMethods("CAD", true)).toEqual(["STRIPE_BANK"]);
    expect(visibleWithdrawalMethods("USD", true)).toEqual(["STRIPE_BANK"]);
  });
});