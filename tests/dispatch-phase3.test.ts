import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Isolated PGlite only: live foundation + live phase-1 rules + live phase 2 + PROPOSED phase 3.
const FOUNDATION = readFileSync("supabase/migrations/20261030000000_ash_dispatch_foundation.sql", "utf8");
const PHASE1 = readFileSync("docs/proposed/dispatch_access_rules.sql", "utf8");
const PHASE2 = readFileSync("docs/proposed/dispatch_riders_phase2.sql", "utf8");
const PHASE3 = readFileSync("docs/proposed/dispatch_phase3_accept_guard.sql", "utf8");
const ROLLBACK3 = readFileSync("docs/proposed/dispatch_phase3_accept_guard_rollback.sql", "utf8");

const CUSTOMER = "11111111-1111-1111-1111-111111111111";
const VENDOR = "22222222-2222-2222-2222-222222222222";
const RIDER = "33333333-3333-3333-3333-333333333333";
const RIDER2 = "44444444-4444-4444-4444-444444444444";
const STRANGER = "55555555-5555-5555-5555-555555555555";
const ADMIN = "66666666-6666-6666-6666-666666666666";
const VENDOR2 = "77777777-7777-7777-7777-777777777777";

const db = new PGlite();
async function as<T = Record<string, unknown>>(user: string | null, sql: string, params: unknown[] = []) {
  await db.exec("RESET ROLE");
  await db.query("SELECT set_config('test.uid', $1, false)", [user ?? ""]);
  await db.exec(user ? "SET ROLE authenticated" : "SET ROLE anon");
  try { return (await db.query<T>(sql, params)).rows; } finally { await db.exec("RESET ROLE"); }
}
async function err(user: string | null, sql: string, params: unknown[] = []) {
  try { await as(user, sql, params); return "NO_ERROR"; } catch (e) { return (e as Error).message; }
}
const rider = async (id: string) =>
  (await db.query<Record<string, unknown>>("SELECT * FROM dispatch_riders WHERE user_id=$1", [id])).rows[0];

async function register(u: string, vehicle = "MOTORCYCLE") {
  await as(u, "SELECT dispatch_rider_register('Jean Rider','+237670000000','Douala',$1,'lt 123 ab')", [vehicle]);
}
async function verify(u: string) {
  await register(u);
  for (const d of ["NATIONAL_ID", "SELFIE", "DRIVER_LICENCE"]) await as(u, "SELECT dispatch_rider_add_document($1,$2)", [d, `${u}/${d}.jpg`]);
  await as(u, "SELECT dispatch_rider_submit_verification()");
  await as(ADMIN, "SELECT dispatch_rider_review($1,'VERIFIED')", [u]);
}
async function newJob(mode = "ASH_DISPATCH") {
  const [r] = await as<{ id: string }>(CUSTOMER, "SELECT dispatch_request_job($1,$2,'Akwa, Douala','Bonapriso, Douala') AS id", [VENDOR, mode]);
  await as(VENDOR, "SELECT dispatch_set_quote($1,1500)", [r!.id]);
  await as(CUSTOMER, "SELECT dispatch_approve_quote($1,1500)", [r!.id]);
  return r!.id;
}

beforeAll(async () => {
  await db.exec(`
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;
    GRANT USAGE ON SCHEMA public TO anon, authenticated;
    CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO anon, authenticated;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
    CREATE TABLE public.profiles (user_id uuid PRIMARY KEY);
    CREATE TABLE public.provider_profiles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid);
    CREATE TYPE public.app_role AS ENUM ('admin','user','clean_worker');
    CREATE TABLE public.user_roles (user_id uuid, role app_role);
    CREATE FUNCTION public.has_role(_user_id uuid, _role app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
      AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
    CREATE SCHEMA storage; GRANT USAGE ON SCHEMA storage TO authenticated, anon;
    CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean);
    CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; GRANT SELECT, INSERT ON storage.objects TO authenticated;
    CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT string_to_array(name, '/') $$;
  `);
  for (const u of [CUSTOMER, VENDOR, RIDER, RIDER2, STRANGER, ADMIN, VENDOR2]) {
    await db.query("INSERT INTO auth.users VALUES ($1)", [u]);
    await db.query("INSERT INTO public.profiles VALUES ($1)", [u]);
  }
  await db.query("INSERT INTO provider_profiles(user_id) VALUES ($1),($2)", [VENDOR, VENDOR2]);
  await db.query("INSERT INTO user_roles VALUES ($1,'admin')", [ADMIN]);
  await db.exec(FOUNDATION);
  await db.exec(`ALTER TABLE dispatch_pickup_verifications RENAME COLUMN code TO code_hash;
    ALTER TABLE dispatch_pickup_verifications ADD COLUMN expires_at timestamptz;`);
  await db.exec(PHASE1);
  await db.exec(`BEGIN; ${PHASE2}; COMMIT;`);
  await db.exec(`BEGIN; ${PHASE3}; COMMIT;`);
});
afterAll(async () => { await db.close(); });

async function offer(u: string) {
  const job = await newJob();
  await as(u, "SELECT dispatch_rider_set_availability('AVAILABLE')");
  await as(ADMIN, "SELECT dispatch_assign_rider($1,$2)", [job, u]);
  return job;
}

describe("phase 3: accept-time rider check", () => {
  it("rider who went offline after being offered cannot accept", async () => {
    await verify(RIDER);
    const job = await offer(RIDER);
    await as(RIDER, "SELECT dispatch_rider_set_availability('OFFLINE')");
    expect(await err(RIDER, "SELECT dispatch_rider_respond($1,true)", [job])).toContain("RIDER_UNAVAILABLE");
    await as(RIDER, "SELECT dispatch_rider_set_availability('AVAILABLE')");
    expect(await err(RIDER, "SELECT dispatch_rider_respond($1,true)", [job])).toBe("NO_ERROR");
  });
  it("rider can still decline while offline", async () => {
    await verify(RIDER2);
    const job = await offer(RIDER2);
    await as(RIDER2, "SELECT dispatch_rider_set_availability('OFFLINE')");
    expect(await err(RIDER2, "SELECT dispatch_rider_respond($1,false)", [job])).toBe("NO_ERROR");
  });
});

describe("phase 3: live location", () => {
  const VENDOR_TEAM_ONLY = VENDOR2;
  const loc = (u: string | null, job: string) => as<{ latitude: number }>(u, "SELECT * FROM dispatch_job_rider_location($1)", [job]);
  const rows = async (job: string) => (await db.query("SELECT 1 FROM dispatch_job_live_locations WHERE delivery_id=$1", [job])).rows.length;
  let job = "";
  it("only the assigned rider on an active delivery can share; input validated", async () => {
    [{ id: job }] = await as<{ id: string }>(ADMIN, "SELECT id FROM dispatch_jobs WHERE rider_user_id=$1 AND status='ACCEPTED'", [RIDER]) as { id: string }[];
    expect(await err(RIDER2, "SELECT dispatch_rider_update_location($1,4.05,9.7)", [job])).toContain("NOT_ON_DELIVERY");
    expect(await err(STRANGER, "SELECT dispatch_rider_update_location($1,4.05,9.7)", [job])).toContain("NOT_ON_DELIVERY");
    expect(await err(RIDER, "SELECT dispatch_rider_update_location($1,95,9.7)", [job])).toContain("INVALID_INPUT");
    expect(await err(RIDER, "SELECT dispatch_rider_update_location($1,4.05,9.7,12)", [job])).toBe("NO_ERROR");
  });
  it("customer, rider, shop and staff can read; strangers, other shops and visitors cannot", async () => {
    for (const u of [CUSTOMER, RIDER, VENDOR, ADMIN]) expect((await loc(u, job))[0]?.latitude).toBe(4.05);
    expect(await loc(STRANGER, job)).toHaveLength(0);
    expect(await loc(VENDOR_TEAM_ONLY, job)).toHaveLength(0);
    expect(await loc(RIDER2, job)).toHaveLength(0);
    expect(await err(null, "SELECT * FROM dispatch_job_rider_location($1)", [job])).toContain("permission denied");
  });
  it("the location table cannot be read or written directly by anyone signed in", async () => {
    for (const u of [CUSTOMER, RIDER, VENDOR, ADMIN]) {
      expect(await err(u, "SELECT * FROM dispatch_job_live_locations")).toContain("permission denied");
      expect(await err(u, "UPDATE dispatch_job_live_locations SET latitude=0")).toContain("permission denied");
    }
    expect(await err(null, "SELECT * FROM dispatch_job_live_locations")).toContain("permission denied");
    expect(await err(CUSTOMER, "SELECT dispatch_clear_live_location()")).toContain("permission denied");
  });
  it("position is erased when the delivery is completed", async () => {
    await as(RIDER, "SELECT dispatch_rider_progress($1,'PICKUP_CONFIRMED')", [job]);
    await as(RIDER, "SELECT dispatch_rider_progress($1,'IN_TRANSIT')", [job]);
    await as(RIDER, "SELECT dispatch_rider_update_location($1,4.06,9.71)", [job]);
    const [{ code }] = await as<{ code: string }>(CUSTOMER, "SELECT dispatch_issue_handover_code($1) AS code", [job]);
    expect((await as<{ r: string }>(RIDER, "SELECT dispatch_complete_with_code($1,$2) AS r", [job, code]))[0]!.r).toBe("OK");
    expect(await rows(job)).toBe(0);
    expect(await loc(CUSTOMER, job)).toHaveLength(0);
    expect(await err(RIDER, "SELECT dispatch_rider_update_location($1,4.05,9.7)", [job])).toContain("NOT_ON_DELIVERY");
  });
  it("position is erased when the delivery is cancelled, and when the rider stops sharing", async () => {
    await as(RIDER2, "SELECT dispatch_rider_set_availability('AVAILABLE')");
    const j2 = await offer(RIDER2);
    await as(RIDER2, "SELECT dispatch_rider_respond($1,true)", [j2]);
    await as(RIDER2, "SELECT dispatch_rider_update_location($1,4.05,9.7)", [j2]);
    await as(RIDER2, "SELECT dispatch_rider_stop_location($1)", [j2]);
    expect(await rows(j2)).toBe(0);
    await as(RIDER2, "SELECT dispatch_rider_update_location($1,4.05,9.7)", [j2]);
    expect(await rows(j2)).toBe(1);
    await as(CUSTOMER, "SELECT dispatch_cancel($1)", [j2]);
    expect(await rows(j2)).toBe(0);
    expect(await loc(VENDOR, j2)).toHaveLength(0);
  });
});

describe("end-to-end journeys (isolated)", () => {
  const rows = async (job: string) => (await db.query("SELECT 1 FROM dispatch_job_live_locations WHERE delivery_id=$1", [job])).rows.length;
  it("shop-owned rider: invite, assign, accept, share, deliver; location erased", async () => {
    const c = (await as<{ c: string }>(VENDOR, "SELECT dispatch_vendor_create_invite() AS c"))[0]!.c;
    await as(RIDER2, "SELECT dispatch_rider_redeem_invite($1)", [c]);
    await as(RIDER2, "SELECT dispatch_rider_set_availability('AVAILABLE')");
    const job = await newJob("VENDOR_DISPATCH");
    expect(await err(VENDOR2, "SELECT dispatch_assign_rider($1,$2)", [job, RIDER2])).toContain("NOT_ALLOWED");
    await as(VENDOR, "SELECT dispatch_assign_rider($1,$2)", [job, RIDER2]);
    await as(RIDER2, "SELECT dispatch_rider_respond($1,true)", [job]);
    await as(RIDER2, "SELECT dispatch_rider_update_location($1,4.0,9.6)", [job]);
    expect((await as<{ latitude: number }>(VENDOR, "SELECT * FROM dispatch_job_rider_location($1)", [job]))[0]?.latitude).toBe(4.0);
    await as(RIDER2, "SELECT dispatch_rider_progress($1,'PICKUP_CONFIRMED')", [job]);
    await as(RIDER2, "SELECT dispatch_rider_progress($1,'IN_TRANSIT')", [job]);
    const [{ code }] = await as<{ code: string }>(CUSTOMER, "SELECT dispatch_issue_handover_code($1) AS code", [job]);
    expect((await as<{ r: string }>(RIDER2, "SELECT dispatch_complete_with_code($1,'000000') AS r", [job]))[0]!.r).toBe(code === "000000" ? "OK" : "WRONG");
    expect((await as<{ r: string }>(RIDER2, "SELECT dispatch_complete_with_code($1,$2) AS r", [job, code]))[0]!.r).toBe("OK");
    expect(await rows(job)).toBe(0);
  });
  it("rider declines, delivery is reassigned; old rider's position is erased and cannot be resent", async () => {
    await as(RIDER, "SELECT dispatch_rider_set_availability('AVAILABLE')");
    const job = await offer(RIDER);
    expect(await err(RIDER, "SELECT dispatch_rider_update_location($1,4.0,9.6)", [job])).toContain("NOT_ON_DELIVERY");
    await as(RIDER, "SELECT dispatch_rider_respond($1,false)", [job]);
    await as(ADMIN, "SELECT dispatch_assign_rider($1,$2)", [job, RIDER2]);
    await as(RIDER2, "SELECT dispatch_rider_respond($1,true)", [job]);
    await as(RIDER2, "SELECT dispatch_rider_update_location($1,4.1,9.6)", [job]);
    expect(await err(RIDER, "SELECT dispatch_rider_update_location($1,4.0,9.6)", [job])).toContain("NOT_ON_DELIVERY");
    expect(await as(RIDER, "SELECT * FROM dispatch_job_rider_location($1)", [job])).toHaveLength(0);
    await db.query("UPDATE dispatch_jobs SET rider_user_id=$2 WHERE id=$1", [job, RIDER]);
    expect(await rows(job)).toBe(0);
    await db.query("UPDATE dispatch_jobs SET rider_user_id=$2 WHERE id=$1", [job, RIDER2]);
    await as(CUSTOMER, "SELECT dispatch_cancel($1)", [job]);
  });
  it("self pickup: no rider, no location; shop confirms with customer's code", async () => {
    const [r] = await as<{ id: string }>(CUSTOMER, "SELECT dispatch_request_job($1,'SELF_PICKUP','Akwa, Douala','Akwa, Douala') AS id", [VENDOR]);
    expect(await err(VENDOR, "SELECT dispatch_assign_rider($1,$2)", [r!.id, RIDER])).toContain("NO_RIDER_FOR_SELF_PICKUP");
    expect(await as(CUSTOMER, "SELECT * FROM dispatch_job_rider_location($1)", [r!.id])).toHaveLength(0);
    const [{ code }] = await as<{ code: string }>(CUSTOMER, "SELECT dispatch_issue_handover_code($1) AS code", [r!.id]);
    expect((await as<{ r: string }>(VENDOR, "SELECT dispatch_complete_with_code($1,$2) AS r", [r!.id, code]))[0]!.r).toBe("OK");
  });
});

describe("phase 3 rollback", () => {
  it("removes location actions and restores the live accept action", async () => {
    await db.exec(`BEGIN; ${ROLLBACK3}; COMMIT;`);
    const fns = await db.query<{ proname: string }>("SELECT proname FROM pg_proc WHERE proname IN ('dispatch_rider_update_location','dispatch_job_rider_location')");
    expect(fns.rows).toHaveLength(0);
    expect((await db.query("SELECT to_regclass('public.dispatch_job_live_locations') AS t")).rows[0]).toEqual({ t: null });
    const live = (await db.query<{ d: string }>("SELECT pg_get_functiondef('dispatch_rider_respond(uuid,boolean)'::regprocedure) AS d")).rows[0]!.d;
    expect(live).not.toContain("RIDER_UNAVAILABLE");
    await db.exec(`BEGIN; ${PHASE3}; COMMIT;`);
  });
});
