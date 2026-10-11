# Deliverables — ASH Glo

Inventory of code and historical work, reviewed 11 October 2026; not confirmation of publication, signed artifacts or store approval. See STORE-READINESS.md for blockers. See [DOCS-INDEX.md](./DOCS-INDEX.md) for navigation.

## 1. Member app

| Surface | Route | Notes |
| --- | --- | --- |
| Landing page | `/` | Bilingual EN/FR, light/dark, ASH/green branding and transparent green watermark; separate feature titles and descriptions |
| Privacy policy | `/privacy` | Public policy route; release/billing/deletion checks remain |
| Auth | `/login`, `/register`, `/forgot-password`, `/reset-password` | Existing email/social sign-in controls, password visibility; current Terms and profile-photo onboarding; hosted-provider settings need release testing |
| Marketplace | `/services`, `/services/$providerId` | Location-first discovery, categories, portfolio media, reviews |
| Bookings | `/bookings` | Full lifecycle with 24h pay-after-acceptance window |
| Messages | `/messages` | Order-centric inbox, realtime + polling fallback |
| Earnings | `/dashboard`, `/network` | 3-level referral ledger, collapsible network tree |
| Wallet | `/wallet`, `/transactions`, `/withdraw` | Currency dropdown, actual settlement balances and Money flow; matching-rail, eligibility-gated withdrawals |
| Provider Studio | `/studio` | Services, portfolio uploads, slots, storefront, payment links |
| Storefront / pay links | `/s/$slug`, `/pay/$code` | Public, rate-limited |
| Settings | `/settings` | Privacy summary, account deletion request |
| Market / Extras | `/services`, `/services/extras` | Default Market mode, Services switching, additional products and external partner links |
| Flights | `/flights` | Coming soon; no flight booking or payment is enabled |
| Electricity | `/electricity` | Coming soon; provider integration is unavailable |
| Identity review | `/safety-review`, staff Reports | Red Denied, durable attempts, fourth-attempt ban/logout, admin/Trust-only restoration; exact JPG/PNG copy detection |

## 2. Admin (ASH Console)

Password-gated console at `/console`: financials with safe-to-withdraw calculation, users, providers and
verification, bookings, withdrawals review, payments, referral ledger, deletion requests, security events.

Dashboard colours share the ASH/green palette while retaining scoped themes and departmental workflows. Employee workspace, support, cases, inventory, expansion and shareholder tools use their existing app records. Verified-badge tools use the staff Trust/CEO session rather than requiring a second member-admin sign-in.

## 3. Backend (Lovable Cloud / Supabase)

- Tables for profiles, wallets, transactions, referrals, activations, withdrawals, bookings, services,
  portfolio, conversations, messages, reviews, payment links and charges, subscriptions, notifications,
  push tokens, roles, audit and security logs, rate-limit counters.
- Row-level security on every table; roles stored in a separate `user_roles` table with a
  `has_role()` security-definer check.
- Triggers that create notifications for: new messages, new/updated bookings, community reviews,
  **withdrawal approved/paid/declined**, **account activation verified**, **referral commission earned**.
- Payment webhooks with signature verification, plus `/api/public/reconcile-activations` and
  `/api/public/security-selfcheck`.

## 4. Notifications & push

- In-app notification bell with realtime feed and read state.
- `push_tokens` table storing each member's device token (iOS / Android / web).
- `src/lib/push.ts` + `PushBridge`: permission request, device registration, deep links per category,
  and category routing. Native OS remote delivery owns phone banners; duplicate local/in-app banners are removed. Closed-app sender photos/remote configuration remain release checks.

## 5. Payments

- TchokoPay Mobile Money (MTN MoMo, Orange Money) for Cameroon.
- Stripe card collections verified against provider evidence; MTN/Orange are Cameroon/XAF only. M-PESA is not integrated. Conditional bank collections require Finance receipt confirmation.
- 15% booking commission by default (CEO/Finance can switch between 12% and 15% in Console → Commission); each booking keeps the rate it was paid at. Payment links keep a 1% fee.
- Rates and eligibility are determined by the existing category/region/payment flow; this line is not a universal fee for ASH Clean, Campus or every region.
- Automatic Stripe provider transfers are helper-disabled; onboarding is helper-enabled but saved-control/approved-provider/Stripe gated. Safeguards and release tables are represented by current migrations. Collection, held payable, wallet credit, transfer and bank receipt remain distinct; no current account inventory or end-to-end real-money payout was verified in this audit. The existing Marketplace webhook route must be checked for hosted delivery; do not repeat older “missing webhook/no providers” claims as current facts.
- Audit on 5 October 2026: 136 wallets, 51 ledger transactions, no stored-versus-ledger balance mismatches, no duplicate transaction reference/type pairs; nine completed and nine failed withdrawal records. No money was moved and no provider payout was tested in this review.

## 6. Native app (Capacitor)

- `capacitor.config.ts` (iOS bundle ID `com.ashglogroup.mobile`, Android package `com.ashglogroup.app`, app name ASH Glo).
- Offline bootstrap page in `native/www`, status bar + hardware back handling, safe-area CSS.
- `resources/icon.png` (1024×1024) and `resources/splash.png` (2732×2732) sources.
- Full build and submission checklist in [NATIVE.md](./NATIVE.md).

## 7. Security

- `SECURITY.md`, `SECURITY-CHANGELOG.md`.
- `security_events` audit log and `rate_limit_hits` throttling with `guardPublicRequest`.
- Anonymous-access RLS regression suite and a daily CI self-check.

## 8. Tests

| Suite | Focus |
| --- | --- |
| `tests/format.test.ts` | Currency, dates, phone rules, referral links, commission constants |
| `tests/region.test.ts` | Referral/mobile-money gating, platform take rate, country metadata |
| `tests/booking.test.ts` | Booking lifecycle, labels in EN/FR, tones, payment countdowns |
| `tests/marketplace.test.ts` | Commission maths, category integrity, subscription state |
| `tests/taxonomy.test.ts` | Discovery groups and bilingual category labels |
| `tests/location.test.ts` | Nearest-city resolution for location-first discovery |
| `tests/push.test.ts` | Push categories and notification deep links |
| `tests/rls-anonymous-access.test.ts` | Live anonymous access regression (needs project secrets) |

Run `bun run test` for everything, `bun run test:unit` for the offline suites.

## 9. Store collateral (in `/mnt/documents`)

Historical icon/splash, screenshots, copy and policy exports are dated snapshots, not current release evidence. Use canonical public policies and STORE-SUBMISSION.md/STORE-READINESS.md; re-record screenshots after approved publication. No new Files export was requested or created in this audit.
