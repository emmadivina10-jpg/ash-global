import { createServerFn } from "@tanstack/react-start";

export type Kpi = { label: string; value: string | null };
export type DailyPoint = { date: string; value: number };
export type Identity = {
  staffId: string | null; username: string | null; name: string | null; position: string | null;
  employeeId: string | null; department: string; extraDepartments: string[]; teamSeat: boolean;
};
export type Target = { label: string; target: number } | null;
export type DeptPerformance = {
  department: string; kpis: Kpi[]; series: DailyPoint[]; seriesUnit: string; scope: "personal" | "team";
};
export type LeaderRow = { staffId: string; name: string; employeeId: string | null; value: number | null };

const DAYS = 400;
const day = (iso: string) => iso.slice(0, 10);
const sinceIso = () => new Date(Date.now() - DAYS * 86400000).toISOString();
const monthStart = () => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString(); };

function daily(dates: (string | null | undefined)[], weights?: number[]): DailyPoint[] {
  const map = new Map<string, number>();
  dates.forEach((d, i) => { if (d) map.set(day(d), (map.get(day(d)) ?? 0) + (weights ? (weights[i] ?? 0) : 1)); });
  if (map.size === 0) return [];
  const first = [...map.keys()].sort()[0] as string;
  const out: DailyPoint[] = [];
  for (let t = new Date(first + "T00:00:00Z").getTime(); t <= Date.now(); t += 86400000) {
    const key = new Date(t).toISOString().slice(0, 10);
    out.push({ date: key, value: map.get(key) ?? 0 });
  }
  return out;
}
const n = (v: number | null | undefined) => (v == null ? null : v.toLocaleString("en-US"));
const hours = (ms: number[]) => (ms.length ? `${(ms.reduce((a, b) => a + b, 0) / ms.length / 3600000).toFixed(1)} h` : null);
const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : null);

type Db = Awaited<ReturnType<typeof import("./console.server").adminClient>>;

const LEAD_DEPTS: Record<string, string[]> = { ADVERTISING: ["ADVERTISING", "GROWTH"] };

async function compute(db: Db, department: string, staffId: string | null, teamSeat: boolean): Promise<DeptPerformance> {
  const since = sinceIso();
  const personal = Boolean(staffId) && !teamSeat;
  if (department === "SUPPORT") {
    const [{ data: tickets }, { data: msgs }] = await Promise.all([
      db.from("support_tickets").select("id, status, created_at, updated_at").gte("created_at", since),
      db.from("support_ticket_messages").select("ticket_id, sender, staff_id, created_at").gte("created_at", since).order("created_at"),
    ]);
    const t = tickets ?? []; const m = msgs ?? [];
    const firstReply = new Map<string, string>();
    m.forEach((x) => { if (x.sender === "ADMIN" && !firstReply.has(x.ticket_id)) firstReply.set(x.ticket_id, x.created_at); });
    const resp = t.filter((x) => firstReply.has(x.id)).map((x) => +new Date(firstReply.get(x.id)!) - +new Date(x.created_at));
    const resolved = t.filter((x) => x.status === "RESOLVED");
    const mine = m.filter((x) => x.sender === "ADMIN" && (!personal || x.staff_id === staffId));
    return {
      department, scope: personal ? "personal" : "team", seriesUnit: "replies",
      series: daily(mine.map((x) => x.created_at)),
      kpis: [
        { label: personal ? "My replies sent" : "Replies sent (team)", value: n(mine.length) },
        { label: "Tickets received", value: n(t.length) },
        { label: "Tickets resolved", value: n(resolved.length) },
        { label: "Open tickets", value: n(t.filter((x) => x.status !== "RESOLVED").length) },
        { label: "Average response time", value: hours(resp) },
        { label: "Average resolution time", value: hours(resolved.map((x) => +new Date(x.updated_at) - +new Date(x.created_at))) },
        { label: "Customer satisfaction", value: null },
        { label: "Escalation rate", value: null },
      ],
    };
  }
  if (department === "TRUST") {
    const [{ data: reports }, { data: audit }, { data: ver }] = await Promise.all([
      db.from("content_reports").select("created_at, resolved_at, reviewed_at, status").gte("created_at", since),
      db.from("admin_audit_log").select("action, created_at").like("action", "TS_%").gte("created_at", since),
      db.from("verifications").select("status, updated_at").eq("status", "GRANTED").gte("updated_at", since),
    ]);
    const r = reports ?? []; const a = audit ?? [];
    const done = r.filter((x) => x.resolved_at);
    const reviewed = r.filter((x) => x.reviewed_at || x.resolved_at);
    return {
      department, scope: "team", seriesUnit: "reports resolved",
      series: daily(done.map((x) => x.resolved_at)),
      kpis: [
        { label: "Verifications completed", value: n((ver ?? []).length) },
        { label: "Reports reviewed", value: n(reviewed.length) },
        { label: "Cases resolved", value: n(done.length) },
        { label: "Average review time", value: hours(reviewed.map((x) => +new Date((x.reviewed_at ?? x.resolved_at)!) - +new Date(x.created_at))) },
        { label: "Suspensions", value: n(a.filter((x) => x.action === "TS_SUSPEND").length) },
        { label: "Bans", value: n(a.filter((x) => x.action === "TS_BAN").length) },
        { label: "Open reports", value: n(r.filter((x) => !x.resolved_at).length) },
      ],
    };
  }
  if (department === "REVENUE") {
    const { data } = await db.from("activations").select("amount, paid_at, status").eq("status", "PAID").gte("paid_at", since);
    const rows = data ?? [];
    return {
      department, scope: "team", seriesUnit: "XAF",
      series: daily(rows.map((x) => x.paid_at), rows.map((x) => Number(x.amount) || 0)),
      kpis: [
        { label: "Activation revenue (XAF)", value: n(rows.reduce((s, x) => s + (Number(x.amount) || 0), 0)) },
        { label: "Paid activations", value: n(rows.length) },
        { label: "Expenses", value: null },
        { label: "Net profit", value: null },
        { label: "Reconciliation status", value: "See Console → Finance" },
      ],
    };
  }
  if (department === "MARKETPLACE_OPS") {
    const [{ data: bookings }, { count: providers }, { count: listings }] = await Promise.all([
      db.from("bookings").select("status, created_at, completed_at").gte("created_at", since),
      db.from("provider_profiles").select("id", { count: "exact", head: true }).eq("is_live", true),
      db.from("market_posts").select("id", { count: "exact", head: true }).eq("is_published", true),
    ]);
    const b = bookings ?? [];
    return {
      department, scope: "team", seriesUnit: "bookings",
      series: daily(b.map((x) => x.created_at)),
      kpis: [
        { label: "Active providers", value: n(providers ?? 0) },
        { label: "Active market listings", value: n(listings ?? 0) },
        { label: "Marketplace transactions", value: n(b.length) },
        { label: "Completed transactions", value: n(b.filter((x) => x.status === "COMPLETED" || x.status === "SETTLED").length) },
        { label: "Cancelled transactions", value: n(b.filter((x) => x.status === "CANCELLED" || x.status === "DECLINED").length) },
        { label: "Resolution time", value: null },
      ],
    };
  }
  if (department === "OPERATIONS") {
    const { data } = await db.from("department_tasks").select("status, created_at, completed_at").eq("department", "OPERATIONS");
    const t = data ?? []; const done = t.filter((x) => x.status === "DONE");
    return {
      department, scope: "team", seriesUnit: "tasks completed",
      series: daily(done.map((x) => x.completed_at)),
      kpis: [
        { label: "Tasks completed", value: n(done.length) },
        { label: "Tasks pending", value: n(t.length - done.length) },
        { label: "Completion rate", value: pct(done.length, t.length) },
        { label: "Resolution time", value: hours(done.filter((x) => x.completed_at).map((x) => +new Date(x.completed_at!) - +new Date(x.created_at))) },
        { label: "Operational efficiency", value: null },
      ],
    };
  }
  if (department === "SUPER_ADMIN" || department === "CYBERSECURITY") {
    const { data } = await db.from("security_events").select("severity, created_at").gte("created_at", since);
    const e = data ?? [];
    return {
      department, scope: "team", seriesUnit: "security events",
      series: daily(e.map((x) => x.created_at)),
      kpis: [
        { label: "Security events", value: n(e.length) },
        { label: "High / critical", value: n(e.filter((x) => ["HIGH", "CRITICAL"].includes(String(x.severity).toUpperCase())).length) },
        { label: "Security response", value: null },
      ],
    };
  }
  // Lead-based departments (marketing, growth, sales, partnerships, ...).
  let q = db.from("leads").select("created_at, last_contacted_at, stage, converted_user_id, converted_provider_id, created_by").gte("created_at", since);
  q = personal ? q.eq("created_by", staffId!) : q.in("department", LEAD_DEPTS[department] ?? [department]);
  const { data } = await q;
  const l = data ?? [];
  const contacted = l.filter((x) => x.last_contacted_at).length;
  const converted = l.filter((x) => x.converted_user_id || x.converted_provider_id).length;
  return {
    department, scope: personal ? "personal" : "team", seriesUnit: "leads",
    series: daily(l.map((x) => x.created_at)),
    kpis: [
      { label: "Leads generated", value: n(l.length) },
      { label: "Leads contacted", value: n(contacted) },
      { label: "Qualified leads", value: n(l.filter((x) => ["INTERESTED", "QUALIFIED", "NEGOTIATING", "WON", "CONVERTED"].includes(String(x.stage).toUpperCase())).length) },
      { label: "Registered / converted", value: n(converted) },
      { label: "Conversion rate", value: pct(converted, l.length) },
      { label: "Campaign performance", value: null },
      { label: "Retention", value: null },
    ],
  };
}

async function identityFor(db: Db, actor: { staffId: string | null; department: string; extraDepartments: string[] }): Promise<Identity> {
  const q = db.from("staff_accounts").select("id, username, employee_name, position, employee_id, department, extra_departments");
  const { data } = actor.staffId ? await q.eq("id", actor.staffId).maybeSingle() : await q.eq("username", "ceo").maybeSingle();
  const department = data?.department ?? actor.department;
  return {
    staffId: data?.id ?? null, username: data?.username ?? null, name: data?.employee_name ?? null,
    position: data?.position ?? null, employeeId: data?.employee_id ?? null, department,
    extraDepartments: data?.extra_departments ?? actor.extraDepartments,
    teamSeat: !data?.employee_name,
  };
}

async function targetFor(db: Db, staffId: string | null): Promise<Target> {
  if (!staffId) return null;
  const { data } = await db.from("staff_targets").select("kpi_label, kpi_target").eq("staff_id", staffId).eq("period", "MONTHLY").maybeSingle();
  return data?.kpi_target != null ? { label: data.kpi_label ?? "Monthly target", target: data.kpi_target } : null;
}

/** The signed-in seat's own command center. Department is always taken from the session. */
export const getMyCommandCenter = createServerFn({ method: "GET" }).handler(async () => {
  const { requireConsole, adminClient } = await import("./console.server");
  const actor = await requireConsole();
  const db = await adminClient();
  const identity = await identityFor(db, actor);
  const performance = await compute(db, identity.department, identity.staffId, identity.teamSeat);
  const target = await targetFor(db, identity.staffId);
  return { identity, performance, target, monthStart: monthStart() };
});

/** CEO only: every oversight department with members, KPIs and trends. */
export const getDepartmentsOverview = createServerFn({ method: "GET" }).handler(async () => {
  const { requireSuperAdmin, adminClient } = await import("./console.server");
  await requireSuperAdmin();
  const db = await adminClient();
  const { OVERSIGHT_DEPARTMENTS } = await import("./staff-charters");
  const { data: staff } = await db.from("staff_accounts")
    .select("id, username, employee_name, position, employee_id, department, extra_departments, is_active").order("employee_id");
  const { data: tasks } = await db.from("department_tasks").select("department, title, status, due_date, priority").eq("status", "OPEN").limit(300);
  const { data: targets } = await db.from("staff_targets").select("staff_id, kpi_label, kpi_target").eq("period", "MONTHLY");
  const { data: replies } = await db.from("support_ticket_messages").select("staff_id").eq("sender", "ADMIN").gte("created_at", monthStart());
  const { data: leads } = await db.from("leads").select("created_by").gte("created_at", monthStart());
  const count = (rows: { [k: string]: unknown }[] | null, key: string, id: string) => (rows ?? []).filter((r) => r[key] === id).length;
  const departments = await Promise.all(OVERSIGHT_DEPARTMENTS.map(async (dept) => {
    const members = (staff ?? []).filter((s) => (s.department === dept || (dept === "CYBERSECURITY" && s.department === "SUPER_ADMIN")) && s.is_active);
    const perf = await compute(db, dept, null, true);
    const leaderboard: LeaderRow[] = members.filter((m) => m.employee_name).map((m) => ({
      staffId: m.id, name: m.employee_name!, employeeId: m.employee_id,
      value: dept === "SUPPORT" ? count(replies, "staff_id", m.id) : dept === "ADVERTISING" ? count(leads, "created_by", m.id) : null,
    }));
    return {
      department: dept, performance: perf,
      members: members.map((m) => ({ id: m.id, username: m.username, name: m.employee_name, position: m.position, employeeId: m.employee_id,
        target: (targets ?? []).find((t) => t.staff_id === m.id) ?? null })),
      leaderboard, leaderMetric: dept === "SUPPORT" ? "Replies this month" : dept === "ADVERTISING" ? "Leads this month" : null,
      openTasks: (tasks ?? []).filter((t) => t.department === dept),
    };
  }));
  return { departments };
});

/** CEO only: set or clear a seat's monthly target. */
export const setStaffTarget = createServerFn({ method: "POST" })
  .inputValidator((d: { staffId: string; label: string; target: number | null }) => ({
    staffId: String(d?.staffId ?? ""), label: String(d?.label ?? "").slice(0, 80),
    target: d?.target == null || Number.isNaN(Number(d.target)) ? null : Math.max(0, Math.round(Number(d.target))),
  }))
  .handler(async ({ data }) => {
    const { requireSuperAdmin, adminClient } = await import("./console.server");
    const actor = await requireSuperAdmin();
    const db = await adminClient();
    const { data: existing } = await db.from("staff_targets").select("id").eq("staff_id", data.staffId).eq("period", "MONTHLY").maybeSingle();
    const row = { kpi_label: data.label || "Monthly target", kpi_target: data.target, updated_at: new Date().toISOString() };
    const res = existing
      ? await db.from("staff_targets").update(row).eq("id", existing.id)
      : await db.from("staff_targets").insert({ staff_id: data.staffId, period: "MONTHLY", ...row });
    if (res.error) throw new Error("Unable to save the target.");
    await db.from("admin_audit_log").insert({ actor: actor.name, action: "STAFF_TARGET_SET", target_reference: data.staffId, new_state: row, reason: "Monthly target" });
    return { ok: true as const };
  });

/** Facebook Page connection status. Never returns tokens. */
export const getFacebookStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { requireConsole } = await import("./console.server");
  const actor = await requireConsole();
  const allowed = actor.superAdmin || actor.department === "ADVERTISING";
  return { allowed, configured: Boolean(process.env["META_APP_ID"] && process.env["META_APP_SECRET"]) };
});
