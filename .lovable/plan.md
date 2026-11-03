# ASH Glo — Guest-First Experience & Progressive Authentication

## What I found

- **Today everything member-facing is behind the sign-in gate.** Feed, Market, Campus (Academy), Services, Jobs, Property, Events, Deals, Messages, Wallet all live under `src/routes/_authenticated/`, whose gate redirects every visitor to `/login`.
- **Only storefronts are public.** `provider_profiles` already has a "Public can view live storefronts" guest policy (that powers the public `s.$slug` pages). Posts, Market posts, courses, jobs, events, property listings and services have **no guest read policies** — sign-in is required at the database level, not just in the UI.
- **Return-to-action plumbing already exists.** `oauth-return-path.ts` (`pendingReturn`, `callbackUrl`) and `?next=` are already wired through login, register, Google sign-in and the auth callback. We reuse this — no second auth system.

## Approach

Four phases. Phases 1–2 are code-only (no database change). Phase 3 needs your approval because it changes production security policies. Nothing is published without your approval.

### Phase 1 — Guest shell & contextual sign-in dialog (code only)

- New `GuestShell`: the existing app layout adapted for signed-out visitors — same navigation, but the account area shows **Sign in / Create account** instead of the member menu. Signed-in members keep the current shell unchanged.
- New `AuthGateDialog`: a clean, dismissible bilingual dialog shown when a guest taps an account-only action (like, comment, follow, save, buy, enrol, book, request delivery, apply, message, publish). Buttons: **Create account**, **Sign in**, **Continue with Google** — the existing providers only.
- The dialog builds `next=` from the current page plus the attempted action (e.g. `/post/123?action=comment`), so after sign-in the member lands back on the same post with the comment box open. Login/register/Google already honour `next=`; I'll extend it to carry the pending action.

### Phase 2 — Public browsing pages (code only, reads stay sign-in-only for now)

Move the read-only browsing surfaces out of `_authenticated/` to public routes wrapped in `GuestShell`:

- Feed (browse posts/reels), Market/Deals, Campus course catalogue + instructor profiles, Services, Jobs, Property, Events, business profiles.
- Each page detects the visitor: signed-in → full experience as today; guest → browse mode, with every account-only button opening the `AuthGateDialog`.
- Until Phase 3 is approved, these pages show public content that is already exposed (storefronts, share pages) plus a preview of the layout; full public data switches on in Phase 3.
- **One route per surface** — pages move, they are not duplicated, so no double routes.

### Phase 3 — Public read policies (needs your approval — production security change)

A reviewed migration that classifies public content explicitly:

- Guest SELECT policies for: published feed posts, published Market posts, published courses and **free preview lessons only**, active jobs, public events, active property/vehicle listings, live services.
- Paid lessons, student resources, private videos/documents stay behind the existing server-side entitlement checks — no change there.
- No write access for guests anywhere; all existing member policies, RLS, wallets, payments, commissions, referrals and ASH Rider integration remain untouched.
- I'll show you the exact SQL and rollback before applying anything.

### Phase 4 — Guest personalization & merge (code only)

- Local (on-device) recently-viewed list and temporary wishlist for guests — no passwords, tokens or payment data stored.
- On sign-up, a one-time offer to merge the local wishlist/recently-viewed into the new account.

## What stays untouched

- ASH Rider authentication and its production integration.
- Payments, wallets, commissions, referrals, and all existing records.
- The single existing auth system — no second provider or user database.
- No elevated permissions from account-type selection; existing roles architecture is reused.

## Testing (per your brief)

1. Guest enters and browses public pages without a login redirect.
2. Guest views free course previews; paid lessons stay locked.
3. Guest tapping a protected action gets the dialog; dismissing it leaves them browsing.
4. Sign-in returns to the original page + action (comment box open, checkout resumed).
5. New registration preserves the intended action (no generic dashboard drop).
6. Paid content locked without verified entitlement; pending payments unlock nothing.
7. Guests cannot read private records (verified with isolated database tests).
8. Existing signed-in members see no change.

Isolated PGlite tests for the new policies plus the existing test suite must pass before I report done. I will not claim any flow works without testing it.

## Order of work

1. Phase 1 + 2 (code only) — build and verify in preview.
2. Present Phase 3 SQL for your approval.
3. Phase 4, then the full test report.
