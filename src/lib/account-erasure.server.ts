/** Server-only orchestration. The persistence adapter must durably store every phase.
 * No live adapter is installed until retention and cascade protection are approved.
 */
export type ErasurePhase = "REQUESTED" | "FROZEN" | "FILES_REMOVED" | "DATA_REMOVED" | "AUTH_REMOVED" | "COMPLETED";

export type ErasureJob = {
  id: string;
  userId: string;
  phase: ErasurePhase;
};

export interface ErasureStore {
  /** Serialize workers for the same member; release the lease even after failure. */
  withLease<T>(jobId: string, work: () => Promise<T>): Promise<T>;
  load(jobId: string): Promise<ErasureJob>;
  /** Must verify reviewed legal basis, expiry/hold, field-level allowlist and schema fingerprint. */
  assertRetentionReady(job: ErasureJob): Promise<void>;
  /** Atomically reject new member writes and check unresolved obligations under locks. */
  freezeAndCheckObligations(job: ErasureJob): Promise<void>;
  /** Exact owned paths captured before erasure; repeat removal is harmless. */
  removePersonalFiles(job: ErasureJob): Promise<void>;
  /** Atomic cleanup: preserve monetary invariants, other members' records and necessary evidence. */
  erasePersonalData(job: ErasureJob): Promise<void>;
  /** Must check surviving cascades/blockers before hard deletion through the Auth API. */
  removeSignInIdentity(job: ErasureJob): Promise<void>;
  verifyErasure(job: ErasureJob): Promise<void>;
  savePhase(jobId: string, phase: ErasurePhase): Promise<void>;
  /** Store a bounded code, not raw errors containing personal information. */
  recordFailure(jobId: string, code: string): Promise<void>;
}

const sequence: ErasurePhase[] = ["REQUESTED", "FROZEN", "FILES_REMOVED", "DATA_REMOVED", "AUTH_REMOVED", "COMPLETED"];

export async function executeAccountErasure(store: ErasureStore, jobId: string, expectedUserId: string) {
  return store.withLease(jobId, async () => {
    const job = await store.load(jobId);
    // Caller derives expectedUserId from validated auth or a verified staff-owned request.
    if (!expectedUserId || job.userId !== expectedUserId) throw new Error("ERASURE_FORBIDDEN");
    if (!sequence.includes(job.phase)) throw new Error("ERASURE_INVALID_PHASE");
    if (job.phase === "COMPLETED") return { completed: true as const };
    try {
      await store.assertRetentionReady(job);
      const steps: Array<[ErasurePhase, () => Promise<void>]> = [
        ["FROZEN", () => store.freezeAndCheckObligations(job)],
        ["FILES_REMOVED", () => store.removePersonalFiles(job)],
        ["DATA_REMOVED", () => store.erasePersonalData(job)],
        ["AUTH_REMOVED", () => store.removeSignInIdentity(job)],
        ["COMPLETED", () => store.verifyErasure(job)],
      ];
      for (const [phase, action] of steps) {
        if (sequence.indexOf(job.phase) >= sequence.indexOf(phase)) continue;
        await action();
        await store.savePhase(job.id, phase);
        job.phase = phase;
      }
      return { completed: true as const };
    } catch {
      await store.recordFailure(job.id, "ERASURE_STEP_FAILED");
      throw new Error("ERASURE_INCOMPLETE");
    }
  });
}

/** Fail closed until a reviewed retention schedule and safe live schema exist. */
export function requireErasureDeployment(): never {
  throw new Error("Permanent deletion is not available yet. The request remains pending until safe data erasure is ready; no account or financial records have been deleted.");
}