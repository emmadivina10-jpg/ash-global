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
- [ ] Phase 1b: feature_flags table — SQL proposed at docs/proposed/feature_flags.sql, NEEDS APPROVAL ("approve feature flags")
- [ ] Phase 1c: New nav shell (Discover | Buy & Sell | Kitchen | Services | Account) behind new_nav flag; Feed/Spotlight/Market hidden to /legacy/* with redirects
- [ ] Pre-phase repair (needs approval): TchokoPay webhook dispatcher misroutes TOP-/EVT-/PRM-; gate public reconcile-activations + syncLedgerPayment
- [ ] Phase 2: Discover + video (managed provider, signed playback)
- [ ] Phase 3: Courses + entitlements (vertical slice)
- [ ] Phase 4: Buy & Sell re-skin + ASH Kitchen
- [ ] Phase 5: Services/logistics verification
- [ ] Phase 6: Unified checkout + My Account + admin
