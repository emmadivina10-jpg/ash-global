import { describe, expect, it } from "vitest";
import {
  COUNTRIES,
  HIGH_FEE_COUNTRIES,
  MOMO_COUNTRIES,
  REFERRAL_COUNTRIES,
  countryMeta,
  platformRate,
  showsMobileMoney,
  showsReferral,
} from "../src/lib/region";

describe("region gating", () => {
  it("enables the referral programme in Cameroon and Nigeria", () => {
    expect(showsReferral("CM")).toBe(true);
    expect(showsReferral("NG")).toBe(true);
  });

  it("hides the referral programme elsewhere", () => {
    expect(showsReferral("US")).toBe(false);
    expect(showsReferral("FR")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(showsReferral("cm")).toBe(true);
    expect(showsMobileMoney("cm")).toBe(true);
  });

  it("treats a missing country as not eligible", () => {
    expect(showsReferral(null)).toBe(false);
    expect(showsReferral(undefined)).toBe(false);
    expect(showsMobileMoney(null)).toBe(false);
  });

  it("offers mobile money only in Cameroon", () => {
    expect(showsMobileMoney("CM")).toBe(true);
    expect(showsMobileMoney("NG")).toBe(false);
  });

  it("keeps the referral and momo country lists non-empty", () => {
    expect(REFERRAL_COUNTRIES.length).toBeGreaterThan(0);
    expect(MOMO_COUNTRIES.length).toBeGreaterThan(0);
  });
});

describe("platform take rate", () => {
  it("charges 1% in the core markets", () => {
    expect(platformRate("CM")).toBeCloseTo(0.01);
    expect(platformRate("NG")).toBeCloseTo(0.01);
  });

  it("charges 2% in the high-fee markets", () => {
    for (const code of HIGH_FEE_COUNTRIES) {
      expect(platformRate(code)).toBeCloseTo(0.02);
    }
  });

  it("defaults to 1% when the country is unknown", () => {
    expect(platformRate(null)).toBeCloseTo(0.01);
  });
});

describe("country metadata", () => {
  it("resolves a known country", () => {
    const cm = countryMeta("CM");
    expect(cm.name).toBe("Cameroon");
    expect(cm.currency).toBe("XAF");
  });

  it("falls back gracefully for an unknown code", () => {
    const unknown = countryMeta("ZZ");
    expect(unknown.flag).toBe("🌍");
    expect(unknown.code).toBe("ZZ");
  });

  it("has unique country codes", () => {
    const codes = COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
