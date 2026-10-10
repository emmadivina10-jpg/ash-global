export const MEMBER_TARGET = { count: 10_000, start: "2026-11-18", end: "2027-05-18" } as const;
export const ONLINE_FRESHNESS_MS = 3 * 60_000;
export function hasFreshPresence(timestamp: string | null | undefined, now = Date.now()) {
  if (!timestamp) return false;
  const time = Date.parse(timestamp);
  return Number.isFinite(time) && time <= now && now - time < ONLINE_FRESHNESS_MS;
}
export function canReviewMember(actor: {
  superAdmin: boolean;
  department: string;
  extraDepartments?: string[];
}) {
  const allowed = ["REVENUE", "TRUST", "SUPPORT"];
  return (
    actor.superAdmin ||
    allowed.includes(actor.department) ||
    Boolean(actor.extraDepartments?.some((d) => allowed.includes(d)))
  );
}
export function targetProgress(
  active: number | null,
  today = new Date().toISOString().slice(0, 10),
) {
  return {
    ...MEMBER_TARGET,
    phase:
      today < MEMBER_TARGET.start ? "upcoming" : today > MEMBER_TARGET.end ? "ended" : "running",
    percent:
      active === null ? null : Math.min(100, Math.max(0, (active / MEMBER_TARGET.count) * 100)),
  };
}
