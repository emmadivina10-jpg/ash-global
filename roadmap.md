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
- [x] Verify Markets interactions, responsive layouts, and existing route stability

## Social identity and Messages hardening
- [x] Replace generic member/client labels with resolved profile names throughout member-facing surfaces
- [x] Add shared online presence and new Story/Spotlight avatar indicators
- [x] Restyle the ASH verification badge as a solid Facebook-like badge
- [x] Support recursive comment replies and reactions at every reply depth
- [x] Make group creation and member management complete inside Messages
- [x] Rebuild Archived and Locked chats as dedicated WhatsApp-style list surfaces
- [x] Polish branded chat bubbles, wallpapers, and mobile thread viewport stability
- [x] Improve tab transition speed without weakening fresh-data behavior
- [x] Verify social and chat flows on phone and desktop

## FX instructors and Markets publishing
- [x] Redesign Markets around Overview, compact snapshots, shortcuts, and Latest Market Updates
- [x] Add free FX instructor applications for Cameroon and Nigeria with private ID and selfie capture
- [x] Add manual admin review with a stated 24–48 hour review window and provider-ready KYC fields
- [x] Add approved instructor profiles, branded instructor badges, follows, and market publishing
- [x] Reuse social posts, reactions, threaded comments, reposts, and saves for Markets content
- [x] Link eligible FX Spotlights to Market Updates without duplicate content records
- [x] Add premium Markets panels, detail/profile screens, and admin review reporting

## Wallet, finance, admin, and landing follow-up
- [x] Replace the floating ASH “A” launcher with a card-shaped Wallet launcher and real balance preview
- [x] Reorder mobile navigation to Feed, Services, Earn, Messages, More and open FX Analytics from Feed
- [x] Restyle mobile navigation as a flat Facebook-style edge-to-edge tab bar
- [ ] Keep Cool ASH Card as the default wallet-card theme and Real ASH Card as the alternate theme
- [ ] Add stored TchokoPay fee/net reconciliation before showing provider deductions
- [ ] Refine the admin dashboard around platform funds, reserved funds, and reconciled fees
- [ ] Refresh the landing experience with a compact app view and richer web view
- [ ] Complete every supported language dictionary; retain explicit English fallback until translated

## Spotlight, Feed, and Menu refinements
- [x] Resolve Spotlight member names and profile pictures from the shared member directory
- [x] Collapse Feed and Spotlight text after two lines with See more and See less controls
- [x] Remove the descriptive sentence under the Feed title
- [x] Replace the More sheet with a dedicated Facebook-style Menu page and profile-photo Menu tab
- [x] Verify the mobile Feed and Menu with the signed-in profile

## Automatic Story expiry
- [x] Keep Stories visible for exactly 24 hours
- [x] Remove expired Story media before deleting its database record
- [x] Schedule private cleanup every five minutes with retryable media failures
- [ ] Verify the published cleanup callback and remove existing expired Stories

## Menu, social, jobs, network, and studio fixes
- [ ] Place the Menu lines in front of the profile photo
- [ ] Remove newly connected or pending members from Add Friend suggestions
- [ ] Place the notification bell in front and allow notifications to be deleted
- [ ] Allow one optional job image and professional job-referenced messaging
- [ ] Shorten network level labels to L1/L2/L3 and show member photos and names
- [ ] Make Professional Studio availability and publish actions publish the profile
