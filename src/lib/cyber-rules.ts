/** Pure, client-safe security rules shared by the Cyber dashboard and its tests. */

export const PASSWORD_ROTATION_DAYS = 14;
export const TRAINING_INTERVAL_MONTHS = 6;
export const ALERT_BANNER_MS = 20_000;

export const RESTRICTION_LEVELS = [
  { key: "watch", level: 1, label: "Watch", effect: "Flag only, extra logging" },
  { key: "no_posting", level: 2, label: "Limit posting", effect: "No posts, comments, stories or messages" },
  { key: "no_commerce", level: 3, label: "Limit commerce", effect: "No new bookings, listings or payment links" },
  { key: "wallet_frozen", level: 4, label: "Freeze wallet", effect: "No withdrawals; balance untouched" },
  { key: "no_transactions", level: 5, label: "Stop all transactions", effect: "Every new payment path refused" },
  { key: "locked", level: 6, label: "Sign out and lock", effect: "All sessions ended, sign-in refused" },
] as const;

export type RestrictionKey = (typeof RESTRICTION_LEVELS)[number]["key"];
export type RestrictionState = Record<RestrictionKey, boolean>;

export const EMPTY_RESTRICTIONS: RestrictionState = {
  watch: false,
  no_posting: false,
  no_commerce: false,
  wallet_frozen: false,
  no_transactions: false,
  locked: false,
};

export type ActionKind = "POSTING" | "COMMERCE" | "MONEY" | "SIGN_IN";

/** Mirrors the database trigger enforce_security_restriction. */
export function isActionBlocked(state: RestrictionState, kind: ActionKind, protectedAccount = false): boolean {
  if (protectedAccount) return false;
  if (state.locked) return true;
  if (kind === "POSTING") return state.no_posting;
  if (kind === "COMMERCE") return state.no_commerce || state.no_transactions;
  if (kind === "MONEY") return state.wallet_frozen || state.no_transactions;
  return false;
}

const DAY = 86_400_000;

export function passwordRotationStatus(changedAt: string | null, now = Date.now()) {
  if (!changedAt) return { daysLeft: -PASSWORD_ROTATION_DAYS, overdue: true };
  const age = Math.floor((now - new Date(changedAt).getTime()) / DAY);
  const daysLeft = PASSWORD_ROTATION_DAYS - age;
  return { daysLeft, overdue: daysLeft < 0 };
}

export function trainingDueAt(completedAt: string | null): Date | null {
  if (!completedAt) return null;
  const d = new Date(completedAt);
  d.setUTCMonth(d.getUTCMonth() + TRAINING_INTERVAL_MONTHS);
  return d;
}

export function trainingOverdue(completedAt: string | null, now = Date.now()): boolean {
  const due = trainingDueAt(completedAt);
  return !due || due.getTime() <= now;
}

export function scoreQuiz(answers: number[], correct: number[]): number {
  if (correct.length === 0) return 0;
  const right = correct.filter((c, i) => answers[i] === c).length;
  return Math.round((right / correct.length) * 100);
}

export function ipInCidr(ip: string, cidr: string): boolean {
  const [range, bitsRaw] = cidr.split("/");
  const bits = Number(bitsRaw ?? 32);
  const toInt = (v: string) => {
    const parts = v.split(".").map(Number);
    if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return null;
    return ((parts[0]! << 24) >>> 0) + (parts[1]! << 16) + (parts[2]! << 8) + parts[3]!;
  };
  const a = toInt(ip);
  const b = toInt(range ?? "");
  if (a === null || b === null || bits < 0 || bits > 32) return false;
  if (bits === 0) return true;
  const mask = (~0 << (32 - bits)) >>> 0;
  return (a & mask) === (b & mask);
}

export const AUTOMATION_UA = /(headless|phantomjs|selenium|puppeteer|playwright|curl\/|python-requests|wget|scrapy)/i;

export type PostureItem = { area: string; control: string; framework: string; status: "IN_PLACE" | "MISSING" };

export const POSTURE_BASELINE: PostureItem[] = [
  { area: "Access control", control: "Row-level access rules on member data", framework: "OWASP ASVS V4 / NIST PR.AC", status: "IN_PLACE" },
  { area: "Access control", control: "Department-restricted staff console", framework: "NIST PR.AC-4", status: "IN_PLACE" },
  { area: "Authentication", control: "Hashed staff passwords (scrypt)", framework: "OWASP ASVS V2", status: "IN_PLACE" },
  { area: "Authentication", control: "14-day staff password rotation tracking", framework: "NIST PR.AC-1", status: "IN_PLACE" },
  { area: "Authentication", control: "Two-factor sign-in for staff", framework: "OWASP ASVS V2.8", status: "MISSING" },
  { area: "Integrity", control: "Signed payment webhooks with replay protection", framework: "OWASP ASVS V13", status: "IN_PLACE" },
  { area: "Detection", control: "Rate limiting and security event log", framework: "NIST DE.CM", status: "IN_PLACE" },
  { area: "Detection", control: "Daily automated self-check and AI review", framework: "NIST DE.AE", status: "IN_PLACE" },
  { area: "Response", control: "Reversible account restrictions with audit trail", framework: "NIST RS.MI", status: "IN_PLACE" },
  { area: "Protection", control: "In-app IP and browser blocking", framework: "NIST PR.PT", status: "IN_PLACE" },
  { area: "Protection", control: "Network-edge firewall (WAF)", framework: "NIST PR.PT-4", status: "MISSING" },
  { area: "Awareness", control: "Six-monthly staff security training", framework: "NIST PR.AT", status: "IN_PLACE" },
  { area: "Recovery", control: "Tested backup restore drills", framework: "NIST RC.RP", status: "MISSING" },
  { area: "Governance", control: "Formal certification (SOC 2 / ISO 27001)", framework: "ISO 27001", status: "MISSING" },
];

/** HEAD = Head of Cybersecurity (or CEO / elevated); TRUST_OFFICER = view + non-critical tools only. */
export type CyberRole = "HEAD" | "TRUST_OFFICER" | "NONE";
export function cyberRole(a: { superAdmin: boolean; elevated: boolean; department: string; extraDepartments: string[] }): CyberRole {
  if (a.superAdmin || a.elevated || a.department === "CYBERSECURITY") return "HEAD";
  if (a.extraDepartments.includes("CYBERSECURITY")) return "TRUST_OFFICER";
  return "NONE";
}

/** Departments whose dashboards Cyber may audit in view-only mode. The CEO's own dashboards are excluded. */
export const AUDITABLE_DEPARTMENTS = ["OPERATIONS", "SUPPORT", "REVENUE", "MARKETPLACE_OPS", "ADVERTISING", "TRUST", "GROWTH", "SALES", "PARTNERSHIPS", "CONTENT", "EXPANSION"] as const;
export function canAuditDept(role: CyberRole, dept: string): boolean {
  return role !== "NONE" && (AUDITABLE_DEPARTMENTS as readonly string[]).includes(dept);
}

/** Simple user-agent parse for endpoint inventory. */
export function parseUserAgent(ua: string | null) {
  const s = ua ?? "";
  const bot = /bot|crawl|spider|headless|curl|wget|python|playwright|puppeteer|selenium/i.test(s);
  const os = /iphone|ipad|ios/i.test(s) ? "iOS" : /android/i.test(s) ? "Android" : /windows/i.test(s) ? "Windows" : /mac os/i.test(s) ? "macOS" : /linux/i.test(s) ? "Linux" : "Unknown";
  const device = /mobile|iphone|android/i.test(s) ? "Phone" : /ipad|tablet/i.test(s) ? "Tablet" : s ? "Computer" : "Unknown";
  let browser = "Unknown"; let version = 0;
  const m = s.match(/(Edg|OPR|Chrome|Firefox|Version)\/(\d+)/);
  if (m) { browser = m[1] === "Edg" ? "Edge" : m[1] === "OPR" ? "Opera" : m[1] === "Version" ? "Safari" : m[1]; version = Number(m[2]); }
  const minimum: Record<string, number> = { Chrome: 120, Edge: 120, Firefox: 115, Safari: 16, Opera: 100 };
  const outdated = Boolean(minimum[browser] && version < minimum[browser]);
  return { os, device, browser, version, bot, outdated };
}
