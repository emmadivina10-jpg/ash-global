/** Pure ASH Dispatch rules shared by server actions, screens and tests. No I/O. */
export const DISPATCH_STATUSES = [
  "REQUESTED", "INVITED", "ASSIGNED", "ACCEPTED", "REJECTED",
  "PICKUP_CONFIRMED", "IN_TRANSIT", "DELIVERED", "CANCELLED",
] as const;
export type DispatchStatus = (typeof DISPATCH_STATUSES)[number];
export type FulfillmentMode = "ASH_DISPATCH" | "VENDOR_DISPATCH" | "SELF_PICKUP";
export type DispatchActor = "admin" | "vendor" | "rider" | "customer";

const RIDER_FLOW: Record<DispatchStatus, DispatchStatus[]> = {
  REQUESTED: ["INVITED", "CANCELLED"],
  INVITED: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["ACCEPTED", "REJECTED", "CANCELLED"],
  ACCEPTED: ["PICKUP_CONFIRMED", "CANCELLED"],
  REJECTED: ["INVITED", "CANCELLED"],
  PICKUP_CONFIRMED: ["IN_TRANSIT"],
  IN_TRANSIT: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

/** Self pickup never involves a rider: the customer collects with a code. */
const SELF_PICKUP_FLOW: Partial<Record<DispatchStatus, DispatchStatus[]>> = {
  REQUESTED: ["PICKUP_CONFIRMED", "CANCELLED"],
  PICKUP_CONFIRMED: ["DELIVERED"],
};

export function allowedNext(mode: FulfillmentMode, current: DispatchStatus): DispatchStatus[] {
  if (mode === "SELF_PICKUP") return SELF_PICKUP_FLOW[current] ?? [];
  return RIDER_FLOW[current] ?? [];
}

export function canTransition(mode: FulfillmentMode, current: DispatchStatus, next: DispatchStatus): boolean {
  return allowedNext(mode, current).includes(next);
}

/** Which party may perform each transition. Admin may only cancel or reassign, never fake progress. */
export function actorMayMove(actor: DispatchActor, next: DispatchStatus, mode: FulfillmentMode): boolean {
  switch (next) {
    case "INVITED":
    case "ASSIGNED": return actor === "vendor" || actor === "admin";
    case "ACCEPTED":
    case "REJECTED":
    case "IN_TRANSIT": return actor === "rider";
    case "PICKUP_CONFIRMED": return mode === "SELF_PICKUP" ? actor === "vendor" : actor === "rider";
    case "DELIVERED": return mode === "SELF_PICKUP" ? actor === "vendor" : actor === "rider";
    case "CANCELLED": return actor !== "rider";
    default: return false;
  }
}

export function isActiveForTracking(status: DispatchStatus): boolean {
  return status === "ACCEPTED" || status === "PICKUP_CONFIRMED" || status === "IN_TRANSIT";
}

/** Customer must approve the exact current quote before a rider can be assigned. */
export function quoteApproved(q: { feeXaf: number | null; approvedFeeXaf: number | null }): boolean {
  return q.feeXaf !== null && q.feeXaf >= 0 && q.approvedFeeXaf === q.feeXaf;
}

export const PICKUP_CODE_TTL_MS = 30 * 60 * 1000;
export const PICKUP_CODE_MAX_ATTEMPTS = 5;

/** 6-digit code from the platform CSPRNG (no modulo bias beyond negligible). */
export function generatePickupCode(rand: () => number = () => crypto.getRandomValues(new Uint32Array(1))[0] ?? 0): string {
  const n = rand() % 1_000_000;
  return String(n).padStart(6, "0");
}

export type CodeCheck = "OK" | "EXPIRED" | "LOCKED" | "USED" | "WRONG";
export function checkPickupCode(v: {
  matches: boolean; issuedAt: number; now: number; attempts: number; usedAt: number | null;
}): CodeCheck {
  if (v.usedAt !== null) return "USED";
  if (v.attempts >= PICKUP_CODE_MAX_ATTEMPTS) return "LOCKED";
  if (v.now - v.issuedAt > PICKUP_CODE_TTL_MS) return "EXPIRED";
  return v.matches ? "OK" : "WRONG";
}
