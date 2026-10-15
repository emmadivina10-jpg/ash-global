import { describe, expect, it } from "vitest";
import {
  OUTCOME_UNKNOWN, runWalletCredit, validateWalletCreditInput, type CreditRpc,
} from "../src/lib/wallet-credit";
import {
  initialCreditForm, isCreditFormLocked, nextCreditRequest, resolveCreditRequest,
} from "../src/lib/wallet-credit-form";

const REQ = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";
const SEAT = "33333333-3333-4333-8333-333333333333";
const input = { requestId: REQ, userId: USER, amount: 1000, reason: "Goodwill credit" };
const okRpc: CreditRpc = async (a) => ({
  data: { ok: true, reference: "ADJ-1", amount: a._amount, currency: "XAF", new_balance: 1000 },
  error: null,
});
const rev = { staffId: SEAT, department: "REVENUE", extraDepartments: [] };

describe("input rules", () => {
  it("rejects reasons over 500 characters instead of cutting them", () => {
    expect(validateWalletCreditInput({ ...input, reason: "x".repeat(501) })).toBe("REASON_TOO_LONG");
    expect(validateWalletCreditInput({ ...input, reason: "x".repeat(500) })).toBeNull();
  });
  it("allows up to 10,000,000 XAF whole amounts only", () => {
    expect(validateWalletCreditInput({ ...input, amount: 10_000_000 })).toBeNull();
    expect(validateWalletCreditInput({ ...input, amount: 10_000_001 })).toBe("INVALID_AMOUNT");
    expect(validateWalletCreditInput({ ...input, amount: 10.5 })).toBe("INVALID_AMOUNT");
  });
  it("requires a request ID", () => {
    expect(validateWalletCreditInput({ ...input, requestId: "" })).toBe("REQUEST_ID_REQUIRED");
  });
});

describe("who may credit", () => {
  it("rejects the seatless master-password session", async () => {
    const r = await runWalletCredit({ staffId: null, department: "SUPER_ADMIN", extraDepartments: [] }, input, okRpc);
    expect(r).toEqual({ ok: false, error: "INDIVIDUAL_ACCOUNT_REQUIRED" });
  });
  it("accepts a Super-admin seat", async () => {
    const r = await runWalletCredit({ staffId: SEAT, department: "SUPER_ADMIN", extraDepartments: [] }, input, okRpc);
    expect(r.ok).toBe(true);
  });
  it("accepts a Revenue seat and Revenue as extra department", async () => {
    expect((await runWalletCredit(rev, input, okRpc)).ok).toBe(true);
    expect((await runWalletCredit({ staffId: SEAT, department: "MARKETPLACE_OPS", extraDepartments: ["REVENUE"] }, input, okRpc)).ok).toBe(true);
  });
  it("rejects other departments, even when elevated", async () => {
    const r = await runWalletCredit({ staffId: SEAT, department: "TRUST", extraDepartments: [] }, input, okRpc);
    expect(r).toEqual({ ok: false, error: "UNAUTHORIZED_ACTOR" });
  });
  it("sends the session seat, never a caller-supplied one", async () => {
    let sent = "";
    await runWalletCredit(rev, input, async (a) => { sent = a._staff_id; return okRpc(a); });
    expect(sent).toBe(SEAT);
  });
});

describe("outcomes", () => {
  it("database error is reported as unknown, not failed", async () => {
    expect(await runWalletCredit(rev, input, async () => ({ data: null, error: { code: "57014" } })))
      .toEqual({ ok: false, error: OUTCOME_UNKNOWN });
  });
  it("network throw is reported as unknown", async () => {
    expect(await runWalletCredit(rev, input, async () => { throw new Error("reset"); }))
      .toEqual({ ok: false, error: OUTCOME_UNKNOWN });
  });
  it("passes through replay and conflict results", async () => {
    const replay = await runWalletCredit(rev, input, async () => ({
      data: { ok: true, reference: "ADJ-1", amount: 1000, new_balance: 1000, replayed: true }, error: null }));
    expect(replay.ok && replay.replayed).toBe(true);
    const conflict = await runWalletCredit(rev, input, async () => ({ data: { ok: false, error: "REQUEST_ID_REUSED" }, error: null }));
    expect(conflict).toEqual({ ok: false, error: "REQUEST_ID_REUSED" });
  });
});

describe("credit form after an unknown outcome", () => {
  let n = 0;
  const newId = () => `aaaaaaaa-0000-4000-8000-00000000000${++n}`;
  const draft = { userId: USER, amount: 1000, reason: "Goodwill credit" };

  it("keeps the original ID and payload, and ignores edits to amount or reason", () => {
    let { state, request: first } = nextCreditRequest(initialCreditForm, draft, newId);
    state = resolveCreditRequest(state, { ok: false, error: OUTCOME_UNKNOWN });
    expect(state.status).toBe("unknown");
    expect(isCreditFormLocked(state)).toBe(true);
    const retry = nextCreditRequest(state, { ...draft, amount: 5000, reason: "Changed reason" }, newId);
    expect(retry.request).toEqual(first);
  });
  it("network failure also keeps the original", () => {
    const { state, request } = nextCreditRequest(initialCreditForm, draft, newId);
    const after = resolveCreditRequest(state, "NETWORK_ERROR");
    expect(after.pending).toEqual(request);
  });
  it("issues a new ID only after the original is definitively resolved", () => {
    let { state, request: first } = nextCreditRequest(initialCreditForm, draft, newId);
    state = resolveCreditRequest(state, { ok: false, error: OUTCOME_UNKNOWN });
    const retry = nextCreditRequest(state, draft, newId);
    state = resolveCreditRequest(retry.state, { ok: true, reference: "ADJ-1", amount: 1000, currency: "XAF", newBalance: 1000, replayed: true, reviewRequired: false });
    expect(isCreditFormLocked(state)).toBe(false);
    const next = nextCreditRequest(state, { ...draft, amount: 2000 }, newId);
    expect(next.request.requestId).not.toBe(first.requestId);
    expect(next.request.amount).toBe(2000);
  });
  it("a definitive rejection unlocks the form", () => {
    const { state } = nextCreditRequest(initialCreditForm, draft, newId);
    expect(isCreditFormLocked(resolveCreditRequest(state, { ok: false, error: "USER_NOT_FOUND" }))).toBe(false);
  });
});
