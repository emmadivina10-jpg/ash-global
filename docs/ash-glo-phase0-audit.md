# ASH Glo — Phase 0 Architecture Inventory (Audit Only)

Date: 2026-11-03. Read-only audit. No code, schema, configuration, or data was changed.
Method: three parallel source investigations (frontend, backend/payments, feed/market/logistics/admin) plus direct read-only production database queries (tables, RLS, policies, functions, storage buckets).

---

## 1. Frontend stack

- **Framework:** TanStack Start v1 (React 19, SSR) on Vite 7; Tailwind CSS v4 via `src/styles.css` (native CSS `@import`, OKLCH semantic tokens); shadcn-style component set; Capacitor for native Android/iOS wrappers.
- **Router:** TanStack Router file-based routes under `src/routes/`; three pathless layouts: `_authenticated` (member gate, `AppShell`), `_browse` (guest or member, `GuestShell`/`AppShell`), and `console.tsx` (staff console, separate branding).
- **State/data:** TanStack Query (`ensureQueryData` in loaders, `useSuspenseQuery` in components); server logic via `createServerFn`.
- **Build/deploy:** Lovable preview + publish; native builds via Capacitor CI (artifact-only).

## 2. Route map (summary)

- **Member (`_authenticated`, ~45 routes):** feed creation, bookings (+confirm/receipt/track), wallet, withdraw, transactions, dashboard, network, referral-rewards, activate, verified, studio, inventory (Coming Soon), deliveries, dispatch, rider, logistics-admin, clean.* (laundry), flights, electricity, investment, shareholder, campus.become-instructor, campus.teaching, markets.instructors/update, mentors, groups, friends, messages, notifications, profile, settings, menu, create, assistant, analytics, security-update, property.manage/new, freelance.* (Coming Soon), fx-analytics (Coming Soon).
- **Guest (`_browse`, ~20 routes):** feed, post.$postId, spotlight, services.index ($providerId, extras), campus.index/instructors, property.index/$listingId, articles, jobs.* (Coming Soon), events.* (Coming Soon), deals (Coming Soon), hashtag.$tag, search, u.$userId.
- **Public top-level:** landing `/`, login, register, forgot/reset-password, auth.callback, consent, onboarding, setup-profile, safety-review, pay.$code (payment links), s.$slug (storefronts), share.$kind.$id, delete-account, account-deletion, contact, support, and legal pages (terms, privacy, community-guidelines, marketplace-policy, referral-wallet-terms).
- **Console (`/console`, ~40 routes):** overview, workspace, cases, departments, revenue, security (+security-updates), payments, withdrawals, payout, ledger, commission, finance, shareholders, users, providers, clean, bookings, deletions, support, outreach, operations, merchant, growth, sales, marketplace, advertising, partnerships, content, expansion, property, campus-catalogue, trust, reports, verification, campus-instructors, instructors (FX), staff, riders, members.$memberId.
- **API routes (9):** webhooks (tchokopay, stripe, stripe-flights), reconcile-activations, cleanup-stories, cleanup-spotlight-videos, security-selfcheck, public profiles/$username, staff-member-ai; plus Lovable email preview/webhook routes and sitemap.xml.

## 3. Auth and roles

- **Provider:** Supabase Auth (Lovable Cloud). Email/password + Google/Lovable social on login; social hidden on register.
- **Member server functions:** `requireSupabaseAuth` middleware (`src/integrations/supabase/auth-middleware.ts`) validates Bearer JWT, checks moderation status, provides user-scoped client.
- **Staff console:** separate console-cookie auth (`src/lib/console.server.ts`: `requireConsole`, `requireDepartment`, `requireSuperAdmin`) — NOT the member middleware.
- **Roles:** separate `user_roles` table with security-definer `has_role()` — matches the required pattern. No roles on profiles.
- **Identity enforcement:** `identity_restrictions`, reviewed photo hashes, non-throwing denial triggers, `identityMiddleware`.

## 4. Database

- **182 tables in `public`, ALL with RLS enabled.** No table found with RLS disabled.
- **15 tables with zero policies** — all intentional deny-all / RPC-only or service-role-only (e.g. `dispatch_job_live_locations`, `dispatch_pickup_verifications`, `dispatch_rider_invites`, `leads`, `staff_accounts`, `staff_member_ai_threads`, `payment-adjacent snapshots`). These are accessed only through security-definer functions.
- **247 functions, 209 SECURITY DEFINER**, including the full `dispatch_*` suite (26), payment completion RPCs (`complete_activation`, `complete_booking_payment`, `complete_wallet_topup*`, `settleCollection` dispatch targets), `request_wallet_withdrawal`, `admin_credit_wallet_audited`, console functions.
- **Key domains:** social (`social_posts`, `post_*`, `stories`, `spotlight_*`, `friendships`, `conversations`, `messages`), marketplace (`provider_profiles`, `provider_services`, `bookings`, `reviews`, `deals`, `cart_items`), education (`campus_instructor_*`, `campus_subjects`, `fx_instructor_*`, `mentors`), money (`wallets`, `wallet_balances`, `transactions`, `payment_transactions`, `payment_events`, `withdrawals`, `payment_links`, `referrals`, `activations`, `marketplace_settings`), logistics (`dispatch_*` 11 tables), property, jobs, events, freelance, inventory, clean (laundry), staff/console, security/trust, shareholders.

## 5. Storage buckets

10 buckets, **all private**: avatars (5MB), campus-verification (15MB), job-images (8MB), market-verification (15MB), portfolio (unlimited), property (10MB), rider-documents (10MB), spotlight (50MB, MIME-restricted), staff-avatars, voice-notes (5MB). No public bucket exists; media is served via signed URLs.

## 6. Backend functions

56 `createServerFn` modules + 9 API routes. Member functions use `requireSupabaseAuth`; staff functions use the console guard; deliberately public functions are limited to: deletion requests, referral-code validation, region detection, share previews, public storefronts/payment-link initiation (with server-side verification), local news rail, support ticket intake.

## 7. Payments

- **TchokoPay ("Chocopee"):** MTN Mobile Money + Orange Money, XAF. Server-side initiation (`/collect/charge`), status verification (`/collect/{ref}`), disbursement for withdrawals. Webhook: HMAC-SHA256 over `timestamp.rawBody`, 5-min tolerance. Idempotency-Key supported.
- **Stripe:** Checkout + Connect. Booking card charges in **USD** (620 XAF/USD conversion, $0.50 min, 1,850 XAF min enforced by `enforce_service_min_price` trigger + `price-minimum.ts`). Wallet card top-ups settle in actual currency (CAD etc.) into `wallet_balances`. Webhooks: v1 HMAC-SHA256, 5-min tolerance; platform secret `STRIPE_WEBHOOK_SECRET` + Connect secret `STRIPE_WEBHOOK_CONNECT_SECRET`. Refund/dispute events processed (reverse/hold settlement); no customer-facing refund-initiation API found.
- **Card/bank UI:** disabled everywhere via `CARD_BANK_ENABLED = false` (`mobile-payment-policy.ts`) — presentation-only, not server authorization.
- **Confirmation model:** payment truth comes from provider evidence (gateway status queries / verified webhooks), never browser success flags. `settleCollection` is the single settlement dispatcher.
- **Ledger:** `payment_transactions` (unique merchant ref, service-role only) + `payment_events` audit + `transactions` (wallet accounting). Exactly-once via unique references and row locks.

### Payment findings (risks)

1. **TchokoPay webhook dispatcher is incomplete:** it special-cases `CLN-`, booking/link/verification, else `complete_activation`. `TOP-` (top-up), `EVT-` (event ticket), `PRM-` (promotion) callbacks are misrouted. Polling paths cover some of this, but the webhook branch itself is wrong.
2. **`/api/public/reconcile-activations` is unauthenticated** (rate-limit only) and can mutate financial state after provider checks.
3. **`syncLedgerPayment` is public** — accepts a client-supplied reference (it does verify with the provider, so it is an abuse/disclosure surface, not payment-trust bypass).
4. **Commission default mismatch:** original SQL default 12% vs shared helper fallback 15%; deployed `marketplace_settings` governs, but the drift should be reconciled.

## 8. Wallet, transactions, referrals

- **Two balance systems:** `wallets` (XAF: available/pending/earnings) and `wallet_balances` (per-currency non-XAF card settlements).
- **Withdrawals:** `request_wallet_withdrawal` RPC — XAF via MTN/Orange only, min 100 XAF; non-XAF via Stripe Bank, min 1 unit. One pending withdrawal at a time; row-locked.
- **Referrals:** 3 levels (L1 1,500 / L2 750 / L3 250 XAF), only ACTIVE referrers earn, exactly-once via unique transaction refs. Fully separate from marketplace percentage commissions (12%/15% only, CEO/Finance controlled, snapshotted at payment).
- **Separation verdict:** any future course/instructor earnings MUST extend the existing ledger with `source_type`/`source_id` and must NOT touch the referral/activation commission paths.

## 9. Orders, vendors, products, services, bookings

Commerce runs on **providers → services/deals → bookings → reviews** (`provider_profiles`, `provider_services`, `bookings`, `reviews`, `deals`, `cart_items` → `request_booking`). There is NO generic products/orders schema. Separate domains: inventory (`inventory_products` etc., UI Coming Soon), laundry (`clean_*`), payment links, event tickets, promotions, property listings (enquiry-style), dispatch.

## 10. Logistics

Full dispatch suite live: `dispatch_jobs`, assignments, events, pickup verifications, live locations (auto-erased), rider documents/invites, vendor prefs, external riders. Five fulfilment modes: ASH_DISPATCH, CHOSEN_RIDER, EXTERNAL_RIDER, VENDOR_DISPATCH, SELF_PICKUP. 15-min offer windows; assignment only on rider acceptance; handover codes; live map (OSM/Leaflet, client-only). ASH Rider is a separate app on the same backend, reading/writing only via `dispatch_*` RPCs.

## 11. Admin tools

Extensive console (~40 screens): finance ledger, payments, withdrawals, payouts, commission, reconciliation, rider verification, campus/FX instructor review, trust & safety, moderation, member review, staff management, departments/targets, shareholders, support inbox, outreach, expansion, cybersecurity center. Staff notifications with sound exist (`StaffNotificationCenter`).

## 12. Feed, Spotlight, Market locations and dependencies

- **Feed:** `social_posts` + `post_*` tables; `_browse/feed.tsx`, `PostCard`, `social.queries.ts`. Dependencies: push deep links (`/post/$id`), public profiles, share previews, hashtag pages, trending rail, FX market posts (`market_posts.social_post_id` join), trust/safety moderation, member review.
- **Spotlight:** `spotlight_*` tables, `/spotlight`, interleaved into feed; stories (`stories`, `story_*`) in `StoriesRail`.
- **Market:** no `/market` route — `/services` renders `MarketBrowser` (deals + property + providers). "ASH Markets" (FX) is a separate content system (`market_posts`, `fx_instructor_*`).
- **Hiding Feed/Spotlight from nav is feasible but must preserve:** `/post/$postId`, `/share/*`, hashtag routes, push notification targets, and the `market_posts` → `social_posts` join.

## 13. i18n

English + French only (`LangCode = "en" | "fr"`). Dictionaries in `src/lib/i18n.tsx` + generated `i18n.generated.ts`; `t(key)` and `tx(en, fr)` helpers; persisted in localStorage `refer.lang`; cross-tab sync; `<html lang/dir>` updates. The master prompt's 5-locale selector (en-US/en-CA/en-GB/fr-FR/fr-CA) would be an expansion of the current two-language model.

## 14. UI-only / mocked / broken

- **Coming Soon routes:** Deals, Events (list+detail), Jobs (list+detail), Freelance (list+detail), Inventory, FX analytics.
- **Console nav:** six logistics entries deliberately disabled ("Soon").
- **Hard-coded switches:** `CARD_BANK_ENABLED = false`; nav arrays source-defined.
- **Stale docs:** `styles.css` header comment says "Emerald Prestige" but the shipping palette is ASH coral/magenta/purple.
- **Create page** offers Deal/Event/Project publishing while those browse destinations are Coming Soon.

---

# Deliverable A — REUSE / MODIFY / ADD

| Capability | Verdict | Notes |
|---|---|---|
| Discover (video-first) | **ADD** | No video platform exists; Spotlight/stories are social video only. New tables needed (videos, categories, engagement). |
| Courses / LMS | **ADD** | No courses, lessons, enrolments, entitlements, or progress tables exist. Campus = live tutoring bookings, not courses. |
| Instructors | **MODIFY** | Two instructor systems exist (Campus tutoring, FX content). Unify or clearly separate; reuse application/approval pattern and `user_roles`. |
| Buy & Sell | **MODIFY** | Re-skin existing Market (`/services` + MarketBrowser + provider/booking commerce). No second marketplace DB. Needs category-kind flag. |
| ASH Kitchen | **ADD (thin)** | Food = vendor classification flag + menu/opening-hours model on existing provider records; reuse booking/checkout. |
| Services hub | **REUSE** | Existing bookings/provider system is complete; preserve as-is. |
| Delivery/logistics | **REUSE** | Dispatch suite is complete with 5 fulfilment modes; Kitchen/Buy & Sell orders would create `dispatch_jobs` via existing RPCs. |
| Checkout | **MODIFY** | Existing booking payment flow + `settleCollection`; add `order_type`/`source_type` rather than a new ledger. |
| Dashboards | **MODIFY** | Studio (vendor), Teaching (Campus), console exist; unify into one business area rather than adding more. |
| My Account | **MODIFY** | Profile/settings/wallet/transactions/bookings exist; needs consolidation, not new systems. |
| Language selector | **REUSE** | en/fr works app-wide; regional variants would be new. |
| Feature flags | **ADD** | No flag system exists today — required by the Constitution before any new surface ships. |
| Guest-first browsing | **REUSE** | `_browse` shell + `GuestShell` + auth-gate (`guest-gate.tsx`) already shipped. |
| Notifications (staff) | **REUSE** | StaffNotificationCenter with sound exists. |

# Deliverable B — Top 10 risks

1. **Apple IAP (app-store):** paid courses/videos in the iOS app require In-App Purchase (guideline 3.1.1). Must be decided BEFORE building mobile course purchase. Web-only sale is the alternative.
2. **TchokoPay webhook misrouting** (`TOP-`/`EVT-`/`PRM-`): existing defect; any new `order_type` flowing through the same dispatcher inherits it. Fix before Phase 6.
3. **YouTube ToS:** embeds are not private and cannot be paywalled; paid lessons need direct upload + signed playback (managed provider). Legal review recommended.
4. **Video cost/security:** self-hosting video is a scale killer; managed provider (Mux/Cloudflare Stream) with signed playback + entitlement checks is required. New external account + secrets.
5. **Unauthenticated financial endpoints:** `reconcile-activations` (mutating) and `syncLedgerPayment` are public; rate-limit only. Should be gated before transaction volume grows.
6. **Scope/team load:** seven product areas on a small team; the Constitution's phase gates and feature flags are the mitigation.
7. **Duplicate-concept drift:** two instructor systems already exist (Campus, FX); a third (course instructors) without unification repeats the mistake the Constitution warns about.
8. **Forex/crypto content compliance:** education-only framing, risk disclaimers, no signals-as-advice; provincial (Canada) and COBAC/COSUMAF (Cameroon) considerations; legal review before paid trading content.
9. **Brand direction conflict:** the master prompt specifies black/purple #4B0082/gold #D4AF37; the shipping app uses ASH coral/magenta/purple tokens and project memory records emerald/gold. One palette must be chosen before Phase 1 design tokens.
10. **Migration discipline:** two migration lineages exist (`supabase/migrations` and `drizzle/migrations`); additive-only rule must hold across both, with exact-SQL approval per the Constitution.

# Deliverable C — Proposed minimal schema additions (PROPOSAL ONLY, no SQL)

All additive, all new tables with RLS + grants, nothing renamed or dropped:

1. `feature_flags` (key, enabled, description) — or server-readable config; needed by Phase 1.
2. `videos` (id, owner_id, title, description, category, tags, visibility, status, source_type [youtube|upload], youtube_id, provider_asset_id, thumbnail, duration, scheduled_at, created/updated).
3. `video_engagement` (likes/bookmarks/views/follows — separate tables or one per concept; comments reuse the existing comment pattern but as a NEW table, not `post_comments`).
4. `courses` (id, instructor_id, title, description, category, cover, price, currency, level, language, status).
5. `course_sections` + `course_lessons` (lesson: video_id nullable, free_preview flag, position, resources).
6. `enrolments` (user_id, course_id, order/transaction ref, status, created) — the entitlement core; RLS + server-issued signed playback only.
7. `lesson_progress` (user_id, lesson_id, position_seconds, completed_at).
8. `course_reviews` (verified-purchase only — distinct from community `reviews` and general comments).
9. `vendor_kind` classification: nullable column on `provider_profiles` (or a `vendor_categories` map) with `food`/`general` kind — powers Kitchen vs Buy & Sell without copying records.
10. `orders.order_type` / `payment_transactions.source_type+source_id` extension (nullable columns) to unify checkout across product/food/course/service.
11. `live_sessions` (scheduled lives: title, time, meeting link, enrolment-gated) — placeholder-level, no streaming.

# Deliverable D — Recommended phase order (adjusted to findings)

0. **This audit** ✔
1. **Decisions first (blocking):** brand palette, Apple IAP strategy, video provider choice, YouTube policy acknowledgment. No code until answered.
2. **Fix existing payment defects** (TchokoPay webhook dispatcher, public reconcile/sync endpoints) — small, high-value, protects everything built later.
3. **Phase 1 as written:** feature flags + nav shell + design tokens (after palette decision). Guest-first already exists — that part is done.
4. **Phase 2 Discover/video** with managed provider; YouTube for free content only.
5. **Phase 3 courses/entitlements** — the vertical slice proving the spine (upload → enrol → verified payment → protected playback).
6. **Phase 4 Buy & Sell + Kitchen** (re-skin, not rebuild).
7. **Phase 5 Services/logistics** — mostly verification; dispatch is already complete.
8. **Phase 6 unified checkout/account/admin.**

# Deliverable E — Questions for you + external accounts needed

1. **Brand palette:** keep the shipping ASH coral/magenta/purple, adopt the document's black/royal-purple/gold, or reconcile with the emerald/gold recorded in project memory? (Phase 1 design tokens depend on this.)
2. **Apple IAP:** will courses be sold inside the iOS app (requires In-App Purchase, 15/30% Apple fee) or web-only purchase with the app as a viewer?
3. **Video provider:** Mux (best signed-playback/analytics) or Cloudflare Stream (cheaper at small scale)? Either needs an account + API keys added as secrets.
4. **YouTube:** confirm YouTube embeds are for free/preview content only, never paid lessons.
5. **Instructor unification:** should course instructors be a third system, or should Campus/FX instructor profiles be unified into one instructor identity?
6. **Kitchen launch scope:** are there real food vendors today to classify, or does Kitchen launch empty with honest empty states?
7. **Payment defects:** approve fixing the TchokoPay webhook dispatcher and gating the two public financial endpoints as a pre-phase repair?
8. **Regional locales:** is the 5-locale selector (en-US/CA/GB, fr-FR/CA) actually wanted, given the app currently ships exactly en/fr?
