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

/** Trust & Safety queue: every user report filed from the apps. */
export const listReports = createServerFn({ method: "POST" })
  .inputValidator((data: { status?: string }) => ({ status: String(data?.status ?? "OPEN").toUpperCase() }))
  .handler(async ({ data }) => {
    const { requireConsole, adminClient } = await import("./console.server");
    await requireConsole();
    const db = await adminClient();

    let query = db.from("content_reports").select("*").order("created_at", { ascending: false }).limit(200);
    if (data.status !== "ALL") query = query.eq("status", data.status);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    const { count: openCount } = await db
      .from("content_reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "OPEN");
    const { count: blocks } = await db.from("user_blocks").select("id", { count: "exact", head: true });

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
    if (!["OPEN", "REVIEWING", "ACTIONED", "DISMISSED"].includes(data.status)) throw new Error("BAD_STATUS");

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
