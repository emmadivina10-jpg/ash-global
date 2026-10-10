import { describe, expect, it } from "vitest";
import { preflight } from "../scripts/validation-preflight";

const PROD = "scynsxeezthoekxwqhsw";
describe("validation preflight", () => {
  it("blocks when draft targets production", () => expect(preflight([PROD, PROD, PROD], "isoabc")).toBe("DRAFT_TARGETS_PRODUCTION"));
  it("blocks when database tool targets production", () => expect(preflight(["isoabc", "isoabc", "isoabc"], PROD)).toBe("DATABASE_TARGETS_PRODUCTION"));
  it("blocks when database identity is unknown", () => expect(preflight(["isoabc", "isoabc", "isoabc"], undefined)).toBe("DATABASE_IDENTITY_UNVERIFIED"));
  it("blocks when draft identity is missing", () => expect(preflight(["isoabc", undefined, "isoabc"], "isoabc")).toBe("DRAFT_IDENTITY_UNVERIFIED"));
  it("blocks mismatched identities", () => expect(preflight(["isoabc", "isoabc", "isoabc"], "isoxyz")).toBe("IDENTITY_MISMATCH"));
  it("passes only matching non-production identities", () => expect(preflight(["isoabc", "isoabc", "isoabc"], "isoabc")).toBeNull());
});
