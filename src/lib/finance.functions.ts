import { createServerFn } from "@tanstack/react-start";

/**
 * Master financial ledger (read-only). Every row is derived from an existing record —
 * nothing is created here. Categories keep real revenue apart from customer funds,
 * wallet credits, payouts and owner withdrawals so nothing is counted twice.
 */
export type LedgerCategory =
  | "REVENUE" // ASH income
  | "CUSTOMER_FUNDS" // money held for providers (not ASH income)
  | "WALLET_CREDIT" // admin adjustment / credit to a member wallet (not income)
  | "REWARD" // referral commission credited to a member wallet
  | "MEMBER_PAYOUT" // member wallet withdrawal paid out
  | "OWNER_WITHDRAWAL"; // platform/owner withdrawal

export type LedgerEntry = {
  id: string;
  direction: "IN" | "OUT" | "INTERNAL";
  category: LedgerCategory;
  type: string;
  amount: number;
  status: string;
  reference: string;
  providerReference: string | null;
  source: string;
  destination: string;
  recipient: string | null;
  userId: string | null;
  description: string;
  createdAt: string;
  record: string; // originating table
};

export const getFinanceLedger = createServerFn({ method: "GET" }).handler(async () => {
  const { requireDepartment } = await import("./console.server");
  await requireDepartment("REVENUE");
  const { computeFinanceLedger } = await import("./finance.server");
  return computeFinanceLedger();
});
