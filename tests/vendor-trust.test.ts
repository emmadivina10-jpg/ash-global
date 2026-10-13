import { describe, expect, it } from "vitest";
import { trustLevel } from "../src/lib/vendor-trust";

const base = { verified: false, rating: null, reviews: 0, completedBookings: 0, accountAgeDays: 10, recentComments: [] };

describe("vendor trust", () => {
  it("strongly recommends verified accounts", () => {
    expect(trustLevel({ ...base, verified: true })).toBe("recommended");
  });
  it("flags low ratings", () => {
    expect(trustLevel({ ...base, rating: 2.5, reviews: 4 })).toBe("caution");
  });
  it("needs history before saying good", () => {
    expect(trustLevel(base)).toBe("unknown");
  });
});
