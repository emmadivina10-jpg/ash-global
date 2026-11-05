import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20261104214000_restrict_anon_provider_profile_columns.sql";
const liveOwner = "11111111-1111-4111-8111-111111111111";
const hiddenOwner = "22222222-2222-4222-8222-222222222222";
const removedOwner = "33333333-3333-4333-8333-333333333333";
const liveProvider = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

let database: PGlite;

async function asAnon<T>(run: () => Promise<T>) {
  await database.exec("SET ROLE anon");
  try {
    return await run();
  } finally {
    await database.exec("RESET ROLE");
  }
}

async function denied(sql: string) {
  return asAnon(async () => {
    try {
      await database.query(sql);
      return null;
    } catch (error) {
      return (error as Error).message;
    }
  });
}

beforeAll(async () => {
  database = new PGlite();
  await database.exec(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE SCHEMA safety;
    CREATE FUNCTION safety.ugc_visible(_user uuid) RETURNS boolean
      LANGUAGE sql AS $$ SELECT true $$;
    CREATE TABLE public.provider_profiles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL,
      business_name text NOT NULL,
      bio text,
      city text,
      phone text,
      whatsapp text,
      categories text[] NOT NULL DEFAULT '{}',
      avatar_url text,
      cover_url text,
      is_live boolean NOT NULL DEFAULT false,
      subscription_expires_at timestamptz,
      rating_avg numeric NOT NULL DEFAULT 0,
      rating_count integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      billing_mode text,
      is_verified boolean NOT NULL DEFAULT false,
      accepting_bookings boolean NOT NULL DEFAULT true,
      service_areas text[],
      completed_bookings integer NOT NULL DEFAULT 0,
      slug text,
      tagline text,
      verification_status text,
      verification_requested_at timestamptz,
      verified_at timestamptz,
      slot_minutes integer,
      booking_lead_hours integer,
      country text,
      moderation_status text NOT NULL DEFAULT 'APPROVED'
    );
    GRANT SELECT ON public.provider_profiles TO anon, authenticated;
    ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Public can view live storefronts" ON public.provider_profiles
      FOR SELECT TO anon USING (is_live = true);
    CREATE POLICY "members read" ON public.provider_profiles
      FOR SELECT TO authenticated USING (true);
    CREATE POLICY "moderation removed hidden" ON public.provider_profiles
      AS RESTRICTIVE FOR SELECT USING (moderation_status <> 'REMOVED');

    INSERT INTO public.provider_profiles
      (id, user_id, business_name, phone, whatsapp, is_live, slug, subscription_expires_at,
       verification_status, slot_minutes, moderation_status)
    VALUES
      ('${liveProvider}', '${liveOwner}', 'Live Studio', '+237600000001', '+237600000002', true,
       'live-studio', now() + interval '30 days', 'APPROVED', 30, 'APPROVED'),
      (gen_random_uuid(), '${hiddenOwner}', 'Draft Studio', '+237600000003', '+237600000004', false,
       'draft-studio', NULL, 'NONE', 30, 'APPROVED'),
      (gen_random_uuid(), '${removedOwner}', 'Removed Studio', '+237600000005', '+237600000006', true,
       'removed-studio', NULL, 'NONE', 30, 'REMOVED');
  `);
  await database.exec(await readFile(migrationPath, "utf8"));
});

afterAll(async () => {
  await database.close();
});

describe("anonymous provider storefront access", () => {
  it("returns the public storefront columns for live providers only", async () => {
    const rows = await asAnon(() =>
      database.query<{ business_name: string }>(
        "SELECT business_name, slug, city, rating_avg, is_verified FROM public.provider_profiles ORDER BY business_name",
      ),
    );
    expect(rows.rows.map((row) => row.business_name)).toEqual(["Live Studio"]);
  });

  it.each([
    "phone",
    "whatsapp",
    "user_id",
    "subscription_expires_at",
    "billing_mode",
    "verification_status",
    "verification_requested_at",
    "verified_at",
    "slot_minutes",
    "booking_lead_hours",
    "moderation_status",
  ])("denies anonymous reads of %s", async (column) => {
    expect(await denied(`SELECT ${column} FROM public.provider_profiles`)).toMatch(
      /permission denied/i,
    );
  });

  it("denies select * and filtering by a withheld column", async () => {
    expect(await denied("SELECT * FROM public.provider_profiles")).toMatch(/permission denied/i);
    expect(
      await denied(`SELECT id FROM public.provider_profiles WHERE user_id = '${liveOwner}'`),
    ).toMatch(/permission denied/i);
  });

  it("keeps signed-in member access to every column", async () => {
    await database.exec("SET ROLE authenticated");
    try {
      const result = await database.query<{ phone: string }>(
        `SELECT phone, user_id FROM public.provider_profiles WHERE id = '${liveProvider}'`,
      );
      expect(result.rows[0]?.phone).toBe("+237600000001");
    } finally {
      await database.exec("RESET ROLE");
    }
  });
});

describe("public_provider_identities", () => {
  it("echoes the owner id only for ids the caller supplied", async () => {
    const byOwner = await asAnon(() =>
      database.query<{ user_id: string | null }>(
        `SELECT user_id FROM public.public_provider_identities(ARRAY['${liveOwner}']::uuid[], '{}')`,
      ),
    );
    expect(byOwner.rows).toEqual([{ user_id: liveOwner }]);

    const byProvider = await asAnon(() =>
      database.query<{ user_id: string | null }>(
        `SELECT user_id FROM public.public_provider_identities('{}', ARRAY['${liveProvider}']::uuid[])`,
      ),
    );
    expect(byProvider.rows).toEqual([{ user_id: null }]);
  });

  it("omits draft and removed storefronts", async () => {
    const result = await asAnon(() =>
      database.query(
        `SELECT id FROM public.public_provider_identities(ARRAY['${hiddenOwner}','${removedOwner}']::uuid[], '{}')`,
      ),
    );
    expect(result.rows).toEqual([]);
  });

  it("returns no contact or administrative columns", async () => {
    const result = await asAnon(() =>
      database.query(
        `SELECT * FROM public.public_provider_identities(ARRAY['${liveOwner}']::uuid[], '{}')`,
      ),
    );
    const names = result.fields.map((field) => field.name);
    for (const withheld of ["phone", "whatsapp", "subscription_expires_at", "moderation_status"]) {
      expect(names).not.toContain(withheld);
    }
  });
});
