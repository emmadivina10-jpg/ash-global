import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20261105010000_split_provider_availability_public_policy.sql";
const ownerId = "11111111-1111-4111-8111-111111111111";
const guestId = "22222222-2222-4222-8222-222222222222";
const liveProviderId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const privateProviderId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

let database: PGlite;

async function asRole<T>(
  role: "anon" | "authenticated",
  userId: string | null,
  run: () => Promise<T>,
) {
  await database.exec(`SET ROLE ${role}`);
  if (userId) {
    await database.exec(`SET request.jwt.claim.sub = '${userId}'`);
  }
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
    CREATE FUNCTION auth.uid() RETURNS uuid
      LANGUAGE sql STABLE
      AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE FUNCTION safety.identity_access_allowed(_uid uuid) RETURNS boolean
      LANGUAGE sql STABLE
      AS $$ SELECT true $$;

    CREATE TABLE public.provider_profiles (
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL,
      is_live boolean NOT NULL
    );
    CREATE TABLE public.provider_availability (
      id uuid PRIMARY KEY,
      provider_id uuid NOT NULL,
      weekday integer NOT NULL
    );

    GRANT SELECT (id, is_live) ON public.provider_profiles TO anon;
    GRANT SELECT ON public.provider_profiles TO authenticated;
    GRANT SELECT ON public.provider_availability TO anon, authenticated;
    ALTER TABLE public.provider_availability ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Availability readable for live providers" ON public.provider_availability
      FOR SELECT TO anon, authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.provider_profiles p
          WHERE p.id = provider_id AND (p.is_live OR p.user_id = auth.uid())
        )
        AND safety.identity_access_allowed(auth.uid())
      );

    INSERT INTO public.provider_profiles (id, user_id, is_live) VALUES
      ('${liveProviderId}', '${ownerId}', true),
      ('${privateProviderId}', '${ownerId}', false);
    INSERT INTO public.provider_availability (id, provider_id, weekday) VALUES
      ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '${liveProviderId}', 1),
      ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '${privateProviderId}', 2);
  `);
  await database.exec(await readFile(migrationPath, "utf8"));
});

afterAll(async () => {
  await database.close();
});

describe("provider availability after storefront column restrictions", () => {
  it("allows anonymous reads for live storefronts without granting user_id", async () => {
    const result = await asRole("anon", null, () =>
      database.query<{ provider_id: string }>(
        "SELECT provider_id FROM public.provider_availability ORDER BY weekday",
      ),
    );
    expect(result.rows).toEqual([{ provider_id: liveProviderId }]);

    await expect(
      asRole("anon", null, () => database.query("SELECT user_id FROM public.provider_profiles")),
    ).rejects.toThrow(/permission denied/i);
  });

  it("preserves authenticated owner reads for private provider availability", async () => {
    const result = await asRole("authenticated", ownerId, () =>
      database.query<{ provider_id: string }>(
        "SELECT provider_id FROM public.provider_availability ORDER BY weekday",
      ),
    );
    expect(result.rows).toEqual([
      { provider_id: liveProviderId },
      { provider_id: privateProviderId },
    ]);
  });

  it("does not grant normal authenticated users private provider availability", async () => {
    const result = await asRole("authenticated", guestId, () =>
      database.query<{ provider_id: string }>(
        "SELECT provider_id FROM public.provider_availability ORDER BY weekday",
      ),
    );
    expect(result.rows).toEqual([{ provider_id: liveProviderId }]);
  });
});
