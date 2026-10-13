import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type IdentityStatus = { attempts: number; restricted: boolean; banned: boolean };

export const reviewIdentityPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ path: z.string().max(240) }).parse(input))
  .handler(async ({ data, context }) => {
    if (!data.path.startsWith(`${context.userId}/`) || data.path.includes(".."))
      throw new Error("INVALID_PHOTO_PATH");
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { photoHashes } = await import("./identity-photo.server");
    const own = await db.storage.from("avatars").download(data.path);
    if (own.error || !own.data || own.data.size > 5 * 1024 * 1024)
      throw new Error("PHOTO_CHECK_UNAVAILABLE");
    const hashes = photoHashes(new Uint8Array(await own.data.arrayBuffer()));
    // Page through every active verified profile, including photographs uploaded before this protection existed.
    for (let offset = 0; ; offset += 100) {
      const { data: rows, error } = await db
        .from("profiles")
        .select("user_id, avatar_url, verified_until")
        .not("verified_tier", "is", null)
        .not("avatar_url", "is", null)
        .neq("user_id", context.userId)
        .order("user_id")
        .range(offset, offset + 99);
      if (error) throw new Error("PHOTO_CHECK_UNAVAILABLE");
      for (const row of rows ?? []) {
        if (
          !row.avatar_url ||
          !row.verified_until ||
          new Date(row.verified_until).getTime() <= Date.now()
        )
          continue;
        let path = row.avatar_url;
        if (path.startsWith("https://")) {
          const url = new URL(path);
          const cloud = new URL(process.env["SUPABASE_URL"] ?? "http://invalid.local");
          if (url.origin !== cloud.origin)
            throw new Error(
              "A verified photo needs staff review before this upload can be checked.",
            );
          const match = url.pathname.match(
            /\/storage\/v1\/object\/(?:sign|public|authenticated)\/avatars\/(.+)$/,
          );
          if (!match?.[1]) throw new Error("PHOTO_CHECK_UNAVAILABLE");
          path = decodeURIComponent(match[1]);
        }
        const cached = await db
          .from("identity_photo_reviews")
          .select("file_hash,pixel_hash")
          .eq("object_path", path)
          .maybeSingle();
        if (cached.error) throw new Error("PHOTO_CHECK_UNAVAILABLE");
        let protectedHashes = cached.data;
        if (!protectedHashes) {
          const stored = await db.storage.from("avatars").download(path);
          if (stored.error || !stored.data || stored.data.size > 5 * 1024 * 1024)
            throw new Error("PHOTO_CHECK_UNAVAILABLE");
          protectedHashes = photoHashes(new Uint8Array(await stored.data.arrayBuffer()));
          const cache = await db.from("identity_photo_reviews").upsert({
            object_path: path,
            user_id: row.user_id,
            ...protectedHashes,
            approved: true,
          });
          if (cache.error) throw new Error("PHOTO_CHECK_UNAVAILABLE");
        }
        if (
          hashes.file_hash === protectedHashes.file_hash ||
          hashes.pixel_hash === protectedHashes.pixel_hash
        ) {
          const denial = await db.rpc("record_identity_denial", {
            _actor: context.userId,
            _owner: row.user_id,
            _kind: "PHOTO",
            _value: data.path,
          });
          if (denial.error) throw new Error("IDENTITY_CHECK_FAILED");
          const status = denial.data as unknown as IdentityStatus;
          if (status.banned) {
            const ban = await db
              .from("profiles")
              .update({
                moderation_banned_at: new Date().toISOString(),
                moderation_ban_reason: "VERIFIED_IDENTITY_IMPERSONATION",
              })
              .eq("user_id", context.userId)
              .is("moderation_banned_at", null);
            if (ban.error) throw new Error("IDENTITY_CHECK_FAILED");
            const token = (await import("@tanstack/react-start/server"))
              .getRequest()
              .headers.get("authorization")
              ?.replace(/^Bearer /, "");
            if (token) await db.auth.admin.signOut(token, "global");
          }
          await db.storage.from("avatars").remove([data.path]);
          return { ok: false as const, ...status };
        }
      }
      if ((rows?.length ?? 0) < 100) break;
    }
    const review = await db
      .from("identity_photo_reviews")
      .upsert({ object_path: data.path, user_id: context.userId, ...hashes, approved: true });
    if (review.error) throw new Error("PHOTO_CHECK_UNAVAILABLE");
    return { ok: true as const, attempts: 0, restricted: false, banned: false };
  });

export const restoreIdentityAccount = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid(), reason: z.string().trim().min(3).max(500) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { requireDepartment, adminClient } = await import("./console.server");
    const actor = await requireDepartment("TRUST");
    const db = await adminClient();
    const result = await db.rpc("restore_identity_access", {
      _uid: data.userId,
      _actor: `${actor.name} (${actor.department})`,
      _reason: data.reason,
    });
    if (result.error) throw new Error("Could not restore account.");
    return { ok: true };
  });
