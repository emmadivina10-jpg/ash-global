import { describe, expect, it } from "vitest";
import { canAuditDept, cyberRole, parseUserAgent } from "../src/lib/cyber-rules";

const base = { superAdmin: false, elevated: false, extraDepartments: [] as string[] };

describe("cyber roles", () => {
  it("Head of Cybersecurity seat is HEAD", () => {
    expect(cyberRole({ ...base, department: "CYBERSECURITY" })).toBe("HEAD");
  });
  it("Trust seat with Cyber access is a limited TRUST_OFFICER, not HEAD", () => {
    expect(cyberRole({ ...base, department: "TRUST", extraDepartments: ["CYBERSECURITY"] })).toBe("TRUST_OFFICER");
  });
  it("other seats have no cyber role", () => {
    expect(cyberRole({ ...base, department: "SUPPORT" })).toBe("NONE");
  });
  it("CEO dashboards are never auditable", () => {
    expect(canAuditDept("HEAD", "SUPER_ADMIN")).toBe(false);
    expect(canAuditDept("HEAD", "SUPPORT")).toBe(true);
    expect(canAuditDept("NONE", "SUPPORT")).toBe(false);
  });
  it("flags automation browsers", () => {
    expect(parseUserAgent("Mozilla/5.0 HeadlessChrome/120").bot).toBe(true);
  });
});
