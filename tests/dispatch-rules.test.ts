import { describe, expect, it } from "vitest";
import {
  actorMayMove, canTransition, checkPickupCode, generatePickupCode, isActiveForTracking,
  quoteApproved, PICKUP_CODE_TTL_MS,
} from "../src/lib/dispatch-rules";

describe("dispatch status chain", () => {
  it("follows REQUESTED → … → DELIVERED for rider delivery", () => {
    const chain = ["REQUESTED", "INVITED", "ASSIGNED", "ACCEPTED", "PICKUP_CONFIRMED", "IN_TRANSIT", "DELIVERED"] as const;
    for (let i = 0; i < chain.length - 1; i++) expect(canTransition("ASH_DISPATCH", chain[i], chain[i + 1])).toBe(true);
  });
  it("cannot skip straight to DELIVERED", () => expect(canTransition("ASH_DISPATCH", "ACCEPTED", "DELIVERED")).toBe(false));
  it("cannot cancel once the parcel is in transit", () => expect(canTransition("VENDOR_DISPATCH", "IN_TRANSIT", "CANCELLED")).toBe(false));
  it("self pickup never goes through a rider", () => {
    expect(canTransition("SELF_PICKUP", "REQUESTED", "INVITED")).toBe(false);
    expect(canTransition("SELF_PICKUP", "REQUESTED", "PICKUP_CONFIRMED")).toBe(true);
  });
});

describe("who may act", () => {
  it("only the rider accepts a job", () => {
    expect(actorMayMove("rider", "ACCEPTED", "ASH_DISPATCH")).toBe(true);
    expect(actorMayMove("admin", "ACCEPTED", "ASH_DISPATCH")).toBe(false);
  });
  it("admin cannot mark a delivery delivered", () => expect(actorMayMove("admin", "DELIVERED", "ASH_DISPATCH")).toBe(false));
  it("riders cannot cancel", () => expect(actorMayMove("rider", "CANCELLED", "ASH_DISPATCH")).toBe(false));
});

describe("quote approval", () => {
  it("requires approval of the exact current fee", () => {
    expect(quoteApproved({ feeXaf: 1500, approvedFeeXaf: 1500 })).toBe(true);
    expect(quoteApproved({ feeXaf: 2000, approvedFeeXaf: 1500 })).toBe(false);
    expect(quoteApproved({ feeXaf: null, approvedFeeXaf: null })).toBe(false);
  });
});

describe("pickup code", () => {
  it("is six digits", () => expect(generatePickupCode(() => new Uint32Array([42]))).toBe("000042"));
  const base = { matches: true, issuedAt: 0, now: 1000, attempts: 0, usedAt: null };
  it("accepts a fresh correct code", () => expect(checkPickupCode(base)).toBe("OK"));
  it("expires after 30 minutes", () => expect(checkPickupCode({ ...base, now: PICKUP_CODE_TTL_MS + 1 })).toBe("EXPIRED"));
  it("locks after 5 attempts", () => expect(checkPickupCode({ ...base, attempts: 5 })).toBe("LOCKED"));
  it("cannot be replayed", () => expect(checkPickupCode({ ...base, usedAt: 500 })).toBe("USED"));
});

it("tracking only during active legs", () => {
  expect(isActiveForTracking("IN_TRANSIT")).toBe(true);
  expect(isActiveForTracking("DELIVERED")).toBe(false);
});
