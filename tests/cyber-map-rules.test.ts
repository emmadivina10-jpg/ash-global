import { describe, expect, it } from "vitest";
import { placeByCity, reportWindow, sessionRevoked } from "../src/lib/cyber-map-rules";

const cities: [string, string, number, number][] = [["Douala", "CM", 4.05, 9.7], ["Toronto", "CA", 43.7, -79.4]];
const countries = { CM: [7.37, 12.35, "Cameroon"], CA: [56.1, -106.3, "Canada"] } as Record<string, [number, number, string]>;

describe("cyber report windows", () => {
  const now = new Date("2026-10-11T15:30:00Z");
  it("daily report starts at midnight UTC today", () => {
    expect(reportWindow("DAILY", now).start.toISOString()).toBe("2026-10-11T00:00:00.000Z");
  });
  it("weekly report covers the last 7 days", () => {
    expect(reportWindow("WEEKLY", now).start.toISOString()).toBe("2026-10-04T15:30:00.000Z");
  });
});

describe("provider map placement", () => {
  it("uses the city centre when the city is known", () => {
    expect(placeByCity("douala", "CM", cities, countries)).toEqual({ lat: 4.05, lng: 9.7, precision: "city" });
  });
  it("falls back to the country centre", () => {
    expect(placeByCity("Unknownville", "Canada", cities, countries)?.precision).toBe("country");
  });
  it("returns null with no usable location", () => {
    expect(placeByCity(null, "", cities, countries)).toBeNull();
  });
});

describe("forced logout", () => {
  it("rejects sessions signed in before the revocation", () => {
    expect(sessionRevoked(1_700_000_000, new Date(1_700_000_100_000).toISOString())).toBe(true);
  });
  it("allows a fresh sign-in after the revocation", () => {
    expect(sessionRevoked(1_700_000_200, new Date(1_700_000_100_000).toISOString())).toBe(false);
  });
});
