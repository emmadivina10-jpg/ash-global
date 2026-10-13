import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const FOUNDER_TARGET_PCT = 90;

export type ShareholderRow = {
  id: string;
  display_name: string;
  role: string;
  ownership_pct: number;
  investment_committed: number | null;
  investment_received: number;
  currency: string;
  payment_status: string;
  allocation_status: string;
  agreement_status: string;
  allocation_date: string | null;
  transaction_reference: string | null;
  is_founder: boolean;
};

const COLS =
  "id, display_name, role, ownership_pct, investment_committed, investment_received, currency, payment_status, allocation_status, agreement_status, allocation_date, transaction_reference, is_founder";

async function companyPerformance() {
  const { computeFinanceLedger } = await import("./finance.server");
  const { summary, entries } = await computeFinanceLedger();
  const monthly = new Map<string, number>();
  const daily = new Map<string, number>();
  for (const e of entries) {
    if (e.category !== "REVENUE") continue;
    const k = e.createdAt.slice(0, 7);
    monthly.set(k, (monthly.get(k) ?? 0) + e.amount);
    const d = e.createdAt.slice(0, 10);
    daily.set(d, (daily.get(d) ?? 0) + e.amount);
  }
  // Stock-style cumulative revenue timeline (oldest → newest).
  let running = 0;
  const revenueTimeline = [...daily.entries()].sort().map(([date, amount]) => {
    running += amount;
    return { date, amount, cumulative: running };
  });
  return {
    currency: "XAF",
    revenue: summary.revenue,
    cashOnHand: summary.cashOnHand,
    memberObligations: summary.walletLiability,
    ownerWithdrawals: summary.ownerCompleted,
    revenueByMonth: [...monthly.entries()].sort().map(([month, amount]) => ({ month, amount })),
    revenueTimeline,
  };
}

async function currentValuation() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("company_valuation")
    .select("valuation, currency, approved_at, approved_by")
    .order("approved_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data
    ? {
        valuation: Number(data.valuation),
        currency: data.currency,
        approvedAt: data.approved_at,
        approvedBy: data.approved_by,
      }
    : null;
}

function capSummary(rows: { ownership_pct: number; is_founder: boolean }[]) {
  const issued = rows.reduce((s, r) => s + Number(r.ownership_pct), 0);
  const others = rows.filter((r) => !r.is_founder).reduce((s, r) => s + Number(r.ownership_pct), 0);
  return {
    issued,
    founderTarget: FOUNDER_TARGET_PCT,
    existingOthers: others,
    futureAvailable: Math.max(100 - FOUNDER_TARGET_PCT - others, 0),
  };
}

/** Signed-in member: their own shareholder record only (null if not a shareholder). */
export const getMyShareholding = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: me } = await supabaseAdmin
      .from("shareholders")
      .select(COLS)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!me) return { shareholder: null };
    const [{ data: all }, { data: events }] = await Promise.all([
      supabaseAdmin.from("shareholders").select("ownership_pct, is_founder"),
      supabaseAdmin
        .from("shareholder_events")
        .select("kind, detail, created_at")
        .eq("shareholder_id", me.id)
        .order("created_at", { ascending: false }),
    ]);
    return {
      shareholder: me as ShareholderRow,
      cap: capSummary((all ?? []) as { ownership_pct: number; is_founder: boolean }[]),
      history: events ?? [],
      performance: await companyPerformance(),
      valuation: await currentValuation(),
    };
  });

/** CEO console: full cap table, history and shared Finance figures. */
export const getShareholderCenter = createServerFn({ method: "GET" }).handler(async () => {
  const { requireConsole, adminClient } = await import("./console.server");
  const actor = await requireConsole();
  // Investor seat: read-only view; every change stays CEO-only.
  if (!actor.superAdmin && actor.department !== "INVESTOR") throw new Error("FORBIDDEN_DEPARTMENT");
  const db = await adminClient();
  const [{ data: rows }, { data: events }] = await Promise.all([
    db.from("shareholders").select(COLS).order("ownership_pct", { ascending: false }),
    db
      .from("shareholder_events")
      .select("shareholder_id, kind, detail, actor, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  const list = (rows ?? []) as ShareholderRow[];
  return {
    shareholders: list,
    cap: capSummary(list),
    history: events ?? [],
    performance: await companyPerformance(),
    valuation: await currentValuation(),
    canEdit: actor.superAdmin,
  };
});

/** CEO only: set a new approved company valuation. Recalculates implied values everywhere; never touches ownership or cash. */
export const updateCompanyValuation = createServerFn({ method: "POST" })
  .inputValidator((d: { valuation: number }) => ({ valuation: Number(d.valuation) }))
  .handler(async ({ data }) => {
    const { requireSuperAdmin, adminClient } = await import("./console.server");
    const actor = await requireSuperAdmin();
    if (!(data.valuation > 0)) return { ok: false as const, error: "Enter a positive valuation." };
    const db = await adminClient();
    const { error } = await db
      .from("company_valuation")
      .insert({ valuation: data.valuation, currency: "CAD", approved_by: actor.name });
    if (error) return { ok: false as const, error: error.message };
    await db.from("shareholder_events").insert({
      shareholder_id: null,
      kind: "VALUATION_UPDATED",
      detail: `Approved company valuation set to CAD ${data.valuation.toLocaleString()}`,
      actor: actor.name,
    });
    return { ok: true as const };
  });

/** CEO only: record a confirmed payment against a shareholder's commitment. Never changes ownership. */
export const recordShareholderPayment = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; amount: number; reference: string }) => ({
    id: String(d.id),
    amount: Number(d.amount),
    reference: String(d.reference ?? "")
      .trim()
      .slice(0, 120),
  }))
  .handler(async ({ data }) => {
    const { requireSuperAdmin, adminClient } = await import("./console.server");
    const actor = await requireSuperAdmin();
    if (!(data.amount > 0)) return { ok: false as const, error: "Enter a positive amount." };
    if (!data.reference)
      return { ok: false as const, error: "A transaction/reference ID is required." };
    const db = await adminClient();
    const { data: sh } = await db.from("shareholders").select(COLS).eq("id", data.id).maybeSingle();
    if (!sh) return { ok: false as const, error: "Shareholder not found." };
    const received = Number(sh.investment_received) + data.amount;
    const committed = Number(sh.investment_committed ?? 0);
    if (committed > 0 && received > committed)
      return { ok: false as const, error: "That exceeds the committed amount." };
    const status = committed > 0 && received >= committed ? "RECEIVED" : "PARTIALLY_RECEIVED";
    const { error } = await db
      .from("shareholders")
      .update({
        investment_received: received,
        payment_status: status,
        transaction_reference: data.reference,
        allocation_status: status === "RECEIVED" ? "ALLOCATED" : sh.allocation_status,
        allocation_date:
          status === "RECEIVED" ? new Date().toISOString().slice(0, 10) : sh.allocation_date,
      })
      .eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    await db.from("shareholder_events").insert({
      shareholder_id: data.id,
      kind: "PAYMENT_RECORDED",
      detail: `${sh.currency} ${data.amount.toLocaleString()} confirmed (ref ${data.reference}); total received ${received.toLocaleString()}`,
      actor: actor.name,
    });
    return { ok: true as const };
  });
