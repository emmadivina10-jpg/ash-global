import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Isolated PGlite only: live foundation + live phase-1 rules + PROPOSED phase 2.
const FOUNDATION = readFileSync("supabase/migrations/20261030000000_ash_dispatch_foundation.sql", "utf8");
const PHASE1 = readFileSync("docs/proposed/dispatch_access_rules.sql", "utf8");
const PHASE2 = readFileSync("docs/proposed/dispatch_riders_phase2.sql", "utf8");
const ROLLBACK = readFileSync("docs/proposed/dispatch_riders_phase2_rollback.sql", "utf8");

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
});
afterAll(async () => { await db.close(); });

describe("rider registration and verification", () => {
  it("anonymous visitors cannot register", async () => {
    expect(await err(null, "SELECT dispatch_rider_register('A B','+237670000000','Douala','BICYCLE')")).toMatch(/permission denied/);
  });
  it("new riders start unverified, inactive and offline", async () => {
    await register(RIDER);
    const r = await rider(RIDER);
    expect([r!.verification_status, r!.is_active, r!.availability_status]).toEqual(["UNSUBMITTED", false, "OFFLINE"]);
    expect(r!.vehicle_plate).toBe("LT 123 AB");
  });
  it("motorcycles and cars require a plate", async () => {
    expect(await err(RIDER2, "SELECT dispatch_rider_register('A B','+237670000000','Douala','CAR')")).toMatch(/PLATE_REQUIRED/);
  });
  it("unverified riders cannot go available", async () => {
    expect(await err(RIDER, "SELECT dispatch_rider_set_availability('AVAILABLE')")).toMatch(/NOT_VERIFIED/);
  });
  it("submission requires ID, selfie and licence for motorcycles", async () => {
    await as(RIDER, "SELECT dispatch_rider_add_document('NATIONAL_ID',$1)", [`${RIDER}/id.jpg`]);
    await as(RIDER, "SELECT dispatch_rider_add_document('SELFIE',$1)", [`${RIDER}/s.jpg`]);
    expect(await err(RIDER, "SELECT dispatch_rider_submit_verification()")).toMatch(/DOCUMENTS_MISSING/);
  });
  it("documents must sit in the rider's own folder", async () => {
    expect(await err(RIDER, "SELECT dispatch_rider_add_document('DRIVER_LICENCE',$1)", [`${RIDER2}/x.jpg`])).toMatch(/INVALID_PATH/);
    expect(await err(RIDER, "SELECT dispatch_rider_add_document('DRIVER_LICENCE',$1)", [`${RIDER}/../x.jpg`])).toMatch(/INVALID_PATH/);
  });
  it("only staff can verify; riders cannot verify themselves", async () => {
    await as(RIDER, "SELECT dispatch_rider_add_document('DRIVER_LICENCE',$1)", [`${RIDER}/l.jpg`]);
    await as(RIDER, "SELECT dispatch_rider_submit_verification()");
    expect(await err(RIDER, "SELECT dispatch_rider_review($1,'VERIFIED')", [RIDER])).toMatch(/NOT_ALLOWED/);
    expect(await err(VENDOR, "SELECT dispatch_rider_review($1,'VERIFIED')", [RIDER])).toMatch(/NOT_ALLOWED/);
    await as(ADMIN, "SELECT dispatch_rider_review($1,'VERIFIED')", [RIDER]);
    expect((await rider(RIDER))!.verification_status).toBe("VERIFIED");
  });
  it("rejection needs a reason", async () => {
    await register(RIDER2, "BICYCLE");
    await as(RIDER2, "SELECT dispatch_rider_add_document('PASSPORT',$1)", [`${RIDER2}/p.jpg`]);
    await as(RIDER2, "SELECT dispatch_rider_add_document('SELFIE',$1)", [`${RIDER2}/s.jpg`]);
    await as(RIDER2, "SELECT dispatch_rider_submit_verification()");
    expect(await err(ADMIN, "SELECT dispatch_rider_review($1,'REJECTED')", [RIDER2])).toMatch(/NOTE_REQUIRED/);
    await as(ADMIN, "SELECT dispatch_rider_review($1,'REJECTED','Blurry photo')", [RIDER2]);
    expect((await rider(RIDER2))!.verification_status).toBe("REJECTED");
  });
  it("editing vehicle after approval returns the rider to review and offline", async () => {
    await as(RIDER, "SELECT dispatch_rider_set_availability('AVAILABLE')");
    await register(RIDER);
    const r = await rider(RIDER);
    expect([r!.verification_status, r!.is_active, r!.availability_status]).toEqual(["PENDING", false, "OFFLINE"]);
    await as(ADMIN, "SELECT dispatch_rider_review($1,'VERIFIED')", [RIDER]);
  });
  it("identity documents are hidden from shops and strangers and cannot be written directly", async () => {
    expect(await as(RIDER, "SELECT id FROM dispatch_rider_documents")).toHaveLength(3);
    expect(await as(VENDOR, "SELECT id FROM dispatch_rider_documents")).toHaveLength(0);
    expect(await as(STRANGER, "SELECT id FROM dispatch_rider_documents")).toHaveLength(0);
    expect(await err(RIDER, "DELETE FROM dispatch_rider_documents")).toMatch(/permission denied/);
    expect(await err(RIDER, "UPDATE dispatch_riders SET verification_status='VERIFIED'")).toMatch(/permission denied/);
  });
  it("identity files: own folder only", async () => {
    expect(await err(RIDER, "INSERT INTO storage.objects(bucket_id,name) VALUES ('rider-documents',$1)", [`${RIDER2}/x.jpg`])).toMatch(/row-level security/);
    await as(RIDER, "INSERT INTO storage.objects(bucket_id,name) VALUES ('rider-documents',$1)", [`${RIDER}/x.jpg`]);
    expect(await as(STRANGER, "SELECT id FROM storage.objects")).toHaveLength(0);
    expect(await as(ADMIN, "SELECT id FROM storage.objects")).toHaveLength(1);
  });
});

describe("availability and zones", () => {
  it("zones are cleaned, de-duplicated and capped at 10", async () => {
    await as(RIDER, "SELECT dispatch_rider_set_zones(ARRAY[' Akwa ','akwa','Bonapriso'])");
    expect(((await rider(RIDER))!.service_zones as string[]).sort()).toEqual(["akwa", "bonapriso"]);
    expect(await err(RIDER, "SELECT dispatch_rider_set_zones($1)", [Array.from({ length: 11 }, (_, i) => `zone${i}`)])).toMatch(/TOO_MANY_ZONES/);
  });
});

describe("vendor invitations and membership", () => {
  let code = "";
  it("only shop owners can create invites; the code hash is unreadable", async () => {
    expect(await err(STRANGER, "SELECT dispatch_vendor_create_invite()")).toMatch(/NOT_A_VENDOR/);
    code = (await as<{ c: string }>(VENDOR, "SELECT dispatch_vendor_create_invite() AS c"))[0]!.c;
    expect(code).toMatch(/^[0-9A-F]{12}$/);
    expect(await err(VENDOR, "SELECT * FROM dispatch_rider_invites")).toMatch(/permission denied/);
    const list = await as<Record<string, unknown>>(VENDOR, "SELECT * FROM dispatch_vendor_list_invites()");
    expect(list).toHaveLength(1);
    expect(Object.keys(list[0]!)).not.toContain("code_hash");
    expect(await as(VENDOR2, "SELECT * FROM dispatch_vendor_list_invites()")).toHaveLength(0);
  });
  it("wrong codes fail with one generic error", async () => {
    expect(await err(RIDER, "SELECT dispatch_rider_redeem_invite('000000000000')")).toMatch(/INVITE_INVALID/);
  });
  it("a valid code makes the rider a shop member, once only", async () => {
    await as(RIDER, "SELECT dispatch_rider_redeem_invite($1)", [code.toLowerCase()]);
    expect(await as(VENDOR, "SELECT status FROM dispatch_vendor_riders WHERE rider_user_id=$1", [RIDER])).toEqual([{ status: "ACCEPTED" }]);
    expect(await err(RIDER2, "SELECT dispatch_rider_redeem_invite($1)", [code])).toMatch(/INVITE_INVALID/);
  });
  it("expired and revoked codes are refused", async () => {
    const c2 = (await as<{ c: string }>(VENDOR, "SELECT dispatch_vendor_create_invite() AS c"))[0]!.c;
    await db.query("UPDATE dispatch_rider_invites SET expires_at = now() - interval '1 minute' WHERE used_at IS NULL");
    expect(await err(RIDER2, "SELECT dispatch_rider_redeem_invite($1)", [c2])).toMatch(/INVITE_INVALID/);
    await as(VENDOR, "SELECT dispatch_vendor_create_invite()");
    const [inv] = await db.query<{ id: string }>("SELECT id FROM dispatch_rider_invites WHERE used_at IS NULL AND expires_at > now()").then((r) => r.rows);
    expect(await err(VENDOR2, "SELECT dispatch_vendor_revoke_invite($1)", [inv!.id])).toMatch(/NOT_ALLOWED/);
    await as(VENDOR, "SELECT dispatch_vendor_revoke_invite($1)", [inv!.id]);
  });
  it("shops see their member riders but not others' riders", async () => {
    expect(await as(VENDOR, "SELECT user_id FROM dispatch_riders WHERE user_id=$1", [RIDER])).toHaveLength(1);
    expect(await as(VENDOR2, "SELECT user_id FROM dispatch_riders")).toHaveLength(0);
    expect(await err(VENDOR2, "SELECT dispatch_vendor_set_rider_status($1,'SUSPENDED')", [RIDER])).toMatch(/NOT_ALLOWED/);
  });
});

describe("secure assignment", () => {
  it("unverified or offline riders cannot be assigned", async () => {
    const id = await newJob();
    expect(await err(VENDOR, "SELECT dispatch_assign_rider($1,$2)", [id, RIDER2])).toMatch(/RIDER_UNAVAILABLE/);
    await as(RIDER, "SELECT dispatch_rider_set_availability('OFFLINE')");
    expect(await err(VENDOR, "SELECT dispatch_assign_rider($1,$2)", [id, RIDER])).toMatch(/RIDER_UNAVAILABLE/);
  });
  it("a suspended shop rider loses pending offers and can't be assigned", async () => {
    await as(RIDER, "SELECT dispatch_rider_set_availability('AVAILABLE')");
    const id = await newJob("VENDOR_DISPATCH");
    await as(VENDOR, "SELECT dispatch_assign_rider($1,$2)", [id, RIDER]);
    await as(VENDOR, "SELECT dispatch_vendor_set_rider_status($1,'SUSPENDED')", [RIDER]);
    const [j] = await db.query<{ status: string; rider_user_id: string | null }>("SELECT status, rider_user_id FROM dispatch_jobs WHERE id=$1", [id]).then((r) => r.rows);
    expect(j).toEqual({ status: "REQUESTED", rider_user_id: null });
    expect(await err(VENDOR, "SELECT dispatch_assign_rider($1,$2)", [id, RIDER])).toMatch(/NOT_VENDOR_RIDER/);
    await as(VENDOR, "SELECT dispatch_vendor_set_rider_status($1,'ACCEPTED')", [RIDER]);
  });
  it("riders on an active delivery cannot go offline or leave the shop", async () => {
    const id = await newJob("VENDOR_DISPATCH");
    await as(VENDOR, "SELECT dispatch_assign_rider($1,$2)", [id, RIDER]);
    await as(RIDER, "SELECT dispatch_rider_respond($1,true)", [id]);
    expect(await err(RIDER, "SELECT dispatch_rider_set_availability('OFFLINE')")).toMatch(/RIDER_ON_DELIVERY/);
    expect(await err(RIDER, "SELECT dispatch_rider_leave_vendor($1)", [VENDOR])).toMatch(/RIDER_ON_DELIVERY/);
    expect(await err(ADMIN, "SELECT dispatch_rider_review($1,'SUSPENDED','Complaint')", [RIDER])).toMatch(/RIDER_ON_DELIVERY/);
  });
});

describe("rollback", () => {
  it("rollback removes phase 2 cleanly and phase-1 actions still work", async () => {
    await db.exec(`BEGIN; ${ROLLBACK}; COMMIT;`);
    const t = await db.query("SELECT to_regclass('public.dispatch_rider_invites') AS a, to_regclass('public.dispatch_rider_documents') AS b");
    expect(t.rows[0]).toEqual({ a: null, b: null });
    const f = await db.query("SELECT count(*)::int n FROM pg_proc WHERE proname LIKE 'dispatch_rider_re%' OR proname LIKE 'dispatch_vendor_%'");
    expect(f.rows[0]).toEqual({ n: 0 });
    expect(await newJob()).toBeTruthy();
  });
});
