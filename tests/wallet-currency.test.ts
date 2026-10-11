import { describe, expect, it } from "vitest";
import { balanceFor, buildMoneyFlow, minWithdrawalFor, withdrawalMethodsFor } from "../src/lib/wallet-currency";
import { fromStripeMinor } from "../src/lib/payment-settlement.server";

describe("one wallet, real money per currency", () => {
  it("francs only leave by Mobile Money", () => {
    expect(withdrawalMethodsFor("XAF")).toEqual(["MTN_MOMO", "ORANGE_MONEY"]);
  });
  it("card currencies only leave by Card / Bank", () => {
    expect(withdrawalMethodsFor("CAD")).toEqual(["STRIPE_BANK"]);
    expect(withdrawalMethodsFor("USD")).toEqual(["STRIPE_BANK"]);
  });
  it("a currency with no money shows zero, never a conversion", () => {
    const balances = [{ currency: "CAD", available: 12.17, pending: 0, totalIn: 12.17, totalOut: 0 }];
    expect(balanceFor(balances, "XAF").available).toBe(0);
    expect(balanceFor(balances, "USD").available).toBe(0);
    expect(balanceFor(balances, "CAD").available).toBe(12.17);
  });
  it("minimum withdrawal is 100 XAF and 1 in card currencies", () => {
    expect(minWithdrawalFor("XAF")).toBe(100);
    expect(minWithdrawalFor("CAD")).toBe(1);
  });
  it("Stripe settled cents become dollars; XAF stays whole", () => {
    expect(fromStripeMinor(1217, "cad")).toBe(12.17);
    expect(fromStripeMinor(5000, "xaf")).toBe(5000);
  });
  it("money flow counts only the selected currency's completed movements", () => {
    const now = new Date("2026-10-11T12:00:00Z");
    const rows = [
      { amount: 12.17, currency: "CAD", status: "COMPLETED", created_at: "2026-10-11T06:16:00Z" },
      { amount: -5, currency: "CAD", status: "COMPLETED", created_at: "2026-10-10T06:16:00Z" },
      { amount: -3, currency: "CAD", status: "PENDING", created_at: "2026-10-10T06:16:00Z" },
      { amount: 5000, currency: "XAF", status: "COMPLETED", created_at: "2026-10-11T06:16:00Z" },
    ];
    const flow = buildMoneyFlow(rows, "CAD", "7d", now);
    expect(flow.totalIn).toBe(12.17);
    expect(flow.totalOut).toBe(5);
    expect(flow.points).toHaveLength(7);
  });
});
