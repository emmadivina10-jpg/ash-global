# ASH Glo Stripe Marketplace — preparation review

Reviewed 2026-10-10 UTC. Proposal only; no production migration, Stripe configuration change, onboarding, transfer or publish authorized or performed.

## Isolation outcome

A separate draft named **Stripe safeguards isolated review** was created. Its agent positively checked app and database-tool identity and found both still target the shared production backend. It stopped without applying safeguards or creating validation records. The draft remains unaccepted and unpublished. There is no validated isolated backend in this environment.

Application fixture tests are isolated and explicitly forbid network access. They are not a substitute for applying and testing the SQL against a separate backend with the actual existing functions and triggers.

## Account and webhook proposal

Read-only Stripe identity: ASH Glo, `acct_1U3ozTBQjimtCBr2`, previously confirmed TD-linked. The current endpoint list contains only the enabled LIVE Replit endpoint; no ASH TD destination is present. This does not establish what exists on CIBC, which was not inspected.

Proposed URL: `https://ashglogroup.company/api/public/webhooks/stripe`

Source: TD Marketplace platform / your account. Do not subscribe connected-provider events as part of this change.

Exactly 11 selections:

1. `checkout.session.completed`
2. `checkout.session.async_payment_succeeded`
3. `checkout.session.async_payment_failed`
4. `checkout.session.expired`
5. `charge.refunded`
6. `transfer.created`
7. `transfer.updated`
8. `transfer.reversed`
9. `charge.dispute.created`
10. `charge.dispute.updated`
11. `charge.dispute.closed`

Preserve Replit endpoint `https://style-book-ontario.replit.app/api/stripe/webhook`, enabled LIVE, API version `2026-07-29.dahlia`, and its existing events: `checkout.session.completed`, `checkout.session.expired`, `payment_intent.payment_failed`, `payment_intent.canceled`, `account.updated`, `payment_intent.processing`, `payment_intent.requires_action`, `payment_intent.succeeded`. Do not edit its secret or destination.

API version for ASH remains an explicit review item; event fixture tests are not Stripe API-version compatibility evidence. Reuse an ASH destination if a further account-scoped check finds one; create one only if absent after approval.

## Signing-secret association

Secure secret-name listing confirms `STRIPE_WEBHOOK_SECRET` exists; no values were retrieved or printed. ASH verifies the raw body using Stripe's v1 HMAC-SHA256 signature and a 300-second tolerance before processing.

Association to the TD destination is **unverified**. No ASH destination currently exists in the inspected TD endpoint list, and Stripe GET endpoint responses do not reveal signing secrets. Algorithm tests use an isolated fixture secret, not a real credential, and do not verify the stored credential's provenance. No replacement was made or requested.

After separately approved configuration and deployment readiness, a genuine TD delivery to ASH must pass signature verification using the saved secret. If it fails, secure correction of only `STRIPE_WEBHOOK_SECRET` requires explicit approval. Do not replace either Marketplace API key or reuse Replit's secret. Connected-account destinations may need a different signing secret and handler support; deferred.

## Proposed migration

The attached SQL is the existing `stripe-booking-release.sql`, unchanged and **not approved for production execution**. It proposes:

- Four service-only tables with explicit grants and RLS: marketplace controls, durable webhook inbox, booking release ledger, connected bank payout records.
- Atomic registration of a verified Stripe booking and pending provider share; source session/intent/charge evidence and unique release identifiers.
- Booking-row/release-row locking, stable transfer idempotency key, claim and finish operations, holds on refunds/disputes.
- Server-owned provider mapping and verification/transfer evidence update guards.
- Stripe-only replacement of completion wallet behavior; the local MTN/Orange completion path is retained.
- Onboarding and transfer controls default false; no account binding or historical financial repair is seeded.

### Review findings / production blockers

1. Requires existing booking/profile columns, `complete_booking_payment`, `charge_platform_commission`, verification-code functions/triggers and their dependencies. Read-only inspection found these existing functions, but isolated application/concurrency remains untested.
2. SQL currently uses nullable comparisons such as `<>`, `NOT LIKE` and `NOT IN` for some evidence. A hardened revision needs explicit required-key/null rejection and missing-field tests before production approval.
3. Mapping/evidence guards cover UPDATE only. INSERT paths, existing grants/policies, ownership and SECURITY DEFINER execution context need isolated security validation; source review alone cannot establish them.
4. `register_verified_stripe_booking` currently accepts any saved rate from zero to below one. Validate against the 12%/15% policy and explicitly authorized exceptions; do not change paid historical records. Existing campus commission rules need separate confirmation rather than silent changes.
5. Read-only inspection found legacy completion records/messages still use XAF and legacy commission labels. The new release ledger uses actual CAD/USD minor units; currency/accounting correspondence and rounding must be validated, not inferred from wallet amounts.
6. Confirm hold-before-registration, hold-during-submit and late/repeated event behavior against the actual database. Handler tests verify calls and responses, not concurrent transactions or actual money movement.
7. `reconcileRelease` can return TRANSFERRED while the SQL finish operation preserves an existing HELD state. Reconcile return values must be aligned with persisted hold state before approval. Reversal monotonicity also needs SQL replay testing.
8. Fail/cancel settlement branches in the central settlement helper do not currently check every downstream RPC error. Add fail/retry tests before claiming end-to-end processing success.
9. Trigger replacement changes shared production behavior even without backfilling financial rows. It therefore requires separate production approval, a pre-change schema snapshot and a reviewed restoration strategy.

These are review items, not production fixes applied in this phase. The proposal must not be applied byte-for-byte until a revised candidate is isolated-tested and explicitly approved.

## Tests executed

Full suite: **175 passed across 15 files**.

Focused payment suite: **69 passed across five files**:

- Existing signature verification: 4 tests, including valid fixture signature, tampered body, stale timestamp, missing signature.
- Existing commission calculations: 6 tests.
- Existing release policy: 31 tests.
- New Marketplace handler: 18 tests, covering all 11 selected events, processed replay, missing-schema failure, settlement/reconciliation retry, non-live rejection, Flights reference exclusion and wrong account.
- New transfer reconciliation: 10 tests, covering actual ID recording, partial reversal, destination/amount/currency/source mismatch, absent/multiple transfer ambiguity, failed persistence and disabled live gates.

New tests use isolated fixtures; production server modules are not changed. Network is explicitly blocked in both new suites. Full-suite anonymous access checks are existing rejection checks, not financial writes.

**Not run:** SQL installation, real transaction concurrency, actual authenticated RLS/write tests, genuine Stripe-signed delivery, provider onboarding, transfers, refunds/disputes or final bank payout. No real payment success is asserted.

## Production migration plan for later approval

1. Provision a separately isolated backend; prove both app runtime and database tools target it before any schema or fixture write.
2. Capture existing function/trigger/grant definitions and dependency inventory, without exporting private financial rows.
3. Resolve the review findings in the staged candidate and add SQL regression tests.
4. Apply the candidate using the migration tool only to the proven isolated backend, with both controls off and no production credentials/events attached.
5. Validate atomic registration, concurrent duplicate events/claims, code authorization, hold races, monotonic reconciliation, RLS and local payment regression. Preserve paid-booking rates and payment-link 1% rules.
6. Return the exact revised SQL and isolation test evidence for separate owner production approval. Take a schema snapshot and agree maintenance/recovery steps.
7. After production approval only, apply reviewed schema, bind TD with controls false, and separately approve deployment of the expanded handler.
8. Separately approve TD destination correction and secure signing-secret alignment; preserve Replit. Genuine delivery verification is a separate gated check.
9. Onboarding, connected-account event delivery, payout destinations and any change to TD payout schedule remain separate approvals. Live transfers stay disabled until all evidence is accepted and explicit activation is granted.

## Remaining approval requirements

- Provision a genuinely separate validation backend; the created draft is not isolated.
- Review a hardened/retested SQL candidate before any shared production change.
- Approve the exact TD platform endpoint configuration and API version, then secure secret correction only if proven necessary.
- Separately approve publishing, onboarding, connected-account webhook handling and eventual transfer activation.

No LIVE destination, credential, bank setting, production policy, financial record or execution gate was changed.