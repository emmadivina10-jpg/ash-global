# ASH Glo Reactions, Hashtags & User Tagging

## Goal
Replace simple Likes with real reactions and add secure hashtags, mentions, photo tags, tag privacy, notifications, search, and profile discovery. All activity uses authenticated ASH members and database records; no sample engagement is added. Wallet, payments, referrals, bookings, marketplace, messaging, and existing social content remain untouched except where they consume the new social features.

## Build

### 1. Secure social data foundation
- Upgrade existing post and comment Likes into one-reaction-per-member records supporting Love, Like, Haha, Wow, Sad, and Angry while preserving existing Likes and counts.
- Add normalized hashtags and post/Spotlight associations, text mentions, photo tags with image position, member tag preferences, and tag approval/removal states.
- Add indexes for reaction summaries, normalized hashtag lookup, recent activity, mention lookup, and paginated tagged content.
- Enforce ownership, valid content/member references, block relationships, friendship-only tag settings, one reaction per member/content item, and immutable actor identities in database rules.
- Create notifications only through trusted database actions, never from caller-supplied actor IDs. Suppress self-notifications and update existing notification records where grouping is appropriate.
- Enable real-time updates only on the new engagement records used by the app.

### 2. Post and comment reactions
- Add a reusable ASH reaction control: tap applies the member’s last/default Like; press-and-hold opens the six-reaction picker; selecting again removes; selecting another changes it.
- Show the member’s selected reaction, total count, and a real reaction breakdown.
- Support optimistic updates with rollback and live reconciliation from the backend.
- Apply the same architecture to comments and replies, preserving reply behavior and comment moderation.

### 3. Hashtags
- Parse hashtags from social captions and Spotlight captions at publish time, normalize case, and associate them transactionally with content.
- Render hashtags as profile-safe clickable text without breaking line wrapping or existing post navigation.
- Add hashtag suggestions while composing, using debounced indexed lookup and genuine usage counts.
- Add a paginated hashtag page with Recent, Top, and Photos views. Hide trending when real recent activity is insufficient.
- Extend universal search so `#Toronto` prioritizes its hashtag and plain searches can include matching hashtags/posts without merging marketplace rules into social logic.
- Add hashtag affinity as one bounded recommendation signal alongside engagement, friends, recency, and existing signals.

### 4. Mentions and photo tags
- Add debounced `@username` suggestions for post captions, comments, and replies using real profiles, excluding blocked relationships and ineligible members.
- Render mentions as links to member profiles and generate real mention notifications linking to the exact post/comment.
- Add per-photo tagging during post composition: select a real member, place the tag, review it, and publish it with the post.
- Add “Who can tag me?” controls (Everyone, Friends, No one) and “Review tags first”.
- Let members approve, reject, or remove themselves from tags. Add a paginated Tagged profile section that shows only approved/permitted content.

### 5. Spotlight and story engagement
- Make Spotlight hashtags clickable and searchable.
- Add private story/Spotlight reactions and replies where the existing viewer supports them; notify the owner without exposing unnecessary public counts.
- Preserve story views, audience allow/block controls, hold-to-pause, full-screen navigation, and vendor-contact behavior.

### 6. Notifications and live behavior
- Use the real actor profile, avatar, reaction icon, timestamp, preview, and exact deep link.
- Add reaction, mention, tag, tag-review, story-reaction, and story-reply categories to the existing notification screen.
- Group repeated post reactions intelligently while retaining accurate actors/counts.
- Update visible reaction summaries and notifications through database change subscriptions; no manual refresh required where live updates are available.

## Technical details
- Existing `post_likes` and `comment_likes` data will be preserved as `like` reactions during migration.
- New database tables receive explicit authenticated/service grants, row-level access rules, timestamps, and server-enforced validation in the same migration.
- Caption/comment writes call trusted database functions that derive the acting member from the authenticated session, validate blocks and tag permissions, and synchronize hashtags/mentions atomically.
- User search returns a limited page and requires a minimum query length; hashtag suggestions are similarly limited and debounced.
- Feed queries return reaction totals, breakdowns, and current-member reaction without per-card query loops.
- No finance, wallet, referral, affiliate, payout, booking, or payment table/function is changed.

## Verification and second audit
- Test add/change/remove and duplicate prevention for post/comment reactions, breakdowns, notifications, self-notification suppression, and live updates.
- Test hashtag extraction, case normalization, suggestions, pagination, empty states, direct links, universal search, and real-only trending.
- Test caption/comment mentions, profile links, exact-post notifications, blocked-member exclusion, invalid IDs, and forged actor attempts.
- Test photo tag placement, permissions, friendship rules, review/approval, self-removal, tagged profile visibility, and pagination.
- Test Spotlight reactions/replies while preserving private engagement semantics and story controls.
- Regression-check Feed, Spotlight, comments, reposts, friends, groups, messages, notifications, marketplace, bookings, wallet, and referrals.
- Run database/security scans and report each requested area as ✅ Complete, ⚠️ Partial, ❌ Missing, 🔴 Broken, or 🔒 Protected. Anything without an authenticated end-to-end test will be marked unverified rather than complete.
