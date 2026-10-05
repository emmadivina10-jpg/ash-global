# Roadmap

## Tab space and flight dates
- [x] Remove shared top bars from Messages, Services, Flights, Menu and enlarge Messages controls
- [x] Keep stacked flight dates inside their panel
- [x] Verify signed-in four-tab layouts, contained flight dates, no horizontal overflow or runtime errors, and clean preview build; nothing published

## Employee photo and analytics visibility
- [x] Resolve private employee photos for the workspace and identity check, and refresh after profile edits
- [x] Show the existing authorized performance graph on My Workspace using recorded data only
- [x] Verify signed-in analytics section and insufficient-data state, clean runtime and build, and no mobile overflow; nothing published
- [ ] Verify an existing saved employee photo loads end-to-end — tested employee has no saved photo; no profile records changed during this check

## Employee Team chat refinement
- [x] Show current employee names, positions and signed profile photos beside messages, with initials when no photo is available
- [x] Verify photo rendering, initials fallback and desktop/phone chat layout using isolated sample messages; functional lint and preview build pass
- [ ] Verify real saved employee photos in signed-in Team chat — no authenticated staff session used in this check
- [x] Apply selected charcoal-and-emerald channel sidebar and conversation layout without changing messaging or permissions
- [x] Verify isolated desktop/phone layout, channel search, selection, composer and back navigation; lint and preview build pass; nothing published
- [ ] Verify signed-in staff sending and dialog closing — blocked: no authenticated employee console session available for this check

## Current verification
- [x] Audit existing employee authentication and department dashboards without changing accounts, passwords, roles, or the Apple review account; CEO-only report verified in preview (11 supplied passwords mismatch; Trust works; employee Overview restricted)
- [ ] Confirm on a physical iPhone that the full-screen post comment input stays above the keyboard (preview-only fix in place)
- [x] Inspect the existing report destination, security, duplicates, and moderation wiring against the uploaded checklist; physical two-account/staff tests remain pending

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
- [x] Place the Menu lines in front of the profile photo
- [x] Remove newly connected or pending members from Add Friend suggestions
- [x] Place the notification bell in front and allow notifications to be deleted
- [x] Allow one optional job image and professional job-referenced messaging
- [x] Shorten network level labels to L1/L2/L3 and show member photos and names
- [x] Make Professional Studio availability and publish actions publish the profile

## Canonical legal and privacy framework
- [x] Verify current product, data, payment, AI, moderation, personalization, and deletion behavior
- [x] Rewrite Terms of Service and Privacy Policy with confirmed owner decisions
- [x] Add Community Guidelines; Marketplace, Services, Booking & Refund Policy; Referral & Wallet Terms
- [x] Rewrite Account & Data Deletion and align Support & Contact
- [x] Update all legal links, consent, settings, and submission records
- [x] Remove conflicting ages, retention terms, support URLs, entity wording, and unverified geography
- [x] Verify every policy page, route, factual statement, and production build
- [x] Deliver complete final text of all seven documents

## Notifications, entry routing, support chat, and founder profile
- [x] Correct notification destinations using their real event data
- [x] Route completed sign-ins and returning signed-in members to Feed
- [x] Add Support Chat to every member’s Messages using the existing support inbox
- [x] Show awaiting support counts beside Support in the admin console
- [x] Add the confirmed CEO biography to ASH AI’s founder knowledge
- [x] Verify member and admin flows without changing unrelated screens
- [ ] Facebook Page connection for Advertising dashboard — blocked: needs ASH's Meta developer app (App ID + Secret) and Meta app review.
- [ ] Staff dashboards: publish only after owner tests remaining seats (blocked on owner approval).

## Dashboard consolidation brief (36 sections)
- [x] Support message fix: per-employee unread tracking so every support employee sees new customer messages
- [ ] Full read-only architecture audit + consolidation plan (35 console pages → 8 core groups) — awaiting go-ahead
- [ ] Auto-assignment, SLA reassignment, realtime presence (brief §7, §19, §22–24)

## Trust & Verification + Finance brief (32 parts)
- [x] Part 1: Trust & Verification menu section grouping existing pages (same pages, links unchanged)
- [ ] Trust Scores, Suspicious Activity, Investigations, Audit History sub-pages
- [ ] Finance parts 2–30 (periods, archive, statements, finance chat) — awaiting choice of starting part
- Expansion (Josephine): pipeline, tasks, dashboard, Submit to CEO done. Pending: research reports, outreach CRM, letters+approval, Expansion AI.

- [x] Market Research Center: expansion_research table (service-role, deny-all RLS), research reports per opportunity, submit-to-CEO flow, panel in ExpansionWorkspace (preview only)
- [ ] Next: Outreach CRM, Letters + CEO approval, Josephine profile/KPIs, Expansion AI
- [x] Telma unified Advertising & Marketing Command Center (old content/growth pages kept until verified)
- [ ] Content Safety & Integrity in Trust & Verification (later phase)

## Feed posting and flight banner
- [x] Replace the Feed heading with a plus that opens existing posting controls in a dialog
- [x] Replace the inline composer with a plane banner; signed-in preview verified dialog, gallery/camera controls, caption and Post enabled state; no post sent, nothing published
