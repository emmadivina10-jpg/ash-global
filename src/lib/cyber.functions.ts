import { createServerFn } from "@tanstack/react-start";

/**
 * Cybersecurity department data feeds.
 *
 * Read-only intelligence for the security desk: throttling pressure, webhook
 * signature failures, privileged staff activity, account safety signals and
 * an at-a-glance posture score. Every feed is guarded so only the security
 * seat (or the CEO) can reach it.
 */

async function guard() {
  const { requireDepartment, adminClient } = await import("./console.server");
  await requireDepartment("CYBERSECURITY");
  return adminClient();
}

export type ThrottleBucket = { bucket: string; subjects: number; hits: number };
export type WebhookHealth = {
  total: number;
  verified: number;
  rejected: number;
  recent: {
    id: string;
    source: string;
    reference: string | null;
    status: string | null;
    signature_verified: boolean;
    outcome: string;
    created_at: string;
  }[];
};
export type StaffSession = {
  full_name: string;
  username: string;
  department: string;
  is_active: boolean;
  last_login_at: string | null;
};
export type AdminAction = {
  id: string;
  actor: string;
  action: string;
  reason: string | null;
  created_at: string;
};

export type CyberOps = {
  posture: {
    score: number;
    critical: number;
    warn: number;
    open_reports: number;
    stale_scan: boolean;
  };
  throttling: ThrottleBucket[];
  webhooks: WebhookHealth;
  staff: StaffSession[];
  adminActions: AdminAction[];
  accounts: {
    blocked_pairs: number;
    open_reports: number;
    deletion_requests: number;
    suspended: number;
  };
};

export const getCyberOps = createServerFn({ method: "GET" })
  .inputValidator((input: { hours?: number } | undefined) => ({
    hours: Math.min(Math.max(Number(input?.hours ?? 24), 1), 720),
  }))
  .handler(async ({ data }): Promise<CyberOps> => {
    const db = await guard();
    const since = new Date(Date.now() - data.hours * 3600_000).toISOString();

    const [rate, events, payments, staff, audit, blocks, reports, deletions, suspended, selfcheck] =
      await Promise.all([
        db.from("rate_limit_hits").select("bucket, subject, hits").gte("window_start", since),
        db.from("security_events").select("severity").gte("created_at", since),
        db
          .from("payment_events")
          .select("id, source, reference, status, signature_verified, outcome, created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(400),
        db
          .from("staff_accounts")
          .select("full_name, username, department, is_active, last_login_at")
          .order("last_login_at", { ascending: false, nullsFirst: false }),
        db
          .from("admin_audit_log")
          .select("id, actor, action, reason, created_at")
          .order("created_at", { ascending: false })
          .limit(40),
        db.from("user_blocks").select("id", { count: "exact", head: true }),
        db
          .from("content_reports")
          .select("id", { count: "exact", head: true })
          .eq("status", "OPEN"),
        db
          .from("account_deletion_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "PENDING"),
        db
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .neq("account_status", "ACTIVE"),
        db
          .from("security_events")
          .select("created_at, severity")
          .eq("kind", "SELFCHECK")
          .order("created_at", { ascending: false })
          .limit(1),
      ]);

    const buckets = new Map<string, { subjects: Set<string>; hits: number }>();
    for (const row of rate.data ?? []) {
      const entry = buckets.get(row.bucket) ?? { subjects: new Set<string>(), hits: 0 };
      entry.subjects.add(row.subject);
      entry.hits += row.hits;
      buckets.set(row.bucket, entry);
    }

    const paymentRows = payments.data ?? [];
    const rejected = paymentRows.filter((p) => !p.signature_verified).length;

    const severities = events.data ?? [];
    const critical = severities.filter((e) => e.severity === "CRITICAL").length;
    const warn = severities.filter((e) => e.severity === "WARN").length;
    const lastScan = selfcheck.data?.[0] ?? null;
    const staleScan =
      !lastScan || Date.now() - new Date(lastScan.created_at).getTime() > 7 * 86_400_000;
    const openReports = reports.count ?? 0;

    const score = Math.max(
      0,
      100 -
        critical * 15 -
        warn * 4 -
        rejected * 6 -
        (staleScan ? 12 : 0) -
        Math.min(openReports, 10) * 2,
    );

    return {
      posture: { score, critical, warn, open_reports: openReports, stale_scan: staleScan },
      throttling: [...buckets.entries()]
        .map(([bucket, v]) => ({ bucket, subjects: v.subjects.size, hits: v.hits }))
        .sort((a, b) => b.hits - a.hits)
        .slice(0, 12),
      webhooks: {
        total: paymentRows.length,
        verified: paymentRows.length - rejected,
        rejected,
        recent: paymentRows.filter((p) => !p.signature_verified || p.outcome !== "OK").slice(0, 20),
      },
      staff: (staff.data ?? []) as StaffSession[],
      adminActions: (audit.data ?? []) as AdminAction[],
      accounts: {
        blocked_pairs: blocks.count ?? 0,
        open_reports: openReports,
        deletion_requests: deletions.count ?? 0,
        suspended: suspended.count ?? 0,
      },
    };
  });
