import { createServerFn } from "@tanstack/react-start";

export const getFinanceTruth = createServerFn({ method: "GET" }).handler(async () => {
  const { requireDepartment } = await import("./console.server");
  await requireDepartment("REVENUE");
  const { readFinanceTruth } = await import("./finance-reconciliation.server");
  return readFinanceTruth();
});

export const reconcileFinanceNow = createServerFn({ method: "POST" }).handler(async () => {
  const { requireDepartment } = await import("./console.server");
  const actor = await requireDepartment("REVENUE");
  const { runFinanceReconciliation } = await import("./finance-reconciliation.server");
  const a = actor as unknown as { staffId?: string; id?: string };
  void a;
  return runFinanceReconciliation("MANUAL", null);
});
