import { beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({ pages: [] as unknown[][], filters: [] as unknown[][], ranges: [] as number[][], error: null as Error | null }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      const query = {
        select: () => query,
        eq: (...args: unknown[]) => { fixture.filters.push(args); return query; },
        order: () => query,
        range: (from: number, to: number) => {
          fixture.ranges.push([from, to]);
          return Promise.resolve({ data: fixture.pages.shift() ?? [], error: fixture.error });
        },
      };
      return query;
    },
  },
}));
import { fetchAvailableVendors } from "@/lib/available-vendors.queries";

beforeEach(() => { fixture.pages = []; fixture.filters = []; fixture.ranges = []; fixture.error = null; });
describe("Messages available vendors", () => {
  it("includes offline storefronts rather than filtering by presence", async () => {
    fixture.pages = [[{ id: "offline-shop", user_id: "offline-owner", business_name: "Offline shop", avatar_url: null }]];
    const vendors = await fetchAvailableVendors(null);
    expect(vendors.map(v => v.id)).toEqual(["offline-shop"]);
    expect(fixture.filters).toEqual([["is_live", true]]);
  });
  it("loads all pages so the total is not capped at 100 vendors", async () => {
    fixture.pages = [Array.from({ length: 100 }, (_, i) => ({ id: String(i) })), [{ id: "101" }]];
    expect(await fetchAvailableVendors(null)).toHaveLength(101);
    expect(fixture.ranges).toEqual([[0, 99], [100, 199]]);
  });
  it("preserves the existing regional storefront selection", async () => {
    await fetchAvailableVendors("CM");
    expect(fixture.filters).toEqual([["is_live", true], ["country", "CM"]]);
  });
  it("does not turn failed vendor reads into a misleading zero count", async () => {
    fixture.error = new Error("Read unavailable");
    await expect(fetchAvailableVendors(null)).rejects.toThrow("Read unavailable");
  });
});