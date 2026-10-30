import { randomUUID } from "node:crypto";

export const DISPATCH_STATUS = {
  REQUESTED: "REQUESTED",
  INVITED: "INVITED",
  ASSIGNED: "ASSIGNED",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  PICKUP_CONFIRMED: "PICKUP_CONFIRMED",
  IN_TRANSIT: "IN_TRANSIT",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
} as const;

export type DispatchStatus = (typeof DISPATCH_STATUS)[keyof typeof DISPATCH_STATUS];

export const DISPATCH_FLOW: Record<DispatchStatus, DispatchStatus[]> = {
  REQUESTED: ["INVITED", "CANCELLED"],
  INVITED: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["ACCEPTED", "REJECTED", "CANCELLED"],
  ACCEPTED: ["PICKUP_CONFIRMED", "CANCELLED"],
  REJECTED: ["CANCELLED"],
  PICKUP_CONFIRMED: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function isAllowedDispatchStatus(current: DispatchStatus, next: DispatchStatus): boolean {
  return DISPATCH_FLOW[current]?.includes(next) ?? false;
}

export function canManageVendorDelivery({
  actorUserId,
  deliveryVendorId,
  riderUserId,
  customerUserId,
  actorRole,
}: {
  actorUserId: string;
  deliveryVendorId: string | null;
  riderUserId?: string | null;
  customerUserId?: string | null;
  actorRole: "admin" | "vendor" | "rider" | "customer";
}): boolean {
  if (actorRole === "admin") return true;
  if (actorRole === "vendor") return Boolean(deliveryVendorId && actorUserId === deliveryVendorId);
  if (actorRole === "rider") return Boolean(riderUserId && actorUserId === riderUserId);
  if (actorRole === "customer") return Boolean(customerUserId && actorUserId === customerUserId);
  return false;
}

export function createPickupVerificationCode(): string {
  return randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
}

export function assignRiderToDelivery({
  currentStatus,
  riderUserId,
  assignedRiderId,
}: {
  currentStatus: DispatchStatus;
  riderUserId: string | null;
  assignedRiderId: string | null;
}): { ok: boolean; reason?: string } {
  if (!assignedRiderId || !riderUserId) {
    return { ok: false, reason: "RIDER_REQUIRED" };
  }
  if (currentStatus !== "INVITED" && currentStatus !== "REQUESTED") {
    return { ok: false, reason: "INVALID_STATUS" };
  }
  if (assignedRiderId !== riderUserId) {
    return { ok: false, reason: "RIDER_MISMATCH" };
  }
  return { ok: true };
}
