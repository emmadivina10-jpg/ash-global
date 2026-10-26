# Roadmap

## Four illustrated app welcome screens (Oct 20)
- [x] Replace photos with texting, shopping/delivery, travel and wallet drawings; curved slanted image edge and staggered text transitions
- [x] Lower the screen label (People & moments / Market & services / Flights · Coming soon / Wallet & payments) so it sits closer to the text beneath it
- [x] Verified all four screens at 393/360px, EN/FR, light/dark, four indicators, skip/next, join/login, reduced motion, loaded illustrations and curved clipping; no overflow/runtime errors, lint clean, 41 payment safeguards pass, preview build OK; nothing published

## App welcome-screen refresh (Oct 20)
- [x] Replace text-only phone welcome screens with editorial imagery, prominent ASH branding, clearer typography and consistent rounded actions; preserve entry, payment and compact launch behavior
- [x] Verified both screens at 360/393/430px, EN/FR, light/dark, skip/swipe/dots, join/login destinations, reduced motion and unchanged desktop; no overflow/runtime errors; lint clean, 41 payment safeguards pass, preview build OK; nothing published

## Landing wears the app's own colours (Oct 20)
- [x] Drop the separate website palette (deep purple, gold, charcoal, black buttons) and derive every landing colour from the app's own theme tokens, so light and dark follow the app automatically
- [x] Verified in both themes: buttons carry the app's primary colour, page wash and closing band use the app's emerald/magenta/violet blend, support button matches the app's floating-orb style; legibility 5.28 light / 6.32 dark, no overflow or runtime errors; preview build OK; nothing published

## Landing button colour and WhatsApp support (Oct 20)
- [x] Replace the green/blue/violet button blend with solid black (rounded edges, white text, hover lift); dark mode keeps black with a light hairline edge so buttons stay visible
- [x] Add round floating WhatsApp support button (+1 365-384-5986) with expanding label and footer support link; verified black fills, chat link, hover reveal, dark mode, no overflow or runtime errors; preview build OK; nothing published

## Premium desktop landing brief (Oct 20)
- [x] Refine the public desktop page with purple/gold accents, social-first product imagery, ecosystem, steps, discovery, eligible referrals/wallet and real navigation; preserve phone entry and payment logic
- [x] Check 1280/1440/1920px desktop, 834px tablet and 390px phone, eight gallery images, enlarged viewer, registration and sign-in return destinations, light/dark and public links; no horizontal overflow or runtime errors; lint clean, 24 safeguard tests pass, preview build OK; nothing published

## Classic desktop landing (Oct 20)
- [x] Use eight supplied screenshots and prominent ASH Global Technologies branding; preserve mobile onboarding, auth and payment availability
- [x] Verify all eight gallery images, enlarged viewer, download notice, light/dark and 800/1280/1920px layouts; phone onboarding unchanged; 13 payment tests pass, preview build OK; nothing published

## Permanent account deletion (Oct 20)
- [x] Verify current deletion: approval only closes the profile; live foreign keys would cascade-delete financial records or block login deletion
- [x] Add isolated restartable erasure orchestration and block misleading live approvals; no existing accounts, files, schema or money changed
- [ ] Install cascade-safe persistence and retention cleanup — blocked by missing legally approved record/field retention schedule and expiry/hold rules
- [ ] Verify genuine erasure end-to-end in a positively isolated backend before activation; fixture tests do not establish live deletion

## Newly published Feed visibility (Oct 20)
- [x] Read-only live function check: social_feed caps results at 60, below the 120-post client window; the reported slice exclusion does not occur in this deployment. Isolated 240-row reproduction is not the live configuration.
- [x] Discard tentative changes after live verification contradicted the finding; existing rotation tests rerun. No app changes, production posts or publication.

## Mobile payment documentation check (Oct 20)
- [x] Check entry screens and current app/reviewer documents: MTN/Orange via TchokoPay only where eligible; card/bank coming soon; preserve website availability and payment safeguards
- [x] Phone opening/payment slide and four public policies verified; desktop availability separately labelled; 67 isolated payment-policy/safeguard tests passed, preview build OK; no publication or submission

## Mobile card/bank coming soon (Oct 19)
- [ ] Gate mobile preview/native card collections, setup, reminders and bank withdrawals; preserve MTN/Orange, website and live-transfer guard
- [x] Align mobile Stripe wording and reviewer notes; isolated availability tests and phone opening/public-policy checks pass (Oct 20)
- [ ] App Store clearance — blocked by digital billing/deletion decisions, reviewer access and signed-build/privacy/screenshots checks; no submission authorized

## Staff online status (Oct 15)
- [x] Await lazy heartbeat requests after member identity loads; retry every minute and on visibility/network/focus return; shared admin/employee directory shows green Online and muted Offline
- [x] Fifteen presence/insights tests pass; signed-in Feed sends successful heartbeat (204), database confirms fresh presence; preview build OK; no publishing or access-policy changes
- [ ] Staff directory end-to-end and installed-phone check — available member session cannot unlock staff console; requires staff sign-in and a new native build

## Feed opening rotation (Oct 15)
- [x] Correct member/load-specific ordering for Feed posts and Spotlight surfaces; remove newest-first rail override and reset seed on explicit refresh
- [x] Eight regression tests pass, including multiple member keys; signed-in preview shows different first posts/Spotlights across three fresh loads, stable scrolling and viewer dismissal back to Feed; preview build OK, no runtime errors, not published
- [ ] Two real members on separate devices — requires a second authorized member session/device; multi-member ranking tested with isolated inputs only

## Official ASH logo replacement (Oct 13)
- [x] Replace shared logo, notification/email favicon references, social preview, favicon, Apple touch icon and seven CDN-backed web app icons with supplied artwork
- [x] Update Android/iOS app icons and opening source imagery; retain compact centered iOS caption and keep disabled duplicate splash bitmaps blank
- [x] Browser confirms supplied logo loaded, seven icon URLs return 200, no runtime errors; native XML valid and preview build OK; no publishing
- [ ] Installed phone icon/opening check — requires a new native build; existing installed apps and published website remain unchanged

## Feed Spotlights and WhatsApp chat flow
- [x] Interleave existing eligible Spotlights among Feed posts, show real provider ratings, open exact selected item in shared Spotlight viewer
- [x] Coordinate exclusive voice playback, automatic next voice note, and stop playback while recording
- [x] Move voice avatar inside bubble and add swipe-right quoted replies for text and voice
- [x] Twelve focused tests pass; isolated browser confirms text/voice swipe replies, audio auto-next/exclusivity/recording stop, exact Spotlight opening, scrolling/dismissal and no overflow; preview build clean, lint has no errors; no publishing or financial changes
- [ ] Real member Feed and two-party saved reply check — blocked by owner's terms-consent screen and lack of approved test conversations; no agreement accepted or real messages sent

## WhatsApp-style message deletion choices
- [x] Replace inline deletion with a focused choices dialog; preserve sender-only deletion for everyone
- [x] Implement device-local, account-scoped Delete for me without changing shared message records
- [x] Ten regression tests pass; isolated phone menu and personal-choice dismissal verified; lint and preview build clean; no publishing or real messages deleted
- [ ] Real two-member deletion verification — requires approved test conversations; no actual member messages deleted

## Message tab, filter switch and opening screen (Oct 13)
- [x] Show live unread incoming-message count on Messages navigation without loading the full inbox
- [x] Keep comment filter switches capsule-shaped on roomy member screens
- [x] Remove the remaining large ASH mark from in-app welcome, entry loading and native fallback
- [x] Eleven message/support regression tests pass; isolated phone visuals verify capsule switch in both states and logo-free opening; runtime and build clean; preview only
- [ ] Real incoming-message/read badge check — blocked by member terms-consent; no agreement accepted on the user's behalf
- [ ] Installed phone opening verification — requires a new native/TestFlight build; no binary distributed

## Larger Stories and Compass presentation (Oct 12)
- [x] Enlarge Stories/Spotlight cards and separate plus from creation labels; polished blurred fading posting panels
- [x] Rename the top heading Feed; keep tight section spacing
- [x] Blur behind Compass, dismiss on outside tap, and add full booking tracking access from Map
- [x] Isolated preview checks: larger creation card, Story chooser/composer, 12px blur, Compass outside dismissal, tracking link, phone overflow and runtime checks; no publishing or financial changes
- [ ] Real signed-in tracking/feed verification — blocked by member terms-consent; no agreement accepted on the user's behalf

## Embedded tracking and compact feed (Oct 12)
- [x] Embed the live booking workflow in Compass Map with connected green payment/trip/verification progress; preserve payment and location permissions
- [x] Remove Feed selectors, use Ash Glow text without header divider, and tighten Stories-to-post spacing
- [x] Isolated desktop/phone checks: map tiles loaded, Map/Wallet switching stays inline, compact stories and no overflow/runtime errors; 28 booking/payment/location tests pass; preview build OK, no publishing or financial changes
- [ ] Real signed-in booking/feed check — blocked by member terms-consent; no agreement accepted or booking/payment action performed on the user's behalf

## Marketplace continuity and wallet (Oct 12)
- [x] Reuse seller/member chats in both directions and restore missing peer-photo fallbacks using the safe member directory; no privacy changes
- [x] Remove wallet-card glow/decorative placeholders and invented card number; preserve balances and payout actions
- [ ] Goods Buy/cart checkout — blocked: public Market currently exposes service rows; inventory has no customer product checkout or multi-item order flow. Requires separately approved product/order/payment work; do not relabel services or pretend combined payments.
- [x] Twelve conversation/wallet tests pass; preview build OK; no payments or publishing
- [ ] Signed-in chat and wallet visual verification — blocked by the owner's terms-consent screen; no agreement accepted on their behalf

## Policy and store alignment (Oct 11)
- [x] Audit payment availability, verification, privacy and native store requirements without changing live settings or funds
- [x] Align canonical policies and README/native/submission/inventory/security docs; distinguish Stripe, Cameroon MTN/Orange, conditional banks and unsupported M-PESA
- [x] Prepare Apple/Google submission answers and STORE-READINESS.md with explicit billing, deletion, permissions, payout and signed-device blockers
- [x] Verify eight public policy/help routes and welcome metadata without login/overflow/runtime errors; visually inspect policy/support screenshots; 94 focused tests pass and preview build OK; no publication/submission

- [ ] Store submission clearance — blocked: compliant digital billing/earning treatment, full account/data erasure, native permission/release testing, reviewer inputs and authorized payout verification are unresolved; documentation alone cannot clear them
- [ ] Activation help-copy correction — card top-ups settled outside XAF cannot cover XAF activation; existing screen suggestion needs a separately scoped presentation update

## Wallet dropdown and ASH Investment (Oct 11)
- [x] Replace wallet currency chips with a dropdown and 30 display currencies without converting balances
- [x] Add ASH Investment after the Messages PIN action with an inactive, illustrative three-line chart and currency/time controls
- [x] Eight currency tests pass; isolated browser verified 30 options, EUR selection, three curves, period/currency controls and return navigation without runtime errors; preview build OK; no funds/settings changes or publishing
- [ ] Signed-in Messages-to-Investment check — not performed; isolated navigation/controls verified without accepting member terms or changing account records

## Website app screenshots (Oct 10)
- [x] Replace generic website images with supplied Feed, Messages and Flights screenshots; rotate single/paired views with blur/fade, preserving phone onboarding
- [x] Add truthful app download invitation; browser verified images, paired transitions, controls, no overflow/runtime errors; preview build OK, not published
- [ ] Connect public App Store/Google Play downloads — blocked: owner has not supplied released store links; current button explains availability and offers web access

## Welcome and wallet setup (Oct 10)
- [x] Replace welcome tiles with four individual fading product previews and explicit Stripe/card + mobile-money availability
- [x] Add visible bank/card payout setup panel and recurring reminder with permanent opt-out; preserve disabled payouts
- [x] Welcome browser check: four labels, images loaded, Stripe visible, no overflow/runtime errors; card disclosure checked in isolated UI; 36 reminder/payout policy tests pass; preview build OK; no financial changes or publishing
- [ ] Signed-in bank onboarding end-to-end — blocked by existing disabled live onboarding; no account created, card saved or payout enabled

## Live service-code rejection (Oct 10, 19:47)
- [x] Diagnose published RPC error 23514: transactions_type_check excluded all four booking trigger types
- [x] Obtain explicit approval and apply narrow constraint repair only; no financial rows changed, codes consumed or transfers sent
- [x] Reproduce rejection in isolated PostgreSQL and pass 17 repair/verification tests; confirm live constraint and clean preview build
- [ ] Provider retry with customer code — pending provider action; real service completion was not performed on their behalf

## Booking history and language cleanup (Oct 10)
- [x] Add personal archive, restore and permanent history removal without changing bookings or financial records; additive preferences applied to shared backend
- [x] Make Verify Customer open Received bookings and the selected code form
- [x] Expand static dictionaries to 1,738 entries per additional language and connect existing language-aware member labels
- [ ] Finish full-app translation coverage: consent safety list, structured category labels, legal copy, some dialogs and dynamic messages remain bilingual; no claim of complete translation
- [x] Replace overlapping Soon badges with compact accessible symbols
- [x] 17 tests passed; isolated archive/restore/permanent-removal browser interactions passed without writes; French/Spanish/Arabic checked, Arabic RTL works; preview build OK, not published
- [ ] Signed-in booking list and code-focus end-to-end check — blocked by account terms-consent screen; no agreement accepted on user's behalf

## Service verification and native presentation (Oct 10)
- [x] Fix service-code verification without enabling Stripe transfers or changing live financial records; missing transfer table confirmed by read-only query, authorized atomic code RPC preserved
- [x] Remove duplicate in-app banners and native realtime-to-local duplication; preserve native remote banner ownership and APNs registration callbacks
- [x] Replace iOS big-logo opening with smaller ASH mark and bottom ASH GLO wordmark; skip second native WelcomeIntro; XML validated
- [x] Move Compass hiding inside its panel; existing Settings restoration preserved; isolated browser hide/restore checked with no runtime errors
- [x] 51 targeted tests passed and preview build OK; no publishing, real code consumption, database writes, transfers or native distribution
- [ ] Closed-app sender photo + ASH badge — blocked: remote APNs/FCM sender is not configured in this repository, and iOS needs a communication notification service extension plus signed device testing
- [ ] Verify iOS opening on device — blocked: requires a new signed TestFlight build; current installed binary cannot change via preview edits
- [ ] Verify this booking's real code completion — blocked: provider must submit the private customer code after publishing; no service completion or wallet credit performed on the user's behalf

## Shared staff member insights and AI support
- [x] Shared registered-member/today counts, paginated name/photo directory and conservative presence on every staff console
- [x] Authorized audited read-only member review for Finance/Revenue, Trust, Support and admins; existing department action links
- [x] Prepared staff/member-scoped saved AI assistance and Support copy-to-draft suggestions; no automatic reply sending
- [x] Staged additive metrics/history safeguards without applying shared-database changes; 199 regression tests passed, functional lint and preview build clean; unauthorized AI request rejected with 403
- [ ] Activate and validate 30-day active metrics and saved AI — blocked until draft acceptance is separately approved; new structures not installed, live AI call and staff signed-in workflow unverified
- [ ] Complete comprehensive account coverage beyond current bookings, transactions, support, posts and referrals — pending scope; current AI explicitly states its limited evidence

## Booking payment clarity and recovery
- [x] Replace misleading payment actions with one payment entry, clear confirmation feedback and direct tracking access
- [x] Prevent overlapping automatic mobile-money checks; card/bank refresh saved evidence; pending, failed and unavailable outcomes are visible
- [x] 82 focused tests passed; changed-file functional lint clean; isolated phone/desktop confirmation notice checked without overflow/runtime errors; no financial operations or publication
- [ ] Confirm genuine Stripe payment settlement — blocked by TD webhook alignment and staged safeguards requiring separate approval

## Payment return, floating tracking and Menu badge
- [x] Correct app-owned checkout return origins and open booking tracking; existing payment verification remains authoritative
- [x] Add floating Map/Wallet tabs, a round reopen control, and a visible three-line profile Menu badge; phone panel clears the round control
- [x] 189 regression tests passed; isolated desktop/phone tab switching, minimize/reopen and Menu badge checked without runtime errors; preview build OK; nothing published
- [ ] Genuine post-payment arrival and Google Maps rendering — unverified: no payment initiated; Google Maps must be checked on an authorized deployed origin

## Support conversation and notification fixes
- [x] Make Support a conversation-first inbox with message bubbles, search, anchored composer and per-conversation drafts
- [x] Repair resolved/answered Support counts, exact staff unread count, scoped read persistence and notification feedback; future ticket alerts open their conversation without schema or financial changes
- [x] Full regression suite: 185 tests passed; changed-file lint clean; staff access check has no runtime errors; no publication
- [ ] Signed-in Support sending and badge verification — blocked: no authenticated staff session available; no staff credentials or records changed

## Stripe booking payment and provider transfer completion
- [ ] Install and validate staged migration in a positively isolated backend — blocked: the separate safeguards draft also targets production; no migration or validation rows applied
- [x] Validate all 11 Marketplace webhook events, processed-event replays, refund/dispute holds and transfer reconciliation using isolated, network-blocked tests; 175 total tests pass
- [ ] Confirm TD destination and signing-secret association — endpoint absent on TD; secure association requires a real TD-signed delivery
- [x] Continue preview-only onboarding validation, separate status reporting and failed-transfer/payout reconciliation; helper-level live transfers/onboarding remain disabled
- [x] Full suite: 147 tests passed across 13 files; production unsigned webhook still rejects with HTTP 400; Replit configuration untouched
- [x] Read-only audit of configured Stripe account, webhooks, onboarding, transfers, database release and local payout handling
- [x] Verify 15% calculations and signature rejection without sending money
- [x] Stage verified-webhook settlement, service-code gated transfers, actual transfer/payout records and default-off controls in preview
- [x] Run 31 commission, signature and release-policy tests without real financial transactions
- [ ] Apply and validate staged database safeguards — requires separate approval because preview shares the production database; automatic release is disabled
- [ ] Verify atomic settlement/concurrency and refund holds against the approved schema — blocked until safeguards can be installed in an isolated approved environment
- [ ] Resolve TD Marketplace webhook mismatch — requires approval to change live Stripe webhook configuration, no duplicate integrations
- [ ] Verify supported connected-provider onboarding and payout destination — no connected providers currently configured; no real transfers authorized

## Desktop Messages and Flights
- [x] Extend Messages to the right and bottom edges of the desktop content area, preserving phone/tablet layouts
- [x] Restore Flights in desktop navigation, linking to the existing /flights page
- [x] Check isolated desktop layout at 1280/1920px: right/bottom edges reached, no overflow/runtime errors, preview build OK; nothing published
- [ ] Signed-in Messages and Flights interaction check — blocked by the account's terms-consent screen; no legal acceptance recorded on the user's behalf

## Final app alignment and publicity report
- [x] Restore profile-first Menu icon with bottom-right three-line badge
- [ ] Fix browser message composer focus jump
- [ ] Audit wallet, MTN/Orange Money and dashboard financial connections without altering money logic
- [ ] Show Coming soon on Flights
- [ ] Align dashboard, landing, sign-up and login colours; fix joined landing labels
- [ ] Repair confirmed missing dashboard connections only
- [ ] Align documents with actual app flows and create a detailed publicity-ready report
- [ ] Verify changed screens, regressions and preview status; do not publish

## Verified identity protection
- [x] Enforce normalized protected verified names and exact JPG/PNG file/pixel copies, with durable denied-attempt tracking
- [x] Show red Denied, restrict access, and ban/log out on the fourth attempt
- [x] Limit identity restoration to authorized admin and Trust & Verification staff; member mutation access denied
- [x] Verify enforcement without publishing: rollback-only four-strike/restore database test, isolated denial/logout UI, 38 unit/regression tests, clean preview build
- [ ] Detect cropped, resized, or edited copies — not implemented; current comparisons are exact file/decoded-pixel matches
- [ ] End-to-end real-account photo/ban/restoration check — blocked: no active verified profiles available; no member data changed during tests

## Message profile fixes and dual-colour accents
- [x] Fix member-profile navigation, inbox strip and full-width composer
- [x] Apply update-aware avatar rings, dual-colour tabs/wallet, light Market/Extras accents and Menu watermark
- [x] Verify profile interaction and layouts without publishing — isolated chat fixtures at 390/895/1280px, full-width composer, no overflow/runtime errors, 45 regression tests and clean preview build

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
- [x] Refresh the landing experience with a compact app view and richer web view — classic desktop ASH Global Technologies redesign with eight supplied screenshots; phone onboarding preserved (Oct 20)
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

## Services / Market and tab sound
- [x] Replace tab chime with short Facebook-inspired tap while retaining mute settings
- [x] Move tutoring banner into rounded shortcut immediately after Netflix
- [x] Add Market mode with matching tab label/icon and existing real marketplace browsing workflows
- [x] Verify mode switching, filters, layout and sound/mute behavior; do not publish

Market checks: signed-in Services/Market switching and reload persistence, tutoring after Netflix and destination, real listing detail navigation, search/city filters, selling chooser, no mobile/desktop overflow or runtime errors; tab mute verified; 45 commerce/region/format tests pass. Sound similarity requires listening by the owner; no publication.

## Messages and Market refinement
- [x] Archive-only rows, useful new-chat menu, circular photo frames, and subtle member-wide ASH/green surfaces; verified with isolated browser content, no records changed or publication.
- [x] Spacious WhatsApp-inspired Messages with fading emerald branding
- [x] Animated blurred chat actions and avatar Story/Spotlight choices
- [x] Market default and dedicated Extras app grid with ASH-owned branding
- [x] Verify themes, layouts, interactions and regressions without publishing

Messages/Market checks: signed-in Market default and reload persistence, Extras grid and Learn navigation, phone/desktop and both themes, no overflow/runtime errors, and 45 regression tests pass. Chat options, 12px backdrop blur, avatar choices, Story/Spotlight viewers checked with isolated browser sample content because the tested account has no conversations; no records changed, no messages sent, nothing published.
- [ ] Stripe webhook: user adds URL in Stripe, then saves signing secret (blocked on user)

## Provider payout brief (Oct 8)
- [x] Verification code issued on paid booking; provider enters it; earnings released to wallet once (12% default commission, locked per booking)
- [ ] CEO/Finance commission setting (12%/15%) screen
- [ ] Booking-confirmed screen + full receipt with code
- [ ] Booking tracking (on the way / arrived) with real location
- [ ] Provider/customer KYC via an identity provider (needs provider choice)
- [ ] Wallet redesign (available / pending / earned / spent)
- [ ] House Rentals before Properties; globalization items
- [ ] Direct Stripe Connect transfer at release (blocked: XAF prices vs CAD account; needs decision)

## Unified floating Compass
- [x] Combine Map and Wallet into one draggable, closable ASH-colour control on app and tracking screens
- [x] Isolated desktop/phone checks: Map/Wallet switching, drag without accidental opening, dismissal, restore, viewport bounds; no runtime errors or publishing

## Posted feed photo back button (Oct 21)
- [x] Open posted photos in a full-screen viewer with a visible top-left Back arrow, keeping the feed underneath.
- [x] Signed-in real photo checks at 393px and 1280px: visible Back restores exact feed position; no runtime errors; eight feed tests pass; preview build OK.

## Online dot in member chats (Oct 24)
- [x] Fix member-to-member chats never fetching peer presence (only provider/storefront chats did), so the green dot and "Online" label now show in the chat list and open-chat header.
- [x] Two live accounts in the same chat both show each other's green dot and "Online"; presence heartbeat, database reads and build verified. Nothing published.

## Online dot for non-friend chat partners (Oct 25)
- [x] Root cause: the presence read policy only allowed friends (or self) to see a member's online state, so anyone texting you who wasn't a friend never showed the dot.
- [x] Applied migration 0033_conversation_partners_view_presence: signed-in members can now see the online state of anyone they share a conversation with (direct, listing, or provider chats). Group chats and strangers remain excluded.
- [ ] Live two-account visual confirmation — not performed; signing in as the other member's account was declined. Owner can verify in their own preview: the texting partner's dot appears within about a minute.

## Stripe Connect live activation (Oct 26)
- [x] Enabled the ASH Marketplace webhook endpoint on Stripe (was disabled) with checkout, refund, dispute and transfer events.
- [x] Created a Connect webhook endpoint for provider account and payout events; webhook route now accepts both endpoint signing secrets (STRIPE_WEBHOOK_SECRET + STRIPE_WEBHOOK_CONNECT_SECRET, saved by owner).
- [x] Switched on live provider transfers (code flag + marketplace control) after owner approval; 2 ELIGIBLE bookings await authorized dispatch from the Revenue console.
- [x] 67 Stripe safety tests pass; preview build OK. Nothing published.

## Stripe test mode + payment economics (Oct 26)
- [x] Separate test-mode credentials (STRIPE_TEST_SECRET_KEY, STRIPE_TEST_WEBHOOK_SECRET) with hard isolation: live paths reject test keys, test paths reject live keys; test webhook events verified and acknowledged but never settle.
- [x] Minimum viable charge enforced at checkout from measured ASH fees (2.9% + 30¢, +2% FX): 248¢ CAD / 298¢ USD; below-minimum rejected, prices never silently changed.
- [x] LIVE/TEST badge on the payments console; release view now reports the real transfer flag.
- [x] 78 Stripe tests pass (11 new). No live settings, credentials or money touched; nothing published.
- [ ] Owner: create the test-mode webhook endpoint in the Stripe dashboard (test mode → Developers → Webhooks, same URL) — cannot be created with live keys.
