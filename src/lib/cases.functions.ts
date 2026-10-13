import { createServerFn } from "@tanstack/react-start";

/** Case management + department workflows. Server-side RBAC on every call. */

export const CASE_STATUSES = [
  "OPEN",
  "UNDER_REVIEW",
  "ESCALATED",
  "ACTION_REQUIRED",
  "RESOLVED",
  "CLOSED",
] as const;
const EVENT_KINDS = ["NOTE", "EVIDENCE", "DECISION", "ACTION"] as const;

export type WorkflowStep = { department: string; action: string; hours: number };
type HistoryItem = {
  at: string;
  by: string;
  step: number;
  event: string;
  note?: string | undefined;
};

async function ctx() {
  const { requireConsole, adminClient } = await import("./console.server");
  const a = await requireConsole();
  return { a, db: await adminClient() };
}

type CaseRow = {
  id: string;
  departments: string[];
  staff_ids: string[];
  created_by: string;
};

function canSeeCase(
  a: {
    superAdmin: boolean;
    department: string;
    staffId: string | null;
    name: string;
    extraDepartments: string[];
  },
  c: CaseRow,
) {
  if (a.superAdmin) return true;
  if (
    c.departments.includes(a.department) ||
    a.extraDepartments.some((d) => c.departments.includes(d))
  )
    return true;
  if (a.staffId && c.staff_ids.includes(a.staffId)) return true;
  return c.created_by === a.name;
}

async function logEvent(
  db: Awaited<ReturnType<typeof ctx>>["db"],
  caseId: string,
  kind: string,
  body: string,
  a: { staffId: string | null; name: string },
) {
  await db
    .from("ops_case_events")
    .insert({ case_id: caseId, kind, body, staff_id: a.staffId, staff_name: a.name });
  await db.from("ops_cases").update({ updated_at: new Date().toISOString() }).eq("id", caseId);
}

export const listCases = createServerFn({ method: "GET" }).handler(async () => {
  const { a, db } = await ctx();
  const { data } = await db
    .from("ops_cases")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(300);
  const { data: staff } = await db
    .from("staff_accounts")
    .select("id, employee_name, full_name, department")
    .eq("is_active", true);
  return {
    cases: (data ?? []).filter((c) => canSeeCase(a, c)),
    staff: (staff ?? []).map((s) => ({
      id: s.id,
      name: s.employee_name ?? s.full_name,
      department: s.department,
    })),
    canLinkReports:
      a.superAdmin || a.department === "TRUST" || a.extraDepartments.includes("TRUST"),
    actor: { superAdmin: a.superAdmin, department: a.department },
  };
});

export const createCase = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      title: string;
      customer_name?: string;
      priority?: string;
      departments?: string[];
      ticket_id?: string;
    }) => {
      const title = String(d?.title ?? "")
        .trim()
        .slice(0, 200);
      if (!title) throw new Error("Title required");
      return {
        title,
        customer_name: d?.customer_name ? String(d.customer_name).slice(0, 200) : null,
        priority: ["LOW", "NORMAL", "HIGH", "URGENT"].includes(String(d?.priority))
          ? String(d.priority)
          : "NORMAL",
        departments: (d?.departments ?? []).map((x) => String(x).toUpperCase()).slice(0, 14),
        ticket_id: d?.ticket_id ? String(d.ticket_id) : null,
      };
    },
  )
  .handler(async ({ data }) => {
    const { a, db } = await ctx();
    const departments = Array.from(new Set([a.department as string, ...data.departments]));
    const { data: row, error } = await db
      .from("ops_cases")
      .insert({
        title: data.title,
        customer_name: data.customer_name,
        priority: data.priority,
        departments,
        staff_ids: a.staffId ? [a.staffId] : [],
        ticket_ids: data.ticket_id ? [data.ticket_id] : [],
        created_by: a.name,
      })
      .select("id, case_number")
      .single();
    if (error) throw new Error(error.message);
    await logEvent(db, row.id, "STATUS", `Case opened by ${a.name}`, a);
    for (const dept of departments.filter((x) => x !== a.department)) {
      await db.from("staff_notifications").insert({
        department: dept,
        type: "CASE",
        title: `Case #ASH-CASE-${String(row.case_number).padStart(4, "0")} involves your department`,
        body: data.title,
        link: "/console/cases",
      });
    }
    return row;
  });

export const getCase = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => ({ id: String(d.id) }))
  .handler(async ({ data }) => {
    const { a, db } = await ctx();
    const { data: c } = await db.from("ops_cases").select("*").eq("id", data.id).maybeSingle();
    if (!c || !canSeeCase(a, c)) throw new Error("FORBIDDEN");
    const { data: events } = await db
      .from("ops_case_events")
      .select("*")
      .eq("case_id", c.id)
      .order("created_at");
    const { data: tickets } = c.ticket_ids.length
      ? await db
          .from("support_tickets")
          .select("id, subject, status, name, created_at")
          .in("id", c.ticket_ids)
      : { data: [] };
    const showReports =
      a.superAdmin || a.department === "TRUST" || a.extraDepartments.includes("TRUST");
    const { data: reports } =
      showReports && c.report_ids.length
        ? await db
            .from("content_reports")
            .select("id, reason, status, target_type, created_at")
            .in("id", c.report_ids)
        : { data: [] };
    const { data: runs } = await db
      .from("ops_workflow_runs")
      .select("*")
      .eq("case_id", c.id)
      .order("created_at");
    return {
      case: c,
      events: events ?? [],
      tickets: tickets ?? [],
      reports: reports ?? [],
      reportsHidden: !showReports && c.report_ids.length > 0,
      runs: runs ?? [],
    };
  });

export const addCaseEvent = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; kind: string; body: string }) => {
    const kind = String(d?.kind).toUpperCase();
    if (!(EVENT_KINDS as readonly string[]).includes(kind)) throw new Error("Invalid entry type");
    const body = String(d?.body ?? "")
      .trim()
      .slice(0, 4000);
    if (!body) throw new Error("Empty entry");
    return { id: String(d.id), kind, body };
  })
  .handler(async ({ data }) => {
    const { a, db } = await ctx();
    const { data: c } = await db
      .from("ops_cases")
      .select("id, departments, staff_ids, created_by")
      .eq("id", data.id)
      .maybeSingle();
    if (!c || !canSeeCase(a, c)) throw new Error("FORBIDDEN");
    await logEvent(db, c.id, data.kind, data.body, a);
    return { ok: true };
  });

export const updateCase = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      id: string;
      status?: string;
      resolution?: string;
      addDepartment?: string;
      addStaffId?: string;
      addTicketId?: string;
      addReportId?: string;
    }) => ({
      id: String(d.id),
      status:
        d.status && (CASE_STATUSES as readonly string[]).includes(d.status) ? d.status : undefined,
      resolution: d.resolution ? String(d.resolution).slice(0, 4000) : undefined,
      addDepartment: d.addDepartment ? String(d.addDepartment).toUpperCase() : undefined,
      addStaffId: d.addStaffId ? String(d.addStaffId) : undefined,
      addTicketId: d.addTicketId ? String(d.addTicketId).trim() : undefined,
      addReportId: d.addReportId ? String(d.addReportId).trim() : undefined,
    }),
  )
  .handler(async ({ data }) => {
    const { a, db } = await ctx();
    const { data: c } = await db.from("ops_cases").select("*").eq("id", data.id).maybeSingle();
    if (!c || !canSeeCase(a, c)) throw new Error("FORBIDDEN");
    const patch: {
      status?: string;
      resolution?: string;
      departments?: string[];
      staff_ids?: string[];
      ticket_ids?: string[];
      report_ids?: string[];
      updated_at: string;
    } = { updated_at: new Date().toISOString() };
    const log: string[] = [];

    if (data.status && data.status !== c.status) {
      if (
        (data.status === "RESOLVED" || data.status === "CLOSED") &&
        !(data.resolution || c.resolution)
      )
        throw new Error("Add a final resolution first");
      patch.status = data.status;
      log.push(`Status ${c.status} → ${data.status}`);
    }
    if (data.resolution !== undefined) {
      patch.resolution = data.resolution;
      log.push(`Final resolution recorded: ${data.resolution}`);
    }
    if (data.addDepartment && !c.departments.includes(data.addDepartment)) {
      patch.departments = [...c.departments, data.addDepartment];
      log.push(`Department added: ${data.addDepartment}`);
      await db.from("staff_notifications").insert({
        department: data.addDepartment,
        type: "CASE",
        title: `Case #ASH-CASE-${String(c.case_number).padStart(4, "0")} involves your department`,
        body: c.title,
        link: "/console/cases",
      });
    }
    if (data.addStaffId && !c.staff_ids.includes(data.addStaffId)) {
      const { data: s } = await db
        .from("staff_accounts")
        .select("id, employee_name, full_name")
        .eq("id", data.addStaffId)
        .maybeSingle();
      if (!s) throw new Error("Unknown employee");
      patch.staff_ids = [...c.staff_ids, s.id];
      log.push(`Employee added: ${s.employee_name ?? s.full_name}`);
      await db.from("staff_notifications").insert({
        staff_id: s.id,
        type: "CASE",
        title: `You were added to case #ASH-CASE-${String(c.case_number).padStart(4, "0")}`,
        body: c.title,
        link: "/console/cases",
      });
    }
    if (data.addTicketId && !c.ticket_ids.includes(data.addTicketId)) {
      const { data: t } = await db
        .from("support_tickets")
        .select("id, subject")
        .eq("id", data.addTicketId)
        .maybeSingle();
      if (!t) throw new Error("Ticket not found");
      patch.ticket_ids = [...c.ticket_ids, t.id];
      log.push(`Ticket linked: ${t.subject}`);
    }
    if (data.addReportId && !c.report_ids.includes(data.addReportId)) {
      // Safety reports stay within Trust & Safety authorization.
      if (!(a.superAdmin || a.department === "TRUST" || a.extraDepartments.includes("TRUST")))
        throw new Error("FORBIDDEN_DEPARTMENT");
      const { data: r } = await db
        .from("content_reports")
        .select("id, reason")
        .eq("id", data.addReportId)
        .maybeSingle();
      if (!r) throw new Error("Report not found");
      patch.report_ids = [...c.report_ids, r.id];
      log.push(`Safety report linked (${r.reason})`);
    }

    await db.from("ops_cases").update(patch).eq("id", c.id);
    for (const l of log)
      await db.from("ops_case_events").insert({
        case_id: c.id,
        kind: "STATUS",
        body: l,
        staff_id: a.staffId,
        staff_name: a.name,
      });
    return { ok: true };
  });

// ---------- Workflows ----------

function cleanSteps(raw: unknown): WorkflowStep[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => ({
      department: String((s as WorkflowStep)?.department ?? "").toUpperCase(),
      action: String((s as WorkflowStep)?.action ?? "")
        .trim()
        .slice(0, 300),
      hours: Math.max(1, Math.min(720, Math.round(Number((s as WorkflowStep)?.hours) || 24))),
    }))
    .filter((s) => s.department && s.action)
    .slice(0, 20);
}

export const listWorkflows = createServerFn({ method: "GET" }).handler(async () => {
  const { a, db } = await ctx();
  const { data: workflows } = await db.from("ops_workflows").select("*").order("created_at");
  let runQ = db
    .from("ops_workflow_runs")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(200);
  if (!a.superAdmin) runQ = runQ.or(`current_department.eq.${a.department},status.eq.COMPLETED`);
  const { data: runs } = await runQ;
  const visibleRuns = (runs ?? []).filter(
    (r) =>
      a.superAdmin ||
      r.status === "ACTIVE" ||
      (r.history as HistoryItem[]).some((h) => h.by === a.name),
  );
  return {
    workflows: workflows ?? [],
    runs: visibleRuns,
    canConfigure: a.superAdmin,
    department: a.department,
    superAdmin: a.superAdmin,
  };
});

export const saveWorkflow = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      id?: string;
      name: string;
      trigger_category?: string;
      steps: WorkflowStep[];
      active?: boolean;
    }) => {
      const name = String(d?.name ?? "")
        .trim()
        .slice(0, 120);
      const steps = cleanSteps(d?.steps);
      if (!name || steps.length === 0) throw new Error("Name and at least one step required");
      return {
        id: d?.id ? String(d.id) : undefined,
        name,
        trigger_category: d?.trigger_category
          ? String(d.trigger_category).trim().slice(0, 60)
          : null,
        steps,
        active: d?.active !== false,
      };
    },
  )
  .handler(async ({ data }) => {
    const { requireSuperAdmin, adminClient } = await import("./console.server");
    const a = await requireSuperAdmin();
    const db = await adminClient();
    const row = {
      name: data.name,
      trigger_category: data.trigger_category,
      steps: data.steps,
      active: data.active,
      updated_at: new Date().toISOString(),
    };
    if (data.id) await db.from("ops_workflows").update(row).eq("id", data.id);
    else await db.from("ops_workflows").insert({ ...row, created_by: a.name });
    return { ok: true };
  });

/** Matching active workflows for a ticket category (system suggests, a person starts it). */
export const suggestWorkflows = createServerFn({ method: "POST" })
  .inputValidator((d: { category: string }) => ({
    category: String(d?.category ?? "").toLowerCase(),
  }))
  .handler(async ({ data }) => {
    const { db } = await ctx();
    const { data: wfs } = await db
      .from("ops_workflows")
      .select("id, name, trigger_category")
      .eq("active", true);
    return (wfs ?? []).filter(
      (w) => !w.trigger_category || w.trigger_category.toLowerCase() === data.category,
    );
  });

export const startWorkflow = createServerFn({ method: "POST" })
  .inputValidator((d: { workflowId: string; ticketId?: string; caseId?: string }) => ({
    workflowId: String(d.workflowId),
    ticketId: d.ticketId ? String(d.ticketId) : null,
    caseId: d.caseId ? String(d.caseId) : null,
  }))
  .handler(async ({ data }) => {
    const { a, db } = await ctx();
    const { data: wf } = await db
      .from("ops_workflows")
      .select("*")
      .eq("id", data.workflowId)
      .eq("active", true)
      .maybeSingle();
    if (!wf) throw new Error("Workflow not found");
    if (data.caseId) {
      const { data: c } = await db
        .from("ops_cases")
        .select("id, departments, staff_ids, created_by")
        .eq("id", data.caseId)
        .maybeSingle();
      if (!c || !canSeeCase(a, c)) throw new Error("FORBIDDEN");
    }
    const steps = cleanSteps(wf.steps);
    const first = steps[0]!;
    const now = new Date();
    const history: HistoryItem[] = [
      { at: now.toISOString(), by: a.name, step: 0, event: "STARTED" },
    ];
    const { data: run, error } = await db
      .from("ops_workflow_runs")
      .insert({
        workflow_id: wf.id,
        workflow_name: wf.name,
        ticket_id: data.ticketId,
        case_id: data.caseId,
        current_department: first.department,
        due_at: new Date(now.getTime() + first.hours * 3600_000).toISOString(),
        history,
        started_by: a.name,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await db.from("staff_notifications").insert({
      department: first.department,
      type: "WORKFLOW",
      title: `${wf.name}: ${first.action}`,
      body: `Due in ${first.hours}h · started by ${a.name}`,
      link: "/console/cases",
    });
    if (data.caseId) await logEvent(db, data.caseId, "ACTION", `Workflow started: ${wf.name}`, a);
    return run;
  });

export const advanceWorkflow = createServerFn({ method: "POST" })
  .inputValidator((d: { runId: string; note?: string | undefined; escalate?: boolean }) => ({
    runId: String(d.runId),
    note: d.note ? String(d.note).slice(0, 2000) : undefined,
    escalate: Boolean(d.escalate),
  }))
  .handler(async ({ data }) => {
    const { a, db } = await ctx();
    const { data: run } = await db
      .from("ops_workflow_runs")
      .select("*")
      .eq("id", data.runId)
      .maybeSingle();
    if (!run || run.status !== "ACTIVE") throw new Error("Workflow not active");
    // Only the department owning the current step (or the CEO) can act on it.
    if (
      !a.superAdmin &&
      run.current_department !== a.department &&
      !a.extraDepartments.includes(run.current_department ?? "")
    )
      throw new Error("FORBIDDEN_DEPARTMENT");
    const { data: wf } = await db
      .from("ops_workflows")
      .select("steps")
      .eq("id", run.workflow_id)
      .maybeSingle();
    const steps = cleanSteps(wf?.steps);
    const history = [...((run.history as HistoryItem[]) ?? [])];
    const now = new Date();

    if (data.escalate) {
      history.push({
        at: now.toISOString(),
        by: a.name,
        step: run.step_index,
        event: "ESCALATED",
        note: data.note,
      });
      await db
        .from("ops_workflow_runs")
        .update({ history, updated_at: now.toISOString() })
        .eq("id", run.id);
      await db.from("staff_notifications").insert({
        department: "SUPER_ADMIN",
        type: "ESCALATION",
        title: `Workflow escalated: ${run.workflow_name}`,
        body: data.note ?? `Step ${run.step_index + 1} needs attention`,
        link: "/console/cases",
      });
      return { ok: true };
    }

    history.push({
      at: now.toISOString(),
      by: a.name,
      step: run.step_index,
      event: "STEP_DONE",
      note: data.note,
    });
    const nextIndex = run.step_index + 1;
    const next = steps[nextIndex];
    if (!next) {
      history.push({ at: now.toISOString(), by: a.name, step: run.step_index, event: "COMPLETED" });
      await db
        .from("ops_workflow_runs")
        .update({
          status: "COMPLETED",
          history,
          current_department: null,
          due_at: null,
          updated_at: now.toISOString(),
        })
        .eq("id", run.id);
    } else {
      await db
        .from("ops_workflow_runs")
        .update({
          step_index: nextIndex,
          current_department: next.department,
          due_at: new Date(now.getTime() + next.hours * 3600_000).toISOString(),
          history,
          updated_at: now.toISOString(),
        })
        .eq("id", run.id);
      await db.from("staff_notifications").insert({
        department: next.department,
        type: "WORKFLOW",
        title: `${run.workflow_name}: ${next.action}`,
        body: `Handed over by ${a.name}${data.note ? ` — ${data.note}` : ""}`,
        link: "/console/cases",
      });
    }
    if (run.case_id)
      await logEvent(
        db,
        run.case_id,
        "ACTION",
        `Workflow "${run.workflow_name}" step ${run.step_index + 1} done${data.note ? `: ${data.note}` : ""}`,
        a,
      );
    return { ok: true };
  });
