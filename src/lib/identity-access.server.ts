export async function enforceIdentityAccess(request: Request, functionName: string) {
  const bearer = request.headers.get("authorization");
  if (!bearer?.startsWith("Bearer ")) return;
  if (functionName === "reviewIdentityPhoto") return;
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const { data, error } = await db.auth.getUser(bearer.slice(7));
  if (error || !data.user) throw new Error("UNAUTHORIZED");
  const restriction = await db.from("identity_restrictions").select("restricted_at,restored_at").eq("user_id", data.user.id).maybeSingle();
  if (restriction.error) throw new Error("IDENTITY_STATUS_UNAVAILABLE");
  if (restriction.data?.restricted_at && !restriction.data.restored_at) throw new Error("DENIED_IDENTITY_RESTRICTED");
}