import { beforeEach, describe, expect, it, vi } from "vitest";

// Isolated fixtures only: no Stripe requests, credentials or real database writes.
const harness = vi.hoisted(() => ({
  queries: [] as Array<{ table: string; action: string; value: unknown }>,
  inboxStatus: "RECEIVED",
  controlsMissing: false,
  rpc: vi.fn(),
  read: vi.fn(),
  settle: vi.fn(),
  reconcile: vi.fn(),
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: harness.rpc,
    from(table: string) {
      const result = () => {
        if (table === "stripe_marketplace_controls") return harness.controlsMissing
          ? { data: null, error: { message: "absent isolated schema" } }
          : { data: { marketplace_account_id: "acct_isolated" }, error: null };
        if (table === "stripe_webhook_inbox") return { data: { status: harness.inboxStatus }, error: null };
        if (table === "bookings") return { data: { id: "isolated-booking", provider_transaction_id: "cs_isolated", payment_amount: 100, payment_currency: "cad", payment_provider: "STRIPE" }, error: null };
        if (table === "payment_transactions") return { data: { provider: "STRIPE" }, error: null };
        if (table === "stripe_booking_releases") return { data: { booking_id: "isolated-booking" }, error: null };
        return { data: null, error: null };
      };
      const query = {
        select: vi.fn(() => query), eq: vi.fn(() => query),
        upsert(value: unknown) { harness.queries.push({ table, action: "upsert", value }); return query; },
        update(value: unknown) { harness.queries.push({ table, action: "update", value }); return query; },
        single: async () => result(), maybeSingle: async () => result(),
        then(resolve: (value: ReturnType<typeof result>) => unknown) { return Promise.resolve(result()).then(resolve); },
      };
      return query;
    },
  },
}));
vi.mock("../src/lib/stripe.server", () => ({ stripeRead: harness.read }));
vi.mock("../src/lib/payment-settlement.server", () => ({ settleCollection: harness.settle }));
vi.mock("../src/lib/stripe-booking-release.server", () => ({ reconcileRelease: harness.reconcile }));

import { handleMarketplaceEvent } from "../src/lib/stripe-marketplace-webhook.server";

function event(type: string, object: Record<string, unknown> = {}) {
  return { id: "evt_isolated", type, livemode: true, data: { object } };
}

beforeEach(() => {
  vi.clearAllMocks();
  harness.queries.length = 0;
  harness.inboxStatus = "RECEIVED";
  harness.controlsMissing = false;
  harness.rpc.mockResolvedValue({ data: null, error: null });
  harness.settle.mockResolvedValue({ ok: true, outcome: "BOOKING_CONFIRMED" });
  harness.reconcile.mockResolvedValue({ status: "TRANSFERRED" });
  harness.read.mockImplementation(async (path: string) => {
    if (path === "account") return { id: "acct_isolated" };
    if (path.startsWith("transfers/")) return { transfer_group: "isolated-key" };
    return { id: "cs_isolated", metadata: { reference: "BKG-isolated" }, amount_total: 10000, currency: "cad", livemode: true, payment_status: "paid", payment_intent: { id: "pi_isolated", status: "succeeded", latest_charge: { id: "ch_isolated", paid: true, refunded: false, disputed: false } } };
  });
});

describe("isolated Marketplace event dispatch", () => {
  it.each(["checkout.session.completed", "checkout.session.async_payment_succeeded"])("settles verified %s", async (type) => {
    const response = await handleMarketplaceEvent(event(type, { id: "cs_isolated", metadata: { reference: "BKG-isolated" }, payment_status: "paid" }));
    expect(response.status).toBe(200);
    expect(harness.settle).toHaveBeenCalledOnce();
    expect(harness.settle).toHaveBeenCalledWith(expect.objectContaining({ status: "PAID", signatureVerified: true, detail: expect.objectContaining({ charge_id: "ch_isolated", amount_minor: 10000 }) }));
  });
  it.each([["checkout.session.async_payment_failed", "FAILED"], ["checkout.session.expired", "CANCELLED"]])("settles %s as %s", async (type, status) => {
    expect((await handleMarketplaceEvent(event(type, { metadata: { reference: "BKG-isolated" } }))).status).toBe(200);
    expect(harness.settle).toHaveBeenCalledWith(expect.objectContaining({ status }));
  });
  it("holds refunded funds and flags the ledger for review", async () => {
    expect((await handleMarketplaceEvent(event("charge.refunded", { id: "ch_isolated", payment_intent: "pi_isolated" }))).status).toBe(200);
    expect(harness.rpc).toHaveBeenCalledWith("hold_stripe_booking_charge", { _charge_id: "ch_isolated", _reason: "charge.refunded" });
    expect(harness.queries).toContainEqual({ table: "payment_transactions", action: "update", value: { status: "REFUNDED", reconciliation_status: "NEEDS_REVIEW" } });
  });
  it.each(["charge.dispute.created", "charge.dispute.updated", "charge.dispute.closed"])("holds %s without releasing funds", async (type) => {
    expect((await handleMarketplaceEvent(event(type, { charge: "ch_isolated" }))).status).toBe(200);
    expect(harness.rpc).toHaveBeenCalledWith("hold_stripe_booking_charge", { _charge_id: "ch_isolated", _reason: type });
    expect(harness.settle).not.toHaveBeenCalled();
    expect(harness.reconcile).not.toHaveBeenCalled();
  });
  it.each(["transfer.created", "transfer.updated", "transfer.reversed"])("reconciles %s from current transfer evidence", async (type) => {
    harness.reconcile.mockResolvedValue({ status: type === "transfer.reversed" ? "REVERSED" : "TRANSFERRED" });
    expect((await handleMarketplaceEvent(event(type, { id: "tr_isolated" }))).status).toBe(200);
    expect(harness.read).toHaveBeenCalledWith("transfers/tr_isolated");
    expect(harness.reconcile).toHaveBeenCalledWith("isolated-booking");
  });
  it("does not settle a processed event again", async () => {
    harness.inboxStatus = "PROCESSED";
    const response = await handleMarketplaceEvent(event("checkout.session.completed", { metadata: { reference: "BKG-isolated" }, payment_status: "paid" }));
    expect(await response.text()).toBe("ok (duplicate)");
    expect(harness.settle).not.toHaveBeenCalled();
    expect(harness.rpc).not.toHaveBeenCalled();
  });
  it("fails closed when safeguards are absent", async () => {
    harness.controlsMissing = true;
    expect((await handleMarketplaceEvent(event("charge.refunded"))).status).toBe(503);
    expect(harness.rpc).not.toHaveBeenCalled();
    expect(harness.queries).toHaveLength(0);
  });
  it("rejects non-live payloads before any payment read", async () => {
    expect((await handleMarketplaceEvent({ ...event("charge.refunded"), livemode: false })).status).toBe(400);
    expect(harness.read).not.toHaveBeenCalled();
  });
  it("does not mark settlement failures processed", async () => {
    harness.settle.mockResolvedValue({ ok: false });
    expect((await handleMarketplaceEvent(event("checkout.session.async_payment_failed", { metadata: { reference: "BKG-isolated" } }))).status).toBe(500);
    expect(harness.queries.filter(q => q.table === "stripe_webhook_inbox" && q.action === "update")).toHaveLength(0);
  });
  it("does not mark unresolved transfers processed", async () => {
    harness.reconcile.mockResolvedValue({ status: "UNKNOWN" });
    expect((await handleMarketplaceEvent(event("transfer.updated", { id: "tr_isolated" }))).status).toBe(500);
  });
  it("rejects a Flights reference on Marketplace", async () => {
    expect((await handleMarketplaceEvent(event("checkout.session.completed", { metadata: { reference: "FLT-isolated" }, payment_status: "paid" }))).status).toBe(500);
    expect(harness.settle).not.toHaveBeenCalled();
  });
  it("rejects a mismatch with the approved platform account", async () => {
    harness.read.mockResolvedValue({ id: "acct_wrong" });
    expect((await handleMarketplaceEvent(event("charge.refunded"))).status).toBe(409);
    expect(harness.rpc).not.toHaveBeenCalled();
  });
});