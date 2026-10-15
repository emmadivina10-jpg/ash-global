// Credit form state. An unresolved request keeps its ID AND its exact payload.
import { OUTCOME_UNKNOWN, type WalletCreditInput, type WalletCreditResult } from "./wallet-credit";

export type CreditDraft = Omit<WalletCreditInput, "requestId">;

export type CreditFormState = {
  /** Set from the moment a request is sent until it is definitively resolved. */
  pending: WalletCreditInput | null;
  status: "idle" | "submitting" | "unknown";
};

export const initialCreditForm: CreditFormState = { pending: null, status: "idle" };

/** While a request is unresolved the amount, reason and member fields must be read-only. */
export function isCreditFormLocked(s: CreditFormState): boolean {
  return s.pending !== null;
}

/**
 * Returns the exact request to send. With an unresolved request, the original is resent
 * unchanged — whatever the form now shows — so a changed amount or reason can never mint a new ID.
 */
export function nextCreditRequest(
  s: CreditFormState,
  draft: CreditDraft,
  newId: () => string,
): { state: CreditFormState; request: WalletCreditInput } {
  const request = s.pending ?? { requestId: newId(), ...draft, reason: draft.reason.trim() };
  return { state: { pending: request, status: "submitting" }, request };
}

/** Clears the pending request only on a definitive answer. Unknown outcomes keep it for retry. */
export function resolveCreditRequest(
  s: CreditFormState,
  result: WalletCreditResult | "NETWORK_ERROR",
): CreditFormState {
  if (result === "NETWORK_ERROR" || (!result.ok && result.error === OUTCOME_UNKNOWN))
    return { pending: s.pending, status: "unknown" };
  return initialCreditForm;
}
