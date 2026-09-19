# Social identity and Messages hardening

## Scope
This release implements the chosen first priority only: social identity, comments, and Messages. FX instructors, finance reconciliation, wallet changes, landing-page changes, and broader admin work remain queued as separate protected phases.

## Changes
- Resolve real profile names wherever the app currently falls back to “ASH member” or “ASH client.” Use a neutral unavailable-name state only when the underlying profile is genuinely missing.
- Extend the shared avatar presentation with an online green dot based on recent app presence, plus an ASH-color ring for members with a current Story or Spotlight. Apply it consistently in chats, profiles, feed, groups, notifications, reviews, and member search where the necessary data is available.
- Replace the translucent verification mark with a solid, crisp Facebook-like scalloped badge and high-contrast check, while retaining ASH’s semantic brand color.
- Allow members to reply at every comment depth. Preserve the existing parent relationship, render nested threads safely on narrow screens, and keep comment/reply reactions available at each level.
- Bring group creation into Messages with real member search, selection, creation feedback, owner member-management controls, and clear errors.
- Present Archived and Locked chats as dedicated inbox views. Locked chats stay absent from normal search and become visible only after the correct PIN; they can be hidden again without exposing titles or previews.
- Refine chat surfaces with readable premium ASH user bubbles, a polished default wallpaper, stable mobile sizing above the tab bar and keyboard, and removal of the lower-screen sliding/cut effect.
- Reduce avoidable navigation latency by preloading primary tabs and tuning stale/refetch behavior for inbox and social identity data without showing stale private content after sign-out.
- Expand the currently partial non-English dictionaries for all text touched in this release. A full application-wide translation is a separate content project because most existing screens currently contain English/French literals.

## Backend and privacy
- Reuse existing profiles, presence timestamp, stories, Spotlights, comments, conversations, chat preferences, groups, and membership records.
- Add only narrowly required presence/read support if the current policies do not expose safe online-state data to signed-in members.
- Do not modify payment, wallet, referral, booking, TchokoPay, authentication, or unrelated content rules.
- Online means recently active in the app, not continuous device tracking; no exact last-seen time is exposed.

## Validation
- Verify real names and avatar states across profile, feed, comments, search, notifications, direct chats, and groups.
- Verify online dots appear and expire correctly; Story/Spotlight rings open the correct content.
- Verify recursive replies and like/unlike at multiple depths with immediate updates.
- Verify group create, add-member, conversation, and owner controls from Messages.
- Verify archived and locked views, PIN reveal/hide, deletion, and ordinary global member search.
- Verify chat scrolling, keyboard opening, bottom navigation clearance, and backgrounds on phone; verify inbox and threads on desktop.
- Confirm primary tab transitions are responsive and the app builds cleanly.

## Deferred approved direction
- FX instructors will use free manual admin review of selfie plus government ID, with a displayed 24–48 hour review window.
- TchokoPay deductions will not be claimed as synchronized until provider fee/net fields are ingested and stored from authoritative responses.