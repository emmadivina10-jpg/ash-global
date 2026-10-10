import { describe, expect, it } from "vitest";
import { parsePayoutReminder, shouldShowPayoutReminder, PAYOUT_REMINDER_INTERVAL } from "../src/lib/payout-reminder";

describe("payout setup reminders", () => {
  it("allows a reminder for a member without a payout account", () => {
    expect(shouldShowPayoutReminder({ disabled: false, lastShown: 0 }, 100, false)).toBe(true);
  });
  it("never reminds after permanent opt-out", () => {
    expect(shouldShowPayoutReminder({ disabled: true, lastShown: 0 }, PAYOUT_REMINDER_INTERVAL * 10, false)).toBe(false);
  });
  it("stops reminders once an account is connected", () => {
    expect(shouldShowPayoutReminder({ disabled: false, lastShown: 0 }, 100, true)).toBe(false);
  });
  it("waits seven days between reminders", () => {
    expect(PAYOUT_REMINDER_INTERVAL).toBe(604800000);
    expect(shouldShowPayoutReminder({ disabled: false, lastShown: 100 }, 604800099, false)).toBe(false);
    expect(shouldShowPayoutReminder({ disabled: false, lastShown: 100 }, 604800100, false)).toBe(true);
  });
  it("retains a saved opt-out", () => {
    expect(parsePayoutReminder('{"disabled":true,"lastShown":250}')).toEqual({ disabled: true, lastShown: 250 });
  });
});