import { beforeEach, describe, expect, it, vi } from "vitest";

// Network and database replacements are restricted to this test process.
const harness = vi.hoisted(() => ({ read: vi.fn(), rpc: vi.fn(), job: {} as Record<string, unknown> }));
vi.mock("../src/lib/stripe.server", () => ({ stripeRead: harness.read, stripeConnect: { transfer: vi.fn() } }));
vi.mock("../src/integrations/supabase/client.server", () => ({ supabaseAdmin: {
  rpc: harness.rpc,
  from: () => { const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: harness.job, error: null }) }; return query; },
} }));
import { reconcileRelease, releaseBookingTransfer, providerOnboardingEnabled } from "../src/lib/stripe-booking-release.server";

const transfer = { id: "tr_isolated", destination: "acct_provider_isolated", amount: 8500, currency: "cad", source_transaction: "ch_isolated", reversed: false, amount_reversed: 0 };
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("NETWORK_FORBIDDEN_IN_ISOLATED_TEST"); }));
  harness.job = { marketplace_account_id: "acct_isolated", destination_account_id: "acct_provider_isolated", amount_minor: 8500, currency: "cad", source_charge_id: "ch_isolated", transfer_id: "tr_isolated" };
  harness.rpc.mockResolvedValue({ error: null });
  harness.read.mockImplementation(async (path: string) => path === "account" ? { id: "acct_isolated" } : transfer);
});

describe("isolated transfer reconciliation", () => {
  it("records the actual matching transfer ID", async () => {
    expect(await reconcileRelease("isolated-booking")).toEqual({ status: "TRANSFERRED", transferId: "tr_isolated" });
    expect(harness.rpc).toHaveBeenCalledWith("finish_stripe_booking_release", { _booking_id: "isolated-booking", _transfer_id: "tr_isolated", _reversed: false });
  });
  it("records a partial reversal as REVERSED", async () => {
    harness.read.mockImplementation(async (path: string) => path === "account" ? { id: "acct_isolated" } : { ...transfer, amount_reversed: 1 });
    expect((await reconcileRelease("isolated-booking")).status).toBe("REVERSED");
    expect(harness.rpc).toHaveBeenCalledWith("finish_stripe_booking_release", expect.objectContaining({ _reversed: true }));
  });
  it.each(["destination", "amount", "currency", "source_transaction"])("rejects mismatched %s evidence", async (field) => {
    harness.read.mockImplementation(async (path: string) => path === "account" ? { id: "acct_isolated" } : { ...transfer, [field]: field === "amount" ? 8501 : "wrong" });
    expect((await reconcileRelease("isolated-booking")).status).toBe("REQUIRES_REVIEW");
    expect(harness.rpc).not.toHaveBeenCalled();
  });
  it("does not treat an absent transfer as success", async () => {
    harness.job.transfer_id = null;
    harness.read.mockImplementation(async (path: string) => path === "account" ? { id: "acct_isolated" } : { data: [], has_more: false });
    expect((await reconcileRelease("isolated-booking")).status).toBe("UNKNOWN");
    expect(harness.rpc).not.toHaveBeenCalled();
  });
  it("requires review rather than accepting multiple transfers", async () => {
    harness.job.transfer_id = null;
    harness.read.mockImplementation(async (path: string) => path === "account" ? { id: "acct_isolated" } : { data: [transfer, transfer], has_more: false });
    expect((await reconcileRelease("isolated-booking")).status).toBe("REQUIRES_REVIEW");
    expect(harness.rpc).not.toHaveBeenCalled();
  });
  it("does not report a transfer recorded when the database rejects it", async () => {
    harness.rpc.mockResolvedValue({ error: { message: "isolated write failure" } });
    expect((await reconcileRelease("isolated-booking")).status).toBe("UNKNOWN");
  });
  it("keeps onboarding and transfer submission disabled without database or Stripe calls", async () => {
    expect(await providerOnboardingEnabled()).toBe(false);
    expect(await releaseBookingTransfer("isolated-booking")).toEqual({ status: "AWAITING_APPROVAL" });
    expect(harness.read).not.toHaveBeenCalled();
    expect(harness.rpc).not.toHaveBeenCalled();
  });
});