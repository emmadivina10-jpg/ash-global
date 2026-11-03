# ASH Logistics — physical-device location checklist

One Android phone (Chrome) + one iPhone (Safari). Uses the preview link, five temporary QA accounts and one test delivery per phone; all removed afterwards with the same clean-up as the 61/61 run. No payments.

## Before starting
- Agent creates QA accounts (customer, shop, rider-Android, rider-iPhone, staff), verifies both riders, and creates one ASH Dispatch test delivery per rider, already accepted.
- Tester signs in on each phone as the rider (sign-in details given privately, never in chat). A second device or laptop is signed in as the QA customer.
- Phones: location services ON, battery saver OFF, latest Chrome / iOS Safari.

## Steps (repeat on each phone)
| # | Action | Expected | Record |
|---|---|---|---|
| 1 | Open Menu → ASH Rider, find the delivery | Card shows the limitation notice (EN), then switch language to FR and check the notice | Pass/fail, screenshot |
| 2 | Tap "Share my live location" | Browser asks for location permission | Exact prompt wording |
| 3 | Choose **Allow while using** (iPhone) / **Allow** (Android) | "Sharing — keep this screen open" appears | |
| 4 | On the customer device open My deliveries | Map shows rider within ~20 s; "updated just now" | Delay in seconds, accuracy vs real spot |
| 5 | Walk ~100 m with screen open | Customer map moves within ~20 s | |
| 6 | Lock the phone 3 min, then unlock | Customer map stops moving; after 3 min shows "rider may have closed the app"; resumes after unlock + screen open | Did it resume automatically? |
| 7 | Switch to another app 1 min, return | Same as 6 | |
| 8 | Tap "Stop sharing" | Customer map shows the "appears here while…" message | |
| 9 | Deny permission: browser site settings → Location → Block, reload, tap Share | Red "permission was refused" message; no position | |
| 10 | Re-allow, share again, then progress: picked up → start delivery → enter customer's code | Delivery completes; customer map disappears | |
| 11 | Agent checks backend | No stored position for that delivery | |

## Known browser limits to note
- iPhone Safari: no sharing when locked/backgrounded; permission may be asked again after each reload; "Precise location" off gives ~km accuracy.
- Android Chrome: sharing stops when the tab is backgrounded or screen off; battery saver can delay positions.
- Both: must use the https preview/published link (location is blocked on plain http).

## After testing
Agent removes all QA accounts, deliveries, documents and files and compares the before/after snapshot (profiles, wallets, balances, bookings, transactions, payments, referrals, shops, roles must be identical).
