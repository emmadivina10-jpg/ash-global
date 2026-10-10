import { beforeEach, describe, expect, it, vi } from "vitest";

// Isolated handler regression tests: never consume a real code or credit money.
const harness = vi.hoisted(() => ({
  rpc: vi.fn(), transfer: vi.fn(),
  providerUser: "provider-fixture", schemaReads: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  const builder = { middleware: () => builder, inputValidator: () => builder,
    handler: (handler: unknown) => handler };
  return builder;
} }));
vi.mock("../src/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("../src/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: harness.schemaReads } }));
vi.mock("../src/lib/stripe-booking-release.server", () => ({ releaseBookingTransfer: harness.transfer }));
import { verifyBookingService } from "../src/lib/stripe-release.functions";

const run = verifyBookingService as unknown as (input: unknown) => Promise<{ ok: boolean; error?: string; releaseStatus?: string }>;
function request() {
  const query = { select: () => query, eq: () => query, single: async () => ({
    data: { payment_provider: "STRIPE", provider_id: "profile-fixture", provider_profiles: { user_id: harness.providerUser } }, error: null,
  }) };
  return { data: { bookingId: "booking-fixture", code: "ASH-123456" }, context: {
    userId: "provider-fixture", supabase: { from: () => query, rpc: harness.rpc },
  } };
}
beforeEach(() => {
  vi.clearAllMocks();
  harness.providerUser = "provider-fixture";
  harness.rpc.mockResolvedValue({ data: { ok: true }, error: null });
});
describe("service verification with transfers disabled", () => {
  it("validates a paid service through the existing code RPC without requiring payout tables", async () => {
    expect(await run(request())).toEqual({ ok: true, releaseStatus: "AVAILABLE_IN_WALLET" });
    expect(harness.rpc).toHaveBeenCalledWith("verify_booking_code", { _booking_id: "booking-fixture", _code: "ASH-123456" });
    expect(harness.schemaReads).not.toHaveBeenCalled();
  });
  it("does not send a Stripe transfer after code verification", async () => {
    await run(request());
    expect(harness.transfer).not.toHaveBeenCalled();
  });
  it("preserves wrong-code rejection and attempts", async () => {
    harness.rpc.mockResolvedValue({ data: { ok: false, error: "WRONG_CODE", attempts_left: 3 }, error: null });
    expect(await run(request())).toEqual({ ok: false, error: "WRONG_CODE", attempts_left: 3 });
  });
  it("rejects a different provider before consuming the code", async () => {
    harness.providerUser = "another-provider";
    expect((await run(request())).ok).toBe(false);
    expect(harness.rpc).not.toHaveBeenCalled();
  });
  it("preserves idempotent already-verified success", async () => {
    harness.rpc.mockResolvedValue({ data: { ok: true, already: true }, error: null });
    expect(await run(request())).toEqual({ ok: true, already: true, releaseStatus: "AVAILABLE_IN_WALLET" });
  });
});