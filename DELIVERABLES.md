# Deliverables — ASH Glo

A complete inventory of what has been built. See [DOCS-INDEX.md](./DOCS-INDEX.md) for navigation.

## 1. Member app

| Surface | Route | Notes |
| --- | --- | --- |
| Landing page | `/` | Bilingual (EN/FR), light/dark, marketplace-first hero |
| Privacy policy | `/privacy` | Public, store-submission ready |
| Auth | `/login`, `/register`, `/forgot-password`, `/reset-password` | Email + Google + Apple, password visibility toggle, fully translated |
| Marketplace | `/services`, `/services/$providerId` | Location-first discovery, categories, portfolio media, reviews |
| Bookings | `/bookings` | Full lifecycle with 24h pay-after-acceptance window |
| Messages | `/messages` | Order-centric inbox, realtime + polling fallback |
| Earnings | `/dashboard`, `/network` | 3-level referral ledger, collapsible network tree |
| Wallet | `/wallet`, `/transactions`, `/withdraw` | Balances, statements, MoMo and Stripe bank payouts |
| Provider Studio | `/studio` | Services, portfolio uploads, slots, storefront, payment links |
| Storefront / pay links | `/s/$slug`, `/pay/$code` | Public, rate-limited |
| Settings | `/settings` | Privacy summary, account deletion request |

## 2. Admin (ASH Console)

Password-gated console at `/console`: financials with safe-to-withdraw calculation, users, providers and
verification, bookings, withdrawals review, payments, referral ledger, deletion requests, security events.

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
  and OS-level delivery (Capacitor local notifications on native, Notification API on web).

## 5. Payments

- TchokoPay Mobile Money (MTN MoMo, Orange Money) for Cameroon.
- Stripe for international card payments; Stripe Connect for bank payouts.
- 1% platform commission on paid bookings (2% in high-fee markets).

## 6. Native app (Capacitor)

- `capacitor.config.ts` (app ID `com.ashglogroup.mobile (iOS) · com.ashglogroup.app (Android)`, app name ASH Glo).
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

App icon and splash, iOS 6.7" and Android screenshots (public + in-app), store listing copy (EN/FR),
30-second preview video script, and the privacy policy source document.
