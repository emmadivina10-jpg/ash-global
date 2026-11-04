# Roadmap

## Discover and icon navigation correction
- [x] Matching video/instructor categories and specific empty states; remove Popular courses
- [x] Edge-to-edge Shop-colour video player, hold previews, seeking and orientation preservation
- [x] Real online instructor pulse and direct upload return to Discover (return tested as a rule; no new live content uploaded)
- [x] Icon-only tabs, centered Home and polished Shop icon; 18 targeted tests and signed-in browser checks

## Guest-First Experience
- [x] Phase 1: GuestShell + AuthGateDialog + return-to-action via next=
- [x] Phase 2: Browsing surfaces moved to public _browse layout; guest mode on each page
- [ ] Phase 3: Public read policies — SQL presented (docs/proposed/guest_public_read.sql), NEEDS USER APPROVAL ("approve phase 3")
- [ ] Phase 4: Guest local wishlist + recently-viewed + merge on signup

## Video-First Ecosystem (master prompt program)
- [x] Phase 0: Architecture audit — docs/ash-glo-phase0-audit.md (read-only, nothing changed)
- [x] Decisions: black/royal-purple/gold palette (progressive transition), web-first course sales (iOS viewer only), Cloudflare Stream (signed playback, swappable), unified instructor identity
- [x] Phase 1a: 2026 brand tokens (royal/brass/onyx) added to styles.css alongside legacy tokens — no existing screen restyled
- [x] Phase 1b: feature_flags table applied (8 flags, all off)
- [x] Phase 1c (CORRECTED, plan APPROVED): five tabs Discover | Shop | ASH Kitchen | Messages | Menu behind new_nav — DONE, flag ON in preview (published app does not read flags until a publish is approved)
  - [x] Feature-switch reader (src/lib/feature-flags.ts), loaded with sign-in in both layouts
  - [x] Shared tab definitions + re-pointing logic (src/lib/member-tabs.ts); AppShell/MobileNav/GuestShell all use it
  - [x] MobileNav: highlight via isTabActive (match prefixes)
  - [x] GuestShell + desktop sidebar: same re-pointing (guest tabs: Discover | Shop | ASH Kitchen | Search | Sign in)
  - [x] /discover page (Stories rail, chips, trending grid, honest empty states) + /feed redirect when on
  - [x] /kitchen page — honest empty state (no genuine food vendors today) + seller CTA, gold cloche art
  - [x] Spotlight viewer close/back → Discover; AppShell home link → useHomePath
  - [x] Menu: seven entries (ASH Rider hero, Flight, Referral Rewards, Friends, Notifications, Wallet, Professional Studio)
  - [x] Messages plus panel: ASH AI + ASH Support cards (portal, focus trap, Escape/arrow keys), permanent chat rows hidden under new_nav
  - [x] Tests: tests/member-tabs.test.ts 9/9; full suite 534 pass / 5 pre-existing fixture failures (ios-release, service-verification)
  - [x] Browser-verified: mobile/guest/desktop screenshots, /feed→/discover redirect, plus panel open/Escape/ASH-AI navigation, dark mode
  - [x] new_nav turned ON (preview only; publish still needs approval)
- [x] Pre-phase repair: payment security fixes integrated (per approved docs/proposed/payment_security_fixes.md)
- [ ] Phase 2: Discover + video (managed provider, signed playback)
- [ ] Phase 3: Courses + entitlements (vertical slice)
- [ ] Phase 4: Buy & Sell re-skin + ASH Kitchen
- [ ] Phase 5: Services/logistics verification
- [ ] Phase 6: Unified checkout + My Account + admin
