import { describe, expect, it } from "vitest";
import {
  ACTIVATION_FEE,
  COMMISSIONS,
  CM_PHONE_REGEX,
  MIN_WITHDRAWAL,
  PAYMENT_METHOD_LABEL,
  formatDate,
  formatDateTime,
  formatSignedXAF,
  formatXAF,
  normalizePhone,
  referralLink,
  transactionLabel,
} from "../src/lib/format";

describe("money formatting", () => {
  it("formats a plain amount with the XAF suffix", () => {
    expect(formatXAF(5000)).toContain("XAF");
    expect(formatXAF(5000).replace(/\u202f|\u00a0|\s/g, "")).toBe("5000XAF");
  });

  it("treats null and undefined as zero", () => {
    expect(formatXAF(null)).toBe("0 XAF");
    expect(formatXAF(undefined)).toBe("0 XAF");
  });

  it("accepts numeric strings", () => {
    expect(formatXAF("1500").replace(/\u202f|\u00a0|\s/g, "")).toBe("1500XAF");
  });

  it("keeps the minus sign in front of negative amounts", () => {
    expect(formatXAF(-250).startsWith("-")).toBe(true);
  });

  it("drops fractional digits", () => {
    expect(formatXAF(1000.6)).not.toContain(",6");
  });

  it("prefixes positive signed amounts with +", () => {
    expect(formatSignedXAF(1500).startsWith("+")).toBe(true);
  });

  it("does not prefix zero", () => {
    expect(formatSignedXAF(0).startsWith("+")).toBe(false);
  });

  it("keeps negative signed amounts negative", () => {
    expect(formatSignedXAF(-1000).startsWith("-")).toBe(true);
  });
});

describe("date formatting", () => {
  it("renders an em dash for missing dates", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDateTime(undefined)).toBe("—");
  });

  it("formats an ISO date", () => {
    expect(formatDate("2026-08-26T10:00:00.000Z")).toContain("2026");
  });

  it("includes a time component in date-time output", () => {
    expect(formatDateTime("2026-08-26T10:00:00.000Z")).toMatch(/\d{2}:\d{2}/);
  });
});

describe("referral links", () => {
  it("builds a register link carrying the code", () => {
    expect(referralLink("ASH123", "https://growrefer.app")).toBe(
      "https://growrefer.app/register?ref=ASH123",
    );
  });
});

describe("phone helpers", () => {
  it("strips spaces and dashes", () => {
    expect(normalizePhone(" 677-123 456").trim()).toBe("677123456");
  });

  it("accepts a local Cameroon number", () => {
    expect(CM_PHONE_REGEX.test("677123456")).toBe(true);
  });

  it("accepts an international Cameroon number", () => {
    expect(CM_PHONE_REGEX.test("+237677123456")).toBe(true);
  });

  it("rejects a number that is too short", () => {
    expect(CM_PHONE_REGEX.test("67712")).toBe(false);
  });

  it("rejects a number that does not start with 6", () => {
    expect(CM_PHONE_REGEX.test("777123456")).toBe(false);
  });
});

describe("labels and constants", () => {
  it("labels every known transaction type", () => {
    expect(transactionLabel("ACTIVATION_PAYMENT")).toBe("Activation payment");
    expect(transactionLabel("REFERRAL_COMMISSION")).toBe("Referral commission");
    expect(transactionLabel("WITHDRAWAL")).toBe("Withdrawal");
    expect(transactionLabel("WITHDRAWAL_REVERSAL")).toBe("Withdrawal reversal");
  });

  it("falls back to Adjustment for unknown types", () => {
    expect(transactionLabel("SOMETHING_ELSE")).toBe("Adjustment");
  });

  it("names both mobile money rails", () => {
    expect(PAYMENT_METHOD_LABEL["MTN_MOMO"]).toBe("MTN Mobile Money");
    expect(PAYMENT_METHOD_LABEL["ORANGE_MONEY"]).toBe("Orange Money");
  });

  it("keeps the published activation fee and commission ladder", () => {
    expect(ACTIVATION_FEE).toBe(5000);
    expect(COMMISSIONS[1]).toBe(1500);
    expect(COMMISSIONS[2]).toBe(750);
    expect(COMMISSIONS[3]).toBe(250);
  });

  it("keeps commissions below the activation fee", () => {
    expect(COMMISSIONS[1] + COMMISSIONS[2] + COMMISSIONS[3]).toBeLessThan(ACTIVATION_FEE);
  });

  it("sets a minimum withdrawal", () => {
    expect(MIN_WITHDRAWAL).toBe(1000);
  });
});
