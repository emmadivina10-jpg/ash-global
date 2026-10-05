import { createServerFn } from "@tanstack/react-start";

export const LEAD_STAGES = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "DEMO",
  "REGISTERED",
  "PAID",
  "LOST",
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number];

export type Lead = {
  id: string;
  name: string;
  lead_type: string;
  category: string | null;
  city: string | null;
  country: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  source: string | null;
  notes: string | null;
  department: string;
  stage: string;
  value: number;
  next_follow_up: string | null;
  last_contacted_at: string | null;
  created_at: string;
};

/** CEO/elevated, own department, granted extra departments, or Operations→Merchant. */
function canUseDept(
  actor: { superAdmin: boolean; elevated: boolean; department: string; extraDepartments: string[] },
  dept: string,
) {
  return (
    actor.superAdmin ||
    actor.elevated ||
    actor.department === dept ||
    actor.extraDepartments.includes(dept) ||
    (actor.department === "OPERATIONS" && dept === "MERCHANT")
  );
}

function todayStart() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Department work board: targets, today's progress, pipeline and lead queue. */
export const getWorkBoard = createServerFn({ method: "POST" })
  .inputValidator((data: { department?: string }) => ({
    department: String(data?.department ?? "").toUpperCase(),
  }))
  .handler(async ({ data }) => {
    const { requireConsole, adminClient } = await import("./console.server");
    const actor = await requireConsole();
    // Only the CEO (super admin) may read another department's board.
    // Exception: the merchant board is nested inside Operations — the
    // Operations seat manages MERCHANT leads with the same login.
    const requested = data.department || actor.department;
    const department = canUseDept(actor, requested) ? requested : actor.department;
    const db = await adminClient();
    const since = todayStart();

    const [leads, activityToday, targets, board] = await Promise.all([
      db
        .from("leads")
        .select("*")
        .eq("department", department)
        .order("stage", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(200),
      db
        .from("lead_activities")
        .select("kind, stage_to, staff_name")
        .gte("created_at", since)
        .limit(1000),
      actor.staffId
        ? db
            .from("staff_targets")
            .select("*")
            .eq("staff_id", actor.staffId)
            .eq("period", "DAILY")
            .maybeSingle()
        : Promise.resolve({ data: null }),
      db.from("leads").select("stage").eq("department", department).limit(2000),
    ]);

    const pipeline: Record<string, number> = {};
    for (const stage of LEAD_STAGES) pipeline[stage] = 0;
    for (const row of board.data ?? []) pipeline[row.stage] = (pipeline[row.stage] ?? 0) + 1;

    const mine = (activityToday.data ?? []).filter((a) => a.staff_name === actor.name);
    const leaderboard = new Map<string, number>();
    for (const a of activityToday.data ?? []) {
      leaderboard.set(a.staff_name, (leaderboard.get(a.staff_name) ?? 0) + 1);
    }

    return {
      actor,
      department,
      canWrite: canUseDept(actor, department),
      leads: (leads.data ?? []) as Lead[],
      pipeline,
      today: {
        contacts: mine.filter((a) => a.kind === "CONTACT").length,
        recruits: mine.filter((a) => a.stage_to === "REGISTERED").length,
        deals: mine.filter((a) => a.stage_to === "PAID").length,
        activities: mine.length,
      },
      targets: targets.data ?? null,
      leaderboard: [...leaderboard.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
    };
  });

export const saveLead = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id?: string;
      name: string;
      leadType: string;
      department: string;
      category?: string;
      city?: string;
      country?: string;
      phone?: string;
      whatsapp?: string;
      email?: string;
      source?: string;
      notes?: string;
      value?: number;
      nextFollowUp?: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const { requireConsole, adminClient } = await import("./console.server");
    const actor = await requireConsole();
    const targetDept = String(data.department).toUpperCase();
    if (!canUseDept(actor, targetDept)) {
      return { ok: false as const, error: "You can only manage leads for your department." };
    }
    const name = String(data.name ?? "").trim().slice(0, 160);
    if (!name) return { ok: false as const, error: "Lead name is required." };

    const row = {
      name,
      lead_type: String(data.leadType ?? "BUSINESS").toUpperCase().slice(0, 30),
      department: String(data.department ?? actor.department).toUpperCase(),
      category: data.category?.slice(0, 80) || null,
      city: data.city?.slice(0, 80) || null,
      country: (data.country || "CM").toUpperCase().slice(0, 2),
      phone: data.phone?.slice(0, 40) || null,
      whatsapp: data.whatsapp?.slice(0, 40) || null,
      email: data.email?.trim().toLowerCase().slice(0, 200) || null,
      source: data.source?.slice(0, 80) || null,
      notes: data.notes?.slice(0, 2000) || null,
      value: Math.max(0, Number(data.value ?? 0) | 0),
      next_follow_up: data.nextFollowUp || null,
      assigned_to: actor.staffId,
      created_by: actor.staffId,
      updated_at: new Date().toISOString(),
    };

    const db = await adminClient();
    const { error } = data.id
      ? await db.from("leads").update(row).eq("id", data.id)
      : await db.from("leads").insert(row);
    return error ? { ok: false as const, error: error.message } : { ok: true as const };
  });

export const moveLeadStage = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; stage: LeadStage; note?: string }) => data)
  .handler(async ({ data }) => {
    const { requireConsole, adminClient } = await import("./console.server");
    const actor = await requireConsole();
    if (!(LEAD_STAGES as readonly string[]).includes(data.stage)) {
      return { ok: false as const, error: "Unknown stage." };
    }
    const db = await adminClient();
    const { data: lead } = await db.from("leads").select("stage, department").eq("id", data.id).maybeSingle();
    if (!lead) return { ok: false as const, error: "Lead not found." };
    if (!canUseDept(actor, lead.department)) {
      return { ok: false as const, error: "You can only manage leads for your department." };
    }

    await db
      .from("leads")
      .update({
        stage: data.stage,
        last_contacted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    await db.from("lead_activities").insert({
      lead_id: data.id,
      staff_id: actor.staffId,
      staff_name: actor.name,
      kind: "STAGE",
      body: data.note?.slice(0, 2000) || null,
      stage_from: lead.stage,
      stage_to: data.stage,
    });
    return { ok: true as const };
  });

export const logLeadActivity = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; kind: string; body?: string }) => data)
  .handler(async ({ data }) => {
    const { requireConsole, adminClient } = await import("./console.server");
    const actor = await requireConsole();
    const db = await adminClient();
    await db.from("lead_activities").insert({
      lead_id: data.id,
      staff_id: actor.staffId,
      staff_name: actor.name,
      kind: String(data.kind ?? "NOTE").toUpperCase().slice(0, 20),
      body: data.body?.slice(0, 2000) || null,
    });
    await db
      .from("leads")
      .update({ last_contacted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", data.id);
    return { ok: true as const };
  });

export const getLeadActivities = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data }) => {
    const { requireConsole, adminClient } = await import("./console.server");
    await requireConsole();
    const db = await adminClient();
    const { data: rows } = await db
      .from("lead_activities")
      .select("id, kind, body, stage_from, stage_to, staff_name, created_at")
      .eq("lead_id", data.id)
      .order("created_at", { ascending: false })
      .limit(40);
    return rows ?? [];
  });

/** Marketplace health: what operations agents work on every morning. */
export const getMarketplaceHealth = createServerFn({ method: "GET" }).handler(async () => {
  const { requireDepartment, adminClient } = await import("./console.server");
  await requireDepartment("MARKETPLACE_OPS");
  const db = await adminClient();
  const since = new Date(Date.now() - 7 * 864e5).toISOString();

  const [newProviders, unverified, noServices, recentBookings, failed, providers] = await Promise.all([
    db.from("provider_profiles").select("id", { count: "exact", head: true }).gte("created_at", since),
    db
      .from("provider_profiles")
      .select("id, business_name, city, created_at, verification_status")
      .eq("is_verified", false)
      .order("created_at", { ascending: false })
      .limit(25),
    db.from("provider_services").select("provider_id").limit(4000),
    db.from("bookings").select("id", { count: "exact", head: true }).gte("created_at", since),
    db
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .in("status", ["CANCELLED", "DECLINED", "PAYMENT_FAILED", "PAYMENT_EXPIRED", "DISPUTED"])
      .gte("created_at", since),
    db
      .from("provider_profiles")
      .select("id, business_name, city, is_live, completed_bookings, rating_avg, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const withServices = new Set((noServices.data ?? []).map((s) => s.provider_id));
  return {
    newProviders7d: newProviders.count ?? 0,
    bookings7d: recentBookings.count ?? 0,
    failed7d: failed.count ?? 0,
    unverified: unverified.data ?? [],
    emptyStorefronts: (providers.data ?? []).filter((p) => !withServices.has(p.id)).slice(0, 25),
    zeroBookings: (providers.data ?? []).filter((p) => p.completed_bookings === 0).slice(0, 25),
  };
});

/** Revenue intelligence: GMV, ASH revenue and where it comes from. */
export const getRevenueIntel = createServerFn({ method: "GET" }).handler(async () => {
  const { requireDepartment, adminClient } = await import("./console.server");
  await requireDepartment("REVENUE");
  const db = await adminClient();
  const since = new Date(Date.now() - 30 * 864e5).toISOString();

  const [bookings, links, activations, payouts] = await Promise.all([
    db.from("bookings").select("price, platform_fee, paid_at, status").not("paid_at", "is", null).limit(5000),
    db.from("payment_link_charges").select("amount, platform_fee, paid_at, status").eq("status", "PAID").limit(5000),
    db.from("activations").select("amount, paid_at, status").eq("status", "PAID").limit(5000),
    db.from("platform_payouts").select("amount").limit(1000),
  ]);

  const recent = (rows: { paid_at: string | null }[]) => rows.filter((r) => r.paid_at && r.paid_at >= since);
  const sum = (rows: any[], key: string) => rows.reduce((total, r) => total + Number(r[key] ?? 0), 0);

  const bookingRows = bookings.data ?? [];
  const linkRows = links.data ?? [];
  const activationRows = activations.data ?? [];

  return {
    gmvAllTime: sum(bookingRows, "price") + sum(linkRows, "amount"),
    gmv30d: sum(recent(bookingRows), "price") + sum(recent(linkRows), "amount"),
    commissionAllTime: sum(bookingRows, "platform_fee") + sum(linkRows, "platform_fee"),
    commission30d: sum(recent(bookingRows), "platform_fee") + sum(recent(linkRows), "platform_fee"),
    activationsRevenue: sum(activationRows, "amount"),
    paidBookings: bookingRows.length,
    paidLinks: linkRows.length,
    payoutsTaken: sum(payouts.data ?? [], "amount"),
  };
});
