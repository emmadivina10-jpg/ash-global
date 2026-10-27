import { describe, expect, it } from "vitest";
import { vendorAction } from "@/lib/vendor-action";

describe("Spotlight vendor action", () => {
  it("food vendors get Order", () => {
    expect(vendorAction("CATERING")).toBe("order");
    expect(vendorAction("PRIVATE_CHEF")).toBe("order");
  });
  it("service vendors get Book", () => expect(vendorAction("BARBER")).toBe("book"));
  it("other vendors get Buy", () => expect(vendorAction("OTHER")).toBe("buy"));
});
