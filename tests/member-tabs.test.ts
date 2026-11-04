import { describe, expect, it } from "vitest";
import {
  DISCOVER_TAB,
  GUEST_TABS,
  KITCHEN_TAB,
  MEMBER_TABS,
  SHOP_TAB,
  isTabActive,
  resolveTab,
  resolveTabs,
} from "@/lib/member-tabs";

const OFF = { newNav: false, servicesMode: "services" as const };
const ON = { newNav: true, servicesMode: "services" as const };

describe("member tab re-pointing under the new_nav switch", () => {
  it("keeps the legacy tabs when the switch is off", () => {
    const tabs = resolveTabs(MEMBER_TABS, OFF);
    expect(tabs.map((t) => t.to)).toEqual(["/feed", "/services", "/spotlight", "/messages"]);
    expect(tabs[0].en).toBe("Feed");
    expect(tabs[1].en).toBe("Services");
    expect(tabs[2].en).toBe("Spotlight");
  });

  it("re-points exactly three slots when the switch is on", () => {
    const tabs = resolveTabs(MEMBER_TABS, ON);
    expect(tabs.map((t) => t.to)).toEqual(["/discover", "/services", "/kitchen", "/messages"]);
    expect(tabs[0].en).toBe("Discover");
    expect(tabs[1].en).toBe("Shop");
    expect(tabs[2].en).toBe("ASH Kitchen");
    // Messages is untouched.
    expect(tabs[3]).toBe(MEMBER_TABS[3]);
  });

  it("never adds a sixth tab", () => {
    expect(resolveTabs(MEMBER_TABS, ON)).toHaveLength(4); // MobileNav appends Menu = 5 total
    expect(resolveTabs(MEMBER_TABS, OFF)).toHaveLength(4);
  });

  it("re-points guest tabs the same way", () => {
    const tabs = resolveTabs(GUEST_TABS, ON);
    expect(tabs.map((t) => t.to)).toEqual(["/discover", "/services", "/kitchen", "/search"]);
    expect(tabs[0].en).toBe("Discover");
    expect(tabs[1].en).toBe("Shop");
    expect(tabs[2].en).toBe("ASH Kitchen");
  });

  it("keeps the Market label in legacy market mode", () => {
    const tabs = resolveTabs(MEMBER_TABS, { newNav: false, servicesMode: "market" });
    expect(tabs[1].en).toBe("Market");
    expect(tabs[1].to).toBe("/services");
  });

  it("uses the required icons for the new tabs", () => {
    expect(DISCOVER_TAB.icon).toBeDefined();
    expect(SHOP_TAB.icon).toBeDefined();
    expect(KITCHEN_TAB.icon).toBeDefined();
    expect(DISCOVER_TAB.icon).not.toBe(MEMBER_TABS[0].icon);
    expect(SHOP_TAB.icon).not.toBe(MEMBER_TABS[1].icon);
    expect(KITCHEN_TAB.icon).not.toBe(MEMBER_TABS[2].icon);
  });

  it("preserves tour markers through re-pointing", () => {
    const tabs = resolveTabs(MEMBER_TABS, ON);
    expect(tabs[0].tour).toBe("feed");
    expect(tabs[1].tour).toBe("market");
  });
});

describe("isTabActive", () => {
  it("matches the tab root and its children", () => {
    expect(isTabActive({ to: "/discover" }, "/discover")).toBe(true);
    expect(isTabActive({ to: "/discover" }, "/discover/")).toBe(true);
    expect(isTabActive({ to: "/services" }, "/services/ash-1")).toBe(true);
    expect(isTabActive({ to: "/discover" }, "/kitchen")).toBe(false);
  });

  it("matches extra prefixes so the viewer keeps Discover highlighted", () => {
    expect(isTabActive(DISCOVER_TAB, "/spotlight")).toBe(true);
    expect(isTabActive(DISCOVER_TAB, "/post/abc")).toBe(true);
    expect(isTabActive(DISCOVER_TAB, "/hashtag/tech")).toBe(true);
    expect(isTabActive(DISCOVER_TAB, "/messages")).toBe(false);
  });
});
