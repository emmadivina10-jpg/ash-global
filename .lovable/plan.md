# ASH Verified + welcome screen polish

## 1. Welcome screen
- Remove the water/ripple background entirely (delete the effect, keep the calm gradient).
- One single design for phone and web: same sections, same order, just tighter on small screens — no long scrolling. Tiles become a compact 2-column grid, the sign-up panel sits directly under them on mobile and beside them on web.
- Add a rotating review carousel (auto-switching every 5s, smooth fade/slide, swipeable, dots): three sample reviews with name, city, 5 stars and a profile photo. These are clearly sample testimonials until real ones exist.

## 2. ASH Verified (blue badge)
Tiers mirroring Facebook's Meta Verified structure, paid monthly by Mobile Money:

| Tier | Who it's for | Monthly |
| --- | --- | --- |
| Verified | Individual members | 3,500 XAF |
| Verified Business | Vendors, shops, pros | 9,000 XAF |
| Verified Business Plus | Larger brands, multi-seat | 25,000 XAF |

- Badge is the Facebook blue check (#1877F2) shown next to the name everywhere a member/vendor appears: feed posts, comments, stories/Spotlight, chat, profile, storefront, reviews.
- Payment is automatic: pay by Mobile Money → badge turns on the moment the payment confirms, with an expiry date and a renewal reminder. No admin step needed.
- Impersonation protection: once a member is verified, nobody else can register or rename themselves to the same display name, and nobody can upload the exact same profile photo. Attempts are blocked and logged to the admin trust queue.
- Content protection: posts by a verified member can't be reposted by others unless the owner switches on "Allow reuse" for that post. A copy-protection note appears on their posts.
- New screen `/verified` explaining the tiers, benefits, current status, expiry and a "Get verified" Mobile Money checkout.

## 3. Admin workflow integration
- New console page **Verification**: live list of verified accounts, tier, paid until, revenue from verification, manual grant/revoke with reason, plus the impersonation attempt log.
- Console home gains a Verification block in the live metrics and the AI daily briefing.
- A single "System map" section on the console home linking every area of the app (users, providers, marketplace, property, events, deals, freelance, jobs, articles, social, stories, chat, support, security, payouts, staff, verification) with its live count, so nothing in the app is missing from the admin workflow.

## Technical notes
- Migration: `verifications` table (user_id, tier, status, amount, payment_reference, provider_transaction_id, started_at, expires_at), `impersonation_attempts` table, `allow_reuse` boolean on `social_posts`, `verified_tier`/`verified_until` on `profiles` (written only by a security-definer function), `is_verified(uuid)` helper, `complete_verification(...)` RPC that activates the badge on paid webhook, and a profile trigger blocking duplicate names/photos of verified accounts. GRANTs + RLS for each new table.
- Payments reuse the existing TchokoPay collection path unchanged; a new `VER-` reference prefix is added as an extra branch in the webhook and settlement switch — no existing branch, wallet, referral or payout logic is touched.
- New `startVerification` server function mirrors `startPromotion`; `src/components/refer/VerifiedBadge.tsx` is the single badge component reused everywhere.
