import { createServerFn } from "@tanstack/react-start";

/** Employee workspace: My Day, identity, availability, My Tasks, daily reports. Real records only. */

const AVAILABILITY = ["AVAILABLE", "AWAY", "BUSY", "OFFLINE"] as const;
const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
const RECURRENCE = ["NONE", "DAILY", "WEEKLY", "MONTHLY"] as const;

/** Response / resolution targets in hours by ticket priority. */
const SLA_DEFAULT = { response: 8, resolution: 48 };
const SLA_HOURS: Record<string, { response: number; resolution: number }> = {
  URGENT: { response: 1, resolution: 8 },
  HIGH: { response: 4, resolution: 24 },
  NORMAL: { response: 8, resolution: 48 },
  LOW: { response: 24, resolution: 72 },
};

async function ctx() {
  const { requireConsole, adminClient } = await import("./console.server");
  const a = await requireConsole();
  return { a, db: await adminClient() };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export const getMyWorkspace = createServerFn({ method: "GET" }).handler(async () => {
  const { a, db } = await ctx();
  const d = today();

  const me = a.staffId
    ? (
        await db
          .from("staff_accounts")
          .select("id, employee_name, full_name, position, department, employee_id, avatar_url, availability, identity_confirmed_at")
          .eq("id", a.staffId)
          .maybeSingle()
      ).data
    : null;

  const avatarSignedUrl = me?.avatar_url
    ? (await db.storage.from("staff-avatars").createSignedUrl(me.avatar_url, 60 * 60)).data?.signedUrl ?? null
    : null;

  let taskQ = db
    .from("department_tasks")
    .select("id, title, due_date, status, priority, progress, assigned_staff_id, department")
    .neq("status", "DONE")
    .limit(300);
  if (!a.superAdmin) taskQ = taskQ.or(`assigned_staff_id.eq.${a.staffId ?? "00000000-0000-0000-0000-000000000000"},department.eq.${a.department}`);
  const { data: tasks } = await taskQ;
  const open = tasks ?? [];

  let ticketQ = db
    .from("support_tickets")
    .select("id, subject, name, status, priority, created_at, last_message_at, assigned_staff_id, assigned_department")
    .not("status", "in", "(RESOLVED,CLOSED)")
    .order("created_at", { ascending: true })
    .limit(200);
  if (!a.superAdmin) {
    const parts = [`assigned_department.eq.${a.department}`];
    if (a.staffId) parts.push(`assigned_staff_id.eq.${a.staffId}`);
    if (a.department === "SUPPORT") parts.push("assigned_department.is.null");
    ticketQ = ticketQ.or(parts.join(","));
  }
  const { data: tickets } = await ticketQ;

  const now = Date.now();
  const ticketRows = (tickets ?? []).map((t) => {
    const sla = SLA_HOURS[t.priority] ?? SLA_DEFAULT;
    const created = new Date(t.created_at).getTime();
    const resolutionDue = created + sla.resolution * 3600_000;
    const remaining = resolutionDue - now;
    const state = remaining < 0 ? "BREACHED" : remaining < sla.resolution * 3600_000 * 0.25 ? "AT_RISK" : "ON_TIME";
    return { ...t, resolution_due: new Date(resolutionDue).toISOString(), sla_state: state };
  });

  let unread = 0;
  if (a.staffId) {
    const { count } = await db
      .from("staff_direct_messages")
      .select("id", { count: "exact", head: true })
      .eq("to_staff_id", a.staffId)
      .is("read_at", null);
    unread = count ?? 0;
  }

  let notifQ = db.from("staff_notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  if (!a.superAdmin) notifQ = notifQ.or(`staff_id.eq.${a.staffId ?? "00000000-0000-0000-0000-000000000000"},department.eq.${a.department}`);
  const { count: notifCount } = await notifQ;

  // Completed today / this week (real records).
  const weekStart = new Date(now - 6 * 86400_000).toISOString();
  let doneQ = db.from("department_tasks").select("completed_at").eq("status", "DONE").gte("completed_at", weekStart);
  if (!a.superAdmin) doneQ = doneQ.eq("department", a.department);
  const { data: done } = await doneQ;
  const doneToday = (done ?? []).filter((r) => (r.completed_at ?? "").startsWith(d)).length;

  let teamQ = db
    .from("staff_accounts")
    .select("id, employee_name, full_name, position, department, availability")
    .eq("is_active", true)
    .order("department");
  if (!a.superAdmin) teamQ = teamQ.eq("department", a.department);
  const { data: team } = await teamQ;

  const { data: myReport } = a.staffId
    ? await db.from("staff_daily_reports").select("*").eq("staff_id", a.staffId).eq("report_date", d).maybeSingle()
    : { data: null };

  return {
    actor: { name: a.name, department: a.department, superAdmin: a.superAdmin, staffId: a.staffId },
    me: me ? { ...me, avatarSignedUrl } : null,
    date: d,
    myDay: {
      dueToday: open.filter((t) => t.due_date === d).length,
      overdue: open.filter((t) => t.due_date < d).length,
      pendingTasks: open.length,
      ticketsAwaiting: ticketRows.length,
      escalations: ticketRows.filter((t) => t.status === "ESCALATED").length,
      breached: ticketRows.filter((t) => t.sla_state === "BREACHED").length,
      unreadMessages: unread,
      unreadNotifications: notifCount ?? 0,
      completedToday: doneToday,
      completedWeek: (done ?? []).length,
    },
    priorities: open
      .filter((t) => t.due_date <= d)
      .sort((x, y) => PRIORITIES.indexOf(y.priority as never) - PRIORITIES.indexOf(x.priority as never))
      .slice(0, 5),
    tickets: ticketRows.slice(0, 8),
    team: (team ?? []).map((t) => ({ ...t, name: t.employee_name ?? t.full_name })),
    myReport,
  };
});

export const setAvailability = createServerFn({ method: "POST" })
  .inputValidator((d: { status: string }) => {
    const s = String(d?.status ?? "").toUpperCase();
    if (!(AVAILABILITY as readonly string[]).includes(s)) throw new Error("Invalid status");
    return { status: s };
  })
  .handler(async ({ data }) => {
    const { a, db } = await ctx();
    if (!a.staffId) return { ok: false };
    await db.from("staff_accounts").update({ availability: data.status }).eq("id", a.staffId);
    return { ok: true };
  });

export const confirmIdentity = createServerFn({ method: "POST" }).handler(async () => {
  const { a, db } = await ctx();
  if (!a.staffId) return { ok: false };
  await db
    .from("staff_accounts")
    .update({ identity_confirmed_at: new Date().toISOString(), availability: "AVAILABLE" })
    .eq("id", a.staffId);
  return { ok: true };
});

// ---------- My Tasks ----------

export const getMyTasks = createServerFn({ method: "GET" }).handler(async () => {
  const { a, db } = await ctx();
  let q = db
    .from("department_tasks")
    .select("id, title, detail, department, due_date, status, priority, progress, recurrence, related_customer, related_ticket_id, assigned_staff_id, completed_at, created_by")
    .order("due_date", { ascending: true })
    .limit(300);
  if (!a.superAdmin) {
    q = q.or(`assigned_staff_id.eq.${a.staffId ?? "00000000-0000-0000-0000-000000000000"},department.eq.${a.department}`);
  }
  const { data } = await q;
  const { data: staff } = await db
    .from("staff_accounts")
    .select("id, employee_name, full_name, department")
    .eq("is_active", true);
  return {
    tasks: data ?? [],
    staff: (staff ?? []).map((s) => ({ id: s.id, name: s.employee_name ?? s.full_name, department: s.department })),
    canAssign: a.superAdmin,
    me: a.staffId,
    today: today(),
  };
});

export const createTask = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      title: string;
      detail?: string;
      due_date: string;
      priority?: string;
      assigned_staff_id?: string | null;
      related_customer?: string;
      recurrence?: string;
    }) => {
      const title = String(d?.title ?? "").trim().slice(0, 200);
      if (!title) throw new Error("Title required");
      const due = /^\d{4}-\d{2}-\d{2}$/.test(d?.due_date ?? "") ? d.due_date : today();
      const priority = (PRIORITIES as readonly string[]).includes(String(d?.priority)) ? String(d.priority) : "NORMAL";
      const recurrence = (RECURRENCE as readonly string[]).includes(String(d?.recurrence)) ? String(d.recurrence) : "NONE";
      return {
        title,
        detail: d?.detail ? String(d.detail).slice(0, 2000) : null,
        due_date: due,
        priority,
        recurrence,
        assigned_staff_id: d?.assigned_staff_id || null,
        related_customer: d?.related_customer ? String(d.related_customer).slice(0, 200) : null,
      };
    },
  )
  .handler(async ({ data }) => {
    const { a, db } = await ctx();
    // Only the CEO assigns to other employees; everyone else creates tasks for themselves.
    const assignee = a.superAdmin ? data.assigned_staff_id : a.staffId;
    let department = a.department as string;
    if (assignee) {
      const { data: s } = await db.from("staff_accounts").select("department").eq("id", assignee).maybeSingle();
      if (!s) throw new Error("Unknown employee");
      department = s.department;
    }
    const { data: row, error } = await db
      .from("department_tasks")
      .insert({
        title: data.title,
        detail: data.detail,
        due_date: data.due_date,
        priority: data.priority,
        recurrence: data.recurrence,
        related_customer: data.related_customer,
        assigned_staff_id: assignee,
        department,
        source: "MANUAL",
        status: "OPEN",
        created_by: a.name,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    if (assignee && assignee !== a.staffId) {
      await db.from("staff_notifications").insert({
        staff_id: assignee,
        type: "TASK",
        title: `New task: ${data.title}`,
        body: `Assigned by ${a.name}, due ${data.due_date}`,
        link: "/console/workspace",
      });
    }
    return { id: row.id };
  });

export const updateTask = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; progress?: number; status?: string }) => ({
    id: String(d.id),
    progress: d.progress === undefined ? undefined : Math.max(0, Math.min(100, Math.round(Number(d.progress)))),
    status: d.status ? String(d.status).toUpperCase() : undefined,
  }))
  .handler(async ({ data }) => {
    const { a, db } = await ctx();
    const { data: t } = await db
      .from("department_tasks")
      .select("id, department, assigned_staff_id, recurrence, title, detail, priority, due_date, related_customer")
      .eq("id", data.id)
      .maybeSingle();
    if (!t) throw new Error("Not found");
    if (!a.superAdmin && t.assigned_staff_id !== a.staffId && t.department !== a.department) throw new Error("FORBIDDEN");

    const patch: { progress?: number; status?: string; completed_at?: string | null; completed_by?: string } = {};
    if (data.progress !== undefined) patch.progress = data.progress;
    const done = data.status === "DONE" || data.progress === 100;
    if (done) {
      patch.status = "DONE";
      patch.progress = 100;
      patch.completed_at = new Date().toISOString();
      patch.completed_by = a.name;
    } else if (data.status) {
      patch.status = data.status === "IN_PROGRESS" ? "IN_PROGRESS" : "OPEN";
      patch.completed_at = null;
    }
    await db.from("department_tasks").update(patch).eq("id", data.id);

    // Recurring tasks spawn their next occurrence on completion.
    if (done && t.recurrence && t.recurrence !== "NONE") {
      const next = new Date(`${t.due_date}T00:00:00Z`);
      if (t.recurrence === "DAILY") next.setUTCDate(next.getUTCDate() + 1);
      if (t.recurrence === "WEEKLY") next.setUTCDate(next.getUTCDate() + 7);
      if (t.recurrence === "MONTHLY") next.setUTCMonth(next.getUTCMonth() + 1);
      await db.from("department_tasks").insert({
        title: t.title,
        detail: t.detail,
        priority: t.priority,
        department: t.department,
        assigned_staff_id: t.assigned_staff_id,
        related_customer: t.related_customer,
        recurrence: t.recurrence,
        due_date: next.toISOString().slice(0, 10),
        source: "RECURRING",
        status: "OPEN",
        created_by: a.name,
      });
    }
    return { ok: true };
  });

export const getTaskComments = createServerFn({ method: "POST" })
  .inputValidator((d: { taskId: string }) => ({ taskId: String(d.taskId) }))
  .handler(async ({ data }) => {
    const { db } = await ctx();
    const { data: rows } = await db
      .from("staff_task_comments")
      .select("id, staff_name, body, created_at")
      .eq("task_id", data.taskId)
      .order("created_at");
    return rows ?? [];
  });

export const addTaskComment = createServerFn({ method: "POST" })
  .inputValidator((d: { taskId: string; body: string }) => {
    const body = String(d?.body ?? "").trim().slice(0, 2000);
    if (!body) throw new Error("Empty comment");
    return { taskId: String(d.taskId), body };
  })
  .handler(async ({ data }) => {
    const { a, db } = await ctx();
    await db.from("staff_task_comments").insert({ task_id: data.taskId, staff_id: a.staffId, staff_name: a.name, body: data.body });
    return { ok: true };
  });

// ---------- Daily reports ----------

export const submitDailyReport = createServerFn({ method: "POST" })
  .inputValidator((d: Record<string, string>) => {
    const f = (k: string) => (d?.[k] ? String(d[k]).slice(0, 3000) : null);
    return {
      accomplished: f("accomplished"),
      problems: f("problems"),
      unfinished: f("unfinished"),
      help_needed: f("help_needed"),
      management_info: f("management_info"),
    };
  })
  .handler(async ({ data }) => {
    const { a, db } = await ctx();
    if (!a.staffId) throw new Error("Daily reports are for employee logins");
    const { error } = await db.from("staff_daily_reports").upsert(
      {
        ...data,
        staff_id: a.staffId,
        staff_name: a.name,
        department: a.department,
        report_date: today(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "staff_id,report_date" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** CEO executive summary built only from submitted reports. */
export const getExecutiveDailySummary = createServerFn({ method: "POST" })
  .inputValidator((d: { date?: string }) => ({ date: /^\d{4}-\d{2}-\d{2}$/.test(d?.date ?? "") ? d.date! : today() }))
  .handler(async ({ data }) => {
    const { requireSuperAdmin, adminClient } = await import("./console.server");
    await requireSuperAdmin();
    const db = await adminClient();
    const { data: reports } = await db
      .from("staff_daily_reports")
      .select("*")
      .eq("report_date", data.date)
      .order("department");
    const { count: active } = await db
      .from("staff_accounts")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .not("employee_name", "is", null);
    const rows = reports ?? [];
    return {
      date: data.date,
      submitted: rows.length,
      expected: active ?? 0,
      helpRequests: rows.filter((r) => r.help_needed).map((r) => ({ name: r.staff_name, department: r.department, text: r.help_needed })),
      problems: rows.filter((r) => r.problems).map((r) => ({ name: r.staff_name, department: r.department, text: r.problems })),
      management: rows.filter((r) => r.management_info).map((r) => ({ name: r.staff_name, department: r.department, text: r.management_info })),
      reports: rows,
    };
  });
