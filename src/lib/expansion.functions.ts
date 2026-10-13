import { createServerFn } from "@tanstack/react-start";

export const EXPANSION_STAGES = [
  ["NEW", "New Opportunity"],
  ["RESEARCH", "Market Research"],
  ["QUALIFIED", "Qualified"],
  ["PROPOSAL", "Proposal Prepared"],
  ["REVIEW", "Management Review"],
  ["APPROVED", "Approved"],
  ["LAUNCH_PREP", "Launch Preparation"],
  ["LAUNCHED", "Launched"],
  ["MONITORING", "Monitoring"],
  ["CLOSED", "Completed / Paused"],
] as const;
const STAGE_KEYS = EXPANSION_STAGES.map(([k]) => k) as string[];
export const SUPPORT_DEPARTMENTS = [
  "ADVERTISING",
  "SALES",
  "OPERATIONS",
  "MARKETPLACE_OPS",
  "REVENUE",
  "TRUST",
  "CYBERSECURITY",
  "SUPER_ADMIN",
] as const;

export type ExpansionOpportunity = {
  id: string;
  name: string;
  market: string;
  category: string | null;
  potential_partners: string | null;
  estimated_size: string | null;
  research_notes: string | null;
  competition: string | null;
  risks: string | null;
  required_resources: string | null;
  launch_requirements: string | null;
  assigned_departments: string[];
  priority: string;
  target_launch_date: string | null;
  stage: string;
  created_by_name: string | null;
  submitted_to_ceo_at: string | null;
  created_at: string;
  updated_at: string;
};

const s = (v: unknown, n = 2000) => {
  const t = String(v ?? "")
    .trim()
    .slice(0, n);
  return t || null;
};

async function ctx() {
  const { requireDepartment, adminClient } = await import("./console.server");
  const actor = await requireDepartment("EXPANSION");
  return { actor, db: await adminClient() };
}

export const getExpansionBoard = createServerFn({ method: "GET" }).handler(async () => {
  const { actor, db } = await ctx();
  const [opps, tasks] = await Promise.all([
    db
      .from("expansion_opportunities")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(300),
    db
      .from("department_tasks")
      .select(
        "id, department, title, detail, due_date, status, priority, progress, expansion_opportunity_id, completed_at",
      )
      .or("department.eq.EXPANSION,expansion_opportunity_id.not.is.null")
      .order("due_date", { ascending: true })
      .limit(300),
  ]);
  if (opps.error || tasks.error) throw new Error("Expansion data could not be loaded.");
  const o = (opps.data ?? []) as ExpansionOpportunity[];
  const t = tasks.data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const active = o.filter((x) => !["CLOSED", "NEW"].includes(x.stage)).length;
  const metrics = {
    activeProjects: active,
    underResearch: o.filter((x) => x.stage === "RESEARCH").length,
    approved: o.filter((x) =>
      ["APPROVED", "LAUNCH_PREP", "LAUNCHED", "MONITORING"].includes(x.stage),
    ).length,
    pendingApprovals: o.filter((x) => x.stage === "REVIEW").length,
    openTasks: t.filter((x) => x.status !== "DONE").length,
    overdueTasks: t.filter((x) => x.status !== "DONE" && x.due_date < today).length,
    total: o.length,
  };
  return {
    actor: { name: actor.name, superAdmin: actor.superAdmin },
    opportunities: o,
    tasks: t,
    metrics,
  };
});

export const getOpportunityHistory = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => ({ id: String(d?.id ?? "") }))
  .handler(async ({ data }) => {
    const { db } = await ctx();
    const { data: rows } = await db
      .from("expansion_opportunity_events")
      .select("id, kind, body, actor_name, created_at")
      .eq("opportunity_id", data.id)
      .order("created_at", { ascending: false })
      .limit(200);
    return rows ?? [];
  });

export const saveOpportunity = createServerFn({ method: "POST" })
  .inputValidator((d: Partial<ExpansionOpportunity>) => ({
    id: s(d?.id, 64),
    name: s(d?.name, 160),
    market: s(d?.market, 160),
    category: s(d?.category, 120),
    potential_partners: s(d?.potential_partners),
    estimated_size: s(d?.estimated_size, 200),
    research_notes: s(d?.research_notes, 6000),
    competition: s(d?.competition),
    risks: s(d?.risks),
    required_resources: s(d?.required_resources),
    launch_requirements: s(d?.launch_requirements),
    assigned_departments: (Array.isArray(d?.assigned_departments) ? d.assigned_departments : [])
      .map((x) => String(x).toUpperCase())
      .filter((x) => (SUPPORT_DEPARTMENTS as readonly string[]).includes(x) || x === "EXPANSION"),
    priority: ["LOW", "NORMAL", "HIGH"].includes(String(d?.priority).toUpperCase())
      ? String(d?.priority).toUpperCase()
      : "NORMAL",
    target_launch_date: /^\d{4}-\d{2}-\d{2}$/.test(String(d?.target_launch_date ?? ""))
      ? String(d?.target_launch_date)
      : null,
  }))
  .handler(async ({ data }) => {
    const { actor, db } = await ctx();
    if (!data.name || !data.market)
      return { ok: false as const, error: "Name and market are required." };
    const { id, ...rest } = data;
    const fields = { ...rest, name: rest.name as string, market: rest.market as string };
    if (id) {
      const { error } = await db.from("expansion_opportunities").update(fields).eq("id", id);
      if (error) return { ok: false as const, error: "Could not save." };
      await db
        .from("expansion_opportunity_events")
        .insert({
          opportunity_id: id,
          kind: "EDITED",
          body: "Details updated",
          actor_name: actor.name,
          actor_staff_id: actor.staffId,
        });
      return { ok: true as const, id };
    }
    const { data: row, error } = await db
      .from("expansion_opportunities")
      .insert({ ...fields, created_by_staff_id: actor.staffId, created_by_name: actor.name })
      .select("id")
      .single();
    if (error || !row) return { ok: false as const, error: "Could not create." };
    await db
      .from("expansion_opportunity_events")
      .insert({
        opportunity_id: row.id,
        kind: "CREATED",
        body: `Opportunity created: ${data.name}`,
        actor_name: actor.name,
        actor_staff_id: actor.staffId,
      });
    return { ok: true as const, id: row.id };
  });

export const moveOpportunityStage = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; stage: string; note?: string }) => ({
    id: String(d?.id ?? ""),
    stage: String(d?.stage ?? "").toUpperCase(),
    note: s(d?.note, 1000),
  }))
  .handler(async ({ data }) => {
    const { actor, db } = await ctx();
    if (!STAGE_KEYS.includes(data.stage)) return { ok: false as const, error: "Invalid stage." };
    // Approval is a CEO decision; Expansion can only submit for review.
    if (data.stage === "APPROVED" && !actor.superAdmin)
      return { ok: false as const, error: "Only the CEO can approve an expansion." };
    const { error } = await db
      .from("expansion_opportunities")
      .update({ stage: data.stage })
      .eq("id", data.id);
    if (error) return { ok: false as const, error: "Could not move." };
    const label = EXPANSION_STAGES.find(([k]) => k === data.stage)?.[1];
    await db
      .from("expansion_opportunity_events")
      .insert({
        opportunity_id: data.id,
        kind: "STAGE",
        body: `Moved to ${label}${data.note ? ` — ${data.note}` : ""}`,
        actor_name: actor.name,
        actor_staff_id: actor.staffId,
      });
    return { ok: true as const };
  });

export const addOpportunityNote = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; body: string }) => ({
    id: String(d?.id ?? ""),
    body: s(d?.body, 3000),
  }))
  .handler(async ({ data }) => {
    const { actor, db } = await ctx();
    if (!data.body) return { ok: false as const };
    await db
      .from("expansion_opportunity_events")
      .insert({
        opportunity_id: data.id,
        kind: "NOTE",
        body: data.body,
        actor_name: actor.name,
        actor_staff_id: actor.staffId,
      });
    return { ok: true as const };
  });

export const createExpansionTask = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      opportunityId?: string;
      department?: string;
      title: string;
      detail?: string;
      dueDate?: string;
      priority?: string;
    }) => ({
      opportunityId: s(d?.opportunityId, 64),
      department: String(d?.department ?? "EXPANSION").toUpperCase(),
      title: s(d?.title, 160),
      detail: s(d?.detail, 1200),
      dueDate: /^\d{4}-\d{2}-\d{2}$/.test(String(d?.dueDate ?? ""))
        ? String(d?.dueDate)
        : new Date().toISOString().slice(0, 10),
      priority: ["LOW", "NORMAL", "HIGH"].includes(String(d?.priority).toUpperCase())
        ? String(d?.priority).toUpperCase()
        : "NORMAL",
    }),
  )
  .handler(async ({ data }) => {
    const { actor, db } = await ctx();
    if (!data.title) return { ok: false as const, error: "Title required." };
    if (
      data.department !== "EXPANSION" &&
      !(SUPPORT_DEPARTMENTS as readonly string[]).includes(data.department)
    )
      return { ok: false as const, error: "Invalid department." };
    const { error } = await db.from("department_tasks").insert({
      department: data.department,
      title: data.title,
      detail: data.detail,
      due_date: data.dueDate,
      priority: data.priority,
      status: "OPEN",
      source: "EXPANSION",
      created_by: actor.name,
      expansion_opportunity_id: data.opportunityId,
    });
    if (error)
      return {
        ok: false as const,
        error:
          error.code === "23505"
            ? "A task with this title already exists for that day."
            : "Could not create task.",
      };
    if (data.department !== "EXPANSION") {
      await db
        .from("staff_notifications")
        .insert({
          department: data.department,
          type: "SUPPORT_REQUEST",
          title: `Expansion support request: ${data.title}`,
          body: `From ${actor.name}`,
          link: "/console/workspace",
        });
    }
    if (data.opportunityId) {
      await db
        .from("expansion_opportunity_events")
        .insert({
          opportunity_id: data.opportunityId,
          kind: "TASK",
          body: `Task for ${data.department}: ${data.title}`,
          actor_name: actor.name,
          actor_staff_id: actor.staffId,
        });
    }
    return { ok: true as const };
  });

export const submitOpportunityToCeo = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; kind: string; message?: string }) => ({
    id: String(d?.id ?? ""),
    kind: s(d?.kind, 60) ?? "Expansion proposal",
    message: s(d?.message, 2000),
  }))
  .handler(async ({ data }) => {
    const { actor, db } = await ctx();
    const { data: opp } = await db
      .from("expansion_opportunities")
      .select("id, name, market, stage")
      .eq("id", data.id)
      .maybeSingle();
    if (!opp) return { ok: false as const, error: "Not found." };
    const now = new Date().toISOString();
    await db
      .from("expansion_opportunities")
      .update({
        submitted_to_ceo_at: now,
        stage: ["NEW", "RESEARCH", "QUALIFIED", "PROPOSAL"].includes(opp.stage)
          ? "REVIEW"
          : opp.stage,
      })
      .eq("id", opp.id);
    await db
      .from("staff_notifications")
      .insert({
        department: "SUPER_ADMIN",
        type: "CEO_SUBMISSION",
        title: `${data.kind}: ${opp.name} (${opp.market})`,
        body: data.message ?? `Submitted by ${actor.name}`,
        link: "/console/expansion",
      });
    await db
      .from("department_tasks")
      .insert({
        department: "SUPER_ADMIN",
        title: `Review ${data.kind.toLowerCase()}: ${opp.name}`.slice(0, 160),
        detail: data.message,
        due_date: now.slice(0, 10),
        priority: "HIGH",
        status: "OPEN",
        source: "EXPANSION",
        created_by: actor.name,
        expansion_opportunity_id: opp.id,
      });
    await db
      .from("expansion_opportunity_events")
      .insert({
        opportunity_id: opp.id,
        kind: "SUBMITTED",
        body: `Submitted to CEO as ${data.kind}${data.message ? ` — ${data.message}` : ""}`,
        actor_name: actor.name,
        actor_staff_id: actor.staffId,
      });
    return { ok: true as const };
  });

// ---- Market Research Center ----

export type ExpansionResearch = {
  id: string;
  opportunity_id: string;
  title: string;
  market_size: string | null;
  demand: string | null;
  competition_level: string;
  competition_detail: string | null;
  entry_barriers: string | null;
  regulations: string | null;
  customer_segments: string | null;
  pricing_insights: string | null;
  sources: string | null;
  findings: string | null;
  recommendation: string | null;
  status: string;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
};

export const getOpportunityResearch = createServerFn({ method: "POST" })
  .inputValidator((d: { opportunityId: string }) => ({
    opportunityId: String(d?.opportunityId ?? ""),
  }))
  .handler(async ({ data }) => {
    const { db } = await ctx();
    const { data: rows, error } = await db
      .from("expansion_research")
      .select("*")
      .eq("opportunity_id", data.opportunityId)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error("Research could not be loaded.");
    return (rows ?? []) as ExpansionResearch[];
  });

export const saveResearchReport = createServerFn({ method: "POST" })
  .inputValidator((d: Partial<ExpansionResearch>) => ({
    id: s(d?.id, 64),
    opportunity_id: String(d?.opportunity_id ?? ""),
    title: s(d?.title, 160),
    market_size: s(d?.market_size, 400),
    demand: s(d?.demand),
    competition_level: ["LOW", "MEDIUM", "HIGH", "UNKNOWN"].includes(
      String(d?.competition_level).toUpperCase(),
    )
      ? String(d?.competition_level).toUpperCase()
      : "UNKNOWN",
    competition_detail: s(d?.competition_detail),
    entry_barriers: s(d?.entry_barriers),
    regulations: s(d?.regulations),
    customer_segments: s(d?.customer_segments),
    pricing_insights: s(d?.pricing_insights),
    sources: s(d?.sources),
    findings: s(d?.findings, 6000),
    recommendation: s(d?.recommendation, 3000),
  }))
  .handler(async ({ data }) => {
    const { actor, db } = await ctx();
    if (!data.title || !data.opportunity_id)
      return { ok: false as const, error: "A title is required." };
    const { id, ...rest } = data;
    const fields = { ...rest, title: rest.title as string };
    if (id) {
      const { error } = await db.from("expansion_research").update(fields).eq("id", id);
      if (error) return { ok: false as const, error: "Could not save." };
      await db
        .from("expansion_opportunity_events")
        .insert({
          opportunity_id: data.opportunity_id,
          kind: "RESEARCH",
          body: `Research updated: ${data.title}`,
          actor_name: actor.name,
          actor_staff_id: actor.staffId,
        });
      return { ok: true as const, id };
    }
    const { data: row, error } = await db
      .from("expansion_research")
      .insert({
        ...fields,
        title: data.title,
        created_by_staff_id: actor.staffId,
        created_by_name: actor.name,
      })
      .select("id")
      .single();
    if (error || !row) return { ok: false as const, error: "Could not create." };
    await db
      .from("expansion_opportunity_events")
      .insert({
        opportunity_id: data.opportunity_id,
        kind: "RESEARCH",
        body: `Research added: ${data.title}`,
        actor_name: actor.name,
        actor_staff_id: actor.staffId,
      });
    return { ok: true as const, id: row.id };
  });

export const submitResearchToCeo = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; message?: string }) => ({
    id: String(d?.id ?? ""),
    message: s(d?.message, 2000),
  }))
  .handler(async ({ data }) => {
    const { actor, db } = await ctx();
    const { data: rep } = await db
      .from("expansion_research")
      .select("id, opportunity_id, title, status")
      .eq("id", data.id)
      .maybeSingle();
    if (!rep) return { ok: false as const, error: "Not found." };
    if (rep.status === "SUBMITTED")
      return { ok: false as const, error: "Already submitted to the CEO." };
    const { data: opp } = await db
      .from("expansion_opportunities")
      .select("id, name, market")
      .eq("id", rep.opportunity_id)
      .maybeSingle();
    const now = new Date().toISOString();
    await db.from("expansion_research").update({ status: "SUBMITTED" }).eq("id", rep.id);
    await db
      .from("staff_notifications")
      .insert({
        department: "SUPER_ADMIN",
        type: "CEO_SUBMISSION",
        title: `Market report: ${rep.title}${opp ? ` (${opp.market})` : ""}`,
        body: data.message ?? `Submitted by ${actor.name}`,
        link: "/console/expansion",
      });
    await db
      .from("department_tasks")
      .insert({
        department: "SUPER_ADMIN",
        title: `Review market report: ${rep.title}`.slice(0, 160),
        detail: data.message,
        due_date: now.slice(0, 10),
        priority: "HIGH",
        status: "OPEN",
        source: "EXPANSION",
        created_by: actor.name,
        expansion_opportunity_id: rep.opportunity_id,
      });
    await db
      .from("expansion_opportunity_events")
      .insert({
        opportunity_id: rep.opportunity_id,
        kind: "SUBMITTED",
        body: `Market report submitted to CEO: ${rep.title}${data.message ? ` — ${data.message}` : ""}`,
        actor_name: actor.name,
        actor_staff_id: actor.staffId,
      });
    return { ok: true as const };
  });
