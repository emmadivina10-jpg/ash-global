// Fail-closed preflight for isolated Stripe safeguard validation.
// Exits non-zero unless the draft backend and the database-tool backend are
// both positively identified, match each other, and differ from production.
// Usage: VALIDATION_DB_REF=<ref reported by the database tool> bun scripts/validation-preflight.ts
const PRODUCTION_REF = "scynsxeezthoekxwqhsw";

export function preflight(draftRefs: (string | undefined)[], dbRef: string | undefined): string | null {
  const refs = draftRefs.map((r) => r?.trim()).filter(Boolean) as string[];
  if (refs.length !== draftRefs.length) return "DRAFT_IDENTITY_UNVERIFIED";
  if (new Set(refs).size !== 1) return "DRAFT_IDENTITY_INCONSISTENT";
  const draft = refs[0];
  const db = dbRef?.trim();
  if (!db) return "DATABASE_IDENTITY_UNVERIFIED";
  if (draft === PRODUCTION_REF) return "DRAFT_TARGETS_PRODUCTION";
  if (db === PRODUCTION_REF) return "DATABASE_TARGETS_PRODUCTION";
  if (draft !== db) return "IDENTITY_MISMATCH";
  return null;
}

if (import.meta.main) {
  const urlRef = process.env.VITE_SUPABASE_URL?.match(/^https:\/\/([a-z0-9]+)\./)?.[1];
  const blocked = preflight(
    [process.env.SUPABASE_PROJECT_ID, process.env.VITE_SUPABASE_PROJECT_ID, urlRef],
    process.env.VALIDATION_DB_REF,
  );
  if (blocked) {
    console.error(`BLOCKED: ${blocked} — no validation database operations may run.`);
    process.exit(1);
  }
  console.log("PREFLIGHT OK: isolated backend confirmed.");
}
