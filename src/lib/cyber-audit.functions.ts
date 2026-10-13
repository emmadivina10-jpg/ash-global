import { createServerFn } from "@tanstack/react-start";
import {
  AUDITABLE_DEPARTMENTS,
  POSTURE_BASELINE,
  canAuditDept,
  cyberRole,
  parseUserAgent,
  passwordRotationStatus,
} from "./cyber-rules";

/**
 * Cyber "Control teams" (view-only audit of employee dashboards, never the CEO's),
 * endpoint (device) inventory and the Trust & Verification desk. Reads are open to
 * Cyber seats (Head + Trust officer); every audit view and run is logged.
 */

async function cyber() {
  const { requireDepartment, adminClient } = await import("./console.server");
  const actor = await requireDepartment("CYBERSECURITY");
  return { actor, role: cyberRole(actor), db: await adminClient() };
}
type Ctx = Awaited<ReturnType<typeof cyber>>;

async function log(c: Ctx, action: string, ref: string | null, reason: string | null) {
  await c.db.from("security_actions").insert({
    actor_staff_id: c.actor.staffId,
    actor_name: c.actor.name,
    action,
    target_ref: ref,
    reason,
  });
}

export const getCyberMe = createServerFn({ method: "GET" }).handler(async () => {
  const { requireConsole } = await import("./console.server");
  const actor = await requireConsole();
  const role = cyberRole(actor);
  return { role, name: actor.name, auditable: role === "NONE" ? [] : [...AUDITABLE_DEPARTMENTS] };
});

export const logAuditView = createServerFn({ method: "POST" })
  .inputValidator((d: { path: string }) => ({ path: String(d?.path ?? "").slice(0, 120) }))
  .handler(async ({ data }) => {
    const c = await cyber();
    await log(c, "AUDIT_VIEW", data.path, "View-only team audit");
    return { ok: true };
  });

export const listTeams = createServerFn({ method: "GET" }).handler(async () => {
  const c = await cyber();
  const { data: seats } = await c.db
    .from("staff_accounts")
    .select(
      "id, username, employee_name, full_name, position, department, is_active, last_login_at, password_changed_at",
    )
    .neq("department", "SUPER_ADMIN")
    .order("department");
  const teams = AUDITABLE_DEPARTMENTS.map((dept) => ({
    dept,
    seats: (seats ?? [])
      .filter((s) => s.department === dept)
      .map((s) => ({
        id: s.id,
        username: s.username,
        name: s.employee_name ?? s.full_name,
        position: s.position,
        active: s.is_active,
        lastLogin: s.last_login_at,
        rotation: passwordRotationStatus(s.password_changed_at),
      })),
  }));
  return { teams };
});

type Finding = { title: string; detail: string; fix: string; priority: "HIGH" | "MEDIUM" | "LOW" };

async function auditMetrics(c: Ctx, dept: string | null) {
  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  let seatQ = c.db
    .from("staff_accounts")
    .select(
      "username, employee_name, full_name, department, is_active, last_login_at, password_changed_at",
    )
    .neq("department", "SUPER_ADMIN");
  if (dept) seatQ = seatQ.eq("department", dept);
  const seats = (await seatQ).data ?? [];
  const names = seats.flatMap(
    (s) => [s.employee_name, s.full_name, s.username].filter(Boolean) as string[],
  );
  let tasksQ = c.db
    .from("department_tasks")
    .select("status, due_date, department")
    .neq("status", "DONE")
    .limit(2000);
  if (dept) tasksQ = tasksQ.eq("department", dept);
  let casesQ = c.db
    .from("ops_cases")
    .select("status, priority, departments")
    .neq("status", "CLOSED")
    .limit(2000);
  if (dept) casesQ = casesQ.contains("departments", [dept]);
  const [tasks, cases, failed, audit, cyberActs, events] = await Promise.all([
    tasksQ,
    casesQ,
    c.db
      .from("security_events")
      .select("subject")
      .eq("kind", "STAFF_LOGIN_FAILED")
      .gte("created_at", since)
      .limit(2000),
    names.length
      ? c.db
          .from("admin_audit_log")
          .select("actor, action")
          .in("actor", names)
          .gte("created_at", since)
          .limit(2000)
      : Promise.resolve({ data: [] as { actor: string; action: string }[] }),
    c.db.from("security_actions").select("action").gte("created_at", since).limit(2000),
    c.db.from("security_events").select("severity").gte("created_at", since).limit(5000),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const privileged: Record<string, number> = {};
  for (const a of audit.data ?? []) privileged[a.action] = (privileged[a.action] ?? 0) + 1;
  return {
    scope: dept ?? "WHOLE_SYSTEM",
    windowDays: 30,
    seats: seats.length,
    inactiveSeats: seats.filter((s) => !s.is_active).length,
    neverSignedIn: seats.filter((s) => s.is_active && !s.last_login_at).map((s) => s.username),
    dormant30d: seats
      .filter((s) => s.is_active && s.last_login_at && s.last_login_at < since)
      .map((s) => s.username),
    overdueRotations: seats
      .filter((s) => s.is_active && passwordRotationStatus(s.password_changed_at).overdue)
      .map((s) => s.username),
    failedStaffLoginsSystem: (failed.data ?? []).length,
    privilegedActions: privileged,
    openTasks: (tasks.data ?? []).length,
    overdueTasks: (tasks.data ?? []).filter((t) => t.due_date && t.due_date < today).length,
    openCases: (cases.data ?? []).length,
    urgentCases: (cases.data ?? []).filter((x) => x.priority === "URGENT" || x.priority === "HIGH")
      .length,
    cyberActions30d: (cyberActs.data ?? []).length,
    criticalEvents30d: (events.data ?? []).filter((e) => e.severity === "CRITICAL").length,
    mechanismsInPlace: POSTURE_BASELINE.filter((p) => p.status === "IN_PLACE").map(
      (p) => p.control,
    ),
    gaps: POSTURE_BASELINE.filter((p) => p.status !== "IN_PLACE").map((p) => p.control),
  };
}

function ruleFindings(m: Awaited<ReturnType<typeof auditMetrics>>): Finding[] {
  const f: Finding[] = [];
  if (m.overdueRotations.length)
    f.push({
      title: "Passwords overdue for rotation",
      detail: m.overdueRotations.join(", "),
      fix: "Request rotation from the CEO.",
      priority: "HIGH",
    });
  if (m.neverSignedIn.length)
    f.push({
      title: "Seats never used",
      detail: m.neverSignedIn.join(", "),
      fix: "Disable unused logins.",
      priority: "MEDIUM",
    });
  if (m.dormant30d.length)
    f.push({
      title: "Dormant seats (30+ days)",
      detail: m.dormant30d.join(", "),
      fix: "Confirm with the CEO and disable if not needed.",
      priority: "MEDIUM",
    });
  if (m.overdueTasks)
    f.push({
      title: `${m.overdueTasks} overdue tasks`,
      detail: "Work past its due date.",
      fix: "Follow up with the team lead.",
      priority: "LOW",
    });
  if (m.criticalEvents30d)
    f.push({
      title: `${m.criticalEvents30d} critical security events`,
      detail: "Last 30 days.",
      fix: "Review each in the audit log.",
      priority: "HIGH",
    });
  for (const g of m.gaps)
    f.push({
      title: `Gap: ${g}`,
      detail: "Not in place yet.",
      fix: "Report to the CEO.",
      priority: "LOW",
    });
  return f;
}

export const runAudit = createServerFn({ method: "POST" })
  .inputValidator((d: { dept: string | null }) => ({ dept: d?.dept ? String(d.dept) : null }))
  .handler(async ({ data }) => {
    const c = await cyber();
    if (data.dept && !canAuditDept(c.role, data.dept)) throw new Error("FORBIDDEN_DEPARTMENT");
    const metrics = await auditMetrics(c, data.dept);
    let summary = "";
    let findings: Finding[] = [];
    const key = process.env["LOVABLE_API_KEY"];
    if (key) {
      try {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
          body: JSON.stringify({
            model: "google/gemini-3.6-flash",
            temperature: 0,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: `You are ASH Intelligence performing a cybersecurity audit and compliance review (OWASP ASVS / NIST CSF) of ${data.dept ? `the ${data.dept} team` : "the whole ASH Glo system"} and its employees' work. Use ONLY the metrics given; never invent numbers or say "Data not available" when missing. Describe the security mechanisms and tools in place, vulnerabilities, compliance gaps and what to fix. Return JSON {"summary": string (3-6 sentences), "findings": [{"title": string, "detail": string, "fix": string, "priority": "HIGH"|"MEDIUM"|"LOW"}]}.`,
              },
              { role: "user", content: JSON.stringify(metrics) },
            ],
          }),
        });
        if (res.ok) {
          const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
          const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}") as {
            summary?: string;
            findings?: Finding[];
          };
          summary = parsed.summary ?? "";
          findings = (parsed.findings ?? []).slice(0, 25);
        }
      } catch {
        // rule-based fallback below
      }
    }
    if (!summary) {
      findings = ruleFindings(metrics);
      summary = findings.length
        ? `${findings.length} finding(s) in this audit.`
        : "No issues found in this audit.";
    }
    const now = new Date();
    const { data: row } = await c.db
      .from("security_reports")
      .insert({
        period: data.dept ? "TEAM_AUDIT" : "SYSTEM_AUDIT",
        period_start: new Date(now.getTime() - 30 * 86400_000).toISOString(),
        period_end: now.toISOString(),
        summary: data.dept ? `[${data.dept}] ${summary}` : summary,
        findings: findings as never,
        metrics: metrics as never,
        generated_by: c.actor.name,
      })
      .select("*")
      .single();
    await log(c, "AUDIT_RUN", data.dept ?? "WHOLE_SYSTEM", row?.id ?? null);
    return row;
  });

// ---------- Endpoint security ----------

export const getEndpoints = createServerFn({ method: "GET" }).handler(async () => {
  const c = await cyber();
  const { data: prints } = await c.db
    .from("access_fingerprints")
    .select("fingerprint, user_id, ip, country, city, user_agent, first_seen, last_seen, hits")
    .order("last_seen", { ascending: false })
    .limit(3000);
  const rows = prints ?? [];
  const byFp = new Map<string, typeof rows>();
  for (const r of rows) byFp.set(r.fingerprint, [...(byFp.get(r.fingerprint) ?? []), r]);
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: profiles } = userIds.length
    ? await c.db.from("profiles").select("id, full_name").in("id", userIds.slice(0, 1000))
    : { data: [] as { id: string; full_name: string | null }[] };
  const name = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? "Member"]));
  const { data: blocks } = await c.db.from("ip_blocks").select("value").eq("kind", "FINGERPRINT");
  const blocked = new Set((blocks ?? []).map((b) => b.value));
  const devices = [...byFp.entries()].slice(0, 400).map(([fp, list]) => {
    const latest = list[0]!;
    const ua = parseUserAgent(latest.user_agent);
    const accounts = [...new Set(list.map((l) => l.user_id))];
    const countries = [...new Set(list.map((l) => l.country).filter(Boolean))] as string[];
    const flags: string[] = [];
    if (ua.bot) flags.push("Automation / bot browser");
    if (ua.outdated) flags.push("Outdated browser");
    if (accounts.length >= 3) flags.push(`Used by ${accounts.length} accounts`);
    if (countries.length >= 3) flags.push(`Seen in ${countries.length} countries`);
    return {
      fingerprint: fp,
      ...ua,
      ip: latest.ip,
      country: latest.country,
      city: latest.city,
      firstSeen: list.reduce((a, l) => (l.first_seen < a ? l.first_seen : a), latest.first_seen),
      lastSeen: latest.last_seen,
      hits: list.reduce((a, l) => a + l.hits, 0),
      accounts: accounts.slice(0, 8).map((id) => ({ id, name: name.get(id) ?? "Member" })),
      flags,
      blocked: blocked.has(fp),
    };
  });
  return {
    role: c.role,
    total: byFp.size,
    flagged: devices.filter((d) => d.flags.length).length,
    devices: devices.sort((a, b) => b.flags.length - a.flags.length),
  };
});

// ---------- Trust & Verification desk ----------

export const getTrustDesk = createServerFn({ method: "GET" }).handler(async () => {
  const c = await cyber();
  const [reports, restricted, impersonation, badges, photos, officer] = await Promise.all([
    c.db
      .from("content_reports")
      .select("id, reason, target_type, status, created_at")
      .in("status", ["OPEN", "PENDING", "REVIEWING"])
      .order("created_at", { ascending: false })
      .limit(50),
    c.db
      .from("identity_restrictions")
      .select("user_id, attempts, restricted_at, banned_at, restored_at")
      .is("restored_at", null)
      .not("restricted_at", "is", null)
      .limit(50),
    c.db
      .from("impersonation_attempts")
      .select("id, kind, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    c.db
      .from("verifications")
      .select("id, tier, status, created_at")
      .eq("status", "PENDING")
      .limit(50),
    c.db
      .from("identity_photo_reviews")
      .select("user_id", { count: "exact", head: true })
      .eq("approved", false),
    c.db
      .from("staff_accounts")
      .select("employee_name, position")
      .eq("department", "TRUST")
      .not("employee_name", "is", null)
      .limit(1)
      .maybeSingle(),
  ]);
  return {
    officer: officer.data
      ? `${officer.data.employee_name}${officer.data.position ? ` — ${officer.data.position}` : ""}`
      : null,
    openReports: reports.data ?? [],
    restricted: restricted.data ?? [],
    impersonation: impersonation.data ?? [],
    pendingBadges: badges.data ?? [],
    pendingPhotoReviews: photos.count ?? 0,
  };
});
