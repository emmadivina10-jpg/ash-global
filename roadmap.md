# Roadmap

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
- [ ] Phase 1c (CORRECTED, plan APPROVED): five tabs Discover | Shop | ASH Kitchen | Messages | Menu behind new_nav (still OFF)
  - [x] Feature-switch reader (src/lib/feature-flags.ts), loaded with sign-in in both layouts
  - [x] Shared tab definitions + re-pointing logic (src/lib/member-tabs.ts); AppShell tab bar uses it (no visible change while switch is off)
  - [ ] MobileNav: highlight via isTabActive (match prefixes)
  - [ ] GuestShell + DesktopMenu + RightRail: same re-pointing
  - [ ] /discover page (video-first, Stories, chips, featured, short videos, trending, instructors, markets, community) + /feed redirect when on
  - [ ] /kitchen page (food sellers = primary food category or active PRIVATE_CHEF/CATERING dishes; today there are none, so honest empty state + seller CTA)
  - [ ] Spotlight viewer close/back → Discover; AppShell home link → useHomePath
  - [ ] Tests (tests/member-tabs.test.ts, kitchen open-now, discover ranking) + phone/desktop screen checks
  - [ ] Turn new_nav on (preview only; live app unaffected until publishing approved)
- [x] Pre-phase repair: payment security fixes integrated (per approved docs/proposed/payment_security_fixes.md)
- [ ] Phase 2: Discover + video (managed provider, signed playback)
- [ ] Phase 3: Courses + entitlements (vertical slice)
- [ ] Phase 4: Buy & Sell re-skin + ASH Kitchen
- [ ] Phase 5: Services/logistics verification
- [ ] Phase 6: Unified checkout + My Account + admin
