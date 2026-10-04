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
  const { requireDepartment, adminClient } = await import("./console.server");
  await requireDepartment("REVENUE");
  const db = await adminClient();

  const [act, subs, links, tix, promos, verifs, cleans, books, tx, wds, owner, wallets, audit, fin] = await Promise.all([
    db.from("activations").select("id,user_id,amount,status,payment_reference,provider_transaction_id,paid_at,created_at").eq("status", "PAID"),
    db.from("provider_subscriptions").select("id,user_id,amount,status,payment_reference,provider_transaction_id,created_at").eq("status", "ACTIVE"),
    db.from("payment_link_charges").select("id,reference,amount,platform_fee,status,payer_name,provider_transaction_id,paid_at,created_at").eq("status", "PAID"),
    db.from("event_tickets").select("id,user_id,amount,platform_fee,status,payment_reference,provider_transaction_id,paid_at,created_at").eq("status", "PAID"),
    db.from("promotions").select("id,owner_id,amount,status,headline,payment_reference,provider_transaction_id,created_at").in("status", ["PAID", "ACTIVE"]),
    db.from("verifications").select("id,user_id,amount,status,tier,payment_reference,provider_transaction_id,created_at").eq("status", "PAID"),
    db.from("clean_orders").select("id,order_no,customer_id,total,payment_status,payment_reference,provider_transaction_id,paid_at,created_at").eq("payment_status", "PAID"),
    db.from("bookings").select("id,client_id,service_title,price,platform_fee,provider_amount,status,payment_reference,provider_transaction_id,paid_at").not("paid_at", "is", null),
    db.from("transactions").select("id,user_id,type,amount,status,reference,description,created_at").order("created_at", { ascending: false }).limit(2000),
    db.from("withdrawals").select("id,user_id,amount,status,payment_method,phone_number,reference,provider_reference,admin_note,requested_at,processed_at").order("requested_at", { ascending: false }).limit(1000),
    db.from("platform_payouts").select("id,amount,destination,note,reference,status,provider,provider_reference,processed_at,failure_reason,created_at").order("created_at", { ascending: false }).limit(500),
    db.from("wallets").select("user_id,available_balance,pending_balance,total_earned,total_withdrawn"),
    db.from("admin_audit_log").select("actor,action,target_user_id,target_reference,reason,created_at").in("action", ["WALLET_CREDIT", "WALLET_REVERSE_TEST_CREDITS"]),
    db.rpc("console_financials"),
  ]);

  // Names for every user referenced.
  const ids = new Set<string>();
  const add = (v: string | null | undefined) => v && ids.add(v);
  act.data?.forEach((r) => add(r.user_id));
  subs.data?.forEach((r) => add(r.user_id));
  tix.data?.forEach((r) => add(r.user_id));
  promos.data?.forEach((r) => add(r.owner_id));
  verifs.data?.forEach((r) => add(r.user_id));
  cleans.data?.forEach((r) => add(r.customer_id));
  books.data?.forEach((r) => add(r.client_id));
  tx.data?.forEach((r) => add(r.user_id));
  wds.data?.forEach((r) => add(r.user_id));
  wallets.data?.forEach((r) => add(r.user_id));
  const { data: profs } = ids.size
    ? await db.from("profiles").select("user_id,full_name,referral_code").in("user_id", [...ids])
    : { data: [] as { user_id: string; full_name: string | null; referral_code: string | null }[] };
  const nameOf = (id: string | null | undefined) =>
    id ? (profs ?? []).find((p) => p.user_id === id)?.full_name || "Member" : null;

  const n = (v: unknown) => Number(v ?? 0);
  const entries: LedgerEntry[] = [];
  const revenue = (
    record: string,
    type: string,
    r: { id: string; amount?: unknown; status?: string | null; provider_transaction_id?: string | null; created_at?: string | null; paid_at?: string | null },
    reference: string | null | undefined,
    payer: string | null | undefined,
    description: string,
    amount = n(r.amount),
  ) =>
    entries.push({
      id: `${record}:${r.id}`,
      direction: "IN",
      category: "REVENUE",
      type,
      amount,
      status: String(r.status ?? "PAID"),
      reference: reference ?? r.id,
      providerReference: r.provider_transaction_id ?? null,
      source: payer ? `${nameOf(payer)} via TchokoPay` : "Customer via TchokoPay",
      destination: "ASH platform account",
      recipient: "ASH Global Technologies",
      userId: payer ?? null,
      description,
      createdAt: String(r.paid_at ?? r.created_at ?? ""),
      record,
    });

  act.data?.forEach((r) => revenue("activations", "ACTIVATION_FEE", r, r.payment_reference, r.user_id, "Member activation fee"));
  subs.data?.forEach((r) => revenue("provider_subscriptions", "SUBSCRIPTION", r, r.payment_reference, r.user_id, "Provider studio subscription"));
  promos.data?.forEach((r) => revenue("promotions", "SPONSORED", r, r.payment_reference, r.owner_id, `Sponsored promotion: ${r.headline ?? ""}`.trim()));
  verifs.data?.forEach((r) => revenue("verifications", "VERIFICATION", r, r.payment_reference, r.user_id, `Verification (${r.tier ?? "badge"})`));
  cleans.data?.forEach((r) => revenue("clean_orders", "ASH_CLEAN", { ...r, status: r.payment_status }, r.payment_reference, r.customer_id, `ASH Clean order ${r.order_no ?? ""}`.trim(), n(r.total)));

  // Pass-through payments: only the ASH fee is revenue; the rest is held for the seller.
  const passThrough = (
    record: string,
    r: { id: string; status?: string | null; provider_transaction_id?: string | null; created_at?: string | null; paid_at?: string | null },
    total: number,
    fee: number,
    reference: string | null | undefined,
    payer: string | null | undefined,
    label: string,
  ) => {
    if (fee > 0) revenue(record, "PLATFORM_COMMISSION", r, reference, payer, `${label} — ASH commission`, fee);
    if (total - fee > 0)
      entries.push({
        id: `${record}:${r.id}:held`,
        direction: "IN",
        category: "CUSTOMER_FUNDS",
        type: "CUSTOMER_PAYMENT",
        amount: total - fee,
        status: String(r.status ?? "PAID"),
        reference: reference ?? r.id,
        providerReference: r.provider_transaction_id ?? null,
        source: payer ? `${nameOf(payer)} via TchokoPay` : "Customer via TchokoPay",
        destination: "Held for seller / provider",
        recipient: null,
        userId: payer ?? null,
        description: `${label} — seller share (not ASH income)`,
        createdAt: String(r.paid_at ?? r.created_at ?? ""),
        record,
      });
  };
  books.data?.forEach((r) => passThrough("bookings", r, n(r.price), n(r.platform_fee), r.payment_reference, r.client_id, `Booking: ${r.service_title ?? ""}`));
  links.data?.forEach((r) => passThrough("payment_link_charges", r, n(r.amount), n(r.platform_fee), r.reference, null, `Payment link (${r.payer_name ?? "payer"})`));
  tix.data?.forEach((r) => passThrough("event_tickets", r, n(r.amount), n(r.platform_fee), r.payment_reference, r.user_id, "Event ticket"));

  // Wallet ledger lines that are internal (credits/rewards) — never income.
  const credits = (tx.data ?? []).filter((t) => t.type === "ADJUSTMENT");
  const auditByRef = new Map((audit.data ?? []).filter((a) => a.target_reference).map((a) => [a.target_reference as string, a]));
  for (const t of tx.data ?? []) {
    if (t.type === "ADJUSTMENT" || t.type === "REFERRAL_COMMISSION") {
      const isCredit = t.type === "ADJUSTMENT";
      entries.push({
        id: `transactions:${t.id}`,
        direction: "INTERNAL",
        category: isCredit ? "WALLET_CREDIT" : "REWARD",
        type: isCredit ? (n(t.amount) < 0 ? "CREDIT_REVERSAL" : "WALLET_CREDIT") : "REFERRAL_COMMISSION",
        amount: n(t.amount),
        status: t.status,
        reference: t.reference,
        providerReference: null,
        source: isCredit ? "ASH admin adjustment" : "Activation fee (referral reward)",
        destination: `${nameOf(t.user_id)}'s ASH wallet`,
        recipient: nameOf(t.user_id),
        userId: t.user_id,
        description: t.description,
        createdAt: t.created_at,
        record: "transactions",
      });
    }
  }

  for (const w of wds.data ?? []) {
    if (w.status !== "COMPLETED") continue;
    entries.push({
      id: `withdrawals:${w.id}`,
      direction: "OUT",
      category: "MEMBER_PAYOUT",
      type: "MEMBER_WITHDRAWAL",
      amount: -n(w.amount),
      status: w.status,
      reference: w.reference,
      providerReference: w.provider_reference,
      source: `${nameOf(w.user_id)}'s ASH wallet`,
      destination: `${w.payment_method ?? "Mobile money"} ${w.phone_number ?? ""}`.trim(),
      recipient: nameOf(w.user_id),
      userId: w.user_id,
      description: w.admin_note || "Member wallet withdrawal",
      createdAt: String(w.processed_at ?? w.requested_at),
      record: "withdrawals",
    });
  }

  for (const p of owner.data ?? []) {
    entries.push({
      id: `platform_payouts:${p.id}`,
      direction: "OUT",
      category: "OWNER_WITHDRAWAL",
      type: "OWNER_WITHDRAWAL",
      amount: -n(p.amount),
      status: p.status,
      reference: p.reference,
      providerReference: p.provider_reference,
      source: "ASH platform account",
      destination: p.destination,
      recipient: "Owner / ASH Global Technologies",
      userId: null,
      description: p.note || p.failure_reason || "Owner/platform withdrawal",
      createdAt: String(p.processed_at ?? p.created_at),
      record: "platform_payouts",
    });
  }

  entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // ---- Totals (cash basis) ----
  const sum = (f: (e: LedgerEntry) => boolean) => entries.filter(f).reduce((s, e) => s + e.amount, 0);
  const revenueTotal = sum((e) => e.category === "REVENUE");
  const customerFunds = sum((e) => e.category === "CUSTOMER_FUNDS");
  const memberPayouts = -sum((e) => e.category === "MEMBER_PAYOUT");
  const ownerTaken = (owner.data ?? [])
    .filter((p) => ["COMPLETED", "PENDING", "PROCESSING"].includes(p.status))
    .reduce((s, p) => s + n(p.amount), 0);
  const ownerCompleted = (owner.data ?? []).filter((p) => p.status === "COMPLETED").reduce((s, p) => s + n(p.amount), 0);
  const walletLiability = (wallets.data ?? []).reduce((s, w) => s + n(w.available_balance) + n(w.pending_balance), 0);
  const pendingMember = (wds.data ?? []).filter((w) => ["PENDING", "PROCESSING"].includes(w.status)).reduce((s, w) => s + n(w.amount), 0);
  const cashOnHand = revenueTotal + customerFunds - memberPayouts - ownerTaken;
  const f = (fin.data ?? {}) as Record<string, number>;
  const refundLiability = n(f["refund_liability"]);
  const ledgerAvailable = Math.max(cashOnHand - walletLiability - refundLiability, 0);
  // Enforced limit: safe_to_withdraw already deducts owner withdrawals exactly once.
  const available = Math.max(n(f["safe_to_withdraw"]), 0);

  // ---- Wallet reconciliation: stored balance vs. sum of the wallet's own history ----
  // Activation payments are external payments shown on a member's history; they never touch the wallet.
  // A REVERSED withdrawal is paired with its WITHDRAWAL_REVERSAL, so both are counted (net zero).
  const reconciliation = (wallets.data ?? [])
    .map((w) => {
      const lines = (tx.data ?? []).filter((t) => t.user_id === w.user_id && t.type !== "ACTIVATION_PAYMENT" && t.status !== "FAILED");
      const computed = lines.reduce((s, t) => s + n(t.amount), 0);
      const stored = n(w.available_balance) + n(w.pending_balance);
      return { userId: w.user_id, name: nameOf(w.user_id), stored, computed, difference: stored - computed, lines: lines.length };
    })
    .filter((r) => r.stored !== 0 || r.lines > 0)
    .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference) || b.stored - a.stored);

  const walletCredits = credits.map((t) => {
    const a = auditByRef.get(t.reference);
    const reversal = n(t.amount) < 0;
    return {
      id: t.id,
      recipient: nameOf(t.user_id),
      userId: t.user_id,
      amount: n(t.amount),
      reason: t.description.replace(/^Admin wallet credit:\s*/i, ""),
      admin: a?.actor ?? (reversal ? "CEO request (audit logged)" : "Not recorded (before audit logging)"),
      adjustmentType: reversal ? "CREDIT REVERSAL" : "WALLET CREDIT",
      reference: t.reference,
      status: t.status,
      createdAt: t.created_at,
    };
  });

  return {
    entries,
    walletCredits,
    ownerWithdrawals: owner.data ?? [],
    reconciliation,
    summary: {
      revenue: revenueTotal,
      customerFunds,
      memberPayouts,
      ownerTaken,
      ownerCompleted,
      walletCreditsNet: credits.filter((t) => t.status === "COMPLETED").reduce((s, t) => s + n(t.amount), 0),
      rewards: (tx.data ?? []).filter((t) => t.type === "REFERRAL_COMMISSION" && t.status === "COMPLETED").reduce((s, t) => s + n(t.amount), 0),
      walletLiability,
      pendingMemberWithdrawals: pendingMember,
      refundLiability,
      cashOnHand,
      availablePlatformFunds: available,
      ledgerAvailable,
      dbCashOnHand: n(f["cash_on_hand"]),
      mismatchedWallets: reconciliation.filter((r) => Math.abs(r.difference) > 0.009).length,
    },
  };
});
