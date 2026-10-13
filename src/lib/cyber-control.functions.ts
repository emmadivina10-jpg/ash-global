import { createServerFn } from "@tanstack/react-start";
import {
  EMPTY_RESTRICTIONS,
  POSTURE_BASELINE,
  RESTRICTION_LEVELS,
  passwordRotationStatus,
  scoreQuiz,
  trainingOverdue,
  type RestrictionState,
} from "./cyber-rules";

/**
 * Cybersecurity command center. Every mutation is guarded by the CYBERSECURITY
 * department (or the CEO), refuses protected owner/admin accounts server-side,
 * and records an append-only security_actions row with a revertable before-state.
 */

async function cyber() {
  const { requireDepartment, adminClient } = await import("./console.server");
  const actor = await requireDepartment("CYBERSECURITY");
  return { actor, db: await adminClient() };
}

async function cyberHead() {
  const { requireCyberHead, adminClient } = await import("./console.server");
  const actor = await requireCyberHead();
  return { actor, db: await adminClient() };
}

async function anyStaff() {
  const { requireConsole, adminClient } = await import("./console.server");
  const actor = await requireConsole();
  return { actor, db: await adminClient() };
}

type Db = Awaited<ReturnType<typeof cyber>>["db"];

async function isProtected(db: Db, userId: string) {
  const { data } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return Boolean(data);
}

function pickState(row: Partial<RestrictionState> | null): RestrictionState {
  const s = { ...EMPTY_RESTRICTIONS };
  if (row) for (const l of RESTRICTION_LEVELS) s[l.key] = Boolean(row[l.key]);
  return s;
}

async function applyState(
  db: Db,
  userId: string,
  state: RestrictionState,
  reason: string | null,
  by: string,
) {
  await db
    .from("security_restrictions")
    .upsert({
      user_id: userId,
      ...state,
      reason,
      updated_by: by,
      updated_at: new Date().toISOString(),
    });
  // Sign-out and lock: ban at the auth layer ends refresh tokens; unlock lifts it.
  await db.auth.admin.updateUserById(userId, { ban_duration: state.locked ? "876000h" : "none" });
}

// ---------- Accounts ----------

export const searchSecurityAccounts = createServerFn({ method: "POST" })
  .inputValidator((d: { q: string }) => ({
    q: String(d?.q ?? "")
      .trim()
      .slice(0, 80),
  }))
  .handler(async ({ data }) => {
    const { db } = await cyber();
    if (data.q.length < 2) return [];
    const like = `%${data.q.replace(/[%_,()]/g, "")}%`;
    const { data: rows } = await db
      .from("profiles")
      .select(
        "user_id, full_name, username, email, account_status, avatar_url, verified_tier, created_at",
      )
      .or(`full_name.ilike.${like},username.ilike.${like},email.ilike.${like}`)
      .limit(20);
    const ids = (rows ?? []).map((r) => r.user_id);
    const [{ data: admins }, { data: restr }] = await Promise.all([
      ids.length
        ? db.from("user_roles").select("user_id").eq("role", "admin").in("user_id", ids)
        : Promise.resolve({ data: [] as { user_id: string }[] }),
      ids.length
        ? db.from("security_restrictions").select("*").in("user_id", ids)
        : Promise.resolve({ data: [] as never[] }),
    ]);
    const adminSet = new Set((admins ?? []).map((a) => a.user_id));
    const rmap = new Map((restr ?? []).map((r: { user_id: string }) => [r.user_id, r]));
    return (rows ?? []).map((r) => ({
      ...r,
      protected: adminSet.has(r.user_id),
      restrictions: pickState((rmap.get(r.user_id) as Partial<RestrictionState>) ?? null),
    }));
  });

export const getSecurityAccount = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string }) => ({ userId: String(d?.userId ?? "") }))
  .handler(async ({ data }) => {
    const { db } = await cyber();
    const uid = data.userId;
    const [
      profile,
      provider,
      identity,
      restr,
      reportsAgainst,
      reportsFiled,
      offplatform,
      blockedBy,
      prints,
      wallet,
      prot,
    ] = await Promise.all([
      db
        .from("profiles")
        .select(
          "user_id, full_name, username, email, phone, city, account_status, avatar_url, verified_tier, verified_until, moderation_banned_at, moderation_ban_reason, created_at",
        )
        .eq("user_id", uid)
        .maybeSingle(),
      db
        .from("provider_profiles")
        .select("id, business_name, slug, is_live, created_at")
        .eq("user_id", uid)
        .maybeSingle(),
      db
        .from("identity_restrictions")
        .select("attempts, restricted_at, banned_at, restored_at")
        .eq("user_id", uid)
        .maybeSingle(),
      db.from("security_restrictions").select("*").eq("user_id", uid).maybeSingle(),
      db
        .from("content_reports")
        .select("id", { count: "exact", head: true })
        .eq("target_user_id", uid)
        .eq("status", "OPEN"),
      db
        .from("content_reports")
        .select("id", { count: "exact", head: true })
        .eq("reporter_id", uid),
      db
        .from("campus_offplatform_flags")
        .select("id", { count: "exact", head: true })
        .eq("user_id", uid),
      db.from("user_blocks").select("id", { count: "exact", head: true }).eq("blocked_id", uid),
      db
        .from("access_fingerprints")
        .select("ip, fingerprint, user_agent, country, hits, first_seen, last_seen")
        .eq("user_id", uid)
        .order("last_seen", { ascending: false })
        .limit(20),
      db
        .from("wallets")
        .select("available_balance, pending_balance, currency")
        .eq("user_id", uid)
        .maybeSingle(),
      isProtected(db, uid),
    ]);
    if (!profile.data) throw new Error("NOT_FOUND");
    const openReports = reportsAgainst.count ?? 0;
    const flags = offplatform.count ?? 0;
    const strikes = identity.data?.attempts ?? 0;
    const compliance = [
      { label: "Verified identity", ok: Boolean(profile.data.verified_tier) },
      { label: "Profile photo set", ok: Boolean(profile.data.avatar_url) },
      { label: "No open reports against them", ok: openReports === 0 },
      { label: "No off-platform payment flags", ok: flags === 0 },
      { label: "No copied-identity strikes", ok: strikes === 0 },
      { label: "Not blocked by many members (<3)", ok: (blockedBy.count ?? 0) < 3 },
      {
        label: "Uses few devices (<5)",
        ok: new Set((prints.data ?? []).map((p) => p.fingerprint)).size < 5,
      },
    ];
    return {
      profile: profile.data,
      provider: provider.data,
      identity: identity.data,
      restrictions: pickState(restr.data as Partial<RestrictionState> | null),
      restrictionReason: (restr.data as { reason?: string } | null)?.reason ?? null,
      openReports,
      reportsFiled: reportsFiled.count ?? 0,
      offplatformFlags: flags,
      blockedBy: blockedBy.count ?? 0,
      fingerprints: prints.data ?? [],
      wallet: wallet.data,
      protected: prot,
      compliance,
      suspicious: compliance.filter((c) => !c.ok).length >= 2,
    };
  });

export const setAccountRestrictions = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string; state: Partial<RestrictionState>; reason: string }) => ({
    userId: String(d?.userId ?? ""),
    state: pickState(d?.state ?? null),
    reason: String(d?.reason ?? "")
      .trim()
      .slice(0, 500),
  }))
  .handler(async ({ data }) => {
    const { actor, db } = await cyberHead();
    if (!data.reason) throw new Error("REASON_REQUIRED");
    if (await isProtected(db, data.userId)) throw new Error("PROTECTED_ACCOUNT");
    const { data: before } = await db
      .from("security_restrictions")
      .select("*")
      .eq("user_id", data.userId)
      .maybeSingle();
    const beforeState = pickState(before as Partial<RestrictionState> | null);
    await applyState(db, data.userId, data.state, data.reason, actor.name);
    await db.from("security_actions").insert({
      actor_staff_id: actor.staffId,
      actor_name: actor.name,
      action: "RESTRICT",
      target_user_id: data.userId,
      before_state: {
        ...beforeState,
        reason: (before as { reason?: string } | null)?.reason ?? null,
      },
      after_state: data.state,
      reason: data.reason,
    });
    return { ok: true };
  });

// ---------- IP / browser blocks ----------

export const listIpBlocks = createServerFn({ method: "GET" }).handler(async () => {
  const { db } = await cyber();
  const { data } = await db
    .from("ip_blocks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
});

export const addIpBlock = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      kind: "IP" | "CIDR" | "FINGERPRINT";
      value: string;
      reason: string;
      hours: number | null;
    }) => ({
      kind: (["IP", "CIDR", "FINGERPRINT"].includes(d?.kind) ? d.kind : "IP") as
        "IP" | "CIDR" | "FINGERPRINT",
      value: String(d?.value ?? "")
        .trim()
        .slice(0, 64),
      reason: String(d?.reason ?? "")
        .trim()
        .slice(0, 300),
      hours: d?.hours ? Math.min(Math.max(Number(d.hours), 1), 24 * 365) : null,
    }),
  )
  .handler(async ({ data }) => {
    const { actor, db } = await cyber();
    if (!data.value || !data.reason) throw new Error("VALUE_AND_REASON_REQUIRED");
    // Never let the analyst lock owners out: refuse blocks matching a protected account's recent IP/browser.
    const { data: admins } = await db.from("user_roles").select("user_id").eq("role", "admin");
    const adminIds = (admins ?? []).map((a) => a.user_id);
    if (adminIds.length && data.kind !== "CIDR") {
      const col = data.kind === "IP" ? "ip" : "fingerprint";
      const { count } = await db
        .from("access_fingerprints")
        .select("id", { count: "exact", head: true })
        .in("user_id", adminIds)
        .eq(col, data.value);
      if ((count ?? 0) > 0) throw new Error("PROTECTED_ACCOUNT");
    }
    const expires = data.hours ? new Date(Date.now() + data.hours * 3600_000).toISOString() : null;
    const { data: row } = await db
      .from("ip_blocks")
      .insert({
        kind: data.kind,
        value: data.value,
        reason: data.reason,
        expires_at: expires,
        created_by: actor.name,
      })
      .select("id")
      .single();
    await db
      .from("security_actions")
      .insert({
        actor_staff_id: actor.staffId,
        actor_name: actor.name,
        action: "IP_BLOCK",
        target_ref: row?.id ?? null,
        after_state: data,
        reason: data.reason,
      });
    const { invalidateBlockCache } = await import("./cyber-guard.server");
    invalidateBlockCache();
    return { ok: true };
  });

export const liftIpBlock = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => ({ id: String(d?.id ?? "") }))
  .handler(async ({ data }) => {
    const { actor, db } = await cyber();
    await db.from("ip_blocks").update({ lifted_at: new Date().toISOString() }).eq("id", data.id);
    await db
      .from("security_actions")
      .insert({
        actor_staff_id: actor.staffId,
        actor_name: actor.name,
        action: "IP_UNBLOCK",
        target_ref: data.id,
      });
    const { invalidateBlockCache } = await import("./cyber-guard.server");
    invalidateBlockCache();
    return { ok: true };
  });

// ---------- Suspicious activity ----------

export const getSuspiciousActivity = createServerFn({ method: "GET" }).handler(async () => {
  const { db } = await cyber();
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const [{ data: prints }, { data: events }] = await Promise.all([
    db
      .from("access_fingerprints")
      .select("user_id, ip, fingerprint, user_agent, country, last_seen")
      .gte("last_seen", since)
      .limit(2000),
    db
      .from("security_events")
      .select("id, kind, severity, subject, actor_user_id, route, created_at")
      .gte("created_at", since)
      .in("severity", ["WARN", "CRITICAL"])
      .order("created_at", { ascending: false })
      .limit(60),
  ]);
  const rows = prints ?? [];
  const byFp = new Map<string, Set<string>>();
  const countries = new Map<string, Set<string>>();
  for (const r of rows) {
    (byFp.get(r.fingerprint) ?? byFp.set(r.fingerprint, new Set()).get(r.fingerprint)!).add(
      r.user_id,
    );
    if (r.country)
      (countries.get(r.user_id) ?? countries.set(r.user_id, new Set()).get(r.user_id)!).add(
        r.country,
      );
  }
  const sharedDevices = [...byFp.entries()]
    .filter(([, u]) => u.size >= 3)
    .map(([fingerprint, u]) => ({ fingerprint, accounts: u.size, userIds: [...u].slice(0, 10) }));
  const multiCountry = [...countries.entries()]
    .filter(([, c]) => c.size >= 3)
    .map(([userId, c]) => ({ userId, countries: [...c] }));
  return { sharedDevices, multiCountry, events: events ?? [] };
});

// ---------- Revert (CEO / super admin only) ----------

export const listSecurityActions = createServerFn({ method: "GET" }).handler(async () => {
  const { requireConsole, adminClient } = await import("./console.server");
  const actor = await requireConsole();
  if (!actor.superAdmin && actor.department !== "CYBERSECURITY")
    throw new Error("FORBIDDEN_DEPARTMENT");
  const db = await adminClient();
  const { data } = await db
    .from("security_actions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(150);
  return { canRevert: actor.superAdmin, actions: data ?? [] };
});

async function revertOne(db: Db, id: string, by: string) {
  const { data: a } = await db.from("security_actions").select("*").eq("id", id).maybeSingle();
  if (!a || a.reverted_at) return false;
  if (a.action === "RESTRICT" && a.target_user_id) {
    const before = (a.before_state ?? {}) as Partial<RestrictionState> & { reason?: string | null };
    await applyState(
      db,
      a.target_user_id,
      pickState(before),
      before.reason ?? null,
      `Revert by ${by}`,
    );
  } else if (a.action === "IP_BLOCK" && a.target_ref) {
    await db
      .from("ip_blocks")
      .update({ lifted_at: new Date().toISOString() })
      .eq("id", a.target_ref);
  } else if (a.action === "IP_UNBLOCK" && a.target_ref) {
    await db.from("ip_blocks").update({ lifted_at: null }).eq("id", a.target_ref);
  } else if (a.action === "BULLETIN_DELETE" && a.target_ref) {
    await db.from("security_bulletins").update({ deleted_at: null }).eq("id", a.target_ref);
  } else {
    return false;
  }
  await db
    .from("security_actions")
    .update({ reverted_at: new Date().toISOString(), reverted_by: by })
    .eq("id", id);
  return true;
}

export const revertSecurityActions = createServerFn({ method: "POST" })
  .inputValidator((d: { ids?: string[]; actorName?: string; day?: string }) => ({
    ids: Array.isArray(d?.ids) ? d.ids.slice(0, 200).map(String) : [],
    actorName: d?.actorName ? String(d.actorName) : null,
    day: d?.day && /^\d{4}-\d{2}-\d{2}$/.test(d.day) ? d.day : null,
  }))
  .handler(async ({ data }) => {
    const { requireSuperAdmin, adminClient } = await import("./console.server");
    const actor = await requireSuperAdmin();
    const db = await adminClient();
    let ids = data.ids;
    if (!ids.length && (data.actorName || data.day)) {
      let q = db
        .from("security_actions")
        .select("id")
        .is("reverted_at", null)
        .order("created_at", { ascending: false });
      if (data.actorName) q = q.eq("actor_name", data.actorName);
      if (data.day)
        q = q
          .gte("created_at", `${data.day}T00:00:00Z`)
          .lt("created_at", `${data.day}T23:59:59.999Z`);
      ids = ((await q.limit(200)).data ?? []).map((r) => r.id);
    }
    const { invalidateBlockCache } = await import("./cyber-guard.server");
    let reverted = 0;
    for (const id of ids) if (await revertOne(db, id, actor.name)) reverted += 1;
    invalidateBlockCache();
    await db
      .from("admin_audit_log")
      .insert({
        actor: actor.name,
        action: "CYBER_REVERT",
        reason: `Reverted ${reverted} cyber action(s)`,
        metadata: { ids },
      });
    return { reverted };
  });

// ---------- Staff password rotation ----------

export const getStaffRotation = createServerFn({ method: "GET" }).handler(async () => {
  const { actor, db } = await cyber();
  const { data } = await db
    .from("staff_accounts")
    .select("id, username, employee_name, full_name, department, is_active, password_changed_at")
    .eq("is_active", true)
    .order("department");
  return {
    canRotate: actor.superAdmin,
    seats: (data ?? []).map((s) => ({ ...s, ...passwordRotationStatus(s.password_changed_at) })),
  };
});

export const requestPasswordRotation = createServerFn({ method: "POST" })
  .inputValidator((d: { staffId: string }) => ({ staffId: String(d?.staffId ?? "") }))
  .handler(async ({ data }) => {
    const { actor, db } = await cyberHead();
    const { data: seat } = await db
      .from("staff_accounts")
      .select("username, department")
      .eq("id", data.staffId)
      .maybeSingle();
    if (!seat) throw new Error("NOT_FOUND");
    await db
      .from("staff_notifications")
      .insert({
        department: "SUPER_ADMIN",
        type: "SECURITY_ROTATION",
        title: `Password rotation due: ${seat.username}`,
        body: `Requested by ${actor.name} (Cybersecurity). Rotate it from the Security dashboard.`,
        link: "/console/security",
      });
    await db
      .from("security_actions")
      .insert({
        actor_staff_id: actor.staffId,
        actor_name: actor.name,
        action: "ROTATION_REQUEST",
        target_ref: seat.username,
      });
    return { ok: true };
  });

/** CEO only. The new password is returned once to the CEO and never stored in plain text or logged. */
export const rotateStaffPassword = createServerFn({ method: "POST" })
  .inputValidator((d: { staffId: string }) => ({ staffId: String(d?.staffId ?? "") }))
  .handler(async ({ data }) => {
    const { requireSuperAdmin, adminClient, hashStaffPassword } = await import("./console.server");
    const actor = await requireSuperAdmin();
    const db = await adminClient();
    const { randomBytes } = await import("node:crypto");
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!#$%";
    const bytes = randomBytes(20);
    const password = [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
    const { data: seat, error } = await db
      .from("staff_accounts")
      .update({
        password_hash: hashStaffPassword(password),
        password_changed_at: new Date().toISOString(),
      })
      .eq("id", data.staffId)
      .select("username")
      .single();
    if (error || !seat) throw new Error("ROTATION_FAILED");
    await db
      .from("security_actions")
      .insert({
        actor_staff_id: actor.staffId,
        actor_name: actor.name,
        action: "ROTATE_PASSWORD",
        target_ref: seat.username,
      });
    return { username: seat.username, password };
  });

// ---------- Bulletins / security alerts ----------

export const sendSecurityAlert = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      title: string;
      body: string;
      severity: string;
      audience: "ALL_MEMBERS" | "MEMBERS" | "STAFF";
      userIds?: string[];
      departments?: string[];
    }) => ({
      title: String(d?.title ?? "")
        .trim()
        .slice(0, 140),
      body: String(d?.body ?? "")
        .trim()
        .slice(0, 4000),
      severity: ["INFO", "WARN", "CRITICAL"].includes(d?.severity) ? d.severity : "INFO",
      audience: (["ALL_MEMBERS", "MEMBERS", "STAFF"].includes(d?.audience)
        ? d.audience
        : "STAFF") as "ALL_MEMBERS" | "MEMBERS" | "STAFF",
      userIds: Array.isArray(d?.userIds) ? d.userIds.slice(0, 500).map(String) : [],
      departments: Array.isArray(d?.departments) ? d.departments.slice(0, 20).map(String) : [],
    }),
  )
  .handler(async ({ data }) => {
    const { actor, db } = await cyber();
    if (!data.title || !data.body) throw new Error("TITLE_AND_BODY_REQUIRED");
    const { data: b, error } = await db
      .from("security_bulletins")
      .insert({
        title: data.title,
        body: data.body,
        severity: data.severity,
        audience: data.audience,
        target_user_ids: data.userIds,
        target_departments: data.departments,
        created_by: actor.name,
      })
      .select("id")
      .single();
    if (error || !b) throw new Error("SEND_FAILED");
    let recipients = 0;
    if (data.audience === "STAFF") {
      const depts = data.departments.length ? data.departments : ["SUPER_ADMIN"];
      await db
        .from("staff_notifications")
        .insert(
          depts.map((department) => ({
            department,
            type: "SECURITY_UPDATE",
            title: `Security update: ${data.title}`,
            body: data.body.slice(0, 280),
            link: "/console/security-updates",
          })),
        );
      recipients = depts.length;
    } else {
      let ids = data.userIds;
      if (data.audience === "ALL_MEMBERS") {
        ids = [];
        for (let from = 0; from < 50_000; from += 1000) {
          const { data: page } = await db
            .from("profiles")
            .select("user_id")
            .order("user_id")
            .range(from, from + 999);
          ids.push(...(page ?? []).map((p) => p.user_id));
          if (!page || page.length < 1000) break;
        }
      }
      for (let i = 0; i < ids.length; i += 500) {
        await db
          .from("notifications")
          .insert(
            ids
              .slice(i, i + 500)
              .map((user_id) => ({
                user_id,
                category: "SECURITY_UPDATE",
                title: data.title,
                body: data.body.slice(0, 280),
                data: { bulletin_id: b.id, severity: data.severity },
              })),
          );
      }
      recipients = ids.length;
    }
    await db
      .from("security_actions")
      .insert({
        actor_staff_id: actor.staffId,
        actor_name: actor.name,
        action: "BULLETIN_SEND",
        target_ref: b.id,
        after_state: { audience: data.audience, recipients },
      });
    return { ok: true, recipients };
  });

export const listSecurityBulletins = createServerFn({ method: "GET" }).handler(async () => {
  const { actor, db } = await anyStaff();
  const { data } = await db
    .from("security_bulletins")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);
  const canDelete = actor.superAdmin || actor.department === "CYBERSECURITY";
  const mine = (b: { target_departments: string[] }) =>
    b.target_departments.length === 0 ||
    b.target_departments.includes(actor.department) ||
    actor.extraDepartments.some((d) => b.target_departments.includes(d));
  const visible = (data ?? []).filter(
    (b) => canDelete || b.audience === "ALL_MEMBERS" || (b.audience === "STAFF" && mine(b)),
  );
  return { canDelete, bulletins: visible };
});

export const deleteSecurityBulletin = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => ({ id: String(d?.id ?? "") }))
  .handler(async ({ data }) => {
    const { actor, db } = await cyber();
    await db
      .from("security_bulletins")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", data.id);
    await db
      .from("security_actions")
      .insert({
        actor_staff_id: actor.staffId,
        actor_name: actor.name,
        action: "BULLETIN_DELETE",
        target_ref: data.id,
      });
    return { ok: true };
  });

// ---------- Posture ----------

export const getSecurityPosture = createServerFn({ method: "GET" }).handler(async () => {
  const { db } = await cyber();
  const [{ data: seats }, { data: scan }] = await Promise.all([
    db.from("staff_accounts").select("password_changed_at").eq("is_active", true),
    db
      .from("security_events")
      .select("created_at")
      .eq("kind", "SELFCHECK")
      .order("created_at", { ascending: false })
      .limit(1),
  ]);
  const overdue = (seats ?? []).filter(
    (s) => passwordRotationStatus(s.password_changed_at).overdue,
  ).length;
  const lastScan = scan?.[0]?.created_at ?? null;
  return { items: POSTURE_BASELINE, overdueRotations: overdue, lastScan };
});

export const reportGapsToCeo = createServerFn({ method: "POST" })
  .inputValidator((d: { gaps: string[]; note: string }) => ({
    gaps: Array.isArray(d?.gaps) ? d.gaps.slice(0, 30).map((g) => String(g).slice(0, 200)) : [],
    note: String(d?.note ?? "").slice(0, 1000),
  }))
  .handler(async ({ data }) => {
    const { actor, db } = await cyber();
    if (!data.gaps.length) throw new Error("NO_GAPS_SELECTED");
    await db
      .from("staff_notifications")
      .insert({
        department: "SUPER_ADMIN",
        type: "SECURITY_GAP_REPORT",
        title: `Security gaps reported (${data.gaps.length})`,
        body: `${data.gaps.join("; ")}${data.note ? ` — ${data.note}` : ""} (from ${actor.name})`,
        link: "/console/security",
      });
    return { ok: true };
  });

// ---------- Daily AI review ----------

async function gatherMetrics(db: Db) {
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const [events, failedStaff, blocks, reports, webhooks, seats, restr, staffLogins] =
    await Promise.all([
      db.from("security_events").select("kind, severity").gte("created_at", since).limit(2000),
      db
        .from("security_events")
        .select("id", { count: "exact", head: true })
        .eq("kind", "STAFF_LOGIN_FAILED")
        .gte("created_at", since),
      db.from("ip_blocks").select("id", { count: "exact", head: true }).is("lifted_at", null),
      db.from("content_reports").select("id", { count: "exact", head: true }).eq("status", "OPEN"),
      db
        .from("payment_events")
        .select("id", { count: "exact", head: true })
        .eq("signature_verified", false)
        .gte("created_at", since),
      db
        .from("staff_accounts")
        .select("username, password_changed_at, last_login_at")
        .eq("is_active", true),
      db
        .from("security_restrictions")
        .select("user_id", { count: "exact", head: true })
        .or(
          "no_posting.eq.true,no_commerce.eq.true,wallet_frozen.eq.true,no_transactions.eq.true,locked.eq.true",
        ),
      db
        .from("staff_accounts")
        .select("id", { count: "exact", head: true })
        .gte("last_login_at", since),
    ]);
  const ev = events.data ?? [];
  const kinds: Record<string, number> = {};
  for (const e of ev) kinds[e.kind] = (kinds[e.kind] ?? 0) + 1;
  const overdueSeats = (seats.data ?? [])
    .filter((s) => passwordRotationStatus(s.password_changed_at).overdue)
    .map((s) => s.username);
  return {
    critical: ev.filter((e) => e.severity === "CRITICAL").length,
    warnings: ev.filter((e) => e.severity === "WARN").length,
    eventKinds: kinds,
    failedStaffLogins: failedStaff.count ?? 0,
    activeBlocks: blocks.count ?? 0,
    openReports: reports.count ?? 0,
    rejectedWebhooks: webhooks.count ?? 0,
    overdueRotations: overdueSeats,
    restrictedAccounts: restr.count ?? 0,
    staffSignInsToday: staffLogins.count ?? 0,
  };
}

type ReviewItem = {
  title: string;
  detail: string;
  action: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  handled?: boolean;
};

async function aiSummary(
  metrics: Record<string, unknown>,
): Promise<{ summary: string; items: ReviewItem[] }> {
  const key = process.env["LOVABLE_API_KEY"];
  const fallback = (): { summary: string; items: ReviewItem[] } => {
    const m = metrics as Awaited<ReturnType<typeof gatherMetrics>>;
    const items: ReviewItem[] = [];
    if (m.critical)
      items.push({
        title: `${m.critical} critical security events`,
        detail: "Recorded in the last 24 hours.",
        action: "Open the event log and investigate each one.",
        priority: "HIGH",
      });
    if (m.rejectedWebhooks)
      items.push({
        title: `${m.rejectedWebhooks} rejected payment webhooks`,
        detail: "Signature checks failed.",
        action: "Confirm no one is forging payment notices.",
        priority: "HIGH",
      });
    if (m.failedStaffLogins)
      items.push({
        title: `${m.failedStaffLogins} failed staff sign-ins`,
        detail: "Wrong username or password at /console.",
        action: "Check for guessing attempts; block the IP if repeated.",
        priority: "MEDIUM",
      });
    if (m.overdueRotations.length)
      items.push({
        title: `${m.overdueRotations.length} staff passwords overdue`,
        detail: m.overdueRotations.join(", "),
        action: "Request rotation from the CEO.",
        priority: "MEDIUM",
      });
    if (m.openReports)
      items.push({
        title: `${m.openReports} open content reports`,
        detail: "Awaiting Trust & Safety.",
        action: "Alert Trust if any look like fraud.",
        priority: "LOW",
      });
    return {
      summary: items.length
        ? `${items.length} item(s) need attention today.`
        : "No issues found in the last 24 hours.",
      items,
    };
  };
  if (!key) return fallback();
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'You are ASH Intelligence, the security analyst assistant for ASH Glo. Using ONLY the metrics given, write a daily security review. Never invent numbers. Return JSON: {"summary": string (2-4 sentences), "items": [{"title": string, "detail": string, "action": string, "priority": "HIGH"|"MEDIUM"|"LOW"}]}. If metrics are all zero, say no issues were found.',
          },
          { role: "user", content: JSON.stringify(metrics) },
        ],
      }),
    });
    if (!res.ok) return fallback();
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}") as {
      summary?: string;
      items?: ReviewItem[];
    };
    if (!parsed.summary) return fallback();
    return { summary: parsed.summary, items: (parsed.items ?? []).slice(0, 12) };
  } catch {
    return fallback();
  }
}

export async function generateDailyReviewFor(db: Db, regenerate = false) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await db
    .from("security_daily_reviews")
    .select("*")
    .eq("review_date", today)
    .maybeSingle();
  if (existing && !regenerate) return existing;
  const metrics = await gatherMetrics(db);
  const { summary, items } = await aiSummary(metrics);
  const { data } = await db
    .from("security_daily_reviews")
    .upsert(
      {
        review_date: today,
        summary,
        items,
        metrics,
        generated_at: new Date().toISOString(),
        acknowledged_at: null,
        acknowledged_by: null,
      },
      { onConflict: "review_date" },
    )
    .select("*")
    .single();
  return data;
}

export const getDailyReview = createServerFn({ method: "POST" })
  .inputValidator((d: { regenerate?: boolean } | undefined) => ({
    regenerate: Boolean(d?.regenerate),
  }))
  .handler(async ({ data }) => {
    const { db } = await cyber();
    const today = await generateDailyReviewFor(db, data.regenerate);
    const { data: history } = await db
      .from("security_daily_reviews")
      .select("review_date, acknowledged_at, acknowledged_by")
      .order("review_date", { ascending: false })
      .limit(14);
    return { today, history: history ?? [] };
  });

export const updateDailyReview = createServerFn({ method: "POST" })
  .inputValidator((d: { handledIndex?: number; acknowledge?: boolean }) => ({
    handledIndex: Number.isInteger(d?.handledIndex) ? Number(d.handledIndex) : null,
    acknowledge: Boolean(d?.acknowledge),
  }))
  .handler(async ({ data }) => {
    const { actor, db } = await cyber();
    const today = new Date().toISOString().slice(0, 10);
    const { data: row } = await db
      .from("security_daily_reviews")
      .select("items")
      .eq("review_date", today)
      .maybeSingle();
    if (!row) throw new Error("NO_REVIEW");
    const items = (row.items as ReviewItem[]) ?? [];
    if (data.handledIndex !== null && items[data.handledIndex])
      items[data.handledIndex] = {
        ...items[data.handledIndex]!,
        handled: !items[data.handledIndex]!.handled,
      };
    await db
      .from("security_daily_reviews")
      .update({
        items,
        ...(data.acknowledge
          ? { acknowledged_at: new Date().toISOString(), acknowledged_by: actor.name }
          : {}),
      })
      .eq("review_date", today);
    return { ok: true };
  });

export const askCyberIntelligence = createServerFn({ method: "POST" })
  .inputValidator((d: { question: string }) => ({
    question: String(d?.question ?? "")
      .trim()
      .slice(0, 500),
  }))
  .handler(async ({ data }) => {
    const { db } = await cyber();
    const metrics = await gatherMetrics(db);
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { answer: "ASH Intelligence is unavailable right now." };
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        temperature: 0,
        messages: [
          {
            role: "system",
            content: `You are ASH Intelligence for the ASH Glo cybersecurity analyst. Answer briefly and only from these real 24-hour metrics; if the data cannot answer, say "Data not available". Metrics: ${JSON.stringify(metrics)}. Security posture baseline: ${JSON.stringify(POSTURE_BASELINE)}`,
          },
          { role: "user", content: data.question },
        ],
      }),
    });
    if (!res.ok) return { answer: "ASH Intelligence is unavailable right now." };
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return { answer: json.choices?.[0]?.message?.content ?? "Data not available" };
  });

// ---------- Awareness training ----------

type QuizQ = { q: string; options: string[]; correct: number };

export const saveTraining = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      title: string;
      lessons: { heading: string; body: string }[];
      quiz: QuizQ[];
      passMark?: number;
    }) => ({
      title: String(d?.title ?? "")
        .trim()
        .slice(0, 140),
      lessons: (Array.isArray(d?.lessons) ? d.lessons : [])
        .slice(0, 20)
        .map((l) => ({
          heading: String(l.heading ?? "").slice(0, 140),
          body: String(l.body ?? "").slice(0, 3000),
        })),
      quiz: (Array.isArray(d?.quiz) ? d.quiz : [])
        .slice(0, 20)
        .map((q) => ({
          q: String(q.q ?? "").slice(0, 300),
          options: (q.options ?? []).slice(0, 6).map((o) => String(o).slice(0, 200)),
          correct: Number(q.correct ?? 0),
        })),
      passMark: Math.min(Math.max(Number(d?.passMark ?? 70), 1), 100),
    }),
  )
  .handler(async ({ data }) => {
    const { actor, db } = await cyber();
    if (!data.title || !data.lessons.length || !data.quiz.length)
      throw new Error("INCOMPLETE_TRAINING");
    await db.from("security_trainings").update({ active: false }).eq("active", true);
    await db
      .from("security_trainings")
      .insert({
        title: data.title,
        lessons: data.lessons,
        quiz: data.quiz,
        pass_mark: data.passMark,
        created_by: actor.name,
      });
    const { data: seats } = await db
      .from("staff_accounts")
      .select("department")
      .eq("is_active", true);
    const depts = [...new Set((seats ?? []).map((s) => s.department))];
    if (depts.length)
      await db
        .from("staff_notifications")
        .insert(
          depts.map((department) => ({
            department,
            type: "SECURITY_TRAINING",
            title: `New security awareness training: ${data.title}`,
            body: "Complete it from Security updates.",
            link: "/console/security-updates",
          })),
        );
    return { ok: true };
  });

export const getTrainingOverview = createServerFn({ method: "GET" }).handler(async () => {
  const { db } = await cyber();
  const [{ data: training }, { data: staff }, { data: done }] = await Promise.all([
    db
      .from("security_trainings")
      .select("id, title, created_at, pass_mark")
      .eq("active", true)
      .maybeSingle(),
    db
      .from("staff_accounts")
      .select("id, username, employee_name, department")
      .eq("is_active", true),
    db
      .from("security_training_completions")
      .select("staff_id, completed_at, passed")
      .eq("passed", true)
      .order("completed_at", { ascending: false }),
  ]);
  const latest = new Map<string, string>();
  for (const c of done ?? []) if (!latest.has(c.staff_id)) latest.set(c.staff_id, c.completed_at);
  return {
    training,
    staff: (staff ?? []).map((s) => ({
      ...s,
      lastCompleted: latest.get(s.id) ?? null,
      overdue: trainingOverdue(latest.get(s.id) ?? null),
    })),
  };
});

export const getMyTraining = createServerFn({ method: "GET" }).handler(async () => {
  const { actor, db } = await anyStaff();
  const { data: training } = await db
    .from("security_trainings")
    .select("id, title, lessons, quiz, pass_mark")
    .eq("active", true)
    .maybeSingle();
  let last: string | null = null;
  if (actor.staffId) {
    const { data } = await db
      .from("security_training_completions")
      .select("completed_at")
      .eq("staff_id", actor.staffId)
      .eq("passed", true)
      .order("completed_at", { ascending: false })
      .limit(1);
    last = data?.[0]?.completed_at ?? null;
  }
  const safe = training
    ? { ...training, quiz: (training.quiz as QuizQ[]).map((q) => ({ q: q.q, options: q.options })) }
    : null;
  return {
    training: safe,
    lastCompleted: last,
    overdue: trainingOverdue(last),
    canTake: Boolean(actor.staffId),
  };
});

export const submitTraining = createServerFn({ method: "POST" })
  .inputValidator((d: { trainingId: string; answers: number[] }) => ({
    trainingId: String(d?.trainingId ?? ""),
    answers: (Array.isArray(d?.answers) ? d.answers : []).slice(0, 20).map(Number),
  }))
  .handler(async ({ data }) => {
    const { actor, db } = await anyStaff();
    if (!actor.staffId) throw new Error("PERSONAL_LOGIN_REQUIRED");
    const { data: t } = await db
      .from("security_trainings")
      .select("quiz, pass_mark")
      .eq("id", data.trainingId)
      .maybeSingle();
    if (!t) throw new Error("NOT_FOUND");
    const score = scoreQuiz(
      data.answers,
      (t.quiz as QuizQ[]).map((q) => q.correct),
    );
    const passed = score >= t.pass_mark;
    await db
      .from("security_training_completions")
      .insert({ training_id: data.trainingId, staff_id: actor.staffId, score, passed });
    return { score, passed };
  });
