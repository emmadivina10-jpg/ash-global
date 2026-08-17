# ASH Glo REFER — Master Refactor (Phased)

## Audit findings so far

- **Activation is genuinely broken end-to-end.** All 27 activation records in the database are `PENDING`; none has ever reached `PAID`, and no profile has ever flipped to `ACTIVE` via payment. So the commission engine has never fired in production.
- Cause candidates confirmed in code: activation rows are created *before* the provider reference is reconciled, the webhook endpoint at `/api/public/webhooks/tchokopay` is likely not registered with TchokoPay (no callback URL is sent — `callbackUrl` is passed as an empty string), and the only other path to `PAID` is the user manually clicking "I have paid — verify". After redirecting to checkout the reference is lost from React state, so that button never appears on return.
- There is no notifications table, no support system, no invoices, no audit log, no location data, and no per-referral commission-status ledger (commissions today are only ordinary transaction rows).

## How I propose to run this

This request is roughly 36 subsystems. Shipping it in one pass would be unverifiable and would risk the money paths. I want to deliver it in phases, each one tested against real records before moving on.

### Phase 1 — Money correctness (start here)
- Fix activation: send a real callback/return URL, persist the reference server-side, and add a `/activate/return` reconciliation route that re-verifies with the provider on landing.
- Register and verify the TchokoPay webhook; make processing idempotent by provider transaction id (unique constraint), not just reference.
- Reconcile the 27 stuck activations against the provider API and settle whichever actually paid.
- Referral ledger: add `activation_status`, `commission_amount`, `commission_status`, `activated_at`, `transaction_id` to referrals so pending vs. earned is a real database state, not a guess.
- Wallet derived from the ledger; pending referral money never presented as withdrawable.
- Withdrawal audit: single in-flight request, no negative balance, correct status machine.
- Notifications table + backend triggers for activation, commission, withdrawal events.

### Phase 2 — Admin console
Payments & Activations section, Referrals, Wallets, Withdrawals, Audit Logs, plus manual activate/deactivate with a recorded actor, reason, and previous/new status.

### Phase 3 — Marketplace
Rename Services → Discovery, full category tree (beauty, tech, home, health, events), search/filters/location, provider ranking, provider profile and image upload fixes, booking lifecycle with pay-after-acceptance, invoices, booking chat, reviews.

### Phase 4 — Experience layer
Single ASH orb (AI, Support, Card, Bank, Map), support system, notification center, network tab redesign, tab bar, landing rotation, onboarding, profile pictures, transitions, performance.

## Technical notes

Database work goes through migrations with GRANTs and RLS. Payment verification stays server-side only (`createServerFn` + the public webhook route); no frontend state ever marks a payment successful. No seeded or fabricated reviews, testimonials, or transactions.

## What I need from you

Confirm the phase order, or tell me which phase matters most right now and I will start there.
