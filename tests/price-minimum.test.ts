import { describe, expect, it } from "vitest";
import { MIN_SERVICE_PRICE_XAF, meetsMinimumPrice } from "@/lib/price-minimum";
import { xafToUsdCents } from "@/lib/stripe.server";
import { minimumChargeMinor } from "@/lib/stripe-mode";
describe("service minimum price", () => {
  it("is 1,850 XAF", () => expect(MIN_SERVICE_PRICE_XAF).toBe(1850));
  it("rejects 500 XAF and accepts 1,850 XAF", () => {
    expect(meetsMinimumPrice(500)).toBe(false);
    expect(meetsMinimumPrice(1850)).toBe(true);
  });
  it("1,850 XAF clears the card checkout minimum", () =>
    expect(xafToUsdCents(1850)).toBeGreaterThanOrEqual(minimumChargeMinor("USD")));
});
