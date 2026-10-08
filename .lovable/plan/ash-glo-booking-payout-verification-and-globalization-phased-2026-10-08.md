# ASH Glo booking, payout, verification and globalization — phased plan

The brief has 30 sections. It is too large to ship safely in one pass, so it is split into phases. Each phase stays in preview until you approve it. Nothing gets published, and no real money moves in testing.

## Phase 1: Stripe account audit (first, read-only)
- The app reads Stripe in one place only, using one secret key on the server. The webhook uses one signing secret. No old keys are written into the code.
- The Stripe account linked to this project is "ASH Glo" (account ID ending ozTBQjimtCBr2).
- Check: ask Stripe which account the saved secret key belongs to, and report its account ID and business name without showing the key. If it isn't the ASH Glo account (the one paid out to CIBC), stop and tell you which key to replace.
- Report the payout schedule. Provider transfers only work if funds stay in the Stripe balance, so automatic daily payouts to the bank must be switched to manual or delayed. You make that change in Stripe; the app will not change it for you.

## Phase 2: Booking money flow and verification code
- Flow: request → provider accepts → "payment required" notice → pay (Card, MTN, Orange or Bank, filtered by country) → server verifies the payment → booking confirmed.
- The commission rate is fixed on each booking when it is paid. The default is 12%. Admins can set a different rate per category, such as 15%. Changing a rate never affects past bookings.
- Once paid, the provider's share is held as **pending settlement**, not credited yet.
- A random, single-use code (ASH-XXXXXX) is created. The app stores only a secure fingerprint of it. Only the customer can see the code.
- The provider enters the code under "Verify customer / Complete booking". The server checks the booking, both people, the payment, the status and whether the code expired or was used. If everything matches, in one step: booking completed, provider wallet credited, ASH revenue recorded. The code can never pay out twice.
- Repeated wrong codes are sent to Trust & Safety.
- Normal bookings need no manual Finance approval.

## Phase 3: Receipts and timeline
- One official receipt is built from the booking record. The customer's copy includes the code. The provider's copy has no code and only limited customer details. Admin, Finance and Trust & Safety see copies based on their permissions.
- Receipts can be downloaded and printed.
- A booking timeline from booking requested to payout released, shown from the customer's side and from the provider's side.

## Phase 4: Find each other and live tracking
- "Find your provider" / "Find your customer" cards: photo, verified badge, location, chat, call where allowed, and directions.
- On the way → Arrived → Service started, with notifications.
- Live location is shared only during an active booking and stops when the booking ends, is cancelled, or times out.
- Maps: a free map service handles the map and directions. Accurate arrival-time estimates may need a paid maps service; I'll name it before adding one.

## Phase 5: Wallet and withdrawals
- A compact wallet: Available, Pending, Total earned, Total spent, Add money, Withdraw, and Transactions. All figures come from the real ledger.
- Withdrawal options depend on country and on what each payment service actually supports. Bank payouts through Stripe use the provider's connected account. "Card withdrawal" appears only if Stripe confirms card payouts are possible for that account.

## Phase 6: Stripe Connect payouts for providers
- Each provider is linked to their own Stripe connected account.
- Payments use separate charges and transfers: the transfer is created only after the code is checked, and is protected so it cannot run twice.
- A failed transfer goes to Finance for review.

## Phase 7: Identity checks (KYC)
- Sell → Become a provider → List a service / house rental / property.
- Providers verify with Stripe Identity. The app stores only the status and a reference, never ID images. Statuses: NOT_STARTED, IN_PROGRESS, VERIFIED, REQUIRES_INPUT, FAILED, REVIEW_REQUIRED.
- Providers cannot take paid bookings until they are verified.
- Customers are checked only when a risk signal appears.
- Exceptions go to Trust & Safety.

## Phase 8: Marketplace and global settings
- New tab order: All, House rentals, Properties, Deals, Services. Rentals and property types are clearly separated.
- Phone numbers with country codes, currency based on country, and no hard-coded Cameroon defaults in booking or payment screens.
- Finance and Trust & Safety dashboards show the new exception queues.

## What stays the same
MTN and Orange payments, the live Stripe webhook (it gains booking settlement only), the wallet ledger, sign-in, and ASH branding.

## Technical notes
- New columns on bookings: commission_rate, commission_amount, provider_amount, currency, settlement_status, verification_code_hash, code_expires_at, code_used_at, receipt_number, and the trip and arrival times.
- A new category_commission_rates table.
- A secured `release_booking_settlement` function locks the booking row, compares the code fingerprint, and credits the wallet exactly once.
- A Stripe transfer key per booking prevents duplicate transfers.

Shall I start with Phases 1 and 2?
