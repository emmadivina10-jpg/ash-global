import { describe, expect, it } from "vitest";
import { executeAccountErasure, requireErasureDeployment, type ErasurePhase, type ErasureStore } from "../src/lib/account-erasure.server";

function fixture(failAt?: string) {
  let phase: ErasurePhase = "REQUESTED";
  let failing = failAt;
  const calls: string[] = [];
  let identityPresent = true;
  let personalDataPresent = true;
  let filesPresent = true;
  const ledger = [{ reference: "fixture-payment", amount: 1000, currency: "CAD" }];
  const counterparty = { message: "other member's independent record" };
  const step = async (name: string, action?: () => void) => {
    calls.push(name);
    if (failing === name) throw new Error("fixture failure");
    action?.();
  };
  const store: ErasureStore = {
    withLease: async (_id, work) => work(),
    load: async () => ({ id: "job", userId: "member", phase }),
    assertRetentionReady: () => step("retention"),
    freezeAndCheckObligations: () => step("freeze"),
    removePersonalFiles: () => step("files", () => { filesPresent = false; }),
    erasePersonalData: () => step("data", () => { personalDataPresent = false; }),
    removeSignInIdentity: () => step("auth", () => { identityPresent = false; }),
    verifyErasure: () => step("verify", () => {
      if (identityPresent || personalDataPresent || filesPresent) throw new Error("residual personal data");
    }),
    savePhase: async (_id, next) => { phase = next; },
    recordFailure: () => step("failure"),
  };
  return { store, calls, ledger, counterparty, phase: () => phase, identity: () => identityPresent, recover: () => { failing = undefined; } };
}

describe("account erasure orchestration (isolated; no live adapter)", () => {
  it("rejects a different member before touching records", async () => {
    const f = fixture();
    await expect(executeAccountErasure(f.store, "job", "another-member")).rejects.toThrow("ERASURE_FORBIDDEN");
    expect(f.calls).toEqual([]);
    expect(f.identity()).toBe(true);
  });
  it("requires retention clearance before destructive work", async () => {
    const f = fixture("retention");
    await expect(executeAccountErasure(f.store, "job", "member")).rejects.toThrow("ERASURE_INCOMPLETE");
    expect(f.calls).toEqual(["retention", "failure"]);
    expect(f.phase()).toBe("REQUESTED");
  });
  it("does not delete while unresolved obligations block freezing", async () => {
    const f = fixture("freeze");
    await expect(executeAccountErasure(f.store, "job", "member")).rejects.toThrow();
    expect(f.calls).not.toContain("files");
    expect(f.identity()).toBe(true);
  });
  it.each(["files", "data", "auth", "verify"])("resumes after %s failure without falsely completing", async (failedStep) => {
    const f = fixture(failedStep);
    await expect(executeAccountErasure(f.store, "job", "member")).rejects.toThrow("ERASURE_INCOMPLETE");
    expect(f.phase()).not.toBe("COMPLETED");
    const successfulPrior = f.calls.filter((name) => ![failedStep, "failure", "retention"].includes(name));
    f.recover();
    await expect(executeAccountErasure(f.store, "job", "member")).resolves.toEqual({ completed: true });
    for (const name of successfulPrior) expect(f.calls.filter((call) => call === name)).toHaveLength(1);
    expect(f.phase()).toBe("COMPLETED");
  });
  it("removes the fixture identity, leaves monetary evidence and counterpart history unchanged", async () => {
    const f = fixture();
    await executeAccountErasure(f.store, "job", "member");
    expect(f.identity()).toBe(false);
    expect(f.ledger).toEqual([{ reference: "fixture-payment", amount: 1000, currency: "CAD" }]);
    expect(f.counterparty.message).toBe("other member's independent record");
    const previous = [...f.calls];
    await executeAccountErasure(f.store, "job", "member");
    expect(f.calls).toEqual(previous);
  });
  it("blocks live activation without retention and cascade protection", () => {
    expect(() => requireErasureDeployment()).toThrow("request remains pending");
  });
});