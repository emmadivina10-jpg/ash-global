# Social and Messages consistency audit fixes

## Scope
Complete only the unfinished or inconsistent parts of Phases 1 and 2. Preserve the current Feed, Stories, Spotlight, Messages, Groups, wallet, payments, referrals, Markets V1, navigation, and visual design. Later phases remain separate releases.

## Confirmed working
- Shared avatar supports the online dot and Story/Spotlight ring.
- Presence uses one recent-activity source.
- The verification badge is solid and high contrast.
- Comments render recursively and Reply remains available at every depth.
- Messages already has branded bubbles/background, conversation search, archive/lock controls, and inline group creation.
- The latest app build is successful.

## Fixes to complete now
- Remove remaining person-name fallbacks that still display “ASH Member” in wallet/transaction cards and moderation records; retain “ASH members” only where it describes the community generally.
- Apply shared online/update avatar state to the remaining social surfaces that already have a real person identity, especially Story viewer, Spotlight, notifications, member suggestions, group rows, and active chat participants.
- Complete group management from Messages: member search during creation, group name/photo editing, owner-only add/remove controls, and member list access without replacing the existing Groups page.
- Make Archived a dedicated inbox state rather than mixing archived and normal conversations.
- Harden locked chats so ordinary conversation/message queries exclude a user’s locked chats before unlock. Fetch locked metadata/content only through a narrowly validated unlock path; keep titles and previews out of normal search and caches.
- Add device biometric unlock only when a supported native capability is available; retain PIN as the universal fallback.
- Keep chat list/thread dimensions stable above the mobile navigation and keyboard.
- Reduce duplicate inbox polling/profile reads where realtime and cached data already cover the same state, while preserving fallback refresh and immediate optimistic feedback.

## Validation
- Verify Feed, Stories, Spotlight, comments/replies, Messages, Groups, search, profiles, notifications, and current Market identity surfaces with real records.
- Verify online dots expire consistently and update rings appear only for active Story/Spotlight content.
- Verify deep reply chains and reactions at several levels.
- Verify create/edit/add/remove group flows and owner permissions.
- Verify archived navigation and confirm locked titles, previews, and messages are absent from ordinary queries before PIN/device unlock.
- Verify phone and desktop chat scrolling, keyboard clearance, navigation spacing, and clean build/runtime output.

## Deferred phases
Performance work outside social/messages, FX instructor/KYC and publishing, wallet card changes, finance reconciliation, full localization, and landing-page redesign remain in their requested phase order. KYC will require a real provider; finance reconciliation will not claim synchronization until authoritative TchokoPay fee/net data is stored.

## Technical details
- Reuse the current profile, presence, Story/Spotlight, group, conversation preference, and chat settings structures where safe.
- Any database hardening will use explicit grants, RLS, server-side validation, and authenticated functions. No client-only flag will grant access to locked content.
- Avoid broad security cleanup unrelated to this release.
