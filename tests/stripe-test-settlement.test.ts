import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Isolated fixtures only: no Stripe requests, credentials or real database writes.
const harness = vi.hoisted(() => ({
  queries: [] as Array<{ table: string; action: string; value: unknown }>,
  inboxStatus: "RECEIVED",
  // Test records: payment_provider STRIPE_TEST + BKG-TEST- reference.
  bookingProvider: "STRIPE_TEST",
  bookingReference: "BKG-TEST-isolated",
  codeResult: { ok: true } as Record<string, unknown>,
  claimResult: {
    ok: true,
    destination_account_id: "acct_test_dest",
    amount_minor: 255,
    currency: "usd",
    source_charge_id: "ch_test",
    attempt: 0,
  } as Record<string, unknown>,
  finishStatus: "TRANSFERRED",
  testRead: vi.fn(),
  testTransfer: vi.fn(),
  settle: vi.fn(),
}));

vi.mock("../src/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc(name: string, args: unknown) {
      if (name === "verify_booking_code")
        return Promise.resolve({ data: harness.codeResult, error: null });
      if (name === "claim_stripe_booking_release")
        return Promise.resolve({ data: harness.claimResult, error: null });
      if (name === "finish_stripe_booking_release")
        return Promise.resolve({ data: { status: harness.finishStatus }, error: null });
      return Promise.resolve({ data: null, error: null });
    },
    from(table: string) {
      const result = () => {
        if (table === "stripe_marketplace_controls")
          return { data: { marketplace_account_id: "acct_LIVE_platform" }, error: null };
        if (table === "stripe_webhook_inbox")
          return { data: { status: harness.inboxStatus }, error: null };
        if (table === "bookings")
          return {
            data: {
              id: "test-booking",
              provider_transaction_id: "cs_test",
              payment_reference: harness.bookingReference,
              payment_amount: 3,
              payment_currency: "usd",
              payment_provider: harness.bookingProvider,
              provider_id: "test-provider",
              paid_at: "2026-10-26T00:00:00Z",
              status: "COMPLETED",
              verification_status: "VERIFIED",
              provider_profiles: { user_id: "provider-user" },
            },
            error: null,
          };
        if (table === "provider_profiles") return { data: { user_id: "provider-user" }, error: null };
        if (table === "profiles")
          return { data: { stripe_account_id: "acct_test_dest" }, error: null };
        if (table === "stripe_booking_releases")
          return {
            data: {
              booking_id: "test-booking",
              status: "PENDING_VERIFICATION",
              marketplace_account_id: "acct_test_platform",
              destination_account_id: "acct_test_dest",
              idempotency_key: "ash_marketplace_booking_test-booking_v1",
              gross_minor: 300,
              amount_minor: 255,
              currency: "usd",
              source_charge_id: "ch_test",
              payment_intent_id: "pi_test",
              transfer_id: null,
            },
            error: null,
          };
        return { data: null, error: null };
      };
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        in: vi.fn(() => query),
        order: vi.fn(() => query),
        limit: vi.fn(() => query),
        upsert(value: unknown) {
          harness.queries.push({ table, action: "upsert", value });
          return query;
        },
        update(value: unknown) {
          harness.queries.push({ table, action: "update", value });
          return query;
        },
        single: async () => result(),
        maybeSingle: async () => result(),
        then(resolve: (value: ReturnType<typeof result>) => unknown) {
          return Promise.resolve(result()).then(resolve);
        },
      };
      return query;
    },
  },
}));
vi.mock("../src/lib/stripe.server", () => ({
  stripeEnvironment: () => ({ live: true, test: true }),
  stripeTestRead: harness.testRead,
  stripeTestTransfer: harness.testTransfer,
}));
vi.mock("../src/lib/payment-settlement.server", () => ({ settleCollection: harness.settle }));

import {
  handleTestMarketplaceEvent,
  verifyTestBookingService,
  releaseTestBookingTransfer,
  reconcileTestRelease,
} from "../src/lib/stripe-test-settlement.server";

function event(type: string, object: Record<string, unknown> = {}) {
  return { id: "evt_test", type, livemode: false, data: { object } };
}

const PAID_SESSION = {
  id: "cs_test",
  metadata: { reference: "BKG-TEST-isolated" },
  amount_total: 300,
  currency: "usd",
  livemode: false,
  payment_status: "paid",
  payment_intent: {
    id: "pi_test",
    status: "succeeded",
    latest_charge: { id: "ch_test", paid: true, refunded: false, disputed: false },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("NETWORK_FORBIDDEN_IN_ISOLATED_TEST");
    }),
  );
  vi.stubEnv("STRIPE_TEST_SETTLEMENT_ENABLED", "true");
  harness.queries.length = 0;
  harness.inboxStatus = "RECEIVED";
  harness.bookingProvider = "STRIPE_TEST";
  harness.bookingReference = "BKG-TEST-isolated";
  harness.codeResult = { ok: true };
  harness.claimResult = {
    ok: true,
    destination_account_id: "acct_test_dest",
    amount_minor: 255,
    currency: "usd",
    source_charge_id: "ch_test",
    attempt: 0,
  };
  harness.finishStatus = "TRANSFERRED";
  harness.settle.mockResolvedValue({ ok: true, outcome: "BOOKING_CONFIRMED" });
  harness.testTransfer.mockResolvedValue({ ok: true, transferId: "tr_test", error: null });
  harness.testRead.mockImplementation(async (path: string) => {
    if (path === "account") return { id: "acct_test_platform" };
    if (path.startsWith("accounts/"))
      return {
        id: "acct_test_dest",
        livemode: false,
        country: "CA",
        payouts_enabled: true,
        capabilities: { transfers: "active" },
      };
    if (path.startsWith("charges/"))
      return {
        id: "ch_test",
        livemode: false,
        paid: true,
        refunded: false,
        disputed: false,
        amount_refunded: 0,
        payment_intent: "pi_test",
        currency: "usd",
        amount: 300,
      };
    if (path.startsWith("transfers?"))
      return {
        data: [
          {
            id: "tr_test",
            livemode: false,
            destination: "acct_test_dest",
            amount: 255,
            currency: "usd",
            source_transaction: "ch_test",
          },
        ],
        has_more: false,
      };
    if (path.startsWith("transfers/"))
      return {
        id: "tr_test",
        livemode: false,
        destination: "acct_test_dest",
        amount: 255,
        currency: "usd",
        source_transaction: "ch_test",
        transfer_group: "ash_marketplace_booking_test-booking_v1",
      };
    return PAID_SESSION;
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("test settlement gates", () => {
  it("refuses everything when the explicit flag is off", async () => {
    vi.stubEnv("STRIPE_TEST_SETTLEMENT_ENABLED", "");
    const response = await handleTestMarketplaceEvent(
      event("checkout.session.completed", { ...PAID_SESSION }),
    );
    expect(response.status).toBe(503);
    expect(harness.settle).not.toHaveBeenCalled();
    expect(harness.testRead).not.toHaveBeenCalled();
    const release = await releaseTestBookingTransfer("test-booking");
    expect(release.status).toBe("TEST_SETTLEMENT_NOT_ENABLED");
    expect(harness.testTransfer).not.toHaveBeenCalled();
  });
  it("rejects live-mode events before any read", async () => {
    const response = await handleTestMarketplaceEvent({
      ...event("checkout.session.completed", PAID_SESSION),
      livemode: true,
    });
    expect(response.status).toBe(400);
    expect(harness.testRead).not.toHaveBeenCalled();
    expect(harness.settle).not.toHaveBeenCalled();
  });
  it("rejects a non-test reference", async () => {
    const response = await handleTestMarketplaceEvent(
      event("checkout.session.completed", {
        ...PAID_SESSION,
        metadata: { reference: "BKG-live-booking" },
      }),
    );
    expect(response.status).toBe(500);
    expect(harness.settle).not.toHaveBeenCalled();
  });
  it("rejects a production booking record (payment_provider STRIPE)", async () => {
    harness.bookingProvider = "STRIPE";
    const response = await handleTestMarketplaceEvent(
      event("checkout.session.completed", { ...PAID_SESSION, payment_status: "paid" }),
    );
    expect(response.status).toBe(500);
    expect(harness.settle).not.toHaveBeenCalled();
  });
  it("refuses when the test platform account equals the live controls account", async () => {
    harness.testRead.mockImplementation(async (path: string) =>
      path === "account" ? { id: "acct_LIVE_platform" } : PAID_SESSION,
    );
    const response = await handleTestMarketplaceEvent(
      event("checkout.session.completed", PAID_SESSION),
    );
    expect(response.status).toBe(409);
    expect(harness.settle).not.toHaveBeenCalled();
  });
});

describe("test payment → booking settlement", () => {
  it("settles a verified test checkout payment", async () => {
    const response = await handleTestMarketplaceEvent(
      event("checkout.session.completed", { ...PAID_SESSION, payment_status: "paid" }),
    );
    expect(response.status).toBe(200);
    expect(harness.settle).toHaveBeenCalledOnce();
    expect(harness.settle).toHaveBeenCalledWith(
      expect.objectContaining({
        merchantReference: "BKG-TEST-isolated",
        status: "PAID",
        source: "STRIPE_TEST_WEBHOOK",
        signatureVerified: true,
        detail: expect.objectContaining({ charge_id: "ch_test", amount_minor: 300 }),
      }),
    );
  });
  it("acknowledges a duplicate event without settling again", async () => {
    harness.inboxStatus = "PROCESSED";
    const response = await handleTestMarketplaceEvent(
      event("checkout.session.completed", { ...PAID_SESSION, payment_status: "paid" }),
    );
    expect(await response.text()).toBe("ok (duplicate)");
    expect(harness.settle).not.toHaveBeenCalled();
  });
  it.each([
    ["checkout.session.async_payment_failed", "FAILED"],
    ["checkout.session.expired", "CANCELLED"],
  ])("settles %s as %s", async (type, status) => {
    expect(
      (await handleTestMarketplaceEvent(event(type, { metadata: { reference: "BKG-TEST-isolated" } })))
        .status,
    ).toBe(200);
    expect(harness.settle).toHaveBeenCalledWith(expect.objectContaining({ status }));
  });
  it("holds a refunded test charge and never releases", async () => {
    expect(
      (await handleTestMarketplaceEvent(event("charge.refunded", { id: "ch_test" }))).status,
    ).toBe(200);
    expect(harness.settle).not.toHaveBeenCalled();
    expect(harness.testTransfer).not.toHaveBeenCalled();
  });
  it.each(["charge.dispute.created", "charge.dispute.updated", "charge.dispute.closed"])(
    "holds %s without releasing funds",
    async (type) => {
      expect((await handleTestMarketplaceEvent(event(type, { charge: "ch_test" }))).status).toBe(
        200,
      );
      expect(harness.settle).not.toHaveBeenCalled();
      expect(harness.testTransfer).not.toHaveBeenCalled();
    },
  );
});

describe("test completion code → provider transfer", () => {
  const input = { bookingId: "test-booking", code: "123456", userId: "provider-user" };

  it("rejects an invalid code and never transfers", async () => {
    harness.codeResult = { ok: false, error: "INVALID_CODE", attempts_left: 2 };
    const result = await verifyTestBookingService(input);
    expect(result).toEqual({ ok: false, error: "INVALID_CODE", attempts_left: 2 });
    expect(harness.testTransfer).not.toHaveBeenCalled();
  });
  it("rejects a production booking even with a valid code", async () => {
    harness.bookingProvider = "STRIPE";
    const result = await verifyTestBookingService(input);
    expect(result).toEqual({ ok: false, error: "NOT_A_TEST_BOOKING" });
    expect(harness.testTransfer).not.toHaveBeenCalled();
  });
  it("rejects a caller who is not the provider", async () => {
    const result = await verifyTestBookingService({ ...input, userId: "someone-else" });
    expect(result).toEqual({ ok: false, error: "VERIFICATION_FAILED" });
    expect(harness.testTransfer).not.toHaveBeenCalled();
  });
  it("transfers the exact server-locked provider share after a valid code", async () => {
    const result = await verifyTestBookingService(input);
    expect(result.ok).toBe(true);
    expect(result.releaseStatus).toBe("TRANSFERRED");
    expect(harness.testTransfer).toHaveBeenCalledOnce();
    expect(harness.testTransfer).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: "acct_test_dest",
        amountCents: 255, // 300 gross − 15% commission (45), locked server-side
        currency: "usd",
        sourceTransaction: "ch_test",
        idempotencyKey: "ash_marketplace_booking_test-booking_v1",
      }),
    );
  });
  it("a concurrent attempt that loses the claim lock never transfers", async () => {
    harness.claimResult = { ok: false };
    const result = await releaseTestBookingTransfer("test-booking");
    expect(result.status).toBe("NOT_CLAIMED");
    expect(harness.testTransfer).not.toHaveBeenCalled();
  });
  it("refuses a claimed amount above the locked share or gross", async () => {
    harness.claimResult = { ...harness.claimResult, amount_minor: 260 };
    expect((await releaseTestBookingTransfer("test-booking")).status).toBe("REQUIRES_REVIEW");
    harness.claimResult = { ...harness.claimResult, amount_minor: 301 };
    expect((await releaseTestBookingTransfer("test-booking")).status).toBe("REQUIRES_REVIEW");
    expect(harness.testTransfer).not.toHaveBeenCalled();
  });
  it("classifies insufficient test balance without retrying", async () => {
    harness.testTransfer.mockResolvedValue({
      ok: false,
      transferId: null,
      error: "STRIPE_TRANSFER_REJECTED",
      httpStatus: 402,
      errorCode: "balance_insufficient",
    });
    const result = await releaseTestBookingTransfer("test-booking");
    expect(result.status).toBe("INSUFFICIENT_FUNDS");
    expect(harness.testTransfer).toHaveBeenCalledOnce();
  });
  it("holds the release when the charge evidence shows a refund", async () => {
    harness.testRead.mockImplementation(async (path: string) => {
      if (path === "account") return { id: "acct_test_platform" };
      if (path.startsWith("accounts/"))
        return {
          id: "acct_test_dest",
          livemode: false,
          country: "CA",
          payouts_enabled: true,
          capabilities: { transfers: "active" },
        };
      if (path.startsWith("charges/"))
        return {
          id: "ch_test",
          livemode: false,
          paid: true,
          refunded: true,
          amount_refunded: 300,
          payment_intent: "pi_test",
          currency: "usd",
          amount: 300,
        };
      return PAID_SESSION;
    });
    const result = await releaseTestBookingTransfer("test-booking");
    expect(result.status).toBe("PAYMENT_HELD");
    expect(harness.testTransfer).not.toHaveBeenCalled();
  });
  it("rejects a live-mode destination account (live IDs fail closed)", async () => {
    harness.testRead.mockImplementation(async (path: string) => {
      if (path === "account") return { id: "acct_test_platform" };
      if (path.startsWith("accounts/")) throw new Error("STRIPE_TEST_READ_FAILED");
      return PAID_SESSION;
    });
    await expect(releaseTestBookingTransfer("test-booking")).rejects.toThrow(
      "STRIPE_TEST_READ_FAILED",
    );
    expect(harness.testTransfer).not.toHaveBeenCalled();
  });
});

describe("test transfer reconciliation", () => {
  it("reconciles a transfer event from current test-mode evidence", async () => {
    const response = await handleTestMarketplaceEvent(
      event("transfer.created", { id: "tr_test" }),
    );
    expect(response.status).toBe(200);
    expect(harness.testRead).toHaveBeenCalledWith("transfers/tr_test");
  });
  it("flags a transfer whose amount differs from the locked share", async () => {
    harness.testRead.mockImplementation(async (path: string) => {
      if (path === "account") return { id: "acct_test_platform" };
      return {
        id: "tr_test",
        livemode: false,
        destination: "acct_test_dest",
        amount: 300,
        currency: "usd",
        source_transaction: "ch_test",
      };
    });
    const result = await reconcileTestRelease("test-booking");
    expect(result.status).toBe("REQUIRES_REVIEW");
  });
  it("flags a live-mode transfer as reviewable, never settled", async () => {
    harness.testRead.mockImplementation(async (path: string) => {
      if (path === "account") return { id: "acct_test_platform" };
      return {
        id: "tr_live",
        livemode: true,
        destination: "acct_test_dest",
        amount: 255,
        currency: "usd",
        source_transaction: "ch_test",
      };
    });
    const result = await reconcileTestRelease("test-booking");
    expect(result.status).toBe("REQUIRES_REVIEW");
  });
});
