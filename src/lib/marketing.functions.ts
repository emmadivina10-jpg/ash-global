import { createServerFn } from "@tanstack/react-start";

const MARKETING = ["ADVERTISING", "CONTENT", "GROWTH"] as const;

/** Real-record overview for the unified Advertising & Marketing command center. */
export const getMarketingOverview = createServerFn({ method: "GET" }).handler(async () => {
  const { requireConsole, adminClient } = await import("./console.server");
  const actor = await requireConsole();
  const allowed =
    actor.superAdmin ||
    actor.elevated ||
    (MARKETING as readonly string[]).includes(actor.department) ||
    actor.extraDepartments.some((d) => (MARKETING as readonly string[]).includes(d));
  if (!allowed) throw new Error("FORBIDDEN_DEPARTMENT");

  const db = await adminClient();
  const nowIso = new Date().toISOString();
  const [leads, promos, tasks] = await Promise.all([
    db
      .from("leads")
      .select("department, stage, lead_type, next_follow_up")
      .in("department", [...MARKETING])
      .limit(5000),
    db.from("promotions").select("status, starts_at, ends_at, impressions, clicks").limit(5000),
    db
      .from("department_tasks")
      .select("department, status")
      .in("department", [...MARKETING])
      .limit(5000),
  ]);

  const leadRows = leads.data ?? [];
  const promoRows = promos.data ?? [];
  const taskRows = tasks.data ?? [];
  const by = (d: string) => leadRows.filter((l) => l.department === d).length;
  const registered = leadRows.filter((l) => l.stage === "REGISTERED" || l.stage === "PAID");
  const active = promoRows.filter(
    (p) => String(p.status).toUpperCase() === "ACTIVE" && (!p.ends_at || p.ends_at > nowIso),
  );
  const impressions = promoRows.reduce((a, p) => a + (Number(p.impressions) || 0), 0);
  const clicks = promoRows.reduce((a, p) => a + (Number(p.clicks) || 0), 0);
  const openTasks = taskRows.filter(
    (t) => !["DONE", "COMPLETED", "CANCELLED"].includes(String(t.status).toUpperCase()),
  );

  return {
    hasData: leadRows.length + promoRows.length + taskRows.length > 0,
    activeCampaigns: active.length,
    totalCampaigns: promoRows.length,
    impressions,
    clicks,
    ctr: impressions > 0 ? Math.round((clicks / impressions) * 1000) / 10 : null,
    leads: {
      total: leadRows.length,
      advertising: by("ADVERTISING"),
      content: by("CONTENT"),
      growth: by("GROWTH"),
    },
    acquiredBusinesses: registered.filter((l) => l.lead_type === "BUSINESS").length,
    acquiredOther: registered.filter((l) => l.lead_type !== "BUSINESS").length,
    conversionRate:
      leadRows.length > 0 ? Math.round((registered.length / leadRows.length) * 1000) / 10 : null,
    followUpsDue: leadRows.filter(
      (l) => l.next_follow_up && l.next_follow_up <= nowIso && l.stage !== "LOST",
    ).length,
    openTasks: openTasks.length,
  };
});
