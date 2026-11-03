import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Isolated PGlite only: builds the live dispatch schema, applies the PROPOSED SQL, then acts as each member.
const FOUNDATION = readFileSync("supabase/migrations/20261030000000_ash_dispatch_foundation.sql", "utf8");
const PROPOSED = readFileSync("docs/proposed/dispatch_access_rules.sql", "utf8");

const CUSTOMER = "11111111-1111-1111-1111-111111111111";
const VENDOR = "22222222-2222-2222-2222-222222222222";
const RIDER = "33333333-3333-3333-3333-333333333333";
const RIDER2 = "44444444-4444-4444-4444-444444444444";
const STRANGER = "55555555-5555-5555-5555-555555555555";
const ADMIN = "66666666-6666-6666-6666-666666666666";

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
const job = async (id: string) =>
  (await db.query<{ status: string; rider_user_id: string | null }>("SELECT status, rider_user_id FROM dispatch_jobs WHERE id=$1", [id])).rows[0];

async function newJob(mode = "ASH_DISPATCH", fee = 1500) {
  const [r] = await as<{ id: string }>(CUSTOMER, "SELECT public.dispatch_request_job($1,$2,'Akwa, Douala','Bonapriso, Douala') AS id", [VENDOR, mode]);
  const id = r!.id;
  if (mode !== "SELF_PICKUP") {
    await as(VENDOR, "SELECT public.dispatch_set_quote($1,$2)", [id, fee]);
    await as(CUSTOMER, "SELECT public.dispatch_approve_quote($1,$2)", [id, fee]);
  }
  return id;
}

beforeAll(async () => {
  await db.exec(`
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN;
    GRANT USAGE ON SCHEMA public TO anon, authenticated;
    CREATE SCHEMA auth; GRANT USAGE ON SCHEMA auth TO anon, authenticated;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
    CREATE TABLE public.profiles (user_id uuid PRIMARY KEY);
    CREATE TYPE public.app_role AS ENUM ('admin','user','clean_worker');
    CREATE TABLE public.user_roles (user_id uuid, role app_role);
    CREATE FUNCTION public.has_role(_user_id uuid, _role app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
      AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
  `);
  for (const u of [CUSTOMER, VENDOR, RIDER, RIDER2, STRANGER, ADMIN]) {
    await db.query("INSERT INTO auth.users VALUES ($1)", [u]);
    await db.query("INSERT INTO public.profiles VALUES ($1)", [u]);
  }
  await db.query("INSERT INTO user_roles VALUES ($1,'admin')", [ADMIN]);
  await db.exec(FOUNDATION);
  // Mirror the live verification columns (code -> code_hash, expires_at).
  await db.exec(`ALTER TABLE dispatch_pickup_verifications RENAME COLUMN code TO code_hash;
    ALTER TABLE dispatch_pickup_verifications ADD COLUMN expires_at timestamptz;`);
  await db.exec(PROPOSED);
  await db.query("INSERT INTO dispatch_riders(user_id, vendor_id) VALUES ($1,$2),($3,NULL)", [RIDER, VENDOR, RIDER2]);
  await db.query("INSERT INTO dispatch_vendor_riders(vendor_id, rider_user_id, status) VALUES ($1,$2,'ACCEPTED')", [VENDOR, RIDER]);
});
afterAll(async () => { await db.close(); });

describe("unauthorized access", () => {
  it("anonymous visitors cannot read or act", async () => {
    expect(await err(null, "SELECT * FROM dispatch_jobs")).toMatch(/permission denied/);
    expect(await err(null, "SELECT public.dispatch_request_job($1,'ASH_DISPATCH','abc','def')", [VENDOR])).toMatch(/permission denied/);
  });
  it("members cannot write dispatch tables directly", async () => {
    expect(await err(CUSTOMER, "INSERT INTO dispatch_jobs(vendor_id,customer_id,pickup_address,dropoff_address) VALUES ($1,$2,'a','b')", [VENDOR, CUSTOMER])).toMatch(/permission denied/);
    const id = await newJob();
    expect(await err(VENDOR, "UPDATE dispatch_jobs SET status='DELIVERED' WHERE id=$1", [id])).toMatch(/permission denied/);
  });
  it("a stranger sees no jobs; each party sees its own", async () => {
    const id = await newJob();
    expect(await as(STRANGER, "SELECT id FROM dispatch_jobs WHERE id=$1", [id])).toHaveLength(0);
    expect(await as(CUSTOMER, "SELECT id FROM dispatch_jobs WHERE id=$1", [id])).toHaveLength(1);
    expect(await as(VENDOR, "SELECT id FROM dispatch_jobs WHERE id=$1", [id])).toHaveLength(1);
    expect(await as(RIDER, "SELECT id FROM dispatch_jobs WHERE id=$1", [id])).toHaveLength(0);
    expect(await as(ADMIN, "SELECT id FROM dispatch_jobs WHERE id=$1", [id])).toHaveLength(1);
    expect(await as(STRANGER, "SELECT * FROM dispatch_job_events WHERE delivery_id=$1", [id])).toHaveLength(0);
  });
  it("a stranger cannot quote, assign, cancel or accept", async () => {
    const id = await newJob();
    expect(await err(STRANGER, "SELECT public.dispatch_set_quote($1,10)", [id])).toMatch(/NOT_ALLOWED/);
    expect(await err(STRANGER, "SELECT public.dispatch_assign_rider($1,$2)", [id, RIDER])).toMatch(/NOT_ALLOWED/);
    expect(await err(STRANGER, "SELECT public.dispatch_cancel($1)", [id])).toMatch(/NOT_ALLOWED/);
    await as(VENDOR, "SELECT public.dispatch_assign_rider($1,$2)", [id, RIDER]);
    expect(await err(RIDER2, "SELECT public.dispatch_rider_respond($1,true)", [id])).toMatch(/NOT_ALLOWED/);
  });
});

describe("pickup code hashes", () => {
  it("cannot be read by any member, including the customer and vendor", async () => {
    const id = await newJob();
    await as(CUSTOMER, "SELECT public.dispatch_issue_handover_code($1)", [id]);
    for (const u of [CUSTOMER, VENDOR, RIDER, ADMIN]) expect(await err(u, "SELECT code_hash FROM dispatch_pickup_verifications")).toMatch(/permission denied/);
  });
  it("only a hash is stored, never the code", async () => {
    const id = await newJob();
    const [r] = await as<{ c: string }>(CUSTOMER, "SELECT public.dispatch_issue_handover_code($1) AS c", [id]);
    expect(r!.c).toMatch(/^\d{6}$/);
    const [v] = (await db.query<{ code_hash: string }>("SELECT code_hash FROM dispatch_pickup_verifications WHERE delivery_id=$1", [id])).rows;
    expect(v!.code_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(v!.code_hash).not.toContain(r!.c);
  });
});

describe("quotes and assignment", () => {
  it("a rider cannot be assigned before the customer approves the exact fee", async () => {
    const [r] = await as<{ id: string }>(CUSTOMER, "SELECT public.dispatch_request_job($1,'ASH_DISPATCH','abc','def') AS id", [VENDOR]);
    await as(VENDOR, "SELECT public.dispatch_set_quote($1,1500)", [r!.id]);
    expect(await err(VENDOR, "SELECT public.dispatch_assign_rider($1,$2)", [r!.id, RIDER])).toMatch(/QUOTE_NOT_APPROVED/);
    expect(await err(CUSTOMER, "SELECT public.dispatch_approve_quote($1,1000)", [r!.id])).toMatch(/QUOTE_CHANGED/);
  });
  it("changing the fee clears approval", async () => {
    const id = await newJob();
    await as(VENDOR, "SELECT public.dispatch_set_quote($1,2000)", [id]);
    expect(await err(VENDOR, "SELECT public.dispatch_assign_rider($1,$2)", [id, RIDER])).toMatch(/QUOTE_NOT_APPROVED/);
  });
  it("vendor dispatch only uses the vendor's own accepted riders", async () => {
    const id = await newJob("VENDOR_DISPATCH");
    expect(await err(VENDOR, "SELECT public.dispatch_assign_rider($1,$2)", [id, RIDER2])).toMatch(/NOT_VENDOR_RIDER/);
  });
  it("self pickup never gets a rider", async () => {
    const id = await newJob("SELF_PICKUP");
    expect(await err(VENDOR, "SELECT public.dispatch_assign_rider($1,$2)", [id, RIDER])).toMatch(/NO_RIDER_FOR_SELF_PICKUP/);
  });
  it("concurrent assignments: only one rider ends up live on a job", async () => {
    const id = await newJob();
    const results = await Promise.allSettled([
      as(VENDOR, "SELECT public.dispatch_assign_rider($1,$2)", [id, RIDER]),
      as(ADMIN, "SELECT public.dispatch_assign_rider($1,$2)", [id, RIDER2]),
    ]);
    expect(results.filter((r) => r.status === "fulfilled").length).toBeGreaterThanOrEqual(1);
    const live = (await db.query("SELECT 1 FROM dispatch_job_assignments WHERE delivery_id=$1 AND status IN ('OPEN','ACCEPTED','IN_PROGRESS')", [id])).rows;
    expect(live).toHaveLength(1);
    expect((await job(id))!.status).toBe("ASSIGNED");
  });
  it("the unique index itself blocks a second live assignment", async () => {
    const id = await newJob();
    await as(VENDOR, "SELECT public.dispatch_assign_rider($1,$2)", [id, RIDER]);
    await expect(db.query("INSERT INTO dispatch_job_assignments(delivery_id,rider_user_id,vendor_id,status) VALUES ($1,$2,$3,'OPEN')", [id, RIDER2, VENDOR]))
      .rejects.toThrow(/dispatch_one_live_assignment/);
  });
});

describe("full delivery and handover code", () => {
  async function inTransit() {
    const id = await newJob();
    await as(VENDOR, "SELECT public.dispatch_assign_rider($1,$2)", [id, RIDER]);
    await as(RIDER, "SELECT public.dispatch_rider_respond($1,true)", [id]);
    expect(await err(RIDER, "SELECT public.dispatch_rider_progress($1,'IN_TRANSIT')", [id])).toMatch(/INVALID_STATUS/);
    await as(RIDER, "SELECT public.dispatch_rider_progress($1,'PICKUP_CONFIRMED')", [id]);
    await as(RIDER, "SELECT public.dispatch_rider_progress($1,'IN_TRANSIT')", [id]);
    const [c] = await as<{ c: string }>(CUSTOMER, "SELECT public.dispatch_issue_handover_code($1) AS c", [id]);
    return { id, code: c!.c };
  }
  const complete = async (id: string, code: string, user = RIDER) =>
    (await as<{ r: string }>(user, "SELECT public.dispatch_complete_with_code($1,$2) AS r", [id, code]))[0]!.r;

  it("completes with the right code and logs every step", async () => {
    const { id, code } = await inTransit();
    expect(await err(VENDOR, "SELECT public.dispatch_complete_with_code($1,$2)", [id, code])).toMatch(/NOT_ALLOWED/);
    expect(await complete(id, code)).toBe("OK");
    expect((await job(id))!.status).toBe("DELIVERED");
    const ev = (await db.query<{ status: string }>("SELECT status FROM dispatch_job_events WHERE delivery_id=$1 ORDER BY created_at, id", [id])).rows.map((r) => r.status);
    for (const s of ["REQUESTED", "ASSIGNED", "ACCEPTED", "PICKUP_CONFIRMED", "IN_TRANSIT", "DELIVERED"]) expect(ev).toContain(s);
  });
  it("replay: a used code cannot be used again or reissued", async () => {
    const { id, code } = await inTransit();
    expect(await complete(id, code)).toBe("OK");
    expect(await err(RIDER, "SELECT public.dispatch_complete_with_code($1,$2)", [id, code])).toMatch(/NOT_ALLOWED/);
    expect(await err(CUSTOMER, "SELECT public.dispatch_issue_handover_code($1)", [id])).toMatch(/INVALID_STATUS/);
    const [v] = (await db.query<{ used_at: string | null }>("SELECT used_at FROM dispatch_pickup_verifications WHERE delivery_id=$1", [id])).rows;
    expect(v!.used_at).not.toBeNull();
  });
  it("locks after 5 wrong tries, even with the right code afterwards", async () => {
    const { id, code } = await inTransit();
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) expect(await complete(id, wrong)).toBe("WRONG");
    expect(await complete(id, code)).toBe("LOCKED");
    expect((await job(id))!.status).toBe("IN_TRANSIT");
  });
  it("expires after 30 minutes", async () => {
    const { id, code } = await inTransit();
    await db.query("UPDATE dispatch_pickup_verifications SET expires_at = now() - interval '1 second' WHERE delivery_id=$1", [id]);
    expect(await complete(id, code)).toBe("EXPIRED");
  });
  it("cannot be cancelled once on the way", async () => {
    const { id } = await inTransit();
    expect(await err(CUSTOMER, "SELECT public.dispatch_cancel($1)", [id])).toMatch(/INVALID_STATUS/);
  });
  it("self pickup: vendor confirms with the customer's code", async () => {
    const id = await newJob("SELF_PICKUP");
    const [c] = await as<{ c: string }>(CUSTOMER, "SELECT public.dispatch_issue_handover_code($1) AS c", [id]);
    expect(await complete(id, c!.c, VENDOR)).toBe("OK");
  });
});
