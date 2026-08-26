import { describe, expect, it } from "vitest";
import { nearestCity } from "../src/lib/location";

describe("nearest city lookup", () => {
  it("resolves Douala coordinates", () => {
    expect(nearestCity(4.0511, 9.7679)).toBe("Douala");
  });

  it("resolves Yaoundé coordinates", () => {
    expect(nearestCity(3.848, 11.5021)).toBe("Yaoundé");
  });

  it("snaps a nearby point to the closest city", () => {
    expect(nearestCity(4.09, 9.72)).toBe("Douala");
  });

  it("returns null far outside Cameroon", () => {
    expect(nearestCity(48.8566, 2.3522)).toBeNull();
  });

  it("returns null in the middle of the ocean", () => {
    expect(nearestCity(-20, -30)).toBeNull();
  });
});
