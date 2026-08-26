# Marketplace reliability, trust, chat, and payouts

## Goal
Make the marketplace complete and dependable from provider setup through booking, messaging, reviews, earnings, and withdrawal.

## What will change

### 1. Studio setup that actually finishes
- Repair portfolio uploads end-to-end, including storage permissions, clear per-file errors, immediate gallery refresh, and safe cleanup when a database write fails.
- Turn Studio into a clear setup sequence: profile, services, photos, availability, storefront, and verification.
- Add a final **Finish & view marketplace** action that validates the required setup, saves pending changes, shows a professional confirmation, and returns to Market with the provider’s own listing highlighted first.
- Replace the current verification panel/chip with a consistent shield-style ASH Verified badge and polished states for not requested, under review, verified, and rejected.

### 2. Booking flow that never appears disabled without explanation
- Fix availability loading so signed-in customers can choose a date/time and submit a booking; surface backend errors instead of silently showing an empty or blurred section.
- Distinguish “no hours configured,” “not accepting bookings,” “no slots that day,” and real loading/error states.
- Let a customer open a specific service directly from the storefront and preserve that service in the booking dialog.
- Keep the 24-hour accept-then-pay workflow, with Mobile Money in supported regions and Stripe card checkout worldwide.

### 3. Reviews and marketplace trust
- Keep completed-booking reviews as **Verified booking** reviews.
- Add one signed-in **Community review** per user/provider, clearly labeled so it cannot be confused with a verified transaction.
- Show rating summary, review count, review type, author identity, and date on provider/storefront pages.
- Prevent self-reviews and duplicate community reviews.

### 4. Reliable global chat
- Repair participant-facing conversation labels so providers see the client, not their own business name.
- Make conversation creation booking-aware and race-safe, and ensure both participants can read/send messages under backend access rules.
- Improve delivery feedback with actual error messages, retry state, unread/read status, realtime updates, and a periodic refresh fallback when realtime is interrupted.

### 5. Clear earnings and safe withdrawals
- Split wallet presentation into **Marketplace earnings**, **Referral earnings**, pending funds, available total, and withdrawn total using ledger-backed figures.
- Keep Cameroon Mobile Money withdrawals and validate their current request/admin settlement path.
- Add Stripe Connect hosted onboarding for international providers. ASH will store only the connected-account ID and readiness state—never card or bank details.
- Add a payout-method panel showing whether bank payouts are ready, and allow eligible balances to be requested to the connected Stripe bank account.
- Keep payout requests auditable and idempotent; do not mark funds withdrawn until Stripe confirms the payout/transfer outcome.

## Technical details
- Add a migration for community reviews, payout account metadata, withdrawal rail/status fields, uniqueness constraints, and race-safe conversation creation. Include explicit grants, RLS, and narrowly scoped authenticated RPC permissions.
- Add authenticated server functions for Stripe Connect account creation, hosted onboarding links, status refresh, and bank payout requests; keep the Stripe secret server-only.
- Add a Stripe webhook route under `/api/public/` with signature verification for connected-account and payout state changes.
- Extend the Stripe helper with Connect account/link/transfer operations and preserve the existing booking Checkout flow.
- Update Studio, provider profile, storefront, Messages, Wallet, Withdraw, and relevant query modules while preserving regional visibility rules.
- Add focused regression tests for uploads/access rules, booking creation, review authorization, conversation participants, and payout balance safety.

## Validation
- Verify provider creation → service → photo → hours → finish → own listing first.
- Verify customer profile click → service selection → slot selection → booking → provider receipt → chat both directions.
- Verify verified and community review creation/labels and duplicate/self-review rejection.
- Verify Mobile Money withdrawal still submits and Stripe Connect onboarding/payout state is handled safely in test mode.
- Check desktop and mobile layouts, runtime logs, tests, and the final build signal.
