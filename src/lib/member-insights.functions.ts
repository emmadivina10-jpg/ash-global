import { createServerFn } from "@tanstack/react-start";
import { canReviewMember, hasFreshPresence, targetProgress } from "./member-insights";

export type MemberMetrics = {
  total: number;
  joinedToday: number;
  active30d: number;
  excluded: number;
  daily: { day: string; registrations: number }[];
  asOf: string;
  quality: string;
};
export const getStaffMemberMetrics = createServerFn({ method: "GET" }).handler(async () => {
  const { requireConsole, adminClient } = await import("./console.server");
  await requireConsole();
  const db = await adminClient();
  const { data, error } = await db.rpc("staff_member_metrics_v1" as never);
  if (error || !data)
    throw new Error("Member activity statistics require the approved staff insights update.");
  const metrics = data as unknown as MemberMetrics;
  return { ...metrics, target: targetProgress(metrics.active30d) };
});
export const getStaffMemberDirectory = createServerFn({ method: "POST" })
  .inputValidator((d: { search?: string; page?: number }) => ({
    search: String(d.search ?? "")
      .trim()
      .slice(0, 80)
      .replace(/[%_,().]/g, ""),
    page: Math.max(0, Math.floor(Number(d.page) || 0)),
  }))
  .handler(async ({ data }) => {
    const { requireConsole, adminClient } = await import("./console.server");
    const actor = await requireConsole();
    const db = await adminClient();
    let query = db
      .from("profiles")
      .select("user_id,full_name,avatar_url", { count: "exact" })
      .order("created_at", { ascending: false })
      .order("user_id");
    if (data.search) query = query.ilike("full_name", `%${data.search}%`);
    const { data: rows, error, count } = await query.range(data.page * 24, data.page * 24 + 23);
    if (error) throw new Error("Members could not be loaded.");
    const ids = (rows ?? []).map((r) => r.user_id);
    const presence = ids.length
      ? await db.from("member_presence").select("user_id,last_active_at").in("user_id", ids)
      : { data: [], error: null };
    if (presence.error) throw new Error("Member presence could not be checked.");
    const map = new Map((presence.data ?? []).map((r) => [r.user_id, r.last_active_at]));
    const members = await Promise.all(
      (rows ?? []).map(async (r) => {
        let avatar = r.avatar_url;
        if (avatar && !avatar.startsWith("https://")) {
          const signed = await db.storage.from("avatars").createSignedUrl(avatar, 300);
          avatar = signed.data?.signedUrl ?? null;
        }
        return {
          userId: r.user_id,
          name: r.full_name,
          avatar,
          lastActiveAt: map.get(r.user_id) ?? null,
          online: hasFreshPresence(map.get(r.user_id)),
        };
      }),
    );
    return { members, total: count ?? 0, canReview: canReviewMember(actor) };
  });
export const getStaffMemberReview = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string; section?: string; page?: number }) => ({
    userId: String(d.userId ?? ""),
    section: String(d.section ?? "bookings"),
    page: Math.max(0, Math.floor(Number(d.page) || 0)),
  }))
  .handler(async ({ data }) => {
    const { loadStaffMemberReview } = await import("./member-review.server");
    return loadStaffMemberReview(data);
  });
export const getStaffMemberAIThread = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string }) => ({ userId: String(d.userId ?? "") }))
  .handler(async ({ data }) => {
    const { getMemberThread } = await import("./member-review.server");
    const thread = await getMemberThread(data.userId);
    return { id: thread.id, messagesJson: JSON.stringify(thread.messages) };
  });

export const getStaffRegisteredCounts = createServerFn({ method: "GET" }).handler(async () => {
  const { requireConsole, adminClient } = await import("./console.server");
  await requireConsole();
  const db = await adminClient();
  const [total, today] = await Promise.all([
    db.from("profiles").select("user_id", { head: true, count: "exact" }),
    db
      .from("profiles")
      .select("user_id", { head: true, count: "exact" })
      .gte("created_at", new Date().toISOString().slice(0, 10) + "T00:00:00Z"),
  ]);
  if (total.error || today.error || total.count === null || today.count === null)
    throw new Error("Member counts unavailable.");
  return { total: total.count, joinedToday: today.count };
});
