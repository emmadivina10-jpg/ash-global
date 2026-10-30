import { describe, expect, it } from "vitest";
import { assignRiderToDelivery, canManageVendorDelivery, createPickupVerificationCode, isAllowedDispatchStatus } from "../src/lib/dispatch";

describe("ASH dispatch rules", () => {
  it("allows valid status transitions", () => {
    expect(isAllowedDispatchStatus("REQUESTED", "INVITED")).toBe(true);
    expect(isAllowedDispatchStatus("ACCEPTED", "PICKUP_CONFIRMED")).toBe(true);
    expect(isAllowedDispatchStatus("DELIVERED", "IN_TRANSIT")).toBe(false);
  });

  it("restricts rider assignment to the assigned rider", () => {
    expect(
      assignRiderToDelivery({
        currentStatus: "INVITED",
        riderUserId: "rider-1",
        assignedRiderId: "rider-1",
      }),
    ).toEqual({ ok: true });

    expect(
      assignRiderToDelivery({
        currentStatus: "INVITED",
        riderUserId: "rider-1",
        assignedRiderId: "rider-2",
      }),
    ).toEqual({ ok: false, reason: "RIDER_MISMATCH" });
  });

  it("only allows vendor or admin access to vendor-owned delivery", () => {
    expect(
      canManageVendorDelivery({
        actorUserId: "vendor-1",
        deliveryVendorId: "vendor-1",
        actorRole: "vendor",
      }),
    ).toBe(true);
    expect(
      canManageVendorDelivery({
        actorUserId: "vendor-2",
        deliveryVendorId: "vendor-1",
        actorRole: "vendor",
      }),
    ).toBe(false);
    expect(
      canManageVendorDelivery({
        actorUserId: "admin-42",
        deliveryVendorId: "vendor-1",
        actorRole: "admin",
      }),
    ).toBe(true);
  });

  it("generates a six-character pickup code", () => {
    const code = createPickupVerificationCode();
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
  });
});
