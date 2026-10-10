import { describe, expect, it } from "vitest";
import { DEFAULT_COMMISSION_RATE, effectiveRate, isAllowedCommissionRate, splitBooking } from "../src/lib/commission";

describe("booking commission", () => {
  it("defaults to 12%", () => expect(DEFAULT_COMMISSION_RATE).toBe(0.12));
  it("allows only 12% and 15%", () => {
    expect(isAllowedCommissionRate(0.12)).toBe(true);
    expect(isAllowedCommissionRate(0.15)).toBe(true);
    expect(isAllowedCommissionRate(0.1)).toBe(false);
    expect(isAllowedCommissionRate(0.01)).toBe(false);
  });
  it("10,000 XAF at 12% gives 1,200 commission and 8,800 to the provider", () => {
    expect(splitBooking(10_000, 0.12)).toEqual({ commission: 1_200, provider: 8_800 });
  });
  it("10,000 XAF at 15% gives 1,500 commission and 8,500 to the provider", () => {
    expect(splitBooking(10_000, 0.15)).toEqual({ commission: 1_500, provider: 8_500 });
  });
  it("paid bookings keep the rate they were paid at", () => {
    expect(effectiveRate(0.12, true, 0.15)).toBe(0.12);
  });
  it("unpaid bookings will be charged the current rate", () => {
    expect(effectiveRate(null, false, 0.15)).toBe(0.15);
  });
});
