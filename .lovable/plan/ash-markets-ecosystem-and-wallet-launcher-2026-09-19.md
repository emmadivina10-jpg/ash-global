# ASH Markets Ecosystem and Wallet Launcher

## Scope guardrails
- Keep `/search` as the existing Markets destination and preserve the five-tab mobile navigation and desktop shell.
- Treat the uploaded images as visual direction only: dark ASH logo grading, compact snapshots, prominent updates, restrained glow, and clear mobile hierarchy.
- Do not change Wallet accounting, payments, referrals, bookings, authentication, Messages, Services, or unrelated social behavior.
- Keep all market figures explicitly labeled demo/informational until a licensed live provider is connected. No trading, signals, execution, promises, or personalized advice.

## Increment 1 — Wallet launcher and Markets foundation
- Replace the floating circular “A” menu with a draggable, card-shaped **Wallet** launcher.
- Opening it shows the signed-in user’s real available and pending wallet balances, then offers **Open Full Wallet** to `/wallet`; remove the unrelated AI/support/card fan menu from this launcher.
- Redesign Markets home with the requested heading, concise introduction, Overview/FX/Stocks/Crypto/Indices/Commodities tabs, compact demo snapshots, six shortcut buttons, a prominent Latest Market Updates stream, and a smaller secondary chart area.
- Open Analysis, Updates, News, Calendar, Instructors, and Learn in polished blurred-background panels on mobile, with wider simultaneous content on desktop.

## Increment 2 — Secure instructor applications
- Add a private instructor-application record for each member, limited initially to Cameroon and Nigeria.
- Collect legal/display identity, birth date, profile details, FX experience, years, expertise, background, ID type/document, selfie, and required declarations.
- Store ID/selfie files privately with owner/admin-only access. Never expose these documents on profiles or public Markets content.
- Show Submitted → Under Review → Approved / Additional Information Required / Rejected and the 24–48-hour review expectation.
- Keep separate fields for manual ASH review and future external KYC-provider status/reference; uploads alone never mean identity verified.
- Add an admin-only Markets review queue using the existing role check and audit patterns.

## Increment 3 — Instructor world and shared publishing
- Add a distinct database-controlled **ASH Verified FX Instructor** badge shown only for approved applications.
- Add professional instructor profiles with real profile identity, username, follow state/count, about, experience, specialties, and filtered Markets content tabs.
- Add an approved-instructor-only Market composer for FX Analysis, Market Update, Article, Educational Post, Commentary, Image, Chart, and Spotlight.
- Model each Market Update as a specialized record linked to one existing social post so reactions, unlimited threaded comments/replies, reposts, ownership, moderation, and media reuse the current social architecture.
- Add saving and instructor following with user-scoped access rules.
- Allow the instructor to surface a linked Market Update in Feed without creating a duplicate post, with “From ASH Markets” and “View in Markets.”
- Link eligible FX Spotlight posts to the existing Spotlight record instead of creating another Spotlight storage or engagement system.

## Increment 4 — Detail views and verification
- Add Markets update detail and instructor profile routes with unique metadata, professional layouts, follow/save/share actions, and the existing recursive discussion UI.
- Validate all status, ownership, publishing, document access, and admin decisions in the database/server layer; never trust client-supplied roles or approval state.
- Verify application states, permissions, publishing, Feed/Spotlight references, panels, demo labels, wallet launcher, and all new views on phone and desktop.
- Confirm existing Feed, Spotlight, Wallet, Messages, Services, navigation, and payment flows remain intact.

## Technical details
- Add narrowly scoped Markets tables for applications, approved profiles, Market metadata linked one-to-one to `social_posts`, instructor follows, and saved Market posts; every table receives explicit grants, RLS, indexes, timestamps, and ownership/admin policies.
- Reuse the existing private media bucket for public Market media where safe; use a separate private verification-documents bucket for ID/selfie files.
- Use authenticated server functions for review and approval transitions. Admin access is checked server-side through the existing role function before privileged writes.
- Keep local V1 FX/chart/news/calendar data in `src/lib/markets.ts`, expanding it only with clearly marked sample educational content.
- Use existing Buttons, dialogs/sheets, avatars, verification, social reactions, comments, media safety, and TanStack Query patterns; add no dependency.

## Acceptance checks
- The first mobile viewport reads as ASH Markets, not a chart dashboard: identity, categories, snapshot, shortcuts, instructor invitation, and Latest Market Updates are immediately clear.
- Non-FX categories remain honest Coming Soon states; all sample market/news/calendar data is visibly disclosed.
- Only approved instructors can publish or display the FX Instructor badge.
- Private application documents cannot be read by other members.
- Market interactions operate through existing social records, and Feed/Spotlight connections do not duplicate content.
- The Wallet launcher displays only real balances and navigates to the existing Wallet screen.