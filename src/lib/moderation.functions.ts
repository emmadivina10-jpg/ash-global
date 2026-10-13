import { createServerFn } from "@tanstack/react-start";

export type ModerationReport = {
  id: string;
  target_type: string;
  target_id: string | null;
  target_user_id: string | null;
  reason: string;
  details: string | null;
  status: string;
  resolution_note: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export type MediaModerationCase = {
  id: string;
  user_id: string;
  member_name: string;
  content_type: string;
  original_name: string | null;
  media_type: string;
  verdict: string;
  confidence: number | null;
  reason: string;
  status: string;
  review_note: string | null;
  created_at: string;
};

/** Trust & Safety queue: every user report filed from the apps. */
export const listReports = createServerFn({ method: "POST" })
  .inputValidator((data: { status?: string }) => ({
    status: String(data?.status ?? "OPEN").toUpperCase(),
  }))
  .handler(async ({ data }) => {
    const { requireDepartment, adminClient } = await import("./console.server");
    await requireDepartment("TRUST", "SUPPORT");
    const db = await adminClient();

    let query = db
      .from("content_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status !== "ALL") query = query.eq("status", data.status);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const { count: openCount } = await db
      .from("content_reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "OPEN");
    const { count: blocks } = await db
      .from("user_blocks")
      .select("id", { count: "exact", head: true });

    return {
      reports: (rows ?? []) as ModerationReport[],
      openCount: openCount ?? 0,
      blocks: blocks ?? 0,
    };
  });

/** Resolve a report. Trust department (or super admin) only. */
export const resolveReport = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; status: string; note?: string }) => ({
    id: String(data?.id ?? ""),
    status: String(data?.status ?? "").toUpperCase(),
    note: data?.note ? String(data.note) : null,
  }))
  .handler(async ({ data }) => {
    const { requireDepartment, adminClient } = await import("./console.server");
    await requireDepartment("TRUST", "SUPPORT");
    if (!data.id) throw new Error("MISSING_ID");
    if (!["OPEN", "REVIEWING", "ACTIONED", "DISMISSED"].includes(data.status))
      throw new Error("BAD_STATUS");

    const db = await adminClient();
    const { error } = await db
      .from("content_reports")
      .update({
        status: data.status,
        resolution_note: data.note,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Private automated-media queue for Trust & Safety and the CEO. */
export const listMediaModerationCases = createServerFn({ method: "GET" }).handler(async () => {
  const { requireDepartment, adminClient } = await import("./console.server");
  await requireDepartment("TRUST");
  const db = await adminClient();
  const { data: cases, error } = await db
    .from("moderation_cases")
    .select(
      "id, user_id, content_type, original_name, media_type, verdict, confidence, reason, status, review_note, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);

  const userIds = Array.from(new Set((cases ?? []).map((item) => item.user_id)));
  const { data: profiles } = userIds.length
    ? await db.from("profiles").select("user_id, full_name").in("user_id", userIds)
    : { data: [] };
  const names = new Map(
    (profiles ?? []).map((profile) => [profile.user_id, profile.full_name || "ASH member"]),
  );

  return (cases ?? []).map((item) => ({
    ...item,
    confidence: item.confidence === null ? null : Number(item.confidence),
    member_name: names.get(item.user_id) ?? "ASH member",
  })) as MediaModerationCase[];
});

/** Human decision. Only the CEO can restore a restricted member. */
export const reviewMediaModerationCase = createServerFn({ method: "POST" })
  .inputValidator((data: { caseId: string; decision: "UPHELD" | "CLEARED"; note: string }) => ({
    caseId: String(data?.caseId ?? ""),
    decision: data?.decision,
    note: String(data?.note ?? "")
      .trim()
      .slice(0, 1000),
  }))
  .handler(async ({ data }) => {
    const { requireDepartment, requireSuperAdmin, adminClient } = await import("./console.server");
    const actor =
      data.decision === "CLEARED" ? await requireSuperAdmin() : await requireDepartment("TRUST");
    if (!data.caseId || !["UPHELD", "CLEARED"].includes(data.decision))
      throw new Error("INVALID_DECISION");
    const db = await adminClient();
    const { error } = await db.rpc("review_media_moderation", {
      _case_id: data.caseId,
      _decision: data.decision,
      _reviewed_by: `${actor.name} (${actor.department})`,
      _note: data.note,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Safe, allow-listed cleanup before a release. Financial and business records are untouched. */
export const runReleaseCleanup = createServerFn({ method: "POST" }).handler(async () => {
  const { requireSuperAdmin, adminClient } = await import("./console.server");
  const actor = await requireSuperAdmin();
  const db = await adminClient();
  const { data, error } = await db.rpc("release_housekeeping");
  if (error) throw new Error(error.message);
  await db.from("admin_audit_log").insert({
    actor: actor.name,
    action: "RELEASE_HOUSEKEEPING",
    reason: "Pre-release cache and expired-content cleanup",
    metadata: data ?? {},
  });
  return data as {
    rate_limit_rows: number;
    old_security_events: number;
    expired_story_views: number;
    expired_stories: number;
  };
});
