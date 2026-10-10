import { adminClient, requireConsole } from "./console.server";
import { canReviewMember } from "./member-insights";
import type { UIMessage } from "ai";
export async function reviewActor() {
  const actor = await requireConsole();
  if (!canReviewMember(actor)) throw new Error("FORBIDDEN_MEMBER_REVIEW");
  return actor;
}
export function validateMemberId(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    throw new Error("INVALID_MEMBER");
}
export async function loadStaffMemberReview(data: {
  userId: string;
  section: string;
  page: number;
}) {
  const actor = await reviewActor();
  validateMemberId(data.userId);
  const db = await adminClient();
  const { data: profile, error } = await db
    .from("profiles")
    .select(
      "user_id,full_name,username,avatar_url,account_status,created_at,verified_tier,moderation_banned_at,moderation_suspended_until",
    )
    .eq("user_id", data.userId)
    .single();
  if (error || !profile) throw new Error("Member could not be loaded.");
  const start = data.page * 25;
  const section = data.section;
  const query =
    section === "transactions"
      ? db
          .from("transactions")
          .select("id,type,amount,currency,status,created_at", { count: "exact" })
          .eq("user_id", data.userId)
      : section === "support"
        ? db
            .from("support_tickets")
            .select("id,subject,status,priority,created_at", { count: "exact" })
            .eq("user_id", data.userId)
        : section === "posts"
          ? db
              .from("social_posts")
              .select("id,caption,created_at", { count: "exact" })
              .eq("author_id", data.userId)
          : section === "referrals"
            ? db
                .from("referrals")
                .select("id,level,activation_status,commission_status,created_at", {
                  count: "exact",
                })
                .eq("referrer_id", data.userId)
            : db
                .from("bookings")
                .select(
                  "id,service_title,status,price,payment_currency,paid_at,verification_status,provider_transfer_status,created_at",
                  { count: "exact" },
                )
                .eq("client_id", data.userId);
  const result = await query
    .order("created_at", { ascending: false })
    .order("id")
    .range(start, start + 24);
  if (result.error) throw new Error("Member records could not be loaded.");
  const audit = await db
    .from("admin_audit_log")
    .insert({
      actor: actor.name,
      action: "STAFF_MEMBER_REVIEW",
      target_user_id: data.userId,
      metadata: { staffId: actor.staffId, department: actor.department, section, page: data.page },
    });
  if (audit.error) throw new Error("Account review could not be recorded.");
  return {
    profile,
    rows: result.data as unknown as Record<string, string | number | boolean | null>[],
    total: result.count ?? 0,
    section,
    department: actor.department,
    superAdmin: actor.superAdmin,
  };
}
export async function getMemberThread(userId: string) {
  const actor = await reviewActor();
  validateMemberId(userId);
  const db = await adminClient();
  const scope = actor.staffId ?? "master-admin";
  const { data: exists, error: profileError } = await db
    .from("profiles")
    .select("user_id")
    .eq("user_id", userId)
    .single();
  if (profileError || !exists) throw new Error("Member could not be loaded.");
  const table = db.from("staff_member_ai_threads" as never);
  const upsert = await table.upsert({ member_id: userId, staff_scope: scope } as never, {
    onConflict: "member_id,staff_scope",
    ignoreDuplicates: true,
  });
  if (upsert.error)
    throw new Error("Secure AI history requires the approved staff insights update.");
  const result = await db
    .from("staff_member_ai_threads" as never)
    .select("*")
    .eq("member_id", userId)
    .eq("staff_scope", scope)
    .limit(1);
  if (result.error || !result.data) throw new Error("Secure AI history could not be loaded.");
  const row = (result.data as unknown as unknown[])[0] as {
    id: string;
    messages: UIMessage[];
    version: number;
  };
  if (!row) throw new Error("Secure AI history could not be loaded.");
  return { ...row, userId, scope };
}
