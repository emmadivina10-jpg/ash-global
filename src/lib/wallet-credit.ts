// Server-side wallet-credit checks and flow, free of framework imports so it can be tested.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const WALLET_CREDIT_MAX_XAF = 10_000_000;
export const WALLET_CREDIT_REASON_MAX = 500;

export type WalletCreditInput = { requestId: string; userId: string; amount: number; reason: string };

/** Returns an error code, or null when the input is acceptable. Reasons are never truncated. */
export function validateWalletCreditInput(input: WalletCreditInput): string | null {
  if (!UUID.test(input.requestId)) return "REQUEST_ID_REQUIRED";
  if (!UUID.test(input.userId)) return "INVALID_USER";
  if (!Number.isInteger(input.amount) || input.amount <= 0 || input.amount > WALLET_CREDIT_MAX_XAF)
    return "INVALID_AMOUNT";
  const len = input.reason.trim().length;
  if (len < 5) return "REASON_REQUIRED";
  if (len > WALLET_CREDIT_REASON_MAX) return "REASON_TOO_LONG";
  return null;
}

export type CreditActor = {
  staffId: string | null;
  department: string;
  extraDepartments: string[];
};

/** Only an individual seat in Revenue or Super admin (or with Revenue as an extra department) may credit. */
export function creditActorError(actor: CreditActor): string | null {
  if (!actor.staffId) return "INDIVIDUAL_ACCOUNT_REQUIRED";
  const ok =
    actor.department === "REVENUE" ||
    actor.department === "SUPER_ADMIN" ||
    actor.extraDepartments.includes("REVENUE");
  return ok ? null : "UNAUTHORIZED_ACTOR";
}

export type CreditRpc = (args: {
  _request_id: string;
  _user_id: string;
  _amount: number;
  _reason: string;
  _staff_id: string;
}) => Promise<{ data: unknown; error: { code?: string } | null }>;

export type WalletCreditResult =
  | {
      ok: true;
      reference: string | null;
      amount: number;
      currency: string;
      newBalance: number;
      replayed: boolean;
      reviewRequired: boolean;
    }
  | { ok: false; error: string };

export const OUTCOME_UNKNOWN = "WALLET_CREDIT_OUTCOME_UNKNOWN";

/** The whole server-side credit decision. actor must come from the server-verified console session. */
export async function runWalletCredit(
  actor: CreditActor,
  input: WalletCreditInput,
  rpc: CreditRpc,
): Promise<WalletCreditResult> {
  const actorErr = creditActorError(actor);
  if (actorErr) return { ok: false, error: actorErr };
  const invalid = validateWalletCreditInput(input);
  if (invalid) return { ok: false, error: invalid };

  let res;
  try {
    res = await rpc({
      _request_id: input.requestId,
      _user_id: input.userId,
      _amount: input.amount,
      _reason: input.reason.trim(),
      _staff_id: actor.staffId as string,
    });
  } catch {
    return { ok: false, error: OUTCOME_UNKNOWN };
  }
  // A database or network error may hide a committed credit; a same-ID retry is safe.
  if (res.error) return { ok: false, error: OUTCOME_UNKNOWN };
  const p = res.data as {
    ok?: boolean; error?: string; reference?: string; amount?: number; currency?: string;
    new_balance?: number; replayed?: boolean; review_required?: boolean;
  } | null;
  if (!p || typeof p.ok !== "boolean") return { ok: false, error: OUTCOME_UNKNOWN };
  if (!p.ok) return { ok: false, error: p.error ?? "WALLET_CREDIT_REJECTED" };
  return {
    ok: true,
    reference: p.reference ?? null,
    amount: Number(p.amount),
    currency: p.currency ?? "XAF",
    newBalance: Number(p.new_balance),
    replayed: Boolean(p.replayed),
    reviewRequired: Boolean(p.review_required),
  };
}
