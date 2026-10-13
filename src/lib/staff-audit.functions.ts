import { createServerFn } from "@tanstack/react-start";

const DASHBOARDS: Record<string, { name: string; route: string }> = {
  SUPER_ADMIN: { name: "CEO / All departments", route: "/console" },
  SUPPORT: { name: "Support", route: "/console/support" },
  GROWTH: { name: "Growth & Acquisition", route: "/console/growth" },
  SALES: { name: "Sales", route: "/console/sales" },
  MARKETPLACE_OPS: { name: "Marketplace Ops", route: "/console/marketplace" },
  ADVERTISING: { name: "Advertising", route: "/console/advertising" },
  PARTNERSHIPS: { name: "Partnerships", route: "/console/partnerships" },
  CONTENT: { name: "Content & Creator", route: "/console/content" },
  MERCHANT: { name: "Merchant", route: "/console/merchant" },
  EXPANSION: { name: "Expansion", route: "/console/expansion" },
  REVENUE: { name: "Revenue Intelligence", route: "/console/revenue" },
  CYBERSECURITY: { name: "Cybersecurity", route: "/console/security" },
  TRUST: { name: "Trust & Verification", route: "/console/trust" },
};

// Historical test results contain no credentials or password hashes.
const TESTED_ACCOUNTS: Record<string, string> = {
  support: "b49ef3c9-b959-410f-8d24-ef51cfba8999",
  growth: "4aab60e3-5bd6-496b-9dae-d05c7b08b8cf",
  sales: "1e188205-b0a4-41d5-92d6-94fd1b2abbad",
  ops: "cbcc0de0-e2df-4844-81fe-827ad598d1d9",
  ads: "f302c7cb-5fd1-4c79-8f4d-0121d69a17ec",
  partners: "46fb49f4-322c-4674-af7b-116546020c54",
  content: "5d129316-2716-47e7-8d48-e933a7090a23",
  merchant: "f56d4c77-9135-4587-aba6-2731f1575cdb",
  expansion: "e5eaf053-b453-426a-ae09-c39b0083ad41",
  revenue: "13a7ebd4-93dc-42e7-afeb-9936b4298f87",
  cyber10000: "0ead442c-539c-4398-8580-4abaecc11440",
  trust: "773ba815-04b4-4ca1-822d-0441f68f539f",
};

export const getStaffAuthenticationAudit = createServerFn({ method: "GET" }).handler(async () => {
  const { requireSuperAdmin, adminClient } = await import("./console.server");
  await requireSuperAdmin();
  const db = await adminClient();
  const { data, error } = await db
    .from("staff_accounts")
    .select("id, username, email, department, is_active, updated_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error("Unable to load the private staff audit.");
  return (data ?? []).map((seat) => {
    const dashboard = DASHBOARDS[seat.department];
    const tested = TESTED_ACCOUNTS[seat.username] === seat.id;
    return {
      id: seat.id,
      username: seat.username,
      email: seat.email,
      role: seat.department,
      dashboard: dashboard?.name ?? "Unmapped department",
      route: dashboard?.route ?? null,
      accountStatus: seat.is_active ? "Active" : "Disabled",
      authentication: !tested
        ? "NOT TESTABLE — no supplied credential"
        : seat.username === "trust"
          ? "PASS — preview and production"
          : "FAIL — previously supplied password",
      permissionStatus: !dashboard
        ? "Unmapped — requires owner review"
        : seat.username === "trust"
          ? "PASS — assigned dashboard opened"
          : "Mapping valid; signed-in access NOT TESTABLE",
      reason:
        seat.department === "SUPER_ADMIN"
          ? "Owner credential was not exercised."
          : seat.username === "trust"
            ? "Login succeeds at /console but Overview is restricted. Opening /console/trust works. Reviewer account unchanged."
            : tested
              ? "Supplied password does not match the stored secure hash. No reset performed. /console Overview is also restricted for employee roles."
              : "No known credential tested. /console Overview is restricted for employee roles.",
      updatedAt: seat.updated_at,
    };
  });
});
