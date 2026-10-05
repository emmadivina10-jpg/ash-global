# ASH — Where Opportunities Connect.

ASH is a digital opportunity, commerce, services, freelance, community, and events
platform that connects people, businesses, freelancers, service providers,
communities, and event organizers in one ecosystem.

Built for the Cameroon and Nigeria markets first — with international support —
ASH is a mobile-first, bilingual (EN/FR) web application covering service
bookings, property, freelance, deals, events, referral earnings, chat, payments,
an AI assistant, and an admin workforce console. The same codebase ships as
native iOS and Android apps via Capacitor.

---

## What the system includes

| Pillar | What it does | Main routes |
| --- | --- | --- |
| **ASH Marketplace** | Book verified service providers (braiders, barbers, nail/lash techs, electricians, nurses…). Provider portfolios, galleries, reviews, booking slots, verification badges. | `/services`, `/services/$providerId`, `/studio`, `/s/$slug`, `/pay/$code` |
| **ASH Property** | Student housing, rentals, sales and land. Location-first search, image galleries, saves, viewing requests, owner messaging, verification, fraud protection, reviews, promotions. | `/property`, `/property/$listingId`, `/property/manage`, `/property/new` |
| **Freelance** | Projects, proposals and gig discovery for freelancers and clients. | `/freelance`, `/freelance/$projectId` |
| **Deals & Promotions** | Discount deals with claim codes, ASH Promote for sellers. | `/deals` |
| **Events & Ticketing** | Event pages, free and paid tickets, mobile-money entry codes. | `/events`, `/events/$eventId` |
| **Refer & Earn** | 3-level referral commissions with a collapsible network tree and full ledger (live in CM/NG). | `/dashboard`, `/network` |
| **Wallet & Payouts** | Balances, statements and supported Mobile Money withdrawals. | `/wallet`, `/transactions`, `/withdraw` |
| **Bookings & Messaging** | Full booking lifecycle with a 24h pay-after-acceptance window; order-centric chat with realtime + polling fallback. | `/bookings`, `/messages` |
| **Universal Search** | One search across services, businesses, freelancers, projects, property, deals and events. | `/search` |
| **Analytics** | Personal and business analytics dashboards. | `/analytics` |
| **ASH AI** | Branded AI assistant with marketplace, property and platform context. | `/assistant` |
| **ASH Console (admin)** | Password-gated admin suite: financials, users, providers, verification, bookings, withdrawals, payments, referral ledger, moderation, property review, security audit. Department-scoped staff seats. | `/console*` |
| **Workforce & CRM** | Employee logins, department access control, CRM leads/activities/targets, branded bilingual outreach. CEO super-admin: Emmanuel Tanga Divine. | `/console/staff`, `/console/outreach`, `/console/security`… |

Public legal pages: `/terms`, `/privacy`, `/community-guidelines`, `/marketplace-policy`, `/referral-wallet-terms`, `/account-deletion`, `/support`, `/contact`.
Auth: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/auth/callback`.

## Core experience

- **First visit and onboarding** — signed-out browser visitors see `/`; sign-up/sign-in and any required email confirmation lead through current Terms acceptance and a profile photo, then `/feed`. Terms acceptance is versioned.
- **Mobile tabs** — Feed, Market/Services, Flights, Messages and Menu. Market is the default Services mode; Extras is `/services/extras`. Wallet remains the floating launcher and is also reachable from Menu/desktop navigation.
- **Availability** — Flights and Electricity are coming soon; neither is a live ticket/bill payment service. TchokoPay in Extras is an external partner link, separate from ASH’s integrated Mobile Money flows.
- **Identity protection** — normalized verified-name reuse and exact JPG/PNG file/pixel copies trigger a red Denied screen, access restriction and a fourth-attempt ban/sign-out. Only authorized admin/Trust staff restore identity access; cropped/edited-photo similarity detection is not implemented.

- **Bilingual by default** — English and French, switchable in-app.
- **Dark & light themes** — ASH magenta/violet and subtle green branding on member screens, entry screens and scoped staff dashboards.
- **Region-aware** — referral earnings and Mobile Money are gated per country (CM/NG referrals, CM mobile money, 1% platform fee, 2% in high-fee markets).
- **Fast navigation** — intent preloading and query caching keep tab switches instant.
- **Notifications & push** — in-app notification bell plus device push with vibration and numeric app badges on installed iOS/Android apps.
- **Public storefronts & payment links** — providers share `/s/$slug` storefronts and `/pay/$code` payment links; both are rate-limited.

## Tech stack

- **Frontend / framework**: TanStack Start v1 (React 19, Vite, TypeScript), TanStack Router + React Query
- **Styling**: Tailwind CSS v4 with OKLCH design tokens (shadcn-style component system)
- **Backend / auth / storage**: Lovable Cloud (Supabase) — Postgres, Row-Level Security, Auth, Storage
- **Payments**: TchokoPay for supported Mobile Money flows; any additional checkout method is presented in its relevant flow
- **Emails**: React Email templates for auth, invites, support and outreach
- **Native shell**: Capacitor 8 (iOS `com.ashglogroup.mobile`, Android `com.ashglogroup.app`)

## Architecture

```
src/
├── routes/                 File-based routes (TanStack Router)
│   ├── _authenticated/     Signed-in app (marketplace, property, wallet, studio…)
│   ├── console.*           Admin console (department-scoped)
│   └── api/public/         Webhooks & cron (TchokoPay, reconcile, security self-check)
├── components/refer/       Product components (shell, cards, chat, notifications, push)
├── components/console/     Admin components (work board, etc.)
├── lib/                    Domain logic
│   ├── *.functions.ts      Typed server functions (client → server RPC)
│   ├── *.server.ts         Server-only helpers (payments, settlement, rate limiting)
│   ├── *.queries.ts        Browser-safe data queries
│   └── email-templates/    React Email templates
├── integrations/supabase/  Generated backend clients — do not edit
├── hooks/                  Shared hooks
└── assets/                 Images
supabase/migrations/        Ordered SQL migrations (schema, RLS, triggers, functions)
tests/                      Vitest suites (unit + live RLS regression)
native/ resources/          Native shell, icons, splash sources
ios/ android/               Committed Capacitor projects
```

Server-side logic lives in typed server functions (`createServerFn`) called
from components — no separate API layer is needed for app-internal work.
External HTTP endpoints (webhooks, cron, public APIs) are TanStack server
routes under `src/routes/api/public/*`, which bypass site auth and therefore
verify callers themselves (e.g. HMAC-SHA256 webhook signatures).

## Backend model

- Postgres tables for profiles, wallets, transactions, referrals, activations,
  withdrawals, bookings, services, portfolio, property listings, conversations,
  messages, reviews, payment links and charges, subscriptions, notifications,
  push tokens, staff accounts, CRM, roles, audit and security logs, rate-limit counters.
- **Row-Level Security on every table.** Roles live in a separate `user_roles`
  table checked through a `has_role()` SECURITY DEFINER function — never on the
  profile row.
- Triggers create notifications for new messages, bookings, reviews, withdrawal
  status changes, activation verification and referral commissions.
- Payment webhooks verify TchokoPay signatures; `/api/public/reconcile-activations`
  reconciles activation payments; `/api/public/security-selfcheck` runs a
  database integrity self-check. Daily CI runs the same checks.

Finance and Shareholders reuse the same read-only ledger. Finance source reads are paginated so totals and wallet reconciliation do not silently stop at a fixed row limit; unavailable data fails rather than appearing as zero. Collection, payout execution, fees and withdrawal limits remain in their existing payment/settlement routines.

## Security

- RLS enforced on every table; anonymous visitors can read only curated public
  data (storefronts, payment links, public listings), never user or financial data.
- Roles in a separate table + security-definer checks prevent privilege escalation.
- `security_events` audit log and `rate_limit_hits` throttling with
  `guardPublicRequest` on public routes.
- Staff console access is enforced server-side per department; only the
  CEO/super-admin has unrestricted access.
- An anonymous-access RLS regression suite (`tests/rls-anonymous-access.test.ts`)
  proves signed-out visitors cannot read protected data, run daily in CI.

See [SECURITY.md](./SECURITY.md) and [SECURITY-CHANGELOG.md](./SECURITY-CHANGELOG.md).

## Development

```sh
bun install
bun run dev        # http://localhost:8080
```

### Scripts

| Script | Purpose |
| --- | --- |
| `bun run dev` | Start the dev server |
| `bun run build` | Production build |
| `bun run test` | All tests (RLS suite needs backend env vars) |
| `bun run test:unit` | Pure unit suites — no network, no secrets |
| `bun run test:security` | Anonymous-access RLS regression suite |
| `bun run lint` / `bun run format` | ESLint / Prettier |
| `npm run native:sync` / `native:doctor` | Capacitor sync / doctor |
| `npm run native:build:android` | Android release bundle |

Server-only environment variables are read inside server function handlers
(never at module scope). Browser Supabase config is auto-generated by Lovable
Cloud — do not edit it by hand.

## Native apps (iOS & Android)

The `ios/` and `android/` projects are committed so native configuration
(entitlements, capabilities, icons, splash) survives clones; cloud builds still
run `cap sync` to refresh web assets.

```sh
npm install        # or bun install
npx cap sync       # web assets, plugins, Package.swift, gradle files
npx cap doctor
```

- iOS is built on Codemagic macOS runners (`codemagic.yaml` → `ios-app-store`);
  no local Xcode required.
- Android: `npm run native:build:android` (JDK 21 + Android SDK 36) or the
  `android-play` Codemagic workflow. Firebase `google-services.json` enables
  push on Android when present.
- Push notifications, local notifications, haptics, badges, splash and status
  bar are wired through Capacitor plugins.

Full workflow in [NATIVE.md](./NATIVE.md); store submission pack in
[STORE-SUBMISSION.md](./STORE-SUBMISSION.md). No certificates, keystores, API
keys or passwords live in this repository.

## Testing

- `tests/format.test.ts` — currency, dates, phone rules, referral links, commission constants
- `tests/region.test.ts` — referral/mobile-money gating, platform take rate, country metadata
- `tests/booking.test.ts` — booking lifecycle, labels in EN/FR, tones, payment countdowns
- `tests/marketplace.test.ts` — commission maths, category integrity, subscription state
- `tests/taxonomy.test.ts`, `tests/location.test.ts` — discovery groups, bilingual labels, nearest-city resolution
- `tests/push.test.ts` — push categories and notification deep links
- `tests/rls-anonymous-access.test.ts` — live anonymous-access regression (needs project secrets)

CI (`.github/workflows/security.yml`) runs the unit suites, the RLS regression
suite and a database self-check.

## Documentation

- [DOCS-INDEX.md](./DOCS-INDEX.md) — navigation to every document
- [DELIVERABLES.md](./DELIVERABLES.md) — full inventory of what has been built
- [NATIVE.md](./NATIVE.md) — Capacitor / App Store / Play Store workflow
- [STORE-SUBMISSION.md](./STORE-SUBMISSION.md) — store listing copy, review notes, privacy/data-safety answers
- [SECURITY.md](./SECURITY.md) / [SECURITY-CHANGELOG.md](./SECURITY-CHANGELOG.md) — security model and hardening log
- `/terms`, `/privacy`, `/community-guidelines`, `/marketplace-policy`, `/referral-wallet-terms`, `/account-deletion`, `/support`, `/contact` — public legal and support pages

## Deployment

1. Build: `bun run build`
2. Deploy via Lovable, or push to GitHub for CI/CD.
3. Connect GitHub in the Lovable editor (`+ → GitHub → Connect project`) for automatic two-way sync.

## Project URLs

- Published: https://ashglogroup.company · https://www.ashglogroup.company
- App: https://ash-global.lovable.app · https://growrefer.app · https://www.growrefer.app

---

Built with [Lovable](https://lovable.dev).