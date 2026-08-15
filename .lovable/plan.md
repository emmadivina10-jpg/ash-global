# ASH Console + Provider Booking Ledger

Two things ship together: a correct booking/commission lifecycle with a real liability-aware ledger, and a separate password-gated admin console at `/console`, outside the member app.

## 1. Booking lifecycle

Extend booking statuses to:

```text
PENDING -> CONFIRMED -> IN_PROGRESS -> COMPLETED -> SETTLED
                     \-> CANCELLED | DECLINED | NO_SHOW | REFUNDED | DISPUTED
```

Rules:
- The 1% platform fee is recorded only on the transition into COMPLETED (already the case) and only for commission-mode providers.
- Moving a COMPLETED booking to REFUNDED, DISPUTED or NO_SHOW reverses the fee with an offsetting ledger entry, so revenue is never recognised on money that went back.
- SETTLED marks provider payout as done; it does not create new fee rows.
- Every booking that reaches COMPLETED also credits the provider's wallet with the net amount (price minus fee for commission mode, full price for subscription mode), so provider money lives in the wallet as a liability rather than being implicit.

## 2. Money separation

A new reporting view/function splits the platform's position into buckets instead of one blended number:

- Platform revenue: activation fees + platform commission fees (net of reversals)
- Provider funds owed: sum of provider wallet balances
- Referral commissions owed: sum of member wallet balances from referral earnings
- Pending withdrawals: PENDING/PROCESSING payout amounts
- Refund liability: bookings in DISPUTED state, at booking value
- Available to ASH: platform revenue minus pending obligations

The member app keeps showing personal balances only; the buckets are console-only.

## 3. Separate admin console

- New route tree at `/console`, with its own layout — no member `AppShell`, no bottom nav, no assistant bubble. Dark, dense, data-first.
- Access is two-factor by design: a shared console password AND an `admin` role on the signed-in account. Password unlocks the console; the role authorises every data read/write.
- Password lives server-side as a secret (`CONSOLE_PASSWORD`, set to the value you gave) plus a generated `SESSION_SECRET` for the encrypted cookie. Never shipped to the browser; compared timing-safely in a server function.
- Existing `/admin` routes inside the member app are removed so there is exactly one admin surface.

Console pages:
- Overview: the six money buckets, user/provider counts, activation and subscription revenue trends
- Users: search, status, roles
- Providers: billing mode, live status, subscription expiry, revenue and fees generated
- Bookings: lifecycle filters, status transitions, refund/dispute handling
- Withdrawals: approve / process / complete / reject (existing settle RPC)
- Ledger: full immutable transaction feed with type filters

## Technical notes

- DB migration: extend `booking_status` enum, add fee-reversal + provider-credit logic to the booking trigger, add `platform_financials()` security-definer function restricted to admins.
- Console gate: `src/lib/console.functions.ts` with `unlockConsole` / `lockConsole` / gated data fetchers using `useSession` from `@tanstack/react-start/server`.
- Console data reads go through `requireSupabaseAuth` + `has_role(uid,'admin')` checks, never the service role for ordinary reads.
- Your account needs the `admin` role granted; tell me the email you sign in with and I will grant it in the same migration.
