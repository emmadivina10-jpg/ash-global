# ASH Logistics — End-to-end verification plan

Status: isolated database journeys PASS (70/70). Live-screen journeys BLOCKED until separately authorised (they need real delivery records).
Scope excludes payments, wallets, Stripe, Mobile Money, TchokoPay and referrals — none are called by any step below.

## Two layers

| Layer | Where | Creates production records? | Status |
|---|---|---|---|
| A. Isolated database journeys | PGlite copy of the live delivery rules (`tests/dispatch-*.test.ts`) | No | 70/70 pass |
| B. Live-screen journeys | Preview app, signed in as dedicated test identities | Yes — delivery rows (no money) | Awaiting approval |

## Test identities for layer B (to create only after approval)

Five dedicated accounts, emails `qa+customer|vendor|rider1|rider2|ops@ashglogroup.company` (or similar), marked as test accounts and excluded from member metrics:

- **QA Customer** — ordinary member.
- **QA Vendor** — owns one test provider profile (no services listed publicly).
- **QA Rider 1** — independent rider, verified by staff.
- **QA Rider 2** — invited into QA Vendor's team, verified.
- **QA Ops** — admin role (logistics staff).

Clean-up after the run: cancel/complete all QA deliveries, remove QA rider documents from private storage, remove the five accounts (on request). Live positions are erased automatically when deliveries end.

## Scenarios

| # | Scenario | Steps | Expected | Layer A | Layer B |
|---|---|---|---|---|---|
| 1 | Customer request | Customer opens shop → Request delivery → addresses | Request appears for customer and shop only; stranger sees nothing | PASS | Pending |
| 2 | Fee + approval | Shop sets fee → customer approves exact fee; shop changes fee | Assignment blocked until approval; changing fee clears approval | PASS | Pending |
| 3 | ASH Dispatch assignment | Ops assigns Rider 1 | Only verified, active, available riders assignable; one live rider per delivery | PASS | Pending |
| 4 | Shop-owned rider | Shop invites Rider 2 → rider redeems → shop assigns | Other shops cannot assign; invite single-use, hash unreadable | PASS | Pending |
| 5 | Accept + pickup | Rider accepts → "I picked up" → "Start delivery" | Offline/suspended rider refused at accept; decline always allowed | PASS | Pending |
| 6 | Live GPS sharing | Rider taps "Share my live location" with screen open | Only assigned rider, only active delivery, coordinates validated | PASS | Pending (needs real phone GPS) |
| 7 | Map visibility | Customer, shop, Ops open delivery | All three see map; stranger, other shop, other rider, visitor see nothing; table unreadable directly | PASS | Pending |
| 8 | Handover code | Customer shows 6-digit code → rider enters | Wrong code counted; 5 tries lock; 30-min expiry; no replay | PASS | Pending |
| 9 | Completion + erase | Rider completes with code | Status Delivered; position deleted; further sharing refused | PASS | Pending |
| 10 | Self-pickup | Customer chooses self pickup → shop enters code | No rider can be assigned; no map; completes by code | PASS | Pending |
| 11 | Cancellation | Customer cancels before transit | Position deleted; cancel refused once in transit | PASS | Pending |
| 12 | Reassignment | Rider 1 declines → Ops assigns Rider 2 | Rider 1 can no longer send or see position; rider change erases position | PASS | Pending |
| 13 | Tracking limitation notice | Rider views active delivery (EN + FR) | Notice says: only this customer/shop/ASH ops, only this delivery, only while screen open, stops on lock/leave, erased at end | Copy reviewed | Pending (visual) |

## Already verified in this preview
- All four logistics screens open signed in on a phone-size screen with no page errors (no delivery records needed).
- Limitation notice copy exists in English and French on the rider's active-delivery card; the customer's empty map explains the rider must keep the screen open; positions older than 3 minutes warn the rider may have closed the app.

## Remaining blockers before production release
1. Layer B needs approval to create QA identities and test delivery records in production (no money involved).
2. Real-device GPS check (Android Chrome + iOS Safari) — requires a person with a phone during layer B.
3. Concurrency is protected by database locks and a unique index; isolated tests cannot run truly parallel requests.
4. Browser sharing stops in the background — by design until the native ASH Rider app exists.
