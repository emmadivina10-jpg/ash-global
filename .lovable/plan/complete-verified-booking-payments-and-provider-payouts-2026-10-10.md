# Complete verified booking payments and provider payouts

## Audit findings
- The existing Marketplace Stripe account is Canadian, with CAD as its default currency. Charges, payouts and transfers are enabled. Automatic bank payouts remain weekly on Tuesdays with a three-day delay.
- No connected-provider accounts exist in Stripe or ASH's provider records. Express onboarding code exists, but is not verified end-to-end.
- The connected TD Marketplace account has only the existing Replit webhook. It has no webhook registered for ASH's `/api/public/webhooks/stripe` address. The ASH endpoint is reachable and rejects unsigned requests, but this does not establish that its saved signing secret belongs to the TD account.
- The three Marketplace credential names are present. No Flights credential names are present. Keep the two accounts separate; do not create another integration or replace keys.
- The active booking commission is 15%; calculation tests confirm 10,000 XAF → 1,500 XAF ASH commission + 8,500 XAF provider payable. Payment-link fees remain separate at 1%.
- Service code verification currently marks the booking completed and credits an internal wallet. It does not initiate a Stripe transfer. The existing Stripe transfer helper has no callers; a wallet credit is not evidence of a transfer or bank payout.
- Webhook replay checking is not protected by a unique event constraint. Settlement ignores business-level rejection returned by database functions and some record-write errors. The card-return path can confirm payment without a webhook and bypass the central settlement helper.
- Card bookings currently charge USD using a fixed XAF conversion. Provider transfers must use an explicitly recorded supported currency and amount, not submit XAF or silently convert a wallet balance.
- Existing local payouts use TchokoPay's Cameroon MTN/Orange flow, with a stored provider reference and signed final-result handling. Other countries and payout methods are not established by that implementation.

## Proposed completion
1. **Verified payment records:** route Stripe booking confirmation through the verified webhook and central settlement path. Check saved session, payment intent, account, amount and currency before confirming; never show success from a return-page visit alone.
2. **Commission and pending payable:** preserve paid bookings' saved rates and authorized exceptions. Save the 15%/85% split for standard bookings at payment. Keep provider funds pending until the existing service-completion and private-code requirements are satisfied.
3. **Provider eligibility:** use the existing Marketplace Express onboarding, validate actual provider country, transfer capability and payout readiness. Protect provider-account mappings from member edits and serialize account creation to avoid duplicates.
4. **Durable release workflow:** create one secured transfer record per booking with immutable amount, currency, destination, Marketplace account and source charge. Only a server-validated completed booking with successful verified payment and no dispute/refund hold can become eligible.
5. **Real transfer execution:** after eligibility, submit the supported Stripe transfer with a stable idempotency key and source-charge association when supported. Persist Stripe's actual transfer ID and response; recover ambiguous requests by reconciliation rather than issuing a fresh payment. Initially keep live execution disabled until explicitly authorized.
6. **Transfer versus payout:** report separately the payable, transfer into a connected Stripe balance, and payout to the provider's bank. Account updates, transfer reversals and payout events must be verified and reconciled against the correct account and provider; failures remain exceptions, not fake success.
7. **Local payout fallback:** unsupported Stripe destinations remain unpaid until an explicitly supported local payout rail is chosen. Use TchokoPay only for destinations the gateway actually supports, confirm its available real funds, reserve the payable once and mark payout completed only after its verified final result. Stripe collections do not automatically fund TchokoPay; cross-rail funding/FX needs an approved process.
8. **Documentation and checks:** align payment and finance wording with actual recorded stages. Test commission, eligibility, duplicate and concurrent events, retries, refunds, account isolation, destination/currency rejection and failed payouts without real financial transactions.

## Approval boundaries
- No real charges, transfers, connected-account creation, webhook changes, payout-schedule changes or changes to existing financial records during verification.
- The database is shared with production. Approve schema/function changes separately before applying them; preview code alone cannot safely isolate those changes.
- Repair the missing TD Marketplace webhook only with approval. Reuse ASH's existing endpoint and inspect any existing ASH destination on the other account before editing; leave the unrelated Replit webhook untouched.
- Automatic platform bank payouts can reduce the balance available for delayed transfers. Audit pending liabilities and source-charge funding first; do not switch to manual payouts blindly.
- Canadian connected-bank destinations are the initial supported path, subject to Stripe account capability checks. Cameroon/Nigeria mobile-money payouts are not established Stripe Connect destinations for this Canadian platform. Broader cross-border support must be confirmed with Stripe for this account, not inferred from global country lists.

## Technical implementation
- Preserve TanStack server routes, `settleCollection`, existing authentication, MTN/Orange flows and payment-link accounting.
- Add service-only durable webhook/release records with unique account/event and booking/release keys, row locks, explicit grants and deny-all member access. Keep privileged clients inside verified handlers.
- Use server-only Marketplace credentials, never Flights credentials, for booking transfers. Fail closed on missing live configuration, unknown currency or destination capability.
- Use an authorized dispatcher/reconciliation path for persistent jobs; no in-memory locks or client-side release authority.
- Expand existing unit tests and add rollback-only database tests where safe; no synthetic successful transactions or wallet balances in production.