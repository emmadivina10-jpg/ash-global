# One wallet, real money per currency + money chart

## What you will see
- One wallet card with a currency switcher at the top: USD, CAD, XAF and any other currency in use.
- Each currency shows only the money that actually came in in that currency. No conversions are shown.
  - Your Stripe card top-up shows as its real dollar amount (for example US$8.07). Under XAF it shows 0 XAF, because nothing came in through TchokoPay.
  - A Mobile Money top-up shows only under XAF.
- Withdrawals use the money in the selected currency:
  - XAF goes out by MTN/Orange.
  - USD and CAD go out by Card/Bank (Stripe).
  - You can never withdraw money that isn't in that currency.
- A new "Money flow" chart on the Wallet page shows a line graph of money in and money out over 7 days, 30 days or 12 months, for the selected currency, with totals for money in, spent and withdrawn.
- Every user gets this, not just you.

## Rules
- Card/Stripe money is held in the currency Stripe actually charged. Today that is USD.
- Mobile Money is held in XAF only.
- Each currency's balance changes only when its own payment or withdrawal is confirmed.
- Bookings, activation and payment links still price in XAF. Paying them from the wallet uses the matching currency. The rules for that are in step 4 below.

## Steps
1. Database: add a per-currency balance record for each user's wallet, plus a currency field on every wallet movement. Nothing is deleted.
2. Backfill: rebuild each user's balances from their confirmed payments.
   - Card top-ups and card booking earnings go in at the real Stripe amount, read from the saved Stripe payment records.
   - Mobile Money goes in as XAF.
   - Before switching over, I check that the rebuilt balances add up to today's balances.
3. Payments: card top-ups and Stripe settlements credit the currency balance. Mobile Money credits XAF.
4. Spending from the wallet (activation, bookings): use XAF first. If there isn't enough XAF, you'll be asked before any USD is used, at a rate shown clearly. If you'd rather the wallet only spend in its own currency, I'll block that instead.
5. Withdrawals: use the selected currency's balance and the matching payout method only.
6. Wallet screen: add the currency switcher, the per-currency balance and the Money flow chart. The admin finance views split totals by currency.
7. Tests for each rule: no crossing between currencies, card money credited in USD, XAF unchanged by card top-ups, and withdrawal limits per currency.

## Technical details
- New table `wallet_balances(user_id, currency, available, pending, ...)` with service-role writes and owner-read RLS. Add a `currency` column to `transactions`, defaulting to XAF.
- Settlement in `payment-settlement.server.ts` takes the Stripe `amount_total`/`currency` from the Checkout session or PaymentIntent.
- The XAF `wallets` row stays as the XAF balance during the transition. `card_balance` is marked deprecated after the backfill.
- The chart uses the existing chart component and data from `transactions` grouped by day or month.

## Open question
Your message ended at "and also". What was the last thing you wanted added?
