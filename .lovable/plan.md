# Add Bank and Card (Stripe Live) payments alongside MTN and Orange

MTN Mobile Money and Orange Money stay exactly as they are. Bank and Card are added next to them for wallet top-ups, payment links and bookings.

## What users will see

One "Choose payment method" picker, shown in the same ASH style:

```text
MTN Mobile Money   (existing flow, unchanged)
Orange Money       (existing flow, unchanged)
Bank               (new)
Card / Stripe      (new)
```

- **Wallet**: a new "Add money" button (the wallet has no top-up today). The balance goes up only after the payment is confirmed.
- **Payment links**: payers can pick Card or Bank as well as Mobile Money.
- **Bookings**: the existing card checkout moves into the same picker, and Bank is added.
- If a payment fails or is cancelled, a "Choose another method" button takes the payer back to the picker.

### Bank flow
- Shows only bank details that Finance has entered and verified in the console. Nothing is hardcoded.
- If no details are set up, it shows: "Bank transfer is currently unavailable. Please choose another payment method."
- The payer gets a unique ASH reference to include with the transfer. The payment is saved as PENDING.
- Finance staff confirm the payment in the console by entering the bank's reference. Only then does it become SUCCESS and the wallet, link or booking gets settled. The audit trail records who confirmed it, when, the bank reference and the transaction ID.

### Card flow
- Uses a secure Stripe Live checkout page. Success comes only from Stripe's signed webhook or a check the server makes with Stripe. What the browser reports is never trusted.

## Finance console
- The Finance and Payments pages get filters for MTN, Orange, Bank and Stripe, plus totals for successful, pending, failed and refunded payments. Each row shows the reference, method, provider, reconciliation status, amount and currency.
- A new Bank details section where Finance can enter and verify the bank details.
- A "Pending bank transfers" queue with confirm and reject buttons.

## Technical details
- **Central ledger**: a new append-safe `payment_transactions` table with id, user_id, amount, currency, method (MTN|ORANGE|BANK|CARD), provider (TCHOKOPAY|STRIPE|BANK), provider_reference, purpose (WALLET_TOPUP|PAYMENT_LINK|BOOKING|ACTIVATION), purpose_ref, status (PENDING|PROCESSING|SUCCESS|FAILED|CANCELLED|REFUNDED|EXPIRED), reconciliation_status, created_at and completed_at. It also has unique constraints on (provider, provider_reference) and on the ASH reference. Access is service-role only, deny-all for others. Users read their own rows through a server function.
- **TchokoPay**: existing tables, RPCs and the webhook stay as they are. The settlement step also writes or updates a matching ledger row so dashboards have one source. No MTN or Orange code paths are removed.
- **Settle exactly once**: a SECURITY DEFINER `settle_payment_transaction(id, provider_status, ...)` locks the row and moves it from a non-final status to SUCCESS. It credits the wallet (via `transactions` and `wallets`) or calls the existing `complete_booking_payment` / `complete_link_payment` only on that change. Repeat events do nothing.
- **Stripe**: extend `stripe.server.ts` with Checkout sessions in XAF (Stripe treats XAF as a zero-decimal currency) and add webhook signature checking with Web Crypto HMAC. New route `/api/public/webhooks/stripe` handles `checkout.session.completed`, `checkout.session.async_payment_succeeded`/`failed`, `checkout.session.expired` and `charge.refunded`. Processed event ids are kept in `payment_events` for idempotency.
- **Bank**: `bank_accounts_config` table (Finance-managed, has a verified flag) and `bank.functions.ts` (create pending, list pending, confirm or reject behind `requireDepartment("FINANCE")` or CEO). Writes go to `admin_audit_log`.
- **Files**: new `PaymentMethodPicker.tsx`, `payments-ledger.functions.ts`, `bank.functions.ts`, `routes/api/public/webhooks/stripe.ts` and the wallet top-up dialog. Edited: `wallet.tsx`, `pay.$code.tsx`, the bookings payment step, `storefront.functions.ts`, `booking.functions.ts`, `payment-settlement.server.ts`, `console.finance.tsx` and `console.payments.tsx`.
- **Secrets**: `STRIPE_SECRET_KEY` is already set (I'll check that it's a live key). `STRIPE_WEBHOOK_SECRET` will be requested after the webhook endpoint exists. Card checkout runs on Stripe's hosted page, so no publishable key is needed.

## Manual steps for you
1. Add the webhook URL `https://ashglogroup.company/api/public/webhooks/stripe` in Stripe and paste its signing secret into the secure form.
2. Enter the real bank details in the console.
3. Publishing is only needed for the webhook to receive live events. I won't publish unless you ask.
