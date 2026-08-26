import { describe, expect, it } from "vitest";
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_KEY,
  PLATFORM_COMMISSION_RATE,
  SERVICE_CATEGORIES,
  isSubscriptionActive,
} from "../src/lib/marketplace";

describe("marketplace economics", () => {
  it("charges a 1% platform commission", () => {
    expect(PLATFORM_COMMISSION_RATE).toBeCloseTo(0.01);
  });

  it("computes the provider payout for a booking", () => {
    const price = 10_000;
    const fee = Math.round(price * PLATFORM_COMMISSION_RATE);
    expect(fee).toBe(100);
    expect(price - fee).toBe(9_900);
  });
});

describe("service categories", () => {
  it("covers the launch verticals", () => {
    for (const category of ["BRAIDER", "BARBER", "NAIL_TECH", "ELECTRICIAN", "WEB_DEV"]) {
      expect(SERVICE_CATEGORIES).toContain(category);
    }
  });

  it("has no duplicates", () => {
    expect(new Set(SERVICE_CATEGORIES).size).toBe(SERVICE_CATEGORIES.length);
  });

  it("ends with the OTHER catch-all", () => {
    expect(SERVICE_CATEGORIES[SERVICE_CATEGORIES.length - 1]).toBe("OTHER");
  });

  it("uses screaming snake case only", () => {
    for (const category of SERVICE_CATEGORIES) {
      expect(category).toMatch(/^[A-Z][A-Z_]*$/);
    }
  });
});

describe("booking status translation keys", () => {
  it("maps every status to a translation key", () => {
    for (const status of BOOKING_STATUSES) {
      expect(BOOKING_STATUS_KEY[status]).toBe(`booking.status.${status}`);
    }
  });
});

describe("provider subscriptions", () => {
  it("is inactive without an expiry", () => {
    expect(isSubscriptionActive(null)).toBe(false);
    expect(isSubscriptionActive(undefined)).toBe(false);
  });

  it("is active while the expiry is in the future", () => {
    expect(isSubscriptionActive(new Date(Date.now() + 86_400_000).toISOString())).toBe(true);
  });

  it("is inactive once the expiry has passed", () => {
    expect(isSubscriptionActive(new Date(Date.now() - 1000).toISOString())).toBe(false);
  });
});
