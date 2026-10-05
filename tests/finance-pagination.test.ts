import { describe, expect, it } from "vitest";
import { allFinanceRows } from "../src/lib/finance-pagination.server";

describe("finance history pagination", () => {
  it("includes ledger rows beyond previous 2000-row limit", async () => {
    const history = Array.from({ length: 2501 }, (_, id) => ({ id, amount: 2 }));
    const result = await allFinanceRows(async (from, to) => ({ data: history.slice(from, to + 1), error: null }));
    expect(result.data.length).toBe(2501);
    expect(result.data.reduce((sum, row) => sum + row.amount, 0)).toBe(5002);
  });
  it("never turns a failed page into a zero balance", async () => {
    await expect(allFinanceRows(async () => ({ data: null, error: { message: "unavailable" } }))).rejects.toThrow("Finance data unavailable");
  });
});