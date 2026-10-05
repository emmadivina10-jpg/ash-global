import { createServerFn } from "@tanstack/react-start";

export const EMPLOYEE_TERMS_VERSION = "2026-10-05";

const TICKET_STATUSES = ["NEW", "OPEN", "IN_PROGRESS", "WAITING", "ESCALATED", "RESOLVED", "CLOSED"] as const;

async function actor() {
  const { requireConsole } = await import("./console.server");
  return requireConsole();
}

async function db() {
  const { adminClient } = await import("./console.server");
  return adminClient();
}

async function notifyDepartment(department: string, n: { type: string; title: string; body?: string; link?: string }) {
  const supabase = await db();
  await supabase.from("staff_notifications").insert({ department, type: n.type, title: n.title, body: n.body ?? null, link: n.link ?? null });
}

async function notifyStaff(staffId: string, n: { type: string; title: string; body?: string; link?: string }) {
  const supabase = await db();
  await supabase.from("staff_notifications").insert({ staff_id: staffId, type: n.type, title: n.title, body: n.body ?? null, link: n.link ?? null });
}

// ---------- Employee terms ----------

export const getEmployeeTermsStatus = createServerFn({ method: "GET" }).handler(async () => {
  const a = await actor();
  if (!a.staffId) return { required: false as const, accepted: true as const, version: EMPLOYEE_TERMS_VERSION };
  const supabase = await db();
  const { data } = await supabase
    .from("employee_terms_acceptance")
    .select("id")
    .eq("staff_id", a.staffId)
    .eq("terms_version", EMPLOYEE_TERMS_VERSION)
    .maybeSingle();
  return { required: true as const, accepted: Boolean(data), version: EMPLOYEE_TERMS_VERSION };
});

export const acceptEmployeeTerms = createServerFn({ method: "POST" }).handler(async () => {
  const a = await actor();
  if (!a.staffId) throw new Error("Only employee accounts accept employee terms");
  const supabase = await db();
  const { error } = await supabase
    .from("employee_terms_acceptance")
    .upsert({ staff_id: a.staffId, terms_version: EMPLOYEE_TERMS_VERSION }, { onConflict: "staff_id,terms_version" });
  if (error) throw error;
  return { ok: true as const };
});

// ---------- Staff notifications ----------

export const getStaffNotifications = createServerFn({ method: "GET" }).handler(async () => {
  const a = await actor();
  const supabase = await db();
  let q = supabase
    .from("staff_notifications")
    .select("id, type, title, body, link, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (a.superAdmin) {
    // CEO sees everything
  } else if (a.staffId) {
    q = q.or(`staff_id.eq.${a.staffId},department.eq.${a.department}`);
  } else {
    return { notifications: [] as never[], unread: 0 };
  }
  const { data, error } = await q;
  if (error) throw error;
  const rows = data ?? [];
  return { notifications: rows, unread: rows.filter((r) => !r.read_at).length };
});

export const markStaffNotificationRead = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => ({ id: String(d?.id ?? "") }))
  .handler(async ({ data }) => {
    await actor();
    const supabase = await db();
    await supabase.from("staff_notifications").update({ read_at: new Date().toISOString() }).eq("id", data.id);
    return { ok: true as const };
  });

export const markAllStaffNotificationsRead = createServerFn({ method: "POST" }).handler(async () => {
  const a = await actor();
  const supabase = await db();
  let q = supabase.from("staff_notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
  if (!a.superAdmin && a.staffId) q = q.or(`staff_id.eq.${a.staffId},department.eq.${a.department}`);
  await q;
  return { ok: true as const };
});

// ---------- Customer ticketing ----------

export const getTicketBoard = createServerFn({ method: "GET" }).handler(async () => {
  const a = await actor();
  const supabase = await db();
  let q = supabase
    .from("support_tickets")
    .select(
      "id, subject, category, status, priority, name, email, created_at, updated_at, assigned_staff_id, assigned_department, escalation_note, escalated_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (!a.superAdmin && a.department !== "SUPPORT") {
    q = q.or(`assigned_department.eq.${a.department},assigned_staff_id.eq.${a.staffId ?? "none"}`);
  }
  const { data: tickets, error } = await q;
  if (error) throw error;
  const { data: staff } = await supabase
    .from("staff_accounts")
    .select("id, username, employee_name, department")
    .eq("is_active", true);
  return { tickets: tickets ?? [], staff: staff ?? [], actor: { department: a.department, staffId: a.staffId, superAdmin: a.superAdmin } };
});

export const assignTicket = createServerFn({ method: "POST" })
  .inputValidator((d: { ticketId: string; staffId?: string | null; department?: string | null }) => ({
    ticketId: String(d?.ticketId ?? ""),
    staffId: d?.staffId ? String(d.staffId) : null,
    department: d?.department ? String(d.department) : null,
  }))
  .handler(async ({ data }) => {
    await actor();
    const supabase = await db();
    const { error } = await supabase
      .from("support_tickets")
      .update({ assigned_staff_id: data.staffId, assigned_department: data.department, status: "OPEN" })
      .eq("id", data.ticketId);
    if (error) throw error;
    if (data.staffId) {
      await notifyStaff(data.staffId, { type: "TICKET_ASSIGNED", title: "A ticket was assigned to you", link: "/console/support" });
    } else if (data.department) {
      await notifyDepartment(data.department, { type: "TICKET_ASSIGNED", title: "A ticket was assigned to your department", link: "/console/support" });
    }
    return { ok: true as const };
  });

export const escalateTicket = createServerFn({ method: "POST" })
  .inputValidator((d: { ticketId: string; department: string; note?: string }) => ({
    ticketId: String(d?.ticketId ?? ""),
    department: String(d?.department ?? "").toUpperCase(),
    note: String(d?.note ?? "").slice(0, 500),
  }))
  .handler(async ({ data }) => {
    const a = await actor();
    const supabase = await db();
    const { data: departments } = await supabase.from("staff_accounts").select("department").eq("is_active", true);
    const valid = new Set((departments ?? []).map((r) => r.department));
    valid.add("SUPER_ADMIN");
    if (!valid.has(data.department)) throw new Error("Unknown department");
    const { error } = await supabase
      .from("support_tickets")
      .update({
        status: "ESCALATED",
        assigned_department: data.department,
        assigned_staff_id: null,
        escalation_note: data.note || `Escalated by ${a.name}`,
        escalated_at: new Date().toISOString(),
      })
      .eq("id", data.ticketId);
    if (error) throw error;
    await notifyDepartment(data.department, {
      type: "TICKET_ESCALATED",
      title: "A ticket was escalated to your department",
      body: data.note || undefined,
      link: "/console/support",
    });
    return { ok: true as const };
  });

export const setTicketBoardStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { ticketId: string; status: string }) => ({ ticketId: String(d?.ticketId ?? ""), status: String(d?.status ?? "").toUpperCase() }))
  .handler(async ({ data }) => {
    await actor();
    if (!TICKET_STATUSES.includes(data.status as (typeof TICKET_STATUSES)[number])) throw new Error("Invalid status");
    const supabase = await db();
    // Map extended statuses onto the existing ticket status column values where possible.
    const existing = ["OPEN", "PENDING", "RESOLVED"].includes(data.status)
      ? data.status
      : data.status === "NEW"
        ? "PENDING"
        : data.status === "CLOSED"
          ? "RESOLVED"
          : data.status === "ESCALATED"
            ? "ESCALATED"
            : "OPEN";
    const { error } = await supabase.from("support_tickets").update({ status: existing }).eq("id", data.ticketId);
    if (error) throw error;
    return { ok: true as const };
  });

export const getTicketNotes = createServerFn({ method: "POST" })
  .inputValidator((d: { ticketId: string }) => ({ ticketId: String(d?.ticketId ?? "") }))
  .handler(async ({ data }) => {
    await actor();
    const supabase = await db();
    const { data: notes, error } = await supabase
      .from("ticket_internal_notes")
      .select("id, staff_name, body, created_at")
      .eq("ticket_id", data.ticketId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return { notes: notes ?? [] };
  });

export const addTicketNote = createServerFn({ method: "POST" })
  .inputValidator((d: { ticketId: string; body: string }) => ({ ticketId: String(d?.ticketId ?? ""), body: String(d?.body ?? "").trim().slice(0, 2000) }))
  .handler(async ({ data }) => {
    const a = await actor();
    if (!data.body) throw new Error("Note is empty");
    const supabase = await db();
    const { error } = await supabase
      .from("ticket_internal_notes")
      .insert({ ticket_id: data.ticketId, staff_id: a.staffId, staff_name: a.name, body: data.body });
    if (error) throw error;
    return { ok: true as const };
  });

// ---------- Direct staff messages ----------

export const getStaffInbox = createServerFn({ method: "GET" }).handler(async () => {
  const a = await actor();
  if (!a.staffId) return { messages: [] as never[], colleagues: [] as never[] };
  const supabase = await db();
  const { data: messages, error } = await supabase
    .from("staff_direct_messages")
    .select("id, from_staff_id, from_name, to_staff_id, body, read_at, created_at")
    .or(`from_staff_id.eq.${a.staffId},to_staff_id.eq.${a.staffId}`)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  const { data: colleagues } = await supabase
    .from("staff_accounts")
    .select("id, username, employee_name, department")
    .eq("is_active", true)
    .neq("id", a.staffId);
  return { messages: messages ?? [], colleagues: colleagues ?? [], me: a.staffId };
});

export const sendDirectMessage = createServerFn({ method: "POST" })
  .inputValidator((d: { toStaffId: string; body: string }) => ({ toStaffId: String(d?.toStaffId ?? ""), body: String(d?.body ?? "").trim().slice(0, 2000) }))
  .handler(async ({ data }) => {
    const a = await actor();
    if (!a.staffId) throw new Error("Only employee accounts can send direct messages");
    if (!data.body) throw new Error("Message is empty");
    const supabase = await db();
    const { error } = await supabase
      .from("staff_direct_messages")
      .insert({ from_staff_id: a.staffId, from_name: a.name, to_staff_id: data.toStaffId, body: data.body });
    if (error) throw error;
    await notifyStaff(data.toStaffId, { type: "DIRECT_MESSAGE", title: `New message from ${a.name}`, link: "/console" });
    return { ok: true as const };
  });

export const markDirectMessagesRead = createServerFn({ method: "POST" })
  .inputValidator((d: { fromStaffId: string }) => ({ fromStaffId: String(d?.fromStaffId ?? "") }))
  .handler(async ({ data }) => {
    const a = await actor();
    if (!a.staffId) return { ok: true as const };
    const supabase = await db();
    await supabase
      .from("staff_direct_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("to_staff_id", a.staffId)
      .eq("from_staff_id", data.fromStaffId)
      .is("read_at", null);
    return { ok: true as const };
  });

// ---------- ASH Intelligence (data-driven, department-scoped) ----------

export const askAshIntelligence = createServerFn({ method: "POST" })
  .inputValidator((d: { question: string }) => ({ question: String(d?.question ?? "").trim().slice(0, 500) }))
  .handler(async ({ data }) => {
    const a = await actor();
    const supabase = await db();
    const q = data.question.toLowerCase();

    // Gather real figures
    const [{ count: openTickets }, { count: escalated }, { count: resolvedToday }, { data: tasks }, { data: accounts }] =
      await Promise.all([
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["OPEN", "PENDING", "ESCALATED"]),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "ESCALATED"),
        supabase
          .from("support_tickets")
          .select("id", { count: "exact", head: true })
          .eq("status", "RESOLVED")
          .gte("updated_at", new Date(Date.now() - 86400000).toISOString()),
        supabase.from("department_tasks").select("department, status"),
        a.superAdmin ? supabase.from("staff_accounts").select("employee_name, department").eq("is_active", true) : Promise.resolve({ data: null }),
      ]);

    const taskRows = tasks ?? [];
    const pendingTasks = taskRows.filter((t) => t.status !== "DONE").length;
    const doneTasks = taskRows.length - pendingTasks;

    const byDept = new Map<string, { pending: number; done: number }>();
    for (const t of taskRows) {
      const d = (t as { department?: string }).department ?? "GENERAL";
      const cur = byDept.get(d) ?? { pending: 0, done: 0 };
      if (t.status === "DONE") cur.done += 1;
      else cur.pending += 1;
      byDept.set(d, cur);
    }

    const myDept = byDept.get(a.department) ?? { pending: 0, done: 0 };
    const unavailable = "Insufficient data to answer that from ASH records.";

    let answer: string;
    if (q.includes("perform") || q.includes("how am i")) {
      answer = a.superAdmin
        ? `Company-wide: ${pendingTasks} tasks pending and ${doneTasks} completed across all departments. ${openTickets ?? 0} customer tickets are open, ${escalated ?? 0} escalated, ${resolvedToday ?? 0} resolved in the last 24 hours.`
        : myDept.pending + myDept.done === 0
          ? unavailable
          : `Your department (${a.department}) has ${myDept.pending} pending tasks and ${myDept.done} completed. There are ${openTickets ?? 0} open customer tickets company-wide.`;
    } else if (q.includes("priorit") || q.includes("attention") || q.includes("what should i")) {
      const worst = [...byDept.entries()].sort((x, y) => y[1].pending - x[1].pending)[0];
      answer = worst
        ? `Highest workload: ${worst[0]} with ${worst[1].pending} pending tasks. ${escalated ?? 0} tickets are escalated and need attention first.`
        : unavailable;
    } else if (q.includes("ticket")) {
      answer = `${openTickets ?? 0} tickets are open, ${escalated ?? 0} escalated, ${resolvedToday ?? 0} resolved in the last 24 hours.`;
    } else if (q.includes("department") || q.includes("compare")) {
      if (!a.superAdmin) return { answer: "That question is outside your department's authorization." };
      const lines = [...byDept.entries()].map(([d, s]) => `${d}: ${s.pending} pending / ${s.done} done`);
      answer = lines.length ? `Department workload — ${lines.join("; ")}.` : unavailable;
    } else if (q.includes("employee") || q.includes("who needs")) {
      if (!a.superAdmin) return { answer: "That question is outside your department's authorization." };
      answer = accounts?.length
        ? `${accounts.length} active employee seats across ${new Set(accounts.map((r) => r.department)).size} departments. Per-person performance figures require recorded activity; where none exists the dashboards show "Data not available".`
        : unavailable;
    } else {
      answer = `Current snapshot: ${openTickets ?? 0} open tickets (${escalated ?? 0} escalated), ${pendingTasks} pending tasks, ${doneTasks} completed. Ask about performance, priorities, tickets, or departments.`;
    }

    return { answer };
  });
