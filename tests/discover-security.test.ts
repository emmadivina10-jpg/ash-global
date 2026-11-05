import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, describe, expect, it } from "vitest";

const migrationPath = "supabase/migrations/20261104210000_public_discover_videos.sql";
const instructorId = "11111111-1111-4111-8111-111111111111";
const memberId = "22222222-2222-4222-8222-222222222222";
const otherId = "33333333-3333-4333-8333-333333333333";
const publicSpotlightId = "44444444-4444-4444-8444-444444444444";
const privateSpotlightId = "55555555-5555-4555-8555-555555555555";
const publicVideoPostId = "66666666-6666-4666-8666-666666666666";
const privateVideoPostId = "77777777-7777-4777-8777-777777777777";

let database: PGlite;

async function asRole<T>(
  role: "anon" | "authenticated",
  userId: string | null,
  run: () => Promise<T>,
) {
  await database.exec(`SET ROLE ${role}`);
  await database.exec(
    userId ? `SET request.jwt.claim.sub = '${userId}'` : "RESET request.jwt.claim.sub",
  );
  try {
    return await run();
  } finally {
    await database.exec("RESET ROLE; RESET request.jwt.claim.sub");
  }
}

beforeAll(async () => {
  database = new PGlite();
  await database.exec(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE SCHEMA auth;
    CREATE SCHEMA safety;
    CREATE SCHEMA storage;
    CREATE FUNCTION auth.uid() RETURNS uuid
      LANGUAGE sql STABLE
      AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE FUNCTION safety.ugc_visible(_owner uuid) RETURNS boolean
      LANGUAGE sql STABLE
      AS $$ SELECT _owner IS NOT NULL AND _owner <> '${otherId}'::uuid $$;

    CREATE TABLE public.campus_instructor_profiles (
      id uuid PRIMARY KEY,
      user_id uuid UNIQUE NOT NULL,
      display_name text NOT NULL,
      headline text NOT NULL DEFAULT '',
      bio text NOT NULL DEFAULT '',
      subjects text[] NOT NULL DEFAULT '{}',
      skills text[] NOT NULL DEFAULT '{}',
      is_active boolean NOT NULL,
      is_verified boolean NOT NULL,
      avatar_url text,
      years_experience integer NOT NULL DEFAULT 0,
      approved_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE public.public_profiles (user_id uuid PRIMARY KEY, avatar_url text);
    CREATE TABLE public.social_posts (
      id uuid PRIMARY KEY,
      author_id uuid NOT NULL,
      caption text NOT NULL DEFAULT '',
      media jsonb NOT NULL DEFAULT '[]',
      city text,
      like_count integer NOT NULL DEFAULT 0,
      comment_count integer NOT NULL DEFAULT 0,
      repost_count integer NOT NULL DEFAULT 0,
      filter_comments boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      is_published boolean NOT NULL,
      moderation_status text NOT NULL
    );
    CREATE TABLE public.spotlight_posts (
      id uuid PRIMARY KEY,
      author_id uuid NOT NULL,
      provider_id uuid,
      caption text NOT NULL DEFAULT '',
      media jsonb NOT NULL DEFAULT '[]',
      is_published boolean NOT NULL,
      moderation_status text NOT NULL,
      view_count integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE storage.objects (bucket_id text NOT NULL, name text NOT NULL);

    INSERT INTO public.campus_instructor_profiles
      (id, user_id, display_name, is_active, is_verified, avatar_url, skills)
    VALUES
      ('${instructorId}', '${instructorId}', 'Approved Instructor', true, true, 'avatar-path', ARRAY['math']),
      ('${memberId}', '${memberId}', 'Inactive Member', false, false, 'private-avatar', ARRAY['private']),
      ('${otherId}', '${otherId}', 'Restricted Instructor', true, true, NULL, '{}');
    INSERT INTO public.public_profiles (user_id, avatar_url) VALUES ('${instructorId}', 'avatar-path');
    INSERT INTO public.social_posts
      (id, author_id, caption, media, city, like_count, comment_count, repost_count, filter_comments, is_published, moderation_status)
    VALUES
      ('${publicVideoPostId}', '${instructorId}', 'Public video', '["${instructorId}/post/cover.jpg","${instructorId}/post/video.mp4","${otherId}/private.mp4"]', 'Douala', 3, 2, 1, true, true, 'APPROVED'),
      ('${privateVideoPostId}', '${instructorId}', 'Unpublished video', '["${instructorId}/post/unpublished.mp4"]', NULL, 0, 0, 0, false, false, 'APPROVED'),
      ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '${instructorId}', 'Pending video', '["${instructorId}/post/pending.mp4"]', NULL, 0, 0, 0, false, true, 'PENDING'),
      ('88888888-8888-4888-8888-888888888888', '${memberId}', 'Member video', '["${memberId}/post/member.mp4"]', NULL, 0, 0, 0, false, true, 'APPROVED'),
      ('99999999-9999-4999-8999-999999999999', '${otherId}', 'Restricted video', '["${otherId}/post/restricted.mp4"]', NULL, 0, 0, 0, false, true, 'APPROVED');
    INSERT INTO public.spotlight_posts
      (id, author_id, caption, media, is_published, moderation_status)
    VALUES
      ('${publicSpotlightId}', '${instructorId}', 'Published Spotlight', '[{"path":"${instructorId}/spotlight/photo.jpg","type":"image"},{"path":"${otherId}/protected.jpg","type":"image"}]', true, 'APPROVED'),
      ('${privateSpotlightId}', '${instructorId}', 'Unpublished Spotlight', '[{"path":"${instructorId}/spotlight/private.jpg","type":"image"}]', false, 'APPROVED'),
      ('aaaaaaaa-1111-4111-8111-111111111111', '${instructorId}', 'Foreign attachment', '[{"path":"${otherId}/protected.jpg","type":"image"}]', true, 'APPROVED'),
      ('bbbbbbbb-1111-4111-8111-111111111111', '${instructorId}', 'Pending Spotlight', '[{"path":"${instructorId}/spotlight/pending.jpg","type":"image"}]', true, 'PENDING');
    INSERT INTO storage.objects (bucket_id, name) VALUES
      ('spotlight', '${instructorId}/post/cover.jpg'),
      ('spotlight', '${instructorId}/post/video.mp4'),
      ('spotlight', '${otherId}/private.mp4'),
      ('spotlight', '${instructorId}/post/unpublished.mp4'),
      ('spotlight', '${instructorId}/post/pending.mp4'),
      ('spotlight', '${instructorId}/spotlight/photo.jpg'),
      ('spotlight', '${instructorId}/spotlight/private.jpg'),
      ('spotlight', '${instructorId}/spotlight/pending.jpg'),
      ('spotlight', '${otherId}/protected.jpg'),
      ('spotlight', '${memberId}/post/member.mp4'),
      ('spotlight', '${memberId}/private-attachment.zip');

    GRANT USAGE ON SCHEMA public, auth, safety, storage TO anon, authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
    GRANT EXECUTE ON FUNCTION safety.ugc_visible(uuid) TO anon, authenticated;
    GRANT SELECT, INSERT, UPDATE ON public.social_posts TO authenticated;
    GRANT SELECT ON public.spotlight_posts TO authenticated;
    GRANT SELECT, INSERT, UPDATE ON storage.objects TO authenticated;
    GRANT SELECT ON storage.objects TO anon;
    ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.spotlight_posts ENABLE ROW LEVEL SECURITY;
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "posts readable" ON public.social_posts
      FOR SELECT TO authenticated USING (is_published OR author_id = auth.uid());
    CREATE POLICY "posts insert own" ON public.social_posts
      FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
    CREATE POLICY "posts update own" ON public.social_posts
      FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
    CREATE POLICY "spotlight read published" ON public.spotlight_posts
      FOR SELECT TO authenticated USING (is_published OR author_id = auth.uid());
    CREATE POLICY "spotlight media insert own" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'spotlight' AND split_part(name, '/', 1) = auth.uid()::text);
    CREATE POLICY "spotlight media update own" ON storage.objects
      FOR UPDATE TO authenticated
      USING (bucket_id = 'spotlight' AND split_part(name, '/', 1) = auth.uid()::text)
      WITH CHECK (bucket_id = 'spotlight' AND split_part(name, '/', 1) = auth.uid()::text);
  `);
  await database.exec(await readFile(migrationPath, "utf8"));
});

afterAll(async () => {
  await database.close();
});

describe("Discover and guest-access RLS", () => {
  it("returns only published, approved instructor videos and only video paths", async () => {
    const result = await asRole("anon", null, () =>
      database.query<{ id: string; media: string[]; like_count: number }>(
        "SELECT id, media, like_count FROM public.discover_video_feed()",
      ),
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      id: publicVideoPostId,
      media: [`${instructorId}/post/video.mp4`],
      like_count: 3,
    });
    expect(Object.keys(result.rows[0] ?? {}).sort()).toEqual(["id", "like_count", "media"]);
  });

  it("permits anonymous storage reads only for approved public videos and published Spotlight media", async () => {
    const result = await asRole("anon", null, () =>
      database.query<{ name: string }>("SELECT name FROM storage.objects ORDER BY name"),
    );
    const names = new Set(result.rows.map((row) => row.name));
    expect(names.has(`${instructorId}/post/video.mp4`)).toBe(true);
    expect(names.has(`${instructorId}/spotlight/photo.jpg`)).toBe(true);
    expect(names.has(`${instructorId}/post/cover.jpg`)).toBe(false);
    expect(names.has(`${otherId}/private.mp4`)).toBe(false);
    expect(names.has(`${instructorId}/post/unpublished.mp4`)).toBe(false);
    expect(names.has(`${instructorId}/post/pending.mp4`)).toBe(false);
    expect(names.has(`${instructorId}/spotlight/private.jpg`)).toBe(false);
    expect(names.has(`${instructorId}/spotlight/pending.jpg`)).toBe(false);
    expect(names.has(`${otherId}/protected.jpg`)).toBe(false);
    expect(names.has(`${memberId}/private-attachment.zip`)).toBe(false);

    const checks = await asRole("anon", null, () =>
      database.query<{ name: string; visible: boolean }>(
        `SELECT name, public.discover_public_spotlight_media_visible(name) AS visible
         FROM (VALUES
           ('${instructorId}/post/cover.jpg'),
           ('${otherId}/private.mp4'),
           ('${instructorId}/post/unpublished.mp4'),
           ('${memberId}/private-attachment.zip')
         ) AS paths(name)`,
      ),
    );
    expect(checks.rows.every((row) => !row.visible)).toBe(true);
  });

  it("limits guest Spotlight reads to public columns and published approved posts", async () => {
    const result = await asRole("anon", null, () =>
      database.query<{ id: string; caption: string; media: unknown }>(
        "SELECT * FROM public.discover_public_spotlight_feed()",
      ),
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      id: publicSpotlightId,
      caption: "Published Spotlight",
      media: [{ path: `${instructorId}/spotlight/photo.jpg`, type: "image" }],
    });
    expect(Object.keys(result.rows[0] ?? {}).sort()).toEqual([
      "author_id",
      "caption",
      "created_at",
      "id",
      "media",
      "provider_id",
    ]);
    await expect(
      asRole("anon", null, () => database.query("SELECT id FROM public.spotlight_posts")),
    ).rejects.toThrow();
  });

  it("returns only public fields for active, safety-visible instructors", async () => {
    const result = await asRole("anon", null, () =>
      database.query("SELECT * FROM public.discover_active_instructors()"),
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      id: instructorId,
      user_id: instructorId,
      display_name: "Approved Instructor",
      avatar_url: "avatar-path",
    });
    expect(Object.keys(result.rows[0] ?? {}).sort()).toEqual([
      "avatar_url",
      "bio",
      "display_name",
      "headline",
      "id",
      "is_active",
      "is_verified",
      "skills",
      "subjects",
      "user_id",
    ]);
    await expect(
      asRole("anon", null, () =>
        database.query("SELECT display_name FROM public.campus_instructor_profiles"),
      ),
    ).rejects.toThrow();
  });

  it("blocks non-instructor video uploads and post inserts while allowing active instructors", async () => {
    await asRole("authenticated", memberId, async () => {
      await expect(
        database.query("INSERT INTO storage.objects (bucket_id, name) VALUES ('spotlight', $1)", [
          `${memberId}/post/blocked.mp4`,
        ]),
      ).rejects.toThrow();
      await expect(
        database.query(
          "INSERT INTO public.social_posts (id, author_id, media, is_published, moderation_status) VALUES ($1, $2, $3, true, 'PENDING')",
          [
            "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            memberId,
            JSON.stringify([`${memberId}/post/blocked.mp4`]),
          ],
        ),
      ).rejects.toThrow();
      await database.query(
        "INSERT INTO storage.objects (bucket_id, name) VALUES ('spotlight', $1)",
        [`${memberId}/post/allowed.jpg`],
      );
      await database.query(
        "INSERT INTO storage.objects (bucket_id, name) VALUES ('spotlight', $1)",
        [`${memberId}/story/allowed.mp4`],
      );
      await database.query(
        "INSERT INTO storage.objects (bucket_id, name) VALUES ('spotlight', $1)",
        [`${memberId}/spotlight/allowed.mp4`],
      );
    });

    await asRole("authenticated", instructorId, async () => {
      await database.query(
        "INSERT INTO storage.objects (bucket_id, name) VALUES ('spotlight', $1)",
        [`${instructorId}/post/allowed.mp4`],
      );
      await database.query(
        "INSERT INTO public.social_posts (id, author_id, media, is_published, moderation_status) VALUES ($1, $2, $3, true, 'PENDING')",
        [
          "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          instructorId,
          JSON.stringify([`${instructorId}/post/allowed.mp4`]),
        ],
      );
    });
  });

  it("allows only active instructors through the route authorization RPC", async () => {
    const allowed = await asRole("authenticated", instructorId, () =>
      database.query<{ current_user_is_active_campus_instructor: boolean }>(
        "SELECT public.current_user_is_active_campus_instructor()",
      ),
    );
    const denied = await asRole("authenticated", memberId, () =>
      database.query<{ current_user_is_active_campus_instructor: boolean }>(
        "SELECT public.current_user_is_active_campus_instructor()",
      ),
    );
    expect(allowed.rows[0]?.current_user_is_active_campus_instructor).toBe(true);
    expect(denied.rows[0]?.current_user_is_active_campus_instructor).toBe(false);
  });
});
