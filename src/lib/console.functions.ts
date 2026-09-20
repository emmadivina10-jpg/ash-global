import { createServerFn } from "@tanstack/react-start";

export type Financials = {
  activation_revenue: number;
  subscription_revenue: number;
  commission_revenue: number;
  booking_cash: number;
  platform_revenue: number;
  provider_owed: number;
  member_owed: number;
  pending_withdrawals: number;
  refund_liability: number;
  paid_out: number;
  cash_in: number;
  cash_on_hand: number;
  total_liabilities: number;
  safe_to_withdraw: number;
  available_to_platform: number;
};

export const consoleStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { consoleSession } = await import("./console.server");
  const session = await consoleSession();

  if (!session.data.unlocked) {
    return { unlocked: false as const, actor: null };
  }

  return {
    unlocked: true as const,
    actor: {
      staffId: session.data.staffId ?? null,
      name: session.data.staffName ?? "Super admin",
      department: session.data.department ?? "SUPER_ADMIN",
      elevated: Boolean(session.data.elevated),
      superAdmin: (session.data.department ?? "SUPER_ADMIN") === "SUPER_ADMIN",
    },
  };
});

/**
 * Staff sign-in. The master CONSOLE_PASSWORD always signs in as super admin
 * (with or without a username), so the owner can never be locked out.
 */
export const unlockConsole = createServerFn({ method: "POST" })
  .inputValidator((data: { username?: string; password: string }) => ({
    username: String(data?.username ?? "")
      .trim()
      .toLowerCase()
      .slice(0, 60),
    password: String(data?.password ?? ""),
  }))
  .handler(async ({ data }) => {
    const { passwordMatches, verifyStaffPassword, consoleSession, adminClient } = await import("./console.server");

    const master = process.env["CONSOLE_PASSWORD"];

    if (!master) {
      throw new Error("CONSOLE_PASSWORD is not set");
    }

    const session = await consoleSession();

    if (data.password && passwordMatches(data.password, master)) {
      await session.update({
        unlocked: true,
        staffId: null,
        staffName: "Super admin",
        department: "SUPER_ADMIN" as const,
        elevated: true,
      });

      return {
        ok: true as const,
        department: "SUPER_ADMIN",
      };
    }

    if (!data.username || !data.password) {
      return { ok: false as const };
    }

    const db = await adminClient();

    const { data: staff } = await db
      .from("staff_accounts")
      .select("id, full_name, department, password_hash, is_active")
      .eq("username", data.username)
      .maybeSingle();

    if (!staff || !staff.is_active || !verifyStaffPassword(data.password, staff.password_hash)) {
      return { ok: false as const };
    }

    await db
      .from("staff_accounts")
      .update({
        last_login_at: new Date().toISOString(),
      })
      .eq("id", staff.id);

    await session.update({
      unlocked: true,
      staffId: staff.id,
      staffName: staff.full_name,
      department: staff.department as never,
      elevated: false,
    });

    return {
      ok: true as const,
      department: staff.department,
    };
  });

/** Super admin only: temporarily unlock write access to every department. */
export const setElevatedMode = createServerFn({ method: "POST" })
  .inputValidator((data: { elevated: boolean }) => ({
    elevated: Boolean(data?.elevated),
  }))
  .handler(async ({ data }) => {
    const { requireSuperAdmin, consoleSession, adminClient } = await import("./console.server");

    const actor = await requireSuperAdmin();
    const session = await consoleSession();

    await session.update({
      elevated: data.elevated,
    });

    const db = await adminClient();

    await db.from("admin_audit_log").insert({
      actor: actor.name,
      action: data.elevated ? "PRIVILEGE_ELEVATED" : "PRIVILEGE_DROPPED",
      previous_state: {
        elevated: !data.elevated,
      },
      new_state: {
        elevated: data.elevated,
      },
    });

    return { ok: true as const };
  });

export const lockConsole = createServerFn({
  method: "POST",
}).handler(async () => {
  const { consoleSession } = await import("./console.server");
  const session = await consoleSession();

  await session.clear();

  return { ok: true as const };
});

type Counts = {
  total_users: number;
  active_users: number;
  pending_users: number;
  total_providers: number;
  live_providers: number;
  total_services: number;
  total_bookings: number;
  paid_bookings: number;
  completed_bookings: number;
  pending_bookings: number;
  gmv: number;
  completed_gmv: number;
};

export const getConsoleOverview = createServerFn({
  method: "GET",
}).handler(async () => {
  const { requireDepartment, adminClient } = await import("./console.server");

  await requireDepartment("SUPER_ADMIN");

  const db = await adminClient();

  // Counts come from the database so they are never capped by API page size.
  const [fin, counts, ledger] = await Promise.all([
    db.rpc("console_financials"),

    db.rpc("console_counts"),

    db
      .from("transactions")
      .select("id, type, amount, reference, description, status, created_at")
      .order("created_at", {
        ascending: false,
      })
      .limit(12),
  ]);

  const c = (counts.data ?? null) as Counts | null;

  const n = (value: number | undefined) => Number(value ?? 0);

  return {
    financials: (fin.data ?? null) as Financials | null,
    financialsError: fin.error?.message ?? null,
    totalUsers: n(c?.total_users),
    activeUsers: n(c?.active_users),
    pendingUsers: n(c?.pending_users),
    totalProviders: n(c?.total_providers),
    liveProviders: n(c?.live_providers),
    totalServices: n(c?.total_services),
    totalBookings: n(c?.total_bookings),
    paidBookings: n(c?.paid_bookings),
    completedBookings: n(c?.completed_bookings),
    pendingBookings: n(c?.pending_bookings),
    gmv: n(c?.gmv),
    completedGmv: n(c?.completed_gmv),
    recent: ledger.data ?? [],
  };
});

export const getConsoleUsers = createServerFn({
  method: "GET",
}).handler(async () => {
  const { requireDepartment, adminClient } = await import("./console.server");

  await requireDepartment("SUPER_ADMIN");

  const db = await adminClient();

  const [profiles, roles, wallets] = await Promise.all([
    db
      .from("profiles")
      .select("user_id, full_name, email, phone, referral_code, account_status, created_at")
      .order("created_at", {
        ascending: false,
      })
      .limit(500),

    db.from("user_roles").select("user_id, role"),

    db.from("wallets").select("user_id, available_balance, pending_balance, total_earned"),
  ]);

  const roleMap = new Map<string, string[]>();

  for (const r of roles.data ?? []) {
    roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), r.role]);
  }

  const walletMap = new Map((wallets.data ?? []).map((w) => [w.user_id, w]));

  return (profiles.data ?? []).map((p) => ({
    ...p,
    roles: roleMap.get(p.user_id) ?? [],
    balance: Number(walletMap.get(p.user_id)?.available_balance ?? 0),
    earned: Number(walletMap.get(p.user_id)?.total_earned ?? 0),
  }));
});

/**
 * Credits a user's withdrawable wallet balance from the admin console.
 *
 * The actual financial mutation is performed by the database RPC
 * `admin_credit_wallet`, which atomically updates the wallet, creates the
 * ADMIN_CREDIT ledger entry, and notifies the user.
 */
export const creditUserWallet = createServerFn({
  method: "POST",
})
  .inputValidator((data: { userId: string; amount: number; reason: string }) => ({
    userId: String(data.userId ?? "").trim(),
    amount: Number(data.amount),
    reason: String(data.reason ?? ""),
  }))
  .handler(async ({ data }) => {
    const { requireDepartment, adminClient } = await import("./console.server");

    // ---------------------------------------------------------------
    // 1. AUTHORIZATION
    // ---------------------------------------------------------------
    try {
      await requireDepartment("REVENUE");
    } catch (err) {
      const message = err instanceof Error ? err.message : "FORBIDDEN";

      console.error("[creditUserWallet] authorization failed:", message);

      return {
        ok: false as const,
        error: message === "CONSOLE_LOCKED" ? "UNAUTHENTICATED" : "FORBIDDEN",
      };
    }

    // ---------------------------------------------------------------
    // 2. INPUT VALIDATION
    // ---------------------------------------------------------------
    if (!data.userId) {
      console.error("[creditUserWallet] invalid user id");

      return {
        ok: false as const,
        error: "INVALID_USER",
      };
    }

    if (!Number.isFinite(data.amount) || data.amount <= 0 || data.amount !== Math.round(data.amount)) {
      console.error("[creditUserWallet] invalid amount:", data.amount);

      return {
        ok: false as const,
        error: "INVALID_AMOUNT",
      };
    }

    const reason = data.reason.trim();

    if (reason.length < 5) {
      console.error("[creditUserWallet] reason too short");

      return {
        ok: false as const,
        error: "REASON_REQUIRED",
      };
    }

    // Keep the reason bounded before sending it to the database.
    const safeReason = reason.slice(0, 500);

    // ---------------------------------------------------------------
    // 3. SERVER-SIDE SUPABASE ADMIN CLIENT
    // ---------------------------------------------------------------
    let db;

    try {
      db = await adminClient();
    } catch (err) {
      const message = err instanceof Error ? err.message : "SUPABASE_ADMIN_CLIENT_FAILED";

      console.error("[creditUserWallet] failed to create admin Supabase client:", message);

      return {
        ok: false as const,
        error: "SUPABASE_ADMIN_CLIENT_FAILED",
        detail: message,
      };
    }

    // ---------------------------------------------------------------
    // 4. DATABASE RPC
    // ---------------------------------------------------------------
    let rpcResult;
    let rpcError;

    try {
      const response = await db.rpc("admin_credit_wallet", {
        _user_id: data.userId,
        _amount: Math.round(data.amount),
        _reason: safeReason,
      });

      rpcResult = response.data;
      rpcError = response.error;
    } catch (err) {
      const message = err instanceof Error ? err.message : "WALLET_CREDIT_RPC_EXCEPTION";

      console.error("[creditUserWallet] RPC threw an exception:", message);

      return {
        ok: false as const,
        error: "WALLET_CREDIT_RPC_EXCEPTION",
        detail: message,
      };
    }

    // ---------------------------------------------------------------
    // 5. RPC ERROR
    // ---------------------------------------------------------------
    if (rpcError) {
      console.error("[creditUserWallet] admin_credit_wallet RPC failed:", {
        message: rpcError.message,
        details: rpcError.details,
        hint: rpcError.hint,
        code: rpcError.code,
      });

      return {
        ok: false as const,
        error: "WALLET_CREDIT_RPC_FAILED",
        detail: rpcError.message,
        code: rpcError.code ?? null,
        details: rpcError.details ?? null,
        hint: rpcError.hint ?? null,
      };
    }

    // ---------------------------------------------------------------
    // 6. VALIDATE RPC PAYLOAD
    // ---------------------------------------------------------------
    const payload = rpcResult as {
      ok?: boolean;
      error?: string;
      reference?: string;
      amount?: number;
      currency?: string;
      new_balance?: number;
    } | null;

    console.log("[creditUserWallet] admin_credit_wallet RPC response:", payload);

    if (!payload?.ok) {
      console.error("[creditUserWallet] RPC returned an unsuccessful payload:", payload);

      return {
        ok: false as const,
        error: payload?.error ?? "WALLET_CREDIT_FAILED",
      };
    }

    // ---------------------------------------------------------------
    // 7. SUCCESS
    // ---------------------------------------------------------------
    const creditedAmount = Number(payload.amount ?? data.amount);

    const newBalance = Number(payload.new_balance ?? 0);

    console.log("[creditUserWallet] wallet successfully credited:", {
      userId: data.userId,
      amount: creditedAmount,
      currency: payload.currency ?? "XAF",
      reference: payload.reference ?? null,
      newBalance,
    });

    return {
      ok: true as const,
      reference: payload.reference ?? null,
      amount: creditedAmount,
      currency: payload.currency ?? "XAF",
      newBalance,
    };
  });

export const getConsoleProviders = createServerFn({
  method: "GET",
}).handler(async () => {
  const { requireDepartment, adminClient } = await import("./console.server");

  await requireDepartment("TRUST");

  const db = await adminClient();

  const [providers, bookings] = await Promise.all([
    db
      .from("provider_profiles")
      .select(
        "id, business_name, city, slug, is_live, is_verified, verification_status, rating_avg, rating_count, created_at",
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(300),

    db.from("bookings").select("provider_id, status, price"),
  ]);

  const bks = bookings.data ?? [];

  return (providers.data ?? []).map((p) => {
    const mine = bks.filter((b) => b.provider_id === p.id);

    const done = mine.filter((b) => b.status === "COMPLETED" || b.status === "SETTLED");

    const revenue = done.reduce((sum, b) => sum + Number(b.price), 0);

    return {
      ...p,
      bookings: mine.length,
      completed: done.length,
      revenue,
      fees: Math.round(revenue * 0.01),
    };
  });
});

export const setProviderVerification = createServerFn({
  method: "POST",
})
  .inputValidator((data: { providerId: string; approve: boolean }) => ({
    providerId: String(data?.providerId ?? ""),
    approve: Boolean(data?.approve),
  }))
  .handler(async ({ data }) => {
    const { requireDepartment, adminClient } = await import("./console.server");

    await requireDepartment("TRUST");

    if (!data.providerId) {
      return {
        ok: false as const,
        error: "INVALID_PROVIDER",
      };
    }

    const db = await adminClient();

    const { error } = await db.rpc("console_set_verification", {
      _provider_id: data.providerId,
      _approve: data.approve,
    });

    return error
      ? {
          ok: false as const,
          error: error.message,
        }
      : {
          ok: true as const,
        };
  });

export const getConsoleBookings = createServerFn({
  method: "GET",
}).handler(async () => {
  const { requireDepartment, adminClient } = await import("./console.server");

  await requireDepartment("MARKETPLACE_OPS");

  const db = await adminClient();

  const [bookings, providers] = await Promise.all([
    db
      .from("bookings")
      .select("id, provider_id, service_title, price, status, scheduled_at, created_at")
      .order("created_at", {
        ascending: false,
      })
      .limit(300),

    db.from("provider_profiles").select("id, business_name"),
  ]);

  const pMap = new Map((providers.data ?? []).map((p) => [p.id, p]));

  return (bookings.data ?? []).map((b) => ({
    ...b,
    providerName: pMap.get(b.provider_id)?.business_name ?? "—",
    billingMode: "COMMISSION" as const,
    fee: Math.round(Number(b.price) * 0.01),
  }));
});

export const setBookingStatus = createServerFn({
  method: "POST",
})
  .inputValidator((data: { id: string; status: string }) => data)
  .handler(async ({ data }) => {
    const { requireDepartment, adminClient } = await import("./console.server");

    await requireDepartment("MARKETPLACE_OPS");

    const allowed = [
      "PENDING",
      "CONFIRMED",
      "IN_PROGRESS",
      "COMPLETED",
      "SETTLED",
      "CANCELLED",
      "DECLINED",
      "NO_SHOW",
      "REFUNDED",
      "DISPUTED",
    ];

    if (!allowed.includes(data.status)) {
      return {
        ok: false as const,
        error: "INVALID_STATUS",
      };
    }

    const db = await adminClient();

    const { error } = await db
      .from("bookings")
      .update({
        status: data.status as never,
      })
      .eq("id", data.id);

    return error
      ? {
          ok: false as const,
          error: error.message,
        }
      : {
          ok: true as const,
        };
  });

export const getConsoleWithdrawals = createServerFn({
  method: "GET",
}).handler(async () => {
  const { requireDepartment, adminClient } = await import("./console.server");

  await requireDepartment("REVENUE");

  const db = await adminClient();

  const { data } = await db
    .from("withdrawals")
    .select("*")
    .order("requested_at", {
      ascending: false,
    })
    .limit(300);

  return data ?? [];
});

/**
 * Exceptional/manual withdrawal settlement.
 *
 * Normal MTN Mobile Money and Orange Money payouts that already have
 * a TchokoPay provider reference must be settled automatically by the
 * signed TchokoPay disbursement webhook.
 *
 * Manual console settlement remains available for exceptional cases,
 * such as withdrawals that have not yet been linked to a provider
 * reference or other authorized administrative intervention.
 */
export const settleWithdrawal = createServerFn({
  method: "POST",
})
  .inputValidator((data: { id: string; status: string; providerReference?: string }) => data)
  .handler(async ({ data }) => {
    const { requireDepartment, adminClient } = await import("./console.server");

    await requireDepartment("REVENUE");

    const db = await adminClient();

    /*
     * Load the current withdrawal first so the console cannot blindly
     * overwrite the state of an unrelated/nonexistent withdrawal.
     */
    const { data: withdrawal, error: withdrawalError } = await db
      .from("withdrawals")
      .select("id, payment_method, status, provider_reference")
      .eq("id", data.id)
      .maybeSingle();

    if (withdrawalError) {
      return {
        ok: false as const,
        error: withdrawalError.message,
      };
    }

    if (!withdrawal) {
      return {
        ok: false as const,
        error: "WITHDRAWAL_NOT_FOUND",
      };
    }

    const isMobileMoney = withdrawal.payment_method === "MTN_MOMO" || withdrawal.payment_method === "ORANGE_MONEY";

    /*
     * Once TchokoPay has accepted a mobile-money payout and ASH has
     * stored the provider reference, normal PROCESSING/COMPLETED
     * transitions must come from the provider webhook.
     */
    if (
      isMobileMoney &&
      withdrawal.provider_reference &&
      (data.status === "PROCESSING" || data.status === "COMPLETED")
    ) {
      return {
        ok: false as const,
        error: "AUTO_SETTLEMENT_ONLY",
      };
    }

    /*
     * Allow the existing RPC to handle exceptional/manual cases.
     */
    const { data: result, error } = await db.rpc("console_settle_withdrawal", {
      _withdrawal_id: data.id,
      _status: data.status,
      ...(data.providerReference
        ? {
            _provider_reference: data.providerReference,
          }
        : {}),
    });

    const payload = result as {
      ok?: boolean;
      error?: string;
    } | null;

    if (error || !payload?.ok) {
      return {
        ok: false as const,
        error: error?.message ?? payload?.error ?? "FAILED",
      };
    }

    return {
      ok: true as const,
    };
  });

/**
 * Exceptional recovery for a TchokoPay payout that is already confirmed
 * as PAID by the provider but whose webhook settlement did not reach ASH.
 *
 * IMPORTANT:
 * - Does NOT create a new payout.
 * - Requires REVENUE access.
 * - Only works on an existing PROCESSING mobile-money withdrawal.
 * - Requires the exact provider reference already stored on the withdrawal.
 * - Final wallet/ledger settlement is performed by the existing
 *   console_settle_withdrawal() RPC.
 */
export const reconcilePaidWithdrawal = createServerFn({
  method: "POST",
})
  .inputValidator((data: { id: string; providerReference: string }) => ({
    id: String(data.id ?? ""),
    providerReference: String(data.providerReference ?? ""),
  }))
  .handler(async ({ data }) => {
    const { requireDepartment, adminClient } = await import("./console.server");

    await requireDepartment("REVENUE");

    if (!data.id || !data.providerReference) {
      return {
        ok: false as const,
        error: "INVALID_INPUT",
      };
    }

    const db = await adminClient();

    const { data: withdrawal, error: withdrawalError } = await db
      .from("withdrawals")
      .select("id, reference, payment_method, amount, currency, status, provider_reference")
      .eq("id", data.id)
      .maybeSingle();

    if (withdrawalError) {
      return {
        ok: false as const,
        error: withdrawalError.message,
      };
    }

    if (!withdrawal) {
      return {
        ok: false as const,
        error: "WITHDRAWAL_NOT_FOUND",
      };
    }

    const isMobileMoney = withdrawal.payment_method === "MTN_MOMO" || withdrawal.payment_method === "ORANGE_MONEY";

    if (!isMobileMoney) {
      return {
        ok: false as const,
        error: "NOT_MOBILE_MONEY_WITHDRAWAL",
      };
    }

    if (withdrawal.status !== "PROCESSING") {
      return {
        ok: false as const,
        error: "WITHDRAWAL_NOT_PROCESSING",
      };
    }

    if (!withdrawal.provider_reference) {
      return {
        ok: false as const,
        error: "MISSING_PROVIDER_REFERENCE",
      };
    }

    /*
     * The admin must explicitly provide the exact provider reference
     * already attached to this withdrawal. This prevents settling an
     * unrelated payout.
     */
    if (withdrawal.provider_reference !== data.providerReference) {
      return {
        ok: false as const,
        error: "PROVIDER_REFERENCE_MISMATCH",
      };
    }

    /*
     * This RPC performs the actual financial transition:
     *
     * pending_balance  -= withdrawal.amount
     * total_withdrawn  += withdrawal.amount
     * withdrawal       -> COMPLETED
     * transaction      -> COMPLETED
     *
     * No new TchokoPay request is made here.
     */
    const { data: result, error: settlementError } = await db.rpc("console_settle_withdrawal", {
      _withdrawal_id: withdrawal.id,
      _status: "COMPLETED",
      _provider_reference: withdrawal.provider_reference,
      _note:
        "Exceptional recovery: TchokoPay dashboard confirmed payout as PAID; webhook settlement was not reflected in ASH.",
    });

    const payload = result as {
      ok?: boolean;
      error?: string;
    } | null;

    if (settlementError || !payload?.ok) {
      return {
        ok: false as const,
        error: settlementError?.message ?? payload?.error ?? "WITHDRAWAL_SETTLEMENT_FAILED",
      };
    }

    return {
      ok: true as const,
      reference: withdrawal.reference,
      providerReference: withdrawal.provider_reference,
      amount: withdrawal.amount,
    };
  });

export const getConsoleLedger = createServerFn({
  method: "GET",
}).handler(async () => {
  const { requireDepartment, adminClient } = await import("./console.server");

  await requireDepartment("REVENUE");

  const db = await adminClient();

  const [tx, activations, subs] = await Promise.all([
    db
      .from("transactions")
      .select("id, type, amount, reference, description, status, created_at")
      .order("created_at", {
        ascending: false,
      })
      .limit(300),

    db
      .from("activations")
      .select("id, amount, status, payment_reference, provider_transaction_id, created_at, paid_at")
      .order("created_at", {
        ascending: false,
      })
      .limit(100),

    db
      .from("provider_subscriptions")
      .select("id, amount, status, payment_reference, period_end, created_at")
      .order("created_at", {
        ascending: false,
      })
      .limit(100),
  ]);

  return {
    transactions: tx.data ?? [],
    activations: activations.data ?? [],
    subscriptions: subs.data ?? [],
  };
});

export const getConsoleDeletionRequests = createServerFn({
  method: "GET",
}).handler(async () => {
  const { requireDepartment, adminClient } = await import("./console.server");

  await requireDepartment("SUPER_ADMIN");

  const db = await adminClient();

  const { data: requests } = await db
    .from("account_deletion_requests")
    .select("id, user_id, reason, status, admin_note, reviewed_at, created_at")
    .order("created_at", {
      ascending: false,
    })
    .limit(200);

  const list = requests ?? [];

  const ids = [...new Set(list.map((r) => r.user_id))];

  const { data: profiles } = ids.length
    ? await db.from("profiles").select("user_id, full_name, email, phone, account_status").in("user_id", ids)
    : {
        data: [] as Array<{
          user_id: string;
          full_name: string;
          email: string;
          phone: string;
          account_status: string;
        }>,
      };

  const byUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  return list.map((r) => ({
    ...r,
    profile: byUser.get(r.user_id) ?? null,
  }));
});

export const reviewDeletionRequest = createServerFn({
  method: "POST",
})
  .inputValidator((data: { id: string; status: "APPROVED" | "REJECTED"; note?: string }) => data)
  .handler(async ({ data }) => {
    const { requireDepartment, adminClient } = await import("./console.server");

    await requireDepartment("SUPPORT");

    if (data.status !== "APPROVED" && data.status !== "REJECTED") {
      throw new Error("INVALID_STATUS");
    }

    const db = await adminClient();

    const { error } = await db
      .from("account_deletion_requests")
      .update({
        status: data.status,
        admin_note: data.note ? String(data.note) : null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (error) {
      throw new Error(error.message);
    }

    if (data.status === "APPROVED") {
      const { data: row } = await db
        .from("account_deletion_requests")
        .select("user_id")
        .eq("id", data.id)
        .maybeSingle();

      if (row?.user_id) {
        await db
          .from("profiles")
          .update({
            account_status: "CLOSED",
          })
          .eq("user_id", row.user_id);
      }
    }

    return {
      ok: true as const,
    };
  });

/* ------------------------------------------------------------------ *
 * Payments & Activations (Phase 2)
 * ------------------------------------------------------------------ */

export type PaymentRow = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_reference: string;
  provider_transaction_id: string | null;
  payment_provider: string;
  created_at: string;
  paid_at: string | null;
  user_id: string;
  profile: {
    full_name: string;
    email: string;
    phone: string;
    account_status: string;
    referred_by: string | null;
  } | null;
};

export const getConsolePayments = createServerFn({
  method: "GET",
}).handler(async () => {
  const { requireDepartment, adminClient } = await import("./console.server");

  await requireDepartment("REVENUE");

  const db = await adminClient();

  const { data: activations } = await db
    .from("activations")
    .select(
      "id, user_id, amount, currency, status, payment_reference, provider_transaction_id, payment_provider, created_at, paid_at",
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(500);

  const rows = activations ?? [];

  const ids = [...new Set(rows.map((r) => r.user_id))];

  const { data: profiles } = ids.length
    ? await db
        .from("profiles")
        .select("user_id, full_name, email, phone, account_status, referred_by")
        .in("user_id", ids)
    : {
        data: [] as Array<Record<string, unknown>>,
      };

  const byUser = new Map((profiles ?? []).map((p) => [(p as { user_id: string }).user_id, p]));

  const [{ data: events }, { data: pendingProfiles }] = await Promise.all([
    db
      .from("payment_events")
      .select("id, source, reference, status, signature_verified, outcome, created_at")
      .order("created_at", {
        ascending: false,
      })
      .limit(50),

    db
      .from("profiles")
      .select("user_id, full_name, email, phone, account_status, created_at")
      .neq("account_status", "ACTIVE")
      .order("created_at", {
        ascending: false,
      })
      .limit(200),
  ]);

  const payments = rows.map((r) => ({
    ...r,
    profile: (byUser.get(r.user_id) as PaymentRow["profile"]) ?? null,
  })) as PaymentRow[];

  const totals = {
    all: payments.length,

    paid: payments.filter((p) => p.status === "PAID").length,

    pending: payments.filter((p) => p.status === "PENDING" || p.status === "PROCESSING").length,

    failed: payments.filter((p) => p.status === "FAILED" || p.status === "CANCELLED").length,

    collected: payments.filter((p) => p.status === "PAID").reduce((sum, p) => sum + Number(p.amount), 0),
  };

  return {
    payments,
    events: events ?? [],
    unactivated: pendingProfiles ?? [],
    totals,
  };
});

/** Re-checks one activation against the payment provider and completes it when the provider says PAID. */
export const verifyPaymentReference = createServerFn({
  method: "POST",
})
  .inputValidator((data: { reference: string }) => data)
  .handler(async ({ data }) => {
    const { requireDepartment, adminClient } = await import("./console.server");

    await requireDepartment("REVENUE");

    const { tchokoPay } = await import("./tchokopay.server");

    const { findMerchantReference, settleCollection } = await import("./payment-settlement.server");

    const db = await adminClient();

    // The console accepts either reference: ours (ACT-/BKG-/PLK-) or TchokoPay's REQ-.
    const isProviderRef = data.reference.startsWith("REQ-");

    const merchantReference = isProviderRef ? await findMerchantReference(data.reference) : data.reference;

    let providerReference: string | null = isProviderRef ? data.reference : null;

    if (!isProviderRef) {
      const { data: activation } = await db
        .from("activations")
        .select("provider_transaction_id")
        .eq("payment_reference", data.reference)
        .maybeSingle();

      providerReference = activation?.provider_transaction_id ?? null;

      if (!providerReference) {
        const { data: booking } = await db
          .from("bookings")
          .select("provider_transaction_id")
          .eq("payment_reference", data.reference)
          .maybeSingle();

        providerReference = booking?.provider_transaction_id ?? null;
      }

      if (!providerReference) {
        const { data: charge } = await db
          .from("payment_link_charges")
          .select("provider_transaction_id")
          .eq("reference", data.reference)
          .maybeSingle();

        providerReference = charge?.provider_transaction_id ?? null;
      }
    }

    if (!merchantReference) {
      return {
        ok: false as const,
        error: "UNKNOWN_REFERENCE",
      };
    }

    const verification = providerReference?.startsWith("REQ-")
      ? await tchokoPay.getCollection(providerReference)
      : await tchokoPay.verifyLegacyPayment(merchantReference);

    if (!verification.ok) {
      await db.from("payment_events").insert({
        source: "CONSOLE_VERIFY",
        reference: merchantReference,
        status: verification.status ?? null,
        outcome: "VERIFY_FAILED",
        detail: {
          error: verification.error ?? null,
        },
      });

      return {
        ok: false as const,
        error: verification.error ?? "VERIFY_FAILED",
      };
    }

    const settled = await settleCollection({
      merchantReference,
      providerReference: verification.providerReference ?? providerReference,
      status: verification.status,
      source: "CONSOLE_VERIFY",
    });

    return {
      ok: settled.ok,
      status: verification.status,
      outcome: settled.outcome,
    };
  });

/** Runs provider-authoritative reconciliation over every activation still awaiting payment. */
export const reconcilePayments = createServerFn({
  method: "POST",
}).handler(async () => {
  const { requireDepartment, adminClient } = await import("./console.server");

  await requireDepartment("REVENUE");

  const { tchokoPay } = await import("./tchokopay.server");

  const db = await adminClient();

  if (!tchokoPay.isConfigured()) {
    return {
      ok: false as const,
      error: "PAYMENT_PROVIDER_NOT_CONFIGURED",
    };
  }

  const { data: pending } = await db
    .from("activations")
    .select("payment_reference, provider_transaction_id")
    .in("status", ["PENDING", "PROCESSING"])
    .order("created_at", {
      ascending: false,
    })
    .limit(100);

  const { settleCollection } = await import("./payment-settlement.server");

  let activated = 0;

  for (const row of pending ?? []) {
    const providerRef = row.provider_transaction_id ?? "";

    const verification = providerRef.startsWith("REQ-")
      ? await tchokoPay.getCollection(providerRef)
      : await tchokoPay.verifyLegacyPayment(row.payment_reference);

    if (!verification.ok) {
      continue;
    }

    const settled = await settleCollection({
      merchantReference: row.payment_reference,
      providerReference: verification.providerReference ?? row.provider_transaction_id,
      status: verification.status,
      source: "CONSOLE_RECONCILE",
    });

    if (verification.status === "PAID" && settled.ok) {
      activated += 1;
    }
  }

  await db.from("payment_events").insert({
    source: "CONSOLE_RECONCILE",
    outcome: "RECONCILED",
    detail: {
      checked: pending?.length ?? 0,
      activated,
    },
  });

  return {
    ok: true as const,
    checked: pending?.length ?? 0,
    activated,
  };
});

/** Manual activation for a member whose money landed outside the platform. Always audited. */
export const manualActivate = createServerFn({
  method: "POST",
})
  .inputValidator((data: { userId: string; reason: string }) => data)
  .handler(async ({ data }) => {
    const { requireDepartment, adminClient } = await import("./console.server");

    await requireDepartment("REVENUE");

    if (!data.reason || data.reason.trim().length < 5) {
      return {
        ok: false as const,
        error: "REASON_REQUIRED",
      };
    }

    const db = await adminClient();

    const { data: result, error } = await db.rpc("admin_manual_activate", {
      _user_id: data.userId,
      _reason: data.reason.trim(),
      _actor: "CONSOLE",
    });

    const payload = result as {
      ok?: boolean;
      error?: string;
    } | null;

    if (error || !payload?.ok) {
      return {
        ok: false as const,
        error: error?.message ?? payload?.error ?? "FAILED",
      };
    }

    return {
      ok: true as const,
    };
  });

export const getConsoleAuditLog = createServerFn({
  method: "GET",
}).handler(async () => {
  const { requireDepartment, adminClient } = await import("./console.server");

  await requireDepartment("SUPER_ADMIN");

  const db = await adminClient();

  const { data } = await db
    .from("admin_audit_log")
    .select("id, actor, action, target_user_id, target_reference, previous_state, new_state, reason, created_at")
    .order("created_at", {
      ascending: false,
    })
    .limit(200);

  const list = data ?? [];

  const ids = [...new Set(list.map((r) => r.target_user_id).filter(Boolean))] as string[];

  const { data: profiles } = ids.length
    ? await db.from("profiles").select("user_id, full_name, email").in("user_id", ids)
    : {
        data: [] as Array<{
          user_id: string;
          full_name: string;
          email: string;
        }>,
      };

  const byUser = new Map((profiles ?? []).map((p) => [p.user_id, p]));

  return list.map((r) => ({
    ...r,
    profile: r.target_user_id ? (byUser.get(r.target_user_id) ?? null) : null,
  }));
});

export type DayPoint = {
  day: string;
  activations: number;
  subscriptions: number;
  commission: number;
  bookingVolume: number;
  payouts: number;
  signups: number;
};

export type ConsoleAnalytics = {
  series: DayPoint[];
  range: number;
  totals: {
    activations: number;
    subscriptions: number;
    commission: number;
    bookingVolume: number;
    payouts: number;
    signups: number;
    revenue: number;
  };
  channels: {
    name: string;
    value: number;
  }[];
};

function dayKey(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString().slice(0, 10);
}

/** Daily platform analytics for the console graphs. Real-time (no cache). */
export const getConsoleAnalytics = createServerFn({
  method: "GET",
})
  .inputValidator(
    (
      input:
        | {
            days?: number;
          }
        | undefined,
    ) => ({
      days: Math.min(Math.max(Number(input?.days ?? 30), 7), 90),
    }),
  )
  .handler(async ({ data }): Promise<ConsoleAnalytics> => {
    const { requireDepartment, adminClient } = await import("./console.server");

    await requireDepartment("SUPER_ADMIN");

    const db = await adminClient();

    const since = new Date(Date.now() - data.days * 86400000);

    const sinceIso = since.toISOString();

    const [activations, subs, bookings, payouts, signups] = await Promise.all([
      db.from("activations").select("amount, paid_at").eq("status", "PAID").gte("paid_at", sinceIso),

      db.from("provider_subscriptions").select("amount, created_at").eq("status", "ACTIVE").gte("created_at", sinceIso),

      db.from("bookings").select("price, platform_fee, paid_at").not("paid_at", "is", null).gte("paid_at", sinceIso),

      db.from("withdrawals").select("amount, processed_at").eq("status", "PAID").gte("processed_at", sinceIso),

      db.from("profiles").select("created_at").gte("created_at", sinceIso),
    ]);

    const buckets = new Map<string, DayPoint>();

    for (let i = data.days - 1; i >= 0; i -= 1) {
      const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);

      buckets.set(day, {
        day,
        activations: 0,
        subscriptions: 0,
        commission: 0,
        bookingVolume: 0,
        payouts: 0,
        signups: 0,
      });
    }

    const add = (key: string | null, field: keyof Omit<DayPoint, "day">, amount: number) => {
      if (!key) {
        return;
      }

      const bucket = buckets.get(key);

      if (!bucket) {
        return;
      }

      bucket[field] += amount;
    };

    for (const row of activations.data ?? []) {
      add(dayKey(row.paid_at), "activations", Number(row.amount ?? 0));
    }

    for (const row of subs.data ?? []) {
      add(dayKey(row.created_at), "subscriptions", Number(row.amount ?? 0));
    }

    for (const row of bookings.data ?? []) {
      const key = dayKey(row.paid_at);

      add(key, "commission", Number(row.platform_fee ?? 0));

      add(key, "bookingVolume", Number(row.price ?? 0));
    }

    for (const row of payouts.data ?? []) {
      add(dayKey(row.processed_at), "payouts", Number(row.amount ?? 0));
    }

    for (const row of signups.data ?? []) {
      add(dayKey(row.created_at), "signups", 1);
    }

    const series = [...buckets.values()];

    const sum = (field: keyof Omit<DayPoint, "day">) => series.reduce((acc, p) => acc + p[field], 0);

    const totals = {
      activations: sum("activations"),
      subscriptions: sum("subscriptions"),
      commission: sum("commission"),
      bookingVolume: sum("bookingVolume"),
      payouts: sum("payouts"),
      signups: sum("signups"),
      revenue: sum("activations") + sum("subscriptions") + sum("commission"),
    };

    return {
      series,
      range: data.days,
      totals,
      channels: [
        {
          name: "Activations",
          value: totals.activations,
        },
        {
          name: "Subscriptions",
          value: totals.subscriptions,
        },
        {
          name: "Booking commission",
          value: totals.commission,
        },
      ].filter((c) => c.value > 0),
    };
  });

/* ------------------------------------------------------------------ *
 * Security
 * ------------------------------------------------------------------ */

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | {
      [key: string]: JsonValue;
    };

export type SecurityEvent = {
  id: string;
  kind: string;
  severity: "INFO" | "WARN" | "CRITICAL";
  subject: string | null;
  actor_user_id: string | null;
  route: string | null;
  detail: Record<string, JsonValue>;
  created_at: string;
};

export type SecurityOverview = {
  since: string;
  total: number;
  critical: number;
  warn: number;
  by_kind: {
    kind: string;
    count: number;
  }[];
  top_subjects: {
    subject: string;
    count: number;
    kinds: string[];
  }[];
  last_selfcheck: {
    severity: string;
    detail: Record<string, JsonValue>;
    created_at: string;
  } | null;
};

/** Security audit log + suspicious-activity summary for the console. */
export const getSecurityAudit = createServerFn({
  method: "GET",
})
  .inputValidator(
    (
      input:
        | {
            hours?: number;
          }
        | undefined,
    ) => ({
      hours: Math.min(Math.max(Number(input?.hours ?? 24), 1), 720),
    }),
  )
  .handler(async ({ data }) => {
    const { requireDepartment, adminClient } = await import("./console.server");

    await requireDepartment("CYBERSECURITY");

    const db = await adminClient();

    const [overview, events] = await Promise.all([
      db.rpc("security_overview", {
        _hours: data.hours,
      }),

      db
        .from("security_events")
        .select("id, kind, severity, subject, actor_user_id, route, detail, created_at")
        .order("created_at", {
          ascending: false,
        })
        .limit(200),
    ]);

    return {
      overview: (overview.data ?? null) as SecurityOverview | null,

      overviewError: overview.error?.message ?? null,

      events: (events.data ?? []) as SecurityEvent[],
    };
  });

/** Runs the database security self-check on demand from the console. */
export const runSecuritySelfCheck = createServerFn({
  method: "POST",
}).handler(async () => {
  const { requireDepartment, adminClient } = await import("./console.server");

  await requireDepartment("CYBERSECURITY");

  const db = await adminClient();

  const { data, error } = await db.rpc("security_selfcheck");

  if (error) {
    return {
      ok: false as const,
      error: error.message,
    };
  }

  return {
    ok: true as const,
    report: data as {
      ok: boolean;
      critical: number;
      warn: number;
      findings: {
        code: string;
        severity: string;
        object: string;
        detail: string;
      }[];
    },
  };
});

/* ------------------------------------------------------------------ *
 * Platform payouts — withdrawing the platform's own revenue
 * ------------------------------------------------------------------ */

export const getConsolePayouts = createServerFn({
  method: "GET",
}).handler(async () => {
  const { requireDepartment, adminClient } = await import("./console.server");

  await requireDepartment("REVENUE");

  const db = await adminClient();

  const [fin, payouts, bookings, providers] = await Promise.all([
    db.rpc("console_financials"),

    db
      .from("platform_payouts")
      .select(
        "id, amount, currency, destination, note, reference, status, provider, provider_reference, processed_at, failure_reason, created_at",
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(200),

    db
      .from("bookings")
      .select("id, provider_id, service_title, price, status, platform_fee, provider_amount, paid_at, created_at")
      .order("created_at", {
        ascending: false,
      })
      .limit(300),

    db.from("provider_profiles").select("id, business_name"),
  ]);

  const taken = (payouts.data ?? [])
    .filter((p) => ["PENDING", "PROCESSING", "COMPLETED"].includes(String(p.status ?? "")))
    .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

  const f = (fin.data ?? {}) as Record<string, number>;

  const pMap = new Map((providers.data ?? []).map((p) => [p.id, p.business_name]));

  return {
    financials: (fin.data ?? null) as Financials | null,

    taken,

    available: Math.max(Number(f["safe_to_withdraw"] ?? 0) - taken, 0),

    payouts: payouts.data ?? [],

    bookings: (bookings.data ?? []).map((b) => ({
      ...b,
      providerName: pMap.get(b.provider_id) ?? "—",
      fee: Number(b.platform_fee ?? Math.round(Number(b.price) * 0.01)),
    })),
  };
});

export const requestConsolePayout = createServerFn({
  method: "POST",
})
  .inputValidator((data: { amount: number; destination: string; provider: "mtn_cm" | "orange_cm"; note?: string }) => ({
    amount: Number(data?.amount),
    destination: String(data?.destination ?? ""),
    provider: data?.provider === "orange_cm" ? "orange_cm" : "mtn_cm",
    note: data?.note ? String(data.note) : "",
  }))
  .handler(async ({ data }) => {
    const { requireDepartment, adminClient } = await import("./console.server");

    await requireDepartment("REVENUE");

    const amount = Math.round(data.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        ok: false as const,
        error: "INVALID_AMOUNT",
      };
    }

    const rawPhone = data.destination.trim();

    let phone = rawPhone.replace(/[^\d+]/g, "");

    if (phone.startsWith("+237")) {
      phone = phone.slice(4);
    } else if (phone.startsWith("237") && phone.length === 12) {
      phone = phone.slice(3);
    }

    phone = phone.replace(/\D/g, "");

    if (!/^6\d{8}$/.test(phone)) {
      return {
        ok: false as const,
        error: "INVALID_CAMEROON_PHONE",
      };
    }

    const db = await adminClient();

    const { data: result, error } = await db.rpc("console_platform_payout", {
      _amount: amount,
      _destination: phone,
      ...(data.note
        ? {
            _note: data.note.trim(),
          }
        : {}),
    });

    const payload = result as {
      ok?: boolean;
      id?: string;
      reference?: string;
      status?: string;
      error?: string;
      available?: number;
      remaining?: number;
    } | null;

    if (error || !payload?.ok || !payload.id || !payload.reference) {
      return {
        ok: false as const,
        error: payload?.error ?? error?.message ?? "PAYOUT_RECORD_FAILED",
        available: payload?.available ?? null,
      };
    }

    const { tchokoPay } = await import("./tchokopay.server");

    if (!tchokoPay.isConfigured()) {
      await db
        .from("platform_payouts")
        .update({
          failure_reason: "PAYMENT_PROVIDER_NOT_CONFIGURED",
        })
        .eq("id", payload.id);

      return {
        ok: false as const,
        error: "PAYMENT_PROVIDER_NOT_CONFIGURED",
        reference: payload.reference,
      };
    }

    const disbursement = await tchokoPay.disburse({
      amount,
      currency: "XAF",
      country: "CM",
      provider: data.provider,
      phone,
      merchantReference: payload.reference,
    });

    if (disbursement.ok) {
      const status = disbursement.status === "PAID" ? "COMPLETED" : "PROCESSING";

      const { error: updateError } = await db
        .from("platform_payouts")
        .update({
          status,
          provider: data.provider,
          provider_reference: disbursement.providerReference ?? null,
          processed_at: status === "COMPLETED" ? new Date().toISOString() : null,
          failure_reason: null,
        })
        .eq("id", payload.id);

      if (updateError) {
        return {
          ok: false as const,
          error: "PAYOUT_STATE_UPDATE_FAILED",
          reference: payload.reference,
          providerReference: disbursement.providerReference ?? null,
        };
      }

      return {
        ok: true as const,
        reference: payload.reference,
        status,
        provider: data.provider,
        providerReference: disbursement.providerReference ?? null,
        remaining: payload.remaining ?? null,
      };
    }

    const uncertainProviderFailure =
      disbursement.error === "PROVIDER_UNREACHABLE" ||
      disbursement.error === "NETWORK_ERROR" ||
      disbursement.error === "TIMEOUT";

    await db
      .from("platform_payouts")
      .update({
        provider: data.provider,
        failure_reason: disbursement.error ?? "DISBURSEMENT_FAILED",
        status: uncertainProviderFailure ? "PENDING" : "FAILED",
        processed_at: uncertainProviderFailure ? null : new Date().toISOString(),
      })
      .eq("id", payload.id);

    return {
      ok: false as const,
      error: disbursement.error ?? "DISBURSEMENT_FAILED",
      reference: payload.reference,
    };
  });
