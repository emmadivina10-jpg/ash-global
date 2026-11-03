import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Isolated PGlite only: dispatch phases 1-3 + flexible delivery methods.
const FOUNDATION = readFileSync("supabase/migrations/20261030000000_ash_dispatch_foundation.sql", "utf8");
const PHASE1 = readFileSync("docs/proposed/dispatch_access_rules.sql", "utf8");
const PHASE2 = readFileSync("docs/proposed/dispatch_riders_phase2.sql", "utf8");
const PHASE3 = readFileSync("docs/proposed/dispatch_phase3_accept_guard.sql", "utf8");
const FLEX = readFileSync("docs/proposed/dispatch_flexible_delivery.sql", "utf8");

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
  return newJobFor(mode);
}
async function newJobFor(mode: string) {
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
    CREATE TABLE public.profiles (user_id uuid PRIMARY KEY, avatar_url text);
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
  await db.exec(`BEGIN; ${FLEX}; COMMIT;`);
});
afterAll(async () => { await db.close(); });

const prefs = (u: string, ash: boolean, chosen: boolean, ext: boolean, own: boolean, pickup: boolean) =>
  as(u, "SELECT dispatch_vendor_set_prefs($1,$2,$3,$4,$5)", [ash, chosen, ext, own, pickup]);
const job = async (id: string) => (await db.query<Record<string, unknown>>("SELECT * FROM dispatch_jobs WHERE id=$1", [id])).rows[0]!;

describe("shop delivery preferences", () => {
  it("defaults allow only ASH Dispatch and self pickup", async () => {
    expect(await err(CUSTOMER, "SELECT dispatch_request_job($1,'CHOSEN_RIDER','Akwa','Bonapriso')", [VENDOR])).toContain("METHOD_NOT_ALLOWED");
    expect(await err(CUSTOMER, "SELECT dispatch_request_job($1,'EXTERNAL_RIDER','Akwa','Bonapriso')", [VENDOR])).toContain("METHOD_NOT_ALLOWED");
    expect(await err(CUSTOMER, "SELECT dispatch_request_job($1,'VENDOR_DISPATCH','Akwa','Bonapriso')", [VENDOR])).toContain("METHOD_NOT_ALLOWED");
    expect(await err(CUSTOMER, "SELECT dispatch_request_job($1,'ASH_DISPATCH','Akwa','Bonapriso')", [VENDOR])).toBe("NO_ERROR");
  });
  it("only shop owners set preferences, at least one method stays on, and they are enforced", async () => {
    expect(await err(STRANGER, "SELECT dispatch_vendor_set_prefs(true,true,true,true,true)")).toContain("NOT_A_VENDOR");
    expect(await err(VENDOR, "SELECT dispatch_vendor_set_prefs(false,false,false,false,false)")).toContain("NO_METHOD");
    await prefs(VENDOR, false, true, true, true, true);
    expect(await err(CUSTOMER, "SELECT dispatch_request_job($1,'ASH_DISPATCH','Akwa','Bonapriso')", [VENDOR])).toContain("METHOD_NOT_ALLOWED");
    expect(await err(CUSTOMER, "INSERT INTO dispatch_vendor_prefs(vendor_id) VALUES ($1)", [CUSTOMER])).toContain("permission denied");
  });
});

describe("choose an ASH rider", () => {
  it("directory shows only verified available riders and no private fields", async () => {
    await verify(RIDER);
    await verify(RIDER2);
    await as(RIDER, "SELECT dispatch_rider_set_availability('AVAILABLE')");
    await as(RIDER2, "SELECT dispatch_rider_set_availability('OFFLINE')");
    const rows = await as<Record<string, unknown>>(CUSTOMER, "SELECT * FROM dispatch_rider_directory()");
    const ids = rows.map((r) => r.user_id);
    expect(ids).toContain(RIDER);
    expect(ids).not.toContain(RIDER2);
    expect(Object.keys(rows[0]!).sort()).toEqual(["availability_status", "avatar_url", "city", "display_name", "service_zones", "user_id", "vehicle_type"]);
    expect(rows[0]!.display_name).toBe("Jean R.");
    expect(await err(null, "SELECT * FROM dispatch_rider_directory()")).toContain("permission denied");
  });
  it("offer is not an assignment until the rider accepts; unavailable riders refused", async () => {
    const id = await newJobFor("CHOSEN_RIDER");
    expect(await err(CUSTOMER, "SELECT dispatch_offer_chosen_rider($1,$2)", [id, RIDER2])).toContain("RIDER_UNAVAILABLE");
    expect(await err(STRANGER, "SELECT dispatch_offer_chosen_rider($1,$2)", [id, RIDER])).toContain("NOT_ALLOWED");
    await as(CUSTOMER, "SELECT dispatch_offer_chosen_rider($1,$2)", [id, RIDER]);
    const j = await job(id);
    expect(j.status).toBe("ASSIGNED");
    expect(j.offer_expires_at).not.toBeNull();
    const [a] = (await db.query<{ status: string }>("SELECT status FROM dispatch_job_assignments WHERE delivery_id=$1", [id])).rows;
    expect(a!.status).toBe("OPEN");
    await as(RIDER, "SELECT dispatch_rider_respond($1,false)", [id]);
    expect((await job(id)).status).toBe("REJECTED");
    expect(await err(CUSTOMER, "SELECT dispatch_switch_mode($1,'ASH_DISPATCH')", [id])).toContain("METHOD_NOT_ALLOWED");
    await prefs(VENDOR, true, true, true, true, true);
    await as(CUSTOMER, "SELECT dispatch_switch_mode($1,'ASH_DISPATCH')", [id]);
    await as(CUSTOMER, "SELECT dispatch_switch_mode($1,'CHOSEN_RIDER')", [id]);
    expect(await err(CUSTOMER, "SELECT dispatch_switch_mode($1,'EXTERNAL_RIDER')", [id])).toContain("BAD_MODE");
  });
  it("expired offers cannot be accepted and are released for another rider", async () => {
    const id = await newJobFor("CHOSEN_RIDER");
    await as(CUSTOMER, "SELECT dispatch_offer_chosen_rider($1,$2)", [id, RIDER]);
    await db.query("UPDATE dispatch_jobs SET offer_expires_at = now() - interval '1 minute' WHERE id=$1", [id]);
    expect(await err(RIDER, "SELECT dispatch_rider_respond($1,true)", [id])).toContain("OFFER_EXPIRED");
    expect((await as<{ r: boolean }>(CUSTOMER, "SELECT dispatch_release_expired($1) AS r", [id]))[0]!.r).toBe(true);
    const j = await job(id);
    expect(j.status).toBe("REJECTED");
    expect(j.rider_user_id).toBeNull();
  });
  it("a rider already on a delivery cannot take a second one", async () => {
    const a = await newJobFor("CHOSEN_RIDER");
    await as(CUSTOMER, "SELECT dispatch_offer_chosen_rider($1,$2)", [a, RIDER]);
    await as(RIDER, "SELECT dispatch_rider_respond($1,true)", [a]);
    expect((await as(CUSTOMER, "SELECT * FROM dispatch_rider_directory()")).map((r) => r.user_id)).not.toContain(RIDER);
    const b = await newJobFor("CHOSEN_RIDER");
    await as(CUSTOMER, "SELECT dispatch_offer_chosen_rider($1,$2)", [b, RIDER]);
    expect(await err(RIDER, "SELECT dispatch_rider_respond($1,true)", [b])).toContain("RIDER_ON_DELIVERY");
    await as(CUSTOMER, "SELECT dispatch_cancel($1)", [a]);
    await as(CUSTOMER, "SELECT dispatch_cancel($1)", [b]);
  });
});

describe("use my own rider", () => {
  it("records details privately, hands over with the code, never shares location", async () => {
    const [{ id }] = await as<{ id: string }>(CUSTOMER, "SELECT dispatch_request_job($1,'EXTERNAL_RIDER','Akwa','Bonapriso') AS id", [VENDOR]);
    expect(await err(CUSTOMER, "SELECT dispatch_set_external_rider($1,'Paul','12','MOTORCYCLE')", [id])).toContain("INVALID_INPUT");
    await as(CUSTOMER, "SELECT dispatch_set_external_rider($1,'Paul Mbe','+237699000000','MOTORCYCLE','LT 9 CD','Blue jacket')", [id]);
    expect(await as(VENDOR, "SELECT full_name FROM dispatch_external_riders WHERE delivery_id=$1", [id])).toHaveLength(1);
    expect(await as(STRANGER, "SELECT full_name FROM dispatch_external_riders WHERE delivery_id=$1", [id])).toHaveLength(0);
    expect(await as(RIDER, "SELECT full_name FROM dispatch_external_riders WHERE delivery_id=$1", [id])).toHaveLength(0);
    expect(await err(CUSTOMER, "SELECT dispatch_external_pickup($1,'000000')", [id])).toContain("NOT_ALLOWED");
    const [{ code }] = await as<{ code: string }>(CUSTOMER, "SELECT dispatch_issue_handover_code($1) AS code", [id]);
    expect((await as<{ r: string }>(VENDOR, "SELECT dispatch_external_pickup($1,'999999') AS r", [id]))[0]!.r).toBe(code === "999999" ? "OK" : "WRONG");
    expect((await as<{ r: string }>(VENDOR, "SELECT dispatch_external_pickup($1,$2) AS r", [id, code]))[0]!.r).toBe("OK");
    expect((await job(id)).status).toBe("IN_TRANSIT");
    expect(await err(CUSTOMER, "SELECT dispatch_rider_update_location($1,4.05,9.7)", [id])).toContain("NOT_ON_DELIVERY");
    expect(await as(CUSTOMER, "SELECT * FROM dispatch_job_rider_location($1)", [id])).toHaveLength(0);
    expect(await err(VENDOR, "SELECT dispatch_external_delivered($1)", [id])).toContain("NOT_ALLOWED");
    await as(CUSTOMER, "SELECT dispatch_external_delivered($1)", [id]);
    expect((await job(id)).status).toBe("DELIVERED");
    expect(await err(CUSTOMER, "SELECT dispatch_set_external_rider($1,'X Y','+237699000000','CAR')", [id])).toContain("INVALID_STATUS");
  });
});
