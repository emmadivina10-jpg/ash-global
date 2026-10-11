import { createServerFn } from "@tanstack/react-start";
import { placeByCity, reportWindow, type ReportPeriod } from "./cyber-map-rules";

/**
 * Cyber world map, account control and security reports. Every function is
 * CYBERSECURITY-only (or CEO); mutations refuse protected owner/admin accounts
 * and record an append-only security_actions row.
 */

async function cyber() {
  const { requireDepartment, adminClient } = await import("./console.server");
  const actor = await requireDepartment("CYBERSECURITY");
  return { actor, db: await adminClient() };
}
type Db = Awaited<ReturnType<typeof cyber>>["db"];
type Actor = Awaited<ReturnType<typeof cyber>>["actor"];

async function isProtected(db: Db, userId: string) {
  const [{ data: role }, { data: prot }] = await Promise.all([
    db.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle(),
    db.rpc("is_protected_account", { _uid: userId }),
  ]);
  return Boolean(role) || Boolean(prot);
}

async function log(db: Db, actor: Actor, action: string, target: { userId?: string | null; ref?: string | null }, reason: string | null, after?: unknown) {
  await db.from("security_actions").insert({
    actor_staff_id: actor.staffId,
    actor_name: actor.name,
    action,
    target_user_id: target.userId ?? null,
    target_ref: target.ref ?? null,
    reason,
    after_state: (after ?? null) as never,
  });
}

async function signAvatars(db: Db, paths: (string | null)[]) {
  const out = new Map<string, string>();
  const priv = [...new Set(paths.filter((p): p is string => Boolean(p) && !p!.startsWith("http")))];
  for (const p of paths) if (p?.startsWith("http")) out.set(p, p);
  if (priv.length) {
    const { data } = await db.storage.from("avatars").createSignedUrls(priv, 3600);
    for (const d of data ?? []) if (d.path && d.signedUrl) out.set(d.path, d.signedUrl);
  }
  return out;
}

const ACTIVE = ["CONFIRMED", "IN_PROGRESS", "ACCEPTED"] as const;

export type MapProvider = {
  providerId: string; userId: string; name: string; avatar: string | null; email: string | null; phone: string | null;
  city: string | null; country: string; verified: boolean; live: boolean; lat: number; lng: number; precision: "live" | "city" | "country";
};
export type MapDevice = { userId: string; name: string; ip: string; city: string | null; country: string | null; lat: number; lng: number; precise: boolean; suspicious: boolean; lastSeen: string; userAgent: string | null };
export type MapTrip = { bookingId: string; title: string; status: string; tripStatus: string; points: { party: string; lat: number; lng: number; updatedAt: string }[] };

export const getCyberMap = createServerFn({ method: "GET" }).handler(async () => {
  const { actor, db } = await cyber();
  const [{ default: cities }, { default: countries }] = await Promise.all([import("./geo/cities.json"), import("./geo/countries.json")]);
  const cityList = cities as unknown as [string, string, number, number][];
  const countryMap = countries as unknown as Record<string, [number, number, string]>;
  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();

  const [providers, prints, bookings] = await Promise.all([
    db.from("provider_profiles").select("id, user_id, business_name, avatar_url, city, country, phone, is_verified, is_live").limit(2000),
    db.from("access_fingerprints").select("user_id, ip, fingerprint, city, country, lat, lng, last_seen, user_agent").gte("last_seen", since).order("last_seen", { ascending: false }).limit(3000),
    db.from("bookings").select("id, service_title, status, trip_status, provider_id, client_id").in("status", ACTIVE as unknown as never[]).limit(300),
  ]);

  const bookingIds = (bookings.data ?? []).map((b) => b.id);
  const { data: locs } = bookingIds.length
    ? await db.from("booking_party_locations").select("booking_id, party, lat, lng, updated_at").in("booking_id", bookingIds).gte("updated_at", new Date(Date.now() - 2 * 3600_000).toISOString())
    : { data: [] as { booking_id: string; party: string; lat: number; lng: number; updated_at: string }[] };

  const userIds = [...new Set([...(providers.data ?? []).map((p) => p.user_id), ...(prints.data ?? []).map((p) => p.user_id)])];
  const profiles = new Map<string, { full_name: string | null; email: string | null; phone: string | null; avatar_url: string | null }>();
  for (let i = 0; i < userIds.length; i += 300) {
    const { data } = await db.from("profiles").select("user_id, full_name, email, phone, avatar_url").in("user_id", userIds.slice(i, i + 300));
    for (const r of data ?? []) profiles.set(r.user_id, r);
  }
  const avatarPaths = (providers.data ?? []).map((p) => p.avatar_url ?? profiles.get(p.user_id)?.avatar_url ?? null);
  const signed = await signAvatars(db, avatarPaths);

  const liveProvider = new Map<string, { lat: number; lng: number }>();
  for (const b of bookings.data ?? []) {
    const l = (locs ?? []).find((x) => x.booking_id === b.id && x.party.toUpperCase() === "PROVIDER");
    if (l) liveProvider.set(b.provider_id, { lat: l.lat, lng: l.lng });
  }

  const mapProviders: MapProvider[] = [];
  for (const p of providers.data ?? []) {
    const prof = profiles.get(p.user_id);
    const live = liveProvider.get(p.id);
    const place = live ? { ...live, precision: "live" as const } : placeByCity(p.city, p.country, cityList, countryMap);
    if (!place) continue;
    const av = p.avatar_url ?? prof?.avatar_url ?? null;
    mapProviders.push({
      providerId: p.id, userId: p.user_id, name: p.business_name || prof?.full_name || "Provider",
      avatar: av ? (signed.get(av) ?? null) : null, email: prof?.email ?? null, phone: p.phone ?? prof?.phone ?? null,
      city: p.city, country: p.country, verified: p.is_verified, live: p.is_live, lat: place.lat, lng: place.lng, precision: place.precision,
    });
  }

  const usersPerPrint = new Map<string, Set<string>>();
  const countriesPerUser = new Map<string, Set<string>>();
  for (const f of prints.data ?? []) {
    (usersPerPrint.get(f.fingerprint) ?? usersPerPrint.set(f.fingerprint, new Set()).get(f.fingerprint)!).add(f.user_id);
    if (f.country) (countriesPerUser.get(f.user_id) ?? countriesPerUser.set(f.user_id, new Set()).get(f.user_id)!).add(f.country);
  }
  const seen = new Set<string>();
  const devices: MapDevice[] = [];
  for (const f of prints.data ?? []) {
    const key = `${f.user_id}|${f.ip}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const c = f.lat != null && f.lng != null ? { lat: f.lat, lng: f.lng, precise: true } : f.country && countryMap[f.country] ? { lat: countryMap[f.country]![0], lng: countryMap[f.country]![1], precise: false } : null;
    if (!c) continue;
    devices.push({
      userId: f.user_id, name: profiles.get(f.user_id)?.full_name ?? "Member", ip: f.ip, city: f.city, country: f.country, ...c,
      suspicious: (usersPerPrint.get(f.fingerprint)?.size ?? 0) >= 3 || (countriesPerUser.get(f.user_id)?.size ?? 0) >= 3,
      lastSeen: f.last_seen, userAgent: f.user_agent,
    });
  }

  const trips: MapTrip[] = (bookings.data ?? [])
    .map((b) => ({
      bookingId: b.id, title: b.service_title, status: b.status, tripStatus: b.trip_status,
      points: (locs ?? []).filter((l) => l.booking_id === b.id).map((l) => ({ party: l.party, lat: l.lat, lng: l.lng, updatedAt: l.updated_at })),
    }))
    .filter((t) => t.points.length > 0);

  await log(db, actor, "VIEW_MAP", {}, null, { providers: mapProviders.length, devices: devices.length, trips: trips.length });
  return { providers: mapProviders, devices, trips, generatedAt: new Date().toISOString() };
});

export const getLiveTrip = createServerFn({ method: "POST" })
  .inputValidator((d: { bookingId: string }) => ({ bookingId: String(d?.bookingId ?? "") }))
  .handler(async ({ data }) => {
    const { actor, db } = await cyber();
    const { data: b } = await db.from("bookings").select("id, service_title, status, trip_status, client_id, provider_id, scheduled_at").eq("id", data.bookingId).maybeSingle();
    if (!b) throw new Error("NOT_FOUND");
    const { data: locs } = await db.from("booking_party_locations").select("party, lat, lng, updated_at, accuracy_m").eq("booking_id", b.id);
    await log(db, actor, "VIEW_TRIP", { userId: b.client_id, ref: b.id }, null);
    return { booking: b, points: locs ?? [] };
  });

// ---------- ASH Intelligence on one account ----------

export const askAccountIntelligence = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string; question?: string }) => ({ userId: String(d?.userId ?? ""), question: String(d?.question ?? "").trim().slice(0, 400) }))
  .handler(async ({ data }) => {
    const { actor, db } = await cyber();
    const uid = data.userId;
    const [profile, prints, restr, identity, reports, flags, blocks, payments, withdrawals, events] = await Promise.all([
      db.from("profiles").select("full_name, username, account_status, verified_tier, avatar_url, created_at, moderation_banned_at").eq("user_id", uid).maybeSingle(),
      db.from("access_fingerprints").select("ip, fingerprint, country, city, user_agent, hits, first_seen, last_seen").eq("user_id", uid).order("last_seen", { ascending: false }).limit(30),
      db.from("security_restrictions").select("watch, no_posting, no_commerce, wallet_frozen, no_transactions, locked, reason").eq("user_id", uid).maybeSingle(),
      db.from("identity_restrictions").select("attempts, restricted_at, banned_at, restored_at").eq("user_id", uid).maybeSingle(),
      db.from("content_reports").select("reason, status, created_at").eq("target_user_id", uid).order("created_at", { ascending: false }).limit(20),
      db.from("campus_offplatform_flags").select("id", { count: "exact", head: true }).eq("user_id", uid),
      db.from("user_blocks").select("id", { count: "exact", head: true }).eq("blocked_id", uid),
      db.from("payment_transactions").select("method, purpose, status, amount, currency, created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(20),
      db.from("withdrawals").select("amount, currency, status, payment_method, requested_at").eq("user_id", uid).order("requested_at", { ascending: false }).limit(20),
      db.from("security_events").select("kind, severity, created_at").eq("actor_user_id", uid).order("created_at", { ascending: false }).limit(30),
    ]);
    if (!profile.data) throw new Error("NOT_FOUND");
    const records = {
      profile: profile.data, devices: prints.data ?? [], restrictions: restr.data, identityStrikes: identity.data,
      reportsAgainst: reports.data ?? [], offPlatformFlags: flags.count ?? 0, blockedByMembers: blocks.count ?? 0,
      payments: payments.data ?? [], withdrawals: withdrawals.data ?? [], securityEvents: events.data ?? [],
    };
    await log(db, actor, "AI_ACCOUNT_REVIEW", { userId: uid }, data.question || null);
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { answer: "ASH Intelligence is unavailable right now." };
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        temperature: 0,
        messages: [
          { role: "system", content: "You are ASH Intelligence helping the ASH Glo cybersecurity analyst. Using ONLY the account records given, explain what looks risky or vulnerable (devices, countries, reports, payments, strikes), rate the risk Low/Medium/High, and list concrete recommended security actions. Never invent facts; write \"Data not available\" where records are missing. Be concise, use short bullet points." },
          { role: "user", content: `Records: ${JSON.stringify(records)}\n\nQuestion: ${data.question || "What is going on in this account and is it vulnerable to us?"}` },
        ],
      }),
    });
    if (!res.ok) return { answer: res.status === 429 ? "ASH Intelligence is busy, try again shortly." : "ASH Intelligence is unavailable right now." };
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return { answer: json.choices?.[0]?.message?.content ?? "Data not available" };
  });

// ---------- Account control ----------

export const forceLogoutAccount = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string; reason: string }) => ({ userId: String(d?.userId ?? ""), reason: String(d?.reason ?? "").trim().slice(0, 500) }))
  .handler(async ({ data }) => {
    const { actor, db } = await cyber();
    if (!data.reason) throw new Error("REASON_REQUIRED");
    if (await isProtected(db, data.userId)) throw new Error("PROTECTED_ACCOUNT");
    const now = new Date().toISOString();
    const { data: existing } = await db.from("security_restrictions").select("user_id").eq("user_id", data.userId).maybeSingle();
    if (existing) await db.from("security_restrictions").update({ sessions_revoked_at: now, updated_by: actor.name, updated_at: now }).eq("user_id", data.userId);
    else await db.from("security_restrictions").insert({ user_id: data.userId, sessions_revoked_at: now, updated_by: actor.name });
    await log(db, actor, "FORCE_LOGOUT", { userId: data.userId }, data.reason, { sessions_revoked_at: now });
    return { ok: true };
  });

export const sendAccountRecovery = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string; reason: string; origin: string }) => ({
    userId: String(d?.userId ?? ""), reason: String(d?.reason ?? "").trim().slice(0, 500),
    origin: /^https:\/\/[a-z0-9.-]+$/i.test(String(d?.origin ?? "")) ? String(d.origin) : "https://ashglogroup.company",
  }))
  .handler(async ({ data }) => {
    const { actor, db } = await cyber();
    if (!data.reason) throw new Error("REASON_REQUIRED");
    if (await isProtected(db, data.userId)) throw new Error("PROTECTED_ACCOUNT");
    const { data: u } = await db.auth.admin.getUserById(data.userId);
    const email = u.user?.email;
    if (!email) throw new Error("NO_EMAIL");
    const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: `${data.origin}/reset-password` });
    if (error) throw new Error(`RECOVERY_FAILED: ${error.message}`);
    await log(db, actor, "PASSWORD_RECOVERY", { userId: data.userId }, data.reason);
    return { ok: true, sentTo: email.replace(/^(.).*(@.*)$/, "$1•••$2") };
  });

export const listAccountTransactions = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string }) => ({ userId: String(d?.userId ?? "") }))
  .handler(async ({ data }) => {
    const { db } = await cyber();
    const [w, p, h] = await Promise.all([
      db.from("withdrawals").select("id, reference, amount, currency, status, payment_method, requested_at").eq("user_id", data.userId).order("requested_at", { ascending: false }).limit(15),
      db.from("payment_transactions").select("id, reference, amount, currency, status, method, purpose, created_at").eq("user_id", data.userId).order("created_at", { ascending: false }).limit(15),
      db.from("security_transaction_holds").select("*").eq("user_id", data.userId).order("created_at", { ascending: false }),
    ]);
    return { withdrawals: w.data ?? [], payments: p.data ?? [], holds: h.data ?? [] };
  });

export const disputeTransaction = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string; kind: "WITHDRAWAL" | "PAYMENT"; ref: string; reason: string }) => ({
    userId: String(d?.userId ?? ""), kind: d?.kind === "WITHDRAWAL" ? ("WITHDRAWAL" as const) : ("PAYMENT" as const),
    ref: String(d?.ref ?? "").slice(0, 120), reason: String(d?.reason ?? "").trim().slice(0, 500),
  }))
  .handler(async ({ data }) => {
    const { actor, db } = await cyber();
    if (!data.reason || !data.ref) throw new Error("REASON_REQUIRED");
    if (await isProtected(db, data.userId)) throw new Error("PROTECTED_ACCOUNT");
    const { data: prof } = await db.from("profiles").select("full_name").eq("user_id", data.userId).maybeSingle();
    const { data: kase } = await db.from("ops_cases").insert({
      title: `Security dispute: ${data.kind.toLowerCase()} ${data.ref}`, created_by: actor.name, departments: ["REVENUE", "CYBERSECURITY"],
      priority: "HIGH", customer_user_id: data.userId, customer_name: prof?.full_name ?? null,
    }).select("id").single();
    const { data: hold } = await db.from("security_transaction_holds").insert({
      user_id: data.userId, kind: data.kind, ref: data.ref, reason: data.reason, ops_case_id: kase?.id ?? null, created_by: actor.name,
    }).select("id").single();
    await db.from("staff_notifications").insert({ department: "REVENUE", type: "SECURITY_DISPUTE", title: `Security hold on ${data.kind.toLowerCase()} ${data.ref}`, body: `${data.reason} — Cybersecurity (${actor.name}). Do not settle until reviewed.`, link: "/console/cases" });
    await log(db, actor, "TX_HOLD", { userId: data.userId, ref: hold?.id ?? null }, data.reason, { kind: data.kind, ref: data.ref });
    return { ok: true };
  });

export const releaseTransactionHold = createServerFn({ method: "POST" })
  .inputValidator((d: { holdId: string }) => ({ holdId: String(d?.holdId ?? "") }))
  .handler(async ({ data }) => {
    const { actor, db } = await cyber();
    await db.from("security_transaction_holds").update({ released_at: new Date().toISOString(), released_by: actor.name }).eq("id", data.holdId).is("released_at", null);
    await log(db, actor, "TX_HOLD_RELEASE", { ref: data.holdId }, null);
    return { ok: true };
  });

// ---------- Reports ----------

type Finding = { title: string; detail: string; fix: string; priority: "HIGH" | "MEDIUM" | "LOW" };

async function reportMetrics(db: Db, start: string, end: string) {
  const [events, blocks, newBlocks, failedStaff, webhooks, actions, reports, holds, prints, seats] = await Promise.all([
    db.from("security_events").select("kind, severity").gte("created_at", start).lte("created_at", end).limit(5000),
    db.from("ip_blocks").select("id", { count: "exact", head: true }).is("lifted_at", null),
    db.from("ip_blocks").select("id", { count: "exact", head: true }).gte("created_at", start),
    db.from("security_events").select("id", { count: "exact", head: true }).eq("kind", "STAFF_LOGIN_FAILED").gte("created_at", start).lte("created_at", end),
    db.from("payment_events").select("id", { count: "exact", head: true }).eq("signature_verified", false).gte("created_at", start).lte("created_at", end),
    db.from("security_actions").select("action").gte("created_at", start).lte("created_at", end).limit(5000),
    db.from("content_reports").select("id", { count: "exact", head: true }).gte("created_at", start).lte("created_at", end),
    db.from("security_transaction_holds").select("id", { count: "exact", head: true }).is("released_at", null),
    db.from("access_fingerprints").select("country").gte("first_seen", start).limit(5000),
    db.from("staff_accounts").select("username, password_changed_at").eq("is_active", true),
  ]);
  const kinds: Record<string, number> = {};
  for (const e of events.data ?? []) kinds[e.kind] = (kinds[e.kind] ?? 0) + 1;
  const actionCounts: Record<string, number> = {};
  for (const a of actions.data ?? []) actionCounts[a.action] = (actionCounts[a.action] ?? 0) + 1;
  const newCountries: Record<string, number> = {};
  for (const f of prints.data ?? []) if (f.country) newCountries[f.country] = (newCountries[f.country] ?? 0) + 1;
  const { passwordRotationStatus, POSTURE_BASELINE } = await import("./cyber-rules");
  return {
    critical: (events.data ?? []).filter((e) => e.severity === "CRITICAL").length,
    warnings: (events.data ?? []).filter((e) => e.severity === "WARN").length,
    eventKinds: kinds,
    activeBlocks: blocks.count ?? 0,
    newBlocks: newBlocks.count ?? 0,
    failedStaffLogins: failedStaff.count ?? 0,
    rejectedWebhooks: webhooks.count ?? 0,
    cyberActions: actionCounts,
    newContentReports: reports.count ?? 0,
    openTransactionHolds: holds.count ?? 0,
    newDevicesByCountry: newCountries,
    overduePasswordRotations: (seats.data ?? []).filter((s) => passwordRotationStatus(s.password_changed_at).overdue).map((s) => s.username),
    postureGaps: POSTURE_BASELINE.filter((p) => !p.inPlace).map((p) => p.label),
  };
}

function fallbackFindings(m: Awaited<ReturnType<typeof reportMetrics>>): Finding[] {
  const f: Finding[] = [];
  if (m.critical) f.push({ title: `${m.critical} critical security events`, detail: JSON.stringify(m.eventKinds), fix: "Investigate each critical event in the log.", priority: "HIGH" });
  if (m.rejectedWebhooks) f.push({ title: `${m.rejectedWebhooks} rejected payment notices`, detail: "Signature checks failed.", fix: "Confirm nobody is forging payment notices.", priority: "HIGH" });
  if (m.failedStaffLogins) f.push({ title: `${m.failedStaffLogins} failed staff sign-ins`, detail: "Possible password guessing.", fix: "Block repeated IPs.", priority: "MEDIUM" });
  if (m.overduePasswordRotations.length) f.push({ title: "Staff passwords overdue", detail: m.overduePasswordRotations.join(", "), fix: "Request rotation from the CEO.", priority: "MEDIUM" });
  for (const g of m.postureGaps) f.push({ title: `Gap: ${g}`, detail: "Not in place yet.", fix: "Report to the CEO for planning.", priority: "LOW" });
  return f;
}

export const generateSecurityReport = createServerFn({ method: "POST" })
  .inputValidator((d: { period: ReportPeriod }) => ({ period: d?.period === "WEEKLY" ? ("WEEKLY" as const) : ("DAILY" as const) }))
  .handler(async ({ data }) => {
    const { actor, db } = await cyber();
    const w = reportWindow(data.period);
    const metrics = await reportMetrics(db, w.start.toISOString(), w.end.toISOString());
    let summary = "";
    let findings: Finding[] = [];
    const key = process.env["LOVABLE_API_KEY"];
    if (key) {
      try {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
          body: JSON.stringify({
            model: "google/gemini-3.6-flash",
            temperature: 0,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: `You are ASH Intelligence writing the ${data.period.toLowerCase()} security audit report for ASH Glo. Use ONLY the metrics given; never invent numbers. Cover attacks and suspicious activity, vulnerabilities, actions taken and what needs fixing. Return JSON {"summary": string (3-6 sentences), "findings": [{"title": string, "detail": string, "fix": string, "priority": "HIGH"|"MEDIUM"|"LOW"}]}.` },
              { role: "user", content: JSON.stringify(metrics) },
            ],
          }),
        });
        if (res.ok) {
          const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
          const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}") as { summary?: string; findings?: Finding[] };
          summary = parsed.summary ?? "";
          findings = (parsed.findings ?? []).slice(0, 25);
        }
      } catch {
        // fall through to the rule-based report
      }
    }
    if (!summary) {
      findings = fallbackFindings(metrics);
      summary = findings.length ? `${findings.length} finding(s) for this period.` : "No issues found for this period.";
    }
    const { data: row } = await db.from("security_reports").insert({
      period: data.period, period_start: w.start.toISOString(), period_end: w.end.toISOString(),
      summary, findings: findings as never, metrics: metrics as never, generated_by: actor.name,
    }).select("*").single();
    await log(db, actor, "REPORT_GENERATED", { ref: row?.id ?? null }, data.period);
    return row;
  });

export const listSecurityReports = createServerFn({ method: "GET" }).handler(async () => {
  const { db } = await cyber();
  const { data } = await db.from("security_reports").select("*").is("deleted_at", null).order("created_at", { ascending: false }).limit(60);
  return data ?? [];
});

export const sendReportToCeo = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => ({ id: String(d?.id ?? "") }))
  .handler(async ({ data }) => {
    const { actor, db } = await cyber();
    const { data: r } = await db.from("security_reports").select("period, summary, period_start").eq("id", data.id).maybeSingle();
    if (!r) throw new Error("NOT_FOUND");
    await db.from("staff_notifications").insert({ department: "SUPER_ADMIN", type: "SECURITY_REPORT", title: `${r.period === "WEEKLY" ? "Weekly" : "Daily"} security report`, body: `${r.summary.slice(0, 260)} (from ${actor.name})`, link: "/console/security" });
    await db.from("security_reports").update({ sent_to_ceo_at: new Date().toISOString() }).eq("id", data.id);
    return { ok: true };
  });

export const deleteSecurityReport = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => ({ id: String(d?.id ?? "") }))
  .handler(async ({ data }) => {
    const { actor, db } = await cyber();
    await db.from("security_reports").update({ deleted_at: new Date().toISOString() }).eq("id", data.id);
    await log(db, actor, "REPORT_DELETE", { ref: data.id }, null);
    return { ok: true };
  });
