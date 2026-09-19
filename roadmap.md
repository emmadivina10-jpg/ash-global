# Roadmap

## Reactions, hashtags, and tagging
- [ ] Audit current social, comment, story, notification, profile, block, search, and feed systems
- [ ] Add secure database structures, policies, validation, indexes, notifications, and realtime support
- [ ] Implement post and comment reaction UI with picker, counts, and live updates
- [ ] Implement hashtag parsing, suggestions, search, pagination, and trending from real activity
- [ ] Implement mentions, photo tags, permissions, review, removal, notifications, and profile Tagged section
- [ ] Add private story reactions and replies where supported
- [ ] Verify security invariants and existing-system regressions
- [ ] Produce final completion audit
- [x] Refine mobile navigation to exact compact ASH Hub reference without changing routes or behavior

## ASH Markets V1
- [x] Replace the existing Market screen with the focused informational ASH Markets V1 experience
- [x] Rename the mobile Market label to Markets without changing navigation structure
- [ ] Verify Markets interactions, responsive layouts, and existing route stability

## Social identity and Messages hardening
- [x] Replace generic member/client labels with resolved profile names throughout member-facing surfaces
- [x] Add shared online presence and new Story/Spotlight avatar indicators
- [x] Restyle the ASH verification badge as a solid Facebook-like badge
- [x] Support recursive comment replies and reactions at every reply depth
- [x] Make group creation and member management complete inside Messages
- [x] Rebuild Archived and Locked chats as dedicated WhatsApp-style list surfaces
- [x] Polish branded chat bubbles, wallpapers, and mobile thread viewport stability
- [x] Improve tab transition speed without weakening fresh-data behavior
- [ ] Verify social and chat flows on phone and desktop

## FX instructors and Markets publishing
- [ ] Add free FX instructor applications with country, ID document, and selfie capture
- [ ] Add manual admin review with a stated 24–48 hour review window
- [ ] Add approved instructor profiles, branded instructor badges, and market publishing
- [ ] Cross-publish eligible FX Spotlights into the main Feed without duplicating records
- [ ] Add premium Markets discovery/detail surfaces and admin review reporting

## Wallet, finance, admin, and landing follow-up
- [ ] Add Feed card-balance preview with a direct Wallet action
- [ ] Make gold the default wallet-card theme and ASH card the alternate theme
- [ ] Add stored TchokoPay fee/net reconciliation before showing provider deductions
- [ ] Refine the admin dashboard around platform funds, reserved funds, and reconciled fees
- [ ] Refresh the landing experience with a compact app view and richer web view
- [ ] Complete every supported language dictionary; retain explicit English fallback until translated
