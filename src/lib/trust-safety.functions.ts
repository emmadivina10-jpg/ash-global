import { createServerFn } from "@tanstack/react-start";

export type TSReport = {
  id: string;
  target_type: string;
  target_id: string | null;
  target_user_id: string | null;
  reporter_id: string;
  reporter_name: string;
  reported_name: string;
  content_preview: string | null;
  reason: string;
  details: string | null;
  status: string;
  action_taken: string | null;
  resolution_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  resolved_at: string | null;
};

export type TSContent = {
  id: string;
  kind: "POST" | "SPOTLIGHT" | "COMMENT" | "STORY";
  author_id: string;
  author_name: string;
  text: string | null;
  status: string;
  created_at: string;
};

export type TSMember = { user_id: string; name: string; until: string | null; reason: string | null };
export type TSEvent = { id: string; kind: string; actor_name: string; target_name: string; source: string; created_at: string };
export type TSActivity = { id: string; actor: string; action: string; reason: string | null; created_at: string };

const CONTENT_TABLE = { POST: "social_posts", SPOTLIGHT: "spotlight_posts", COMMENT: "post_comments", STORY: "stories" } as const;

/** Full Trust & Safety overview. Trust/Support department or super admin only. */
export const loadTrustSafety = createServerFn({ method: "POST" })
  .inputValidator((data: { status?: string }) => ({ status: String(data?.status ?? "OPEN").toUpperCase() }))
  .handler(async ({ data }) => {
    const { requireDepartment, adminClient } = await import("./console.server");
    await requireDepartment("TRUST", "SUPPORT");
    const db = await adminClient();

    let rq = db.from("content_reports").select("*").order("created_at", { ascending: true }).limit(300);
    if (data.status === "OPEN") rq = rq.in("status", ["OPEN", "REVIEWING"]);
    else if (data.status !== "ALL") rq = rq.eq("status", data.status);

    const [reportsR, blocksR, postsR, spotR, comR, suspR, banR, auditR, storyR] = await Promise.all([
      rq,
      db.from("security_events").select("id, kind, actor_user_id, route, detail, created_at").in("kind", ["USER_BLOCK", "USER_UNBLOCK"]).order("created_at", { ascending: false }).limit(100),
      db.from("social_posts").select("id, author_id, caption, moderation_status, created_at").in("moderation_status", ["FLAGGED", "REMOVED"]).order("created_at", { ascending: false }).limit(100),
      db.from("spotlight_posts").select("id, author_id, caption, moderation_status, created_at").in("moderation_status", ["FLAGGED", "REMOVED"]).order("created_at", { ascending: false }).limit(100),
      db.from("post_comments").select("id, author_id, body, moderation_status, created_at").in("moderation_status", ["FLAGGED", "REMOVED"]).order("created_at", { ascending: false }).limit(100),
      db.from("profiles").select("user_id, full_name, moderation_suspended_until, moderation_ban_reason").gt("moderation_suspended_until", new Date().toISOString()).limit(100),
      db.from("profiles").select("user_id, full_name, moderation_banned_at, moderation_ban_reason").not("moderation_banned_at", "is", null).limit(100),
      db.from("admin_audit_log").select("id, actor, action, reason, created_at").like("action", "TS_%").order("created_at", { ascending: false }).limit(50),
      db.from("stories").select("id, author_id, caption, moderation_status, created_at").in("moderation_status", ["FLAGGED", "REMOVED"]).order("created_at", { ascending: false }).limit(100),
    ]);
    if (reportsR.error) throw new Error(reportsR.error.message);

    const reports = reportsR.data ?? [];
    const content: TSContent[] = [
      ...(postsR.data ?? []).map((r) => ({ id: r.id, kind: "POST" as const, author_id: r.author_id, author_name: "", text: r.caption, status: r.moderation_status, created_at: r.created_at })),
      ...(spotR.data ?? []).map((r) => ({ id: r.id, kind: "SPOTLIGHT" as const, author_id: r.author_id, author_name: "", text: r.caption, status: r.moderation_status, created_at: r.created_at })),
      ...(comR.data ?? []).map((r) => ({ id: r.id, kind: "COMMENT" as const, author_id: r.author_id, author_name: "", text: r.body, status: r.moderation_status, created_at: r.created_at })),
      ...(storyR.data ?? []).map((r) => ({ id: r.id, kind: "STORY" as const, author_id: r.author_id, author_name: "", text: r.caption, status: r.moderation_status, created_at: r.created_at })),
    ];
    const blockRows = blocksR.data ?? [];

    // Content previews for reports
    const previews = new Map<string, string | null>();
    for (const kind of ["POST", "SPOTLIGHT", "COMMENT", "STORY"] as const) {
      const ids = reports.filter((r) => r.target_type === kind && r.target_id).map((r) => r.target_id as string);
      if (!ids.length) continue;
      const col = kind === "COMMENT" ? "body" : "caption";
      const { data: rows } = await db.from(CONTENT_TABLE[kind]).select(`id, ${col}`).in("id", ids);
      for (const row of (rows ?? []) as unknown as Array<Record<string, string | null>>) previews.set(String(row["id"]), row[col] ?? null);
    }
    for (const kind of ["PROVIDER"] as const) {
      const ids = reports.filter((r) => r.target_type === kind && r.target_id).map((r) => r.target_id as string);
      if (!ids.length) continue;
      const { data: rows } = await db.from("provider_profiles").select("id, business_name").in("id", ids);
      for (const row of rows ?? []) previews.set(row.id, row.business_name);
    }
    for (const [kind, tbl] of [["MARKET", "market_posts"], ["EVENT", "events"], ["PROPERTY", "property_listings"]] as const) {
      const ids = reports.filter((r) => r.target_type === kind && r.target_id).map((r) => r.target_id as string);
      if (!ids.length) continue;
      const { data: rows } = await db.from(tbl).select("id, title").in("id", ids);
      for (const row of rows ?? []) previews.set(row.id, row.title);
    }

    const ids = new Set<string>();
    reports.forEach((r) => { ids.add(r.reporter_id); if (r.target_user_id) ids.add(r.target_user_id); });
    content.forEach((c) => ids.add(c.author_id));
    blockRows.forEach((b) => {
      const d = (b.detail ?? {}) as Record<string, string>;
      if (d["blocker_user_id"]) ids.add(d["blocker_user_id"]);
      if (d["blocked_user_id"]) ids.add(d["blocked_user_id"]);
    });
    const names = new Map<string, string>();
    if (ids.size) {
      const { data: profs } = await db.from("profiles").select("user_id, full_name").in("user_id", [...ids]);
      (profs ?? []).forEach((p) => names.set(p.user_id, p.full_name || "Member"));
    }
    const nm = (id: string | null | undefined) => (id ? names.get(id) ?? "Member" : "—");

    return {
      reports: reports.map((r) => ({
        ...r,
        reporter_name: nm(r.reporter_id),
        reported_name: nm(r.target_user_id),
        content_preview: r.target_id ? previews.get(r.target_id) ?? null : null,
      })) as TSReport[],
      content: content.map((c) => ({ ...c, author_name: nm(c.author_id) })),
      blocks: blockRows.map((b) => {
        const d = (b.detail ?? {}) as Record<string, string>;
        return { id: b.id, kind: b.kind, actor_name: nm(d["blocker_user_id"]), target_name: nm(d["blocked_user_id"]), source: b.route, created_at: b.created_at };
      }) as TSEvent[],
      suspended: (suspR.data ?? []).map((p) => ({ user_id: p.user_id, name: p.full_name || "Member", until: p.moderation_suspended_until, reason: p.moderation_ban_reason })) as TSMember[],
      banned: (banR.data ?? []).map((p) => ({ user_id: p.user_id, name: p.full_name || "Member", until: p.moderation_banned_at, reason: p.moderation_ban_reason })) as TSMember[],
      activity: (auditR.data ?? []) as TSActivity[],
    };
  });

type Action = "REVIEW" | "REMOVE" | "RESTORE" | "WARN" | "SUSPEND" | "BAN" | "UNBAN" | "CLOSE";

/** Moderator actions on reports, content and members. Every action is audit-logged. */
export const moderationAction = createServerFn({ method: "POST" })
  .inputValidator((d: { action: Action; reportId?: string; contentKind?: string; contentId?: string; userId?: string; reason?: string; days?: number }) => ({
    action: String(d?.action ?? "").toUpperCase() as Action,
    reportId: d?.reportId ? String(d.reportId) : null,
    contentKind: d?.contentKind ? String(d.contentKind).toUpperCase() : null,
    contentId: d?.contentId ? String(d.contentId) : null,
    userId: d?.userId ? String(d.userId) : null,
    reason: String(d?.reason ?? "").slice(0, 500) || "Violation of ASH Glo Community Guidelines",
    days: Math.min(Math.max(Number(d?.days ?? 7) || 7, 1), 90),
  }))
  .handler(async ({ data }) => {
    const { requireDepartment, adminClient } = await import("./console.server");
    const actor = await requireDepartment("TRUST", "SUPPORT");
    if (!["REVIEW", "REMOVE", "RESTORE", "WARN", "SUSPEND", "BAN", "UNBAN", "CLOSE"].includes(data.action)) throw new Error("BAD_ACTION");
    const db = await adminClient();
    const now = new Date().toISOString();

    const table = data.contentKind && data.contentKind in CONTENT_TABLE ? CONTENT_TABLE[data.contentKind as keyof typeof CONTENT_TABLE] : null;

    const listingTable = data.contentKind === "MARKET" ? "market_posts" : data.contentKind === "EVENT" ? "events" : null;
    const ownedTable = data.contentKind === "PROPERTY" ? "property_listings" : data.contentKind === "PROVIDER" ? "provider_profiles" : null;
    if ((data.action === "REMOVE" || data.action === "RESTORE") && listingTable && data.contentId) {
      const { error } = await db.from(listingTable).update({ is_published: data.action === "RESTORE" }).eq("id", data.contentId);
      if (error) throw new Error(error.message);
    } else if ((data.action === "REMOVE" || data.action === "RESTORE") && ownedTable && data.contentId) {
      const { error } = await db.from(ownedTable).update({ moderation_status: data.action === "REMOVE" ? "REMOVED" : "APPROVED" }).eq("id", data.contentId);
      if (error) throw new Error(error.message);
    } else if (data.action === "REMOVE") {
      if (!table || !data.contentId) throw new Error("This report has no removable content. Use suspend or ban instead.");
      // Permanently delete the content row so it is gone for everyone, including staff views.
      const { error } = await db.from(table).delete().eq("id", data.contentId);
      if (error) throw new Error(error.message);
    } else if (data.action === "RESTORE") {
      if (!table || !data.contentId) throw new Error("This report has no restorable content.");
      const { error } = await db.from(table).update({ moderation_status: "APPROVED" }).eq("id", data.contentId);
      if (error) throw new Error(error.message);
    }
    if (data.action === "WARN" || data.action === "SUSPEND" || data.action === "BAN" || data.action === "UNBAN") {
      if (!data.userId) throw new Error("No member attached.");
    }
    if (data.action === "WARN" && data.userId) {
      await db.rpc("notify_user", {
        _user_id: data.userId,
        _category: "ACCOUNT",
        _title: "Community Guidelines warning",
        _body: `ASH Trust & Safety: ${data.reason}. Further violations can lead to suspension or account termination.`,
        _data: {},
      });
    }
    if (data.action === "SUSPEND" && data.userId) {
      const until = new Date(Date.now() + data.days * 86400000).toISOString();
      const { error } = await db.from("profiles").update({ moderation_suspended_until: until, moderation_ban_reason: data.reason }).eq("user_id", data.userId);
      if (error) throw new Error(error.message);
    }
    if (data.action === "BAN" && data.userId) {
      const { error } = await db.from("profiles").update({ moderation_banned_at: now, moderation_ban_reason: data.reason }).eq("user_id", data.userId);
      if (error) throw new Error(error.message);
    }
    if (data.action === "UNBAN" && data.userId) {
      const { error } = await db.from("profiles").update({ moderation_banned_at: null, moderation_suspended_until: null }).eq("user_id", data.userId);
      if (error) throw new Error(error.message);
    }

    if (data.reportId) {
      const patch: Record<string, unknown> = { reviewed_at: now, moderator_id: actor.staffId, updated_at: now };
      if (data.action === "REVIEW") patch["status"] = "REVIEWING";
      else if (data.action === "CLOSE") Object.assign(patch, { status: "DISMISSED", resolved_at: now, action_taken: "CLOSED", resolution_reason: data.reason, resolution_note: data.reason });
      else Object.assign(patch, { status: "ACTIONED", resolved_at: now, action_taken: data.action, resolution_reason: data.reason, resolution_note: data.reason });
      const { error } = await db.from("content_reports").update(patch as never).eq("id", data.reportId);
      if (error) throw new Error(error.message);
    }

    await db.from("admin_audit_log").insert({
      actor: `${actor.name} (${actor.department})`,
      action: `TS_${data.action}`,
      reason: data.reason,
      metadata: { report_id: data.reportId, content_kind: data.contentKind, content_id: data.contentId, user_id: data.userId, days: data.action === "SUSPEND" ? data.days : null },
    });
    return { ok: true };
  });
