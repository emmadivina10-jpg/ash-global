import { describe, expect, it } from "vitest";
import { bookingSearch, canRemoveBookingHistory, historyMatches } from "../src/lib/booking-history";
describe("personal booking history", () => {
  it("archived rows appear only in the recoverable archive", () => {
    expect(historyMatches("ARCHIVED", "CURRENT")).toBe(false);
    expect(historyMatches("ARCHIVED", "ARCHIVED")).toBe(true);
  });
  it("restored rows return to current history", () => expect(historyMatches(undefined, "CURRENT")).toBe(true));
  it("permanently deleted rows are absent from both lists", () => {
    expect(historyMatches("DELETED", "CURRENT")).toBe(false);
    expect(historyMatches("DELETED", "ARCHIVED")).toBe(false);
  });
  it("failed and completed histories can be removed without changing booking status", () => {
    expect(canRemoveBookingHistory("PAYMENT_FAILED")).toBe(true);
    expect(canRemoveBookingHistory("COMPLETED")).toBe(true);
  });
  it("active payments and services remain visible", () => {
    for (const state of ["PENDING", "PAYMENT_PROCESSING", "CONFIRMED", "IN_PROGRESS", "DISPUTED"]) expect(canRemoveBookingHistory(state)).toBe(false);
  });
  it("verification opens Received and preserves the selected booking", () => expect(bookingSearch({tab:"provider",booking:"booking-123"})).toEqual({tab:"provider",booking:"booking-123"}));
});