import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  "supabase/migrations/20261104213000_fix_anonymous_storage_policy_errors.sql",
  "utf8",
);
const code = sql
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n");
const statements = code
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

describe("anonymous Storage policy fix migration", () => {
  it("only narrows the property-image policy to authenticated users", () => {
    expect(statements).toEqual([
      'ALTER POLICY "property images readable" ON storage.objects TO authenticated',
    ]);
  });

  it("does not grant anything, redefine conditions or add privileged functions", () => {
    expect(code).not.toMatch(/\bGRANT\b/i);
    expect(code).not.toMatch(/\bUSING\b|\bWITH CHECK\b/i);
    expect(code).not.toMatch(/SECURITY DEFINER|CREATE\s+(OR\s+REPLACE\s+)?FUNCTION/i);
    expect(code).not.toMatch(/\bTO\s+(anon|public)\b/i);
  });
});
