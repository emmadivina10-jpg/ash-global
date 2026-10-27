import { describe, expect, it } from "vitest";
import { addItem, cartTotals } from "../src/lib/cart";

const base = { serviceId: "s1", providerId: "p1", providerName: "Shop", title: "Dress", price: 5000 };

describe("cart", () => {
  it("adding the same item twice increases quantity", () => {
    const items = addItem(addItem([], base), base);
    expect(items).toHaveLength(1);
    expect(items[0].qty).toBe(2);
  });
  it("total equals listed prices with no extra customer fee or tax", () => {
    const items = addItem(addItem([], base, 2), { ...base, serviceId: "s2", price: 3000 });
    expect(cartTotals(items)).toMatchObject({ subtotal: 13000, fee: 0, tax: 0, total: 13000, count: 3 });
  });
});
