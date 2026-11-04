import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Simulated payments only: mocked provider and database, no network, no real money.
const h = vi.hoisted(() => ({
  rpc: vi.fn(),
  webhook: vi.fn(),
  getCollection: vi.fn(),
  verifyLegacy: vi.fn(),
  settleMock: vi.fn(),
  useRealSettle: true,
  ledgerRow: null as Record<string, unknown> | null,
  userId: "member-1",
}));

function chain(table: string) {
  const res = () =>
    table === "payment_transactions" ? { data: h.ledgerRow, error: null } : { data: [], error: null };
  const q: Record<string, unknown> = {};
  for (const m of ["select", "eq", "neq", "in", "not", "gte", "order", "limit", "update", "insert", "upsert"])
    q[m] = vi.fn(() => q);
  q.maybeSingle = async () => res();
  q.single = async () => res();
  q.then = (r: (v: unknown) => unknown) => Promise.resolve(res()).then(r);
  return q;
}

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { rpc: h.rpc, from: (t: string) => chain(t) },
}));
vi.mock("@/lib/tchokopay.server", () => ({
  tchokoPay: {
    handleWebhook: h.webhook,
    isConfigured: () => true,
    getCollection: h.getCollection,
    verifyLegacyPayment: h.verifyLegacy,
    getDisbursement: vi.fn(),
  },
}));
vi.mock("@/lib/payment-settlement.server", async () => {
  const real = await vi.importActual<typeof import("../src/lib/payment-settlement.server")>(
    "../src/lib/payment-settlement.server",
  );
  return {
    settleCollection: (i: Parameters<typeof real.settleCollection>[0]) =>
      h.useRealSettle ? real.settleCollection(i) : h.settleMock(i),
  };
});
vi.mock("@/lib/rate-limit.server", () => ({
  guardPublicRequest: async () => null,
  rateLimit: async () => ({ allowed: true, retryAfter: 0 }),
}));

import { Route as Webhook } from "../src/routes/api/public/webhooks/tchokopay";
import { Route as Reconcile, isReconcileAuthorized } from "../src/routes/api/public/reconcile-activations";

type Handler = (a: { request: Request }) => Promise<Response>;
const post = (r: unknown) =>
  (r as { options: { server: { handlers: { POST: Handler } } } }).options.server.handlers.POST;

function callWebhook(reference: string, status: string) {
  h.webhook.mockResolvedValue({
    valid: true,
    signatureVerified: true,
    isDisbursement: false,
    merchantReference: reference,
    providerReference: "REQ-sim",
    status,
  });
  return post(Webhook)({ request: new Request("http://x/hook", { method: "POST", body: "{}" }) });
}
const rpcNames = () => h.rpc.mock.calls.map((c) => c[0]);

beforeEach(() => {
  vi.clearAllMocks();
  h.useRealSettle = true;
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("NETWORK_FORBIDDEN"); }));
  h.rpc.mockResolvedValue({ data: { ok: true }, error: null });
});

describe("TchokoPay webhook routes every collection kind correctly", () => {
  it.each([
    ["TOP-1", "complete_wallet_topup"],
    ["EVT-1", "complete_event_ticket"],
    ["PRM-1", "complete_promotion"],
  ])("PAID %s calls %s once and never complete_activation", async (ref, rpc) => {
    const res = await callWebhook(ref, "PAID");
    expect(res.status).toBe(200);
    expect(rpcNames().filter((n) => n === rpc)).toHaveLength(1);
    expect(rpcNames()).not.toContain("complete_activation");
  });

  it.each([
    ["EVT-1", "fail_event_ticket"],
    ["PRM-1", "fail_promotion"],
  ])("FAILED %s calls %s", async (ref, rpc) => {
    await callWebhook(ref, "FAILED");
    expect(rpcNames()).toContain(rpc);
  });

  it.each([
    ["BKG-1", "complete_booking_payment"],
    ["PLK-1", "complete_link_payment"],
    ["VER-1", "complete_verification"],
    ["CLN-1", "complete_clean_payment"],
    ["ACT-1", "complete_activation"],
  ])("regression: PAID %s still calls %s", async (ref, rpc) => {
    await callWebhook(ref, "PAID");
    expect(rpcNames()).toContain(rpc);
  });

  it("bad signature is refused with no settlement", async () => {
    h.webhook.mockResolvedValue({ valid: false, signatureVerified: false });
    const res = await post(Webhook)({ request: new Request("http://x", { method: "POST", body: "{}" }) });
    expect(res.status).toBe(401);
    expect(h.rpc).not.toHaveBeenCalled();
  });

  it("does not echo the payment reference", async () => {
    const body = await (await callWebhook("TOP-secret-ref", "PAID")).json();
    expect(JSON.stringify(body)).not.toContain("TOP-secret-ref");
  });
});

describe("reconcile endpoint requires the private scheduler secret", () => {
  it("no header → 401, no provider or database work", async () => {
    const res = await post(Reconcile)({ request: new Request("http://x", { method: "POST" }) });
    expect(res.status).toBe(401);
    expect(h.rpc).not.toHaveBeenCalled();
    expect(h.getCollection).not.toHaveBeenCalled();
  });

  it("wrong header → 401", async () => {
    h.rpc.mockResolvedValue({ data: false, error: null });
    const req = new Request("http://x", { method: "POST", headers: { "x-reconcile-secret": "wrong" } });
    expect((await post(Reconcile)({ request: req })).status).toBe(401);
    expect(h.getCollection).not.toHaveBeenCalled();
  });

  it("GET is no longer offered", () => {
    const handlers = (Reconcile as unknown as { options: { server: { handlers: Record<string, unknown> } } })
      .options.server.handlers;
    expect(handlers.GET).toBeUndefined();
  });

  it("correct header → 200 with counts only", async () => {
    h.rpc.mockImplementation(async (name: string) =>
      name === "reconcile_token_matches" ? { data: true, error: null } : { data: { ok: true }, error: null },
    );
    const req = new Request("http://x", { method: "POST", headers: { "x-reconcile-secret": "ok" } });
    expect(await isReconcileAuthorized(req)).toBe(true);
    const res = await post(Reconcile)({ request: req });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(["checked", "ok", "payoutsSettled", "settled"]);
  });
});

describe("issue_booking_code commission fallback", () => {
  const migration = readFileSync("drizzle/migrations/0046_payment_security_fixes.sql", "utf8");
  const fn = migration.slice(
    migration.indexOf("CREATE OR REPLACE FUNCTION public.issue_booking_code"),
    migration.indexOf("CREATE TABLE public.feature_flags"),
  );

  async function db() {
    const pg = new PGlite();
    await pg.exec(`
      CREATE TABLE marketplace_settings (id boolean PRIMARY KEY, commission_rate numeric);
      CREATE TABLE booking_verification_codes (booking_id int, client_id int, code text, expires_at timestamptz);
      CREATE TABLE bookings (id int PRIMARY KEY, provider_id int, client_id int, status text, price numeric,
        commission_rate numeric, platform_fee numeric, provider_amount numeric, verification_status text,
        provider_transfer_status text, scheduled_at timestamptz DEFAULT now());
      CREATE FUNCTION campus_commission_rate(int) RETURNS numeric LANGUAGE sql AS 'SELECT NULL::numeric';
      CREATE FUNCTION generate_booking_code() RETURNS text LANGUAGE sql AS $$SELECT md5(random()::text)$$;
    `);
    await pg.exec(fn.replace(/public\./g, "").replace("SET search_path TO 'public'", ""));
    await pg.exec(`CREATE TRIGGER t BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION issue_booking_code();`);
    return pg;
  }
  async function confirm(pg: PGlite, saved: number | null) {
    await pg.query(`INSERT INTO bookings (id, provider_id, client_id, status, price, commission_rate)
      VALUES (1, 1, 1, 'PENDING', 10000, $1)`, [saved]);
    await pg.exec(`UPDATE bookings SET status = 'CONFIRMED' WHERE id = 1`);
    return (await pg.query<{ commission_rate: string; platform_fee: string }>(
      `SELECT commission_rate, platform_fee FROM bookings`)).rows[0];
  }

  it("uses the live 15% setting", async () => {
    const pg = await db();
    await pg.exec(`INSERT INTO marketplace_settings VALUES (true, 0.15)`);
    const r = await confirm(pg, null);
    expect(Number(r.commission_rate)).toBe(0.15);
    expect(Number(r.platform_fee)).toBe(1500);
  });

  it("keeps a booking's saved 12% rate", async () => {
    const pg = await db();
    await pg.exec(`INSERT INTO marketplace_settings VALUES (true, 0.15)`);
    expect(Number((await confirm(pg, 0.12)).commission_rate)).toBe(0.12);
  });

  it("falls back to 15% (not 12%) if the setting is missing", async () => {
    const pg = await db();
    expect(Number((await confirm(pg, null)).commission_rate)).toBe(0.15);
  });
});
