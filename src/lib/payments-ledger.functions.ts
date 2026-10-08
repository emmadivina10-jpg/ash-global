import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Central ASH payment ledger: wallet top-ups, payment links and bookings by
 * MTN/Orange (TchokoPay), Card (Stripe Live) or Bank. A row only reaches
 * SUCCESS through a verified provider outcome or a Finance bank confirmation.
 */

export type PayMethod = "MOMO" | "CARD" | "BANK";

export type BankDetails = {
  bank_name: string;
  account_name: string;
  account_number: string;
  iban: string | null;
  swift: string | null;
  branch: string | null;
  country: string | null;
  currency: string;
  instructions: string | null;
};

export type StartPaymentResult = {
  ok: boolean;
  reference: string | null;
  status: string;
  checkoutUrl: string | null;
  bank: BankDetails | null;
  error: string | null;
  message: string | null;
};

const MIN_TOPUP = 500;
const MAX_TOPUP = 2_000_000;

function ref(prefix: string) {
  return `${prefix}-${crypto.randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase()}`;
}

function safeOrigin(raw: unknown): string {
  const o = String(raw ?? "").trim();
  if (
    /^https:\/\/[\w.-]+\.lovable\.app$/.test(o) ||
    /^https:\/\/(www\.)?(ashglogroup\.company|growrefer\.app)$/.test(o) ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o)
  )
    return o;
  return process.env["APP_URL"] || "https://ashglogroup.company";
}

function fail(error: string, message: string | null = null, reference: string | null = null): StartPaymentResult {
  return { ok: false, reference, status: "FAILED", checkoutUrl: null, bank: null, error, message };
}

async function verifiedBank(): Promise<BankDetails | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("bank_accounts_config")
    .select("bank_name, account_name, account_number, iban, swift, branch, country, currency, instructions")
    .eq("is_verified", true)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as BankDetails | null) ?? null;
}

async function startCard(input: {
  reference: string;
  amount: number;
  currency: string;
  description: string;
  origin: string;
  returnPath: string;
  email?: string | undefined;
}): Promise<{ ok: boolean; url: string | null; id: string | null; error: string | null }> {
  const { stripePay } = await import("./stripe.server");
  const sep = input.returnPath.includes("?") ? "&" : "?";
  const session = await stripePay.createCheckoutSession({
    reference: input.reference,
    amountCents: Math.round(input.amount), // XAF is zero-decimal in Stripe
    currency: input.currency || "XAF",
    description: input.description,
    successUrl: `${input.origin}${input.returnPath}${sep}ref=${input.reference}&card=1`,
    cancelUrl: `${input.origin}${input.returnPath}${sep}ref=${input.reference}&card=cancel`,
    ...(input.email ? { email: input.email } : {}),
  });
  return { ok: session.ok, url: session.checkoutUrl, id: session.id, error: session.error };
}

/** Public: verified bank details, or null when Finance has not configured any. */
export const getBankDetails = createServerFn({ method: "GET" }).handler(async () => verifiedBank());

/* ---------------------------- Wallet top-up ---------------------------- */

export const startWalletTopup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { method: PayMethod; amount: number; provider?: string | undefined; phone?: string | undefined; country?: string; origin?: string }) => ({
    method: (["MOMO", "CARD", "BANK"].includes(i?.method) ? i.method : "MOMO") as PayMethod,
    amount: Math.floor(Number(i?.amount ?? 0)),
    provider: String(i?.provider ?? "").trim().slice(0, 40),
    phone: String(i?.phone ?? "").trim().slice(0, 20),
    country: String(i?.country ?? "CM").toUpperCase().slice(0, 2) || "CM",
    origin: safeOrigin(i?.origin),
  }))
  .handler(async ({ data, context }): Promise<StartPaymentResult> => {
    if (!Number.isFinite(data.amount) || data.amount < MIN_TOPUP || data.amount > MAX_TOPUP) return fail("INVALID_AMOUNT");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const reference = ref("TOP");

    let bank: BankDetails | null = null;
    if (data.method === "BANK") {
      bank = await verifiedBank();
      if (!bank) return fail("BANK_UNAVAILABLE");
    }
    if (data.method === "MOMO" && (!data.provider || !data.phone)) return fail("INVALID_REQUEST");

    const method = data.method === "MOMO" ? (/orange/i.test(data.provider) ? "ORANGE" : /mtn/i.test(data.provider) ? "MTN" : "MOMO") : data.method;
    const { error: insertError } = await supabaseAdmin.from("payment_transactions").insert({
      reference,
      user_id: context.userId,
      amount: data.amount,
      currency: "XAF",
      method,
      provider: data.method === "CARD" ? "STRIPE" : data.method === "BANK" ? "BANK" : "TCHOKOPAY",
      purpose: "WALLET_TOPUP",
      purpose_ref: reference,
      status: "PENDING",
    });
    if (insertError) return fail("CREATE_FAILED");

    if (data.method === "BANK") {
      return { ok: true, reference, status: "PENDING", checkoutUrl: null, bank, error: null, message: null };
    }

    if (data.method === "CARD") {
      const card = await startCard({
        reference, amount: data.amount, currency: "XAF", description: "ASH Glo wallet top-up",
        origin: data.origin, returnPath: "/wallet", email: (context.claims as { email?: string })?.email,
      });
      if (!card.ok || !card.url) {
        await supabaseAdmin.from("payment_transactions").update({ status: "FAILED", updated_at: new Date().toISOString() }).eq("reference", reference);
        return fail(card.error === "STRIPE_NOT_CONFIGURED" ? "CARD_UNAVAILABLE" : "PAYMENT_START_FAILED", null, reference);
      }
      await supabaseAdmin.from("payment_transactions").update({ status: "PROCESSING", detail: { session_id: card.id }, updated_at: new Date().toISOString() }).eq("reference", reference);
      return { ok: true, reference, status: "PROCESSING", checkoutUrl: card.url, bank: null, error: null, message: null };
    }

    const { tchokoPay } = await import("./tchokopay.server");
    const charge = await tchokoPay.createCharge({
      merchantReference: reference, amount: data.amount, currency: "XAF", country: data.country,
      provider: data.provider, phone: data.phone, description: "ASH Glo wallet top-up",
    });
    if (!charge.ok) {
      await supabaseAdmin.from("payment_transactions").update({ status: "FAILED", updated_at: new Date().toISOString() }).eq("reference", reference);
      return fail(charge.error ?? "PAYMENT_START_FAILED", charge.message ?? null, reference);
    }
    await supabaseAdmin
      .from("payment_transactions")
      .update({ status: "PROCESSING", provider_reference: charge.providerReference ?? null, updated_at: new Date().toISOString() })
      .eq("reference", reference);
    return { ok: true, reference, status: "PROCESSING", checkoutUrl: null, bank: null, error: null, message: null };
  });

/* ------------------------- Payment link: card/bank ------------------------- */

export const startLinkAltPayment = createServerFn({ method: "POST" })
  .inputValidator((i: { code: string; name: string; method: "CARD" | "BANK"; origin?: string }) => ({
    code: String(i?.code ?? "").slice(0, 40),
    name: String(i?.name ?? "").trim().slice(0, 80),
    method: i?.method === "BANK" ? ("BANK" as const) : ("CARD" as const),
    origin: safeOrigin(i?.origin),
  }))
  .handler(async ({ data }): Promise<StartPaymentResult> => {
    if (!data.code || !data.name) return fail("INVALID_INPUT");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin
      .from("payment_links")
      .select("id, code, title, amount, currency, is_active")
      .eq("code", data.code)
      .maybeSingle();
    if (!link || !link.is_active) return fail("LINK_UNAVAILABLE");

    let bank: BankDetails | null = null;
    if (data.method === "BANK") {
      bank = await verifiedBank();
      if (!bank) return fail("BANK_UNAVAILABLE");
    }

    const reference = ref("PLK");
    const { error: chargeError } = await supabaseAdmin.from("payment_link_charges").insert({
      link_id: link.id, reference, amount: link.amount, payer_name: data.name, payer_phone: "",
    });
    if (chargeError) return fail("CHARGE_CREATE_FAILED");
    await supabaseAdmin.from("payment_transactions").insert({
      reference, amount: link.amount, currency: link.currency || "XAF", method: data.method,
      provider: data.method === "CARD" ? "STRIPE" : "BANK", purpose: "PAYMENT_LINK", purpose_ref: link.code,
      payer_name: data.name, status: "PENDING",
    });

    if (data.method === "BANK") return { ok: true, reference, status: "PENDING", checkoutUrl: null, bank, error: null, message: null };

    const card = await startCard({
      reference, amount: Number(link.amount), currency: link.currency || "XAF", description: `ASH — ${link.title}`,
      origin: data.origin, returnPath: `/pay/${link.code}`,
    });
    if (!card.ok || !card.url) {
      await supabaseAdmin.rpc("fail_link_payment", { _payment_reference: reference, _status: "FAILED" });
      await supabaseAdmin.from("payment_transactions").update({ status: "FAILED" }).eq("reference", reference);
      return fail(card.error === "STRIPE_NOT_CONFIGURED" ? "CARD_UNAVAILABLE" : "PAYMENT_START_FAILED", null, reference);
    }
    await supabaseAdmin.from("payment_link_charges").update({ provider_transaction_id: card.id }).eq("reference", reference);
    await supabaseAdmin.from("payment_transactions").update({ status: "PROCESSING", detail: { session_id: card.id } }).eq("reference", reference);
    return { ok: true, reference, status: "PROCESSING", checkoutUrl: card.url, bank: null, error: null, message: null };
  });

/* --------------------------- Booking: bank --------------------------- */

export const startBookingBankPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { bookingId: string }) => ({ bookingId: String(i?.bookingId ?? "") }))
  .handler(async ({ data, context }): Promise<StartPaymentResult> => {
    const { data: booking } = await context.supabase
      .from("bookings")
      .select("id, client_id, status, price, payment_reference")
      .eq("id", data.bookingId)
      .maybeSingle();
    if (!booking || booking.client_id !== context.userId) return fail("NOT_FOUND");
    if (!["ACCEPTED", "PAYMENT_FAILED", "PAYMENT_PROCESSING"].includes(booking.status)) return fail("PAYMENT_NOT_AVAILABLE");
    const bank = await verifiedBank();
    if (!bank) return fail("BANK_UNAVAILABLE");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const reference = booking.payment_reference || ref("BKG");
    if (!booking.payment_reference) {
      await supabaseAdmin.from("bookings").update({ payment_reference: reference }).eq("id", booking.id);
    }
    const { data: existing } = await supabaseAdmin.from("payment_transactions").select("status").eq("reference", reference).maybeSingle();
    if (!existing) {
      await supabaseAdmin.from("payment_transactions").insert({
        reference, user_id: context.userId, amount: booking.price, currency: "XAF", method: "BANK", provider: "BANK",
        purpose: "BOOKING", purpose_ref: booking.id, status: "PENDING",
      });
    }
    return { ok: true, reference, status: "PENDING", checkoutUrl: null, bank, error: null, message: null };
  });

/* ------------------------------ Sync status ------------------------------ */

/**
 * Re-checks a ledger payment with its provider (Stripe or TchokoPay) and
 * settles only on a verified outcome. Bank rows are never changed here.
 * References are unguessable; only the status is returned.
 */
export const syncLedgerPayment = createServerFn({ method: "POST" })
  .inputValidator((i: { reference: string }) => ({ reference: String(i?.reference ?? "").slice(0, 64) }))
  .handler(async ({ data }): Promise<{ status: string; method: string | null }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("payment_transactions")
      .select("reference, provider, provider_reference, status, method, detail")
      .eq("reference", data.reference)
      .maybeSingle();
    if (!row) return { status: "NOT_FOUND", method: null };
    if (["SUCCESS", "FAILED", "CANCELLED", "REFUNDED", "EXPIRED"].includes(row.status) || row.provider === "BANK") {
      return { status: row.status, method: row.method };
    }
    const { settleCollection } = await import("./payment-settlement.server");
    if (row.provider === "STRIPE") {
      const sessionId = (row.detail as { session_id?: string } | null)?.session_id;
      if (!sessionId) return { status: row.status, method: row.method };
      const { stripePay } = await import("./stripe.server");
      const v = await stripePay.verifySession(sessionId);
      if (v.ok && v.status !== "PENDING") {
        const r = await settleCollection({
          merchantReference: row.reference, providerReference: v.paymentIntentId, status: v.status, source: "STRIPE_VERIFY",
        });
        return { status: v.status === "PAID" ? (r.ok ? "SUCCESS" : "PROCESSING") : v.status, method: row.method };
      }
      return { status: row.status, method: row.method };
    }
    if (row.provider_reference?.startsWith("REQ-")) {
      const { tchokoPay } = await import("./tchokopay.server");
      const v = await tchokoPay.getCollection(row.provider_reference);
      if (v.ok && v.status !== "PENDING" && v.status !== "PROCESSING") {
        const r = await settleCollection({
          merchantReference: row.reference, providerReference: row.provider_reference, status: v.status, source: "LEDGER_VERIFY",
        });
        return { status: v.status === "PAID" ? (r.ok ? "SUCCESS" : "PROCESSING") : v.status, method: row.method };
      }
    }
    return { status: row.status, method: row.method };
  });

/* ------------------------------ Finance console ------------------------------ */

export type LedgerRow = {
  id: string;
  reference: string;
  amount: number | null;
  currency: string;
  method: string;
  provider: string;
  provider_reference: string | null;
  purpose: string;
  purpose_ref: string | null;
  status: string;
  reconciliation_status: string;
  payer_name: string | null;
  confirmed_by: string | null;
  bank_reference: string | null;
  created_at: string;
  completed_at: string | null;
};

export const consoleListLedger = createServerFn({ method: "POST" })
  .inputValidator((i: { method?: string; status?: string }) => ({
    method: ["MTN", "ORANGE", "MOMO", "BANK", "CARD"].includes(String(i?.method)) ? String(i.method) : "",
    status: String(i?.status ?? "").slice(0, 20),
  }))
  .handler(async ({ data }) => {
    const { requireDepartment, adminClient } = await import("./console.server");
    await requireDepartment("REVENUE");
    const db = await adminClient();
    let q = db
      .from("payment_transactions")
      .select("id, reference, amount, currency, method, provider, provider_reference, purpose, purpose_ref, status, reconciliation_status, payer_name, confirmed_by, bank_reference, created_at, completed_at")
      .order("created_at", { ascending: false })
      .limit(300);
    if (data.method) q = q.eq("method", data.method);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error("LEDGER_READ_FAILED");
    return (rows ?? []) as LedgerRow[];
  });

export const consoleGetBankConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { requireDepartment, adminClient } = await import("./console.server");
  await requireDepartment("REVENUE");
  const db = await adminClient();
  const { data } = await db.from("bank_accounts_config").select("*").eq("is_active", true).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  return data;
});

export const consoleSaveBankConfig = createServerFn({ method: "POST" })
  .inputValidator((i: Partial<BankDetails> & { verify?: boolean }) => {
    const s = (v: unknown, n = 120) => String(v ?? "").trim().slice(0, n);
    const out = {
      bank_name: s(i.bank_name), account_name: s(i.account_name), account_number: s(i.account_number, 60),
      iban: s(i.iban, 60) || null, swift: s(i.swift, 20) || null, branch: s(i.branch) || null,
      country: s(i.country, 60) || null, currency: s(i.currency, 3).toUpperCase() || "XAF",
      instructions: s(i.instructions, 600) || null, verify: Boolean(i.verify),
    };
    if (!out.bank_name || !out.account_name || !out.account_number) throw new Error("Bank name, account name and account number are required");
    return out;
  })
  .handler(async ({ data }) => {
    const { requireDepartment, adminClient } = await import("./console.server");
    const actor = await requireDepartment("REVENUE");
    const db = await adminClient();
    const who = (actor as { staffId?: string | null; label?: string }).staffId ?? String(actor.department);
    const { verify, ...fields } = data;
    await db.from("bank_accounts_config").update({ is_active: false }).eq("is_active", true);
    const now = new Date().toISOString();
    const { error } = await db.from("bank_accounts_config").insert({
      ...fields, is_active: true, is_verified: verify, verified_by: verify ? who : null, verified_at: verify ? now : null, updated_by: who,
    });
    if (error) throw new Error("BANK_SAVE_FAILED");
    await db.from("admin_audit_log").insert({
      actor: who, action: "BANK_DETAILS_SAVED", new_state: { bank_name: fields.bank_name, verified: verify }, reason: null,
    });
    return { ok: true };
  });

export const consoleDecideBankPayment = createServerFn({ method: "POST" })
  .inputValidator((i: { reference: string; decision: "CONFIRM" | "REJECT"; bankReference?: string; reason?: string }) => {
    const out = {
      reference: String(i?.reference ?? "").slice(0, 64),
      decision: i?.decision === "CONFIRM" ? ("CONFIRM" as const) : ("REJECT" as const),
      bankReference: String(i?.bankReference ?? "").trim().slice(0, 80),
      reason: String(i?.reason ?? "").trim().slice(0, 300),
    };
    if (out.decision === "CONFIRM" && !out.bankReference) throw new Error("Bank reference is required to confirm");
    return out;
  })
  .handler(async ({ data }) => {
    const { requireDepartment, adminClient } = await import("./console.server");
    const actor = await requireDepartment("REVENUE");
    const db = await adminClient();
    const who = (actor as { staffId?: string | null }).staffId ?? String(actor.department);
    const { data: row } = await db.from("payment_transactions").select("*").eq("reference", data.reference).eq("provider", "BANK").maybeSingle();
    if (!row) throw new Error("NOT_FOUND");
    if (row.status !== "PENDING" && row.status !== "PROCESSING") throw new Error("ALREADY_DECIDED");

    const merchantReference = row.reference;
    await db.from("payment_transactions").update({ confirmed_by: who, bank_reference: data.bankReference || null, updated_at: new Date().toISOString() }).eq("id", row.id);

    const { settleCollection } = await import("./payment-settlement.server");
    const result = await settleCollection({
      merchantReference,
      providerReference: null,
      status: data.decision === "CONFIRM" ? "PAID" : "FAILED",
      source: "BANK_CONFIRMATION",
      signatureVerified: false,
      detail: { confirmed_by: who, bank_reference: data.bankReference, reason: data.reason, transaction_id: row.id },
    });
    await db.from("admin_audit_log").insert({
      actor: who,
      action: data.decision === "CONFIRM" ? "BANK_PAYMENT_CONFIRMED" : "BANK_PAYMENT_REJECTED",
      target_user_id: row.user_id,
      target_reference: merchantReference,
      previous_state: { status: row.status },
      new_state: { status: data.decision === "CONFIRM" ? "SUCCESS" : "FAILED", bank_reference: data.bankReference, transaction_id: row.id },
      reason: data.reason || null,
    });
    if (!result.ok) throw new Error(result.error ?? "SETTLEMENT_FAILED");
    return { ok: true };
  });
