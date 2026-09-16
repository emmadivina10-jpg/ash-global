# Roadmap

- [x] Story and Spotlight viewers cover the full screen without app navigation
- [x] Owners can delete their Stories and member-created Spotlights, including uploaded media cleanup
- [x] One-to-four photo posts and Spotlight previews use balanced, gap-free layouts
- [x] Messages list uses direction-locked swipe actions with delete confirmation and stable independent scrolling
- [x] Removed global pull-down loading movement; Messages keeps one clean scroll surface and a stable bottom navigation

- [x] Store TchokoPay webhook signing secret — user declined the secure form for now; webhooks remain safe via API round-trip verification
- [x] Platform payout page: `/console/payout` — withdraw 1% revenue, per-booking status/amount/fee, payout history, balance guard (`platform_payouts` table + `console_platform_payout` RPC)
- [x] Provider dashboard: Studio now shows available-to-withdraw balance, pending payments, net earnings (after 1%), wallet shortcut
- [x] Customer profile page: `/profile` — works for new and existing profiles (fixed previously)
- [ ] End-to-end real booking walkthrough — requires a real MTN MoMo payment; guided steps provided to user
- [x] Codemagic iOS diagnostics — direct raw xcodebuild archive/export logs, result bundles, and signing/profile audit output

## Final pre-release pass (ASH Glo)

Done
- [x] Session persistence: signed-in members no longer bounced to the landing page after closing/reopening (trust stored session before the network check)
- [x] Wallet promoted to its own bottom tab; removed from More
- [x] Bottom bar white-space fix (bounded native scroll surface, no WebView bounce or exposed backing view)
- [x] Notifications open the booking / chat / payout they refer to
- [x] Floating "A" button is draggable and remembers its position
- [x] First-launch welcome + guided tour + header profile menu

Next
- [x] Marketplace polish: phone-system typography, compact unframed header, and removed the Pro card
- [x] Native launch polish: rounded ASH mark followed by an animated app-launch welcome
- [x] Native scroll/safe-area correction: one bounded scroll surface with no duplicated top or bottom inset
- [ ] Marketplace = marketplace + social feed (posts, photos, likes, comments) in the Market tab
- [x] First-launch welcome animation ("Welcome to ASH", ~2.4s, reduced-motion aware) + onboarding coach marks (Next/Skip), shown once per device
- [x] Profile avatar + menu in the header (profile, settings, sign out)
- [ ] Smart auth: browse publicly, sign in only for protected actions, return to the exact action
- [ ] Profile avatar + menu in header
- [ ] Deal-claim confirmation screen (provider, directions, redemption, contact)
- [ ] TchokoPay insufficient-funds message + retry
- [ ] Booking availability in provider timezone; booking screen scrolling
- [ ] Provider Studio section save/collapse
- [ ] Notification sound/vibration toggles
- [ ] Image compression/thumbnails, performance pass
- [ ] Legal documents refresh (Privacy, Terms, Fair Use)
