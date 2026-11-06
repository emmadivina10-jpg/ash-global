# Roadmap

## Messages vendors
- [ ] Restore available storefront discovery independently of online status; round avatars and accurate count; verify signed-in Messages.

## Guest-First Experience
- [x] Phase 1: GuestShell + AuthGateDialog + return-to-action via next=
- [x] Phase 2: Browsing surfaces moved to public _browse layout; guest mode on each page
- [ ] Phase 3: Public read policies — SQL presented (docs/proposed/guest_public_read.sql), NEEDS USER APPROVAL ("approve phase 3")
- [ ] Phase 4: Guest local wishlist + recently-viewed + merge on signup

## Video-First Ecosystem (master prompt program)
- [x] Phase 0: Architecture audit — docs/ash-glo-phase0-audit.md (read-only, nothing changed)
- [ ] Blocking decisions: brand palette, Apple IAP strategy, video provider (Mux vs Cloudflare Stream), YouTube free-only confirmation, instructor unification
- [ ] Pre-phase repair (needs approval): TchokoPay webhook dispatcher misroutes TOP-/EVT-/PRM-; gate public reconcile-activations + syncLedgerPayment
- [ ] Phase 1: Feature flags + nav shell + design tokens (after palette decision)
- [ ] Phase 2: Discover + video (managed provider, signed playback)
- [ ] Phase 3: Courses + entitlements (vertical slice)
- [ ] Phase 4: Buy & Sell re-skin + ASH Kitchen
- [ ] Phase 5: Services/logistics verification
- [ ] Phase 6: Unified checkout + My Account + admin
