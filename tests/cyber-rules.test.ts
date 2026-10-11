import { describe, expect, it } from "vitest";
import {
  EMPTY_RESTRICTIONS,
  ipInCidr,
  isActionBlocked,
  passwordRotationStatus,
  scoreQuiz,
  trainingOverdue,
} from "@/lib/cyber-rules";

const NOW = Date.parse("2026-10-11T00:00:00Z");

describe("cyber restriction levels", () => {
  it("protected (owner/admin) accounts are never blocked", () => {
    expect(isActionBlocked({ ...EMPTY_RESTRICTIONS, locked: true }, "POSTING", true)).toBe(false);
  });
  it("limit posting blocks posting only", () => {
    const s = { ...EMPTY_RESTRICTIONS, no_posting: true };
    expect(isActionBlocked(s, "POSTING")).toBe(true);
    expect(isActionBlocked(s, "MONEY")).toBe(false);
  });
  it("wallet freeze blocks withdrawals but not commerce", () => {
    const s = { ...EMPTY_RESTRICTIONS, wallet_frozen: true };
    expect(isActionBlocked(s, "MONEY")).toBe(true);
    expect(isActionBlocked(s, "COMMERCE")).toBe(false);
  });
  it("stop all transactions blocks commerce and money", () => {
    const s = { ...EMPTY_RESTRICTIONS, no_transactions: true };
    expect(isActionBlocked(s, "COMMERCE")).toBe(true);
    expect(isActionBlocked(s, "MONEY")).toBe(true);
  });
  it("lock blocks everything", () => {
    const s = { ...EMPTY_RESTRICTIONS, locked: true };
    expect(isActionBlocked(s, "SIGN_IN")).toBe(true);
  });
});

describe("rotation and training schedules", () => {
  it("staff password is overdue after 14 days", () => {
    expect(passwordRotationStatus("2026-09-27T00:00:00Z", NOW).overdue).toBe(false);
    expect(passwordRotationStatus("2026-09-26T00:00:00Z", NOW).overdue).toBe(true);
  });
  it("training is due again 6 months after completion", () => {
    expect(trainingOverdue("2026-05-01T00:00:00Z", NOW)).toBe(true);
    expect(trainingOverdue("2026-05-01T00:00:00Z", Date.parse("2026-10-31T00:00:00Z"))).toBe(false);
    expect(trainingOverdue(null, NOW)).toBe(true);
  });
  it("quiz score is a percentage", () => {
    expect(scoreQuiz([0, 1, 2, 0], [0, 1, 2, 3])).toBe(75);
  });
});

describe("ip ranges", () => {
  it("matches CIDR ranges", () => {
    expect(ipInCidr("10.1.2.3", "10.1.0.0/16")).toBe(true);
    expect(ipInCidr("10.2.2.3", "10.1.0.0/16")).toBe(false);
  });
});
