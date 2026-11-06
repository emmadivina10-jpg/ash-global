import { describe, expect, it } from "vitest";
import { giftCardMinorUnits } from "../src/lib/gift-card-amount";

describe("gift card amounts", () => {
  it("uses exact CAD cents and whole XAF", () => {
    expect(giftCardMinorUnits("12.34", "CAD")).toBe(1234);
    expect(giftCardMinorUnits("12.3", "CAD")).toBe(1230);
    expect(giftCardMinorUnits("5000", "XAF")).toBe(5000);
  });
  it("rejects fractional XAF, invalid, zero and unsafe amounts", () => {
    for (const value of ["1.2", "-1", "0", "1e3", "9007199254740992"]) {
      expect(giftCardMinorUnits(value, "XAF")).toBeNull();
    }
    expect(giftCardMinorUnits("1.234", "CAD")).toBeNull();
    expect(giftCardMinorUnits("0.00", "CAD")).toBeNull();
    expect(giftCardMinorUnits("", "CAD")).toBeNull();
  });
});
