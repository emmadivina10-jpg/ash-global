import { describe, expect, it } from "vitest";
import { MEMBER_TABS, resolveTabs } from "../src/lib/member-tabs";

describe("member tabs", () => {
  it("has no separate Home/Feed tab in the legacy bar; Spotlight is the home", () => {
    const tabs = resolveTabs(MEMBER_TABS, { newNav: false, servicesMode: "services" });
    expect(tabs.map((tab) => tab.to)).not.toContain("/feed");
    expect(tabs.find((tab) => tab.to === "/spotlight")?.en).toBe("Spotlight");
  });
});
