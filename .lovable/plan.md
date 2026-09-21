# Notifications, Feed entry, Support Chat, and CEO profile

## What will change

- Fix notification opening so account and unknown alerts go to the relevant account/profile area or Feed instead of Wallet/dashboard, while social alerts continue opening their exact post and financial alerts keep their financial destinations.
- Keep required first-time consent and profile-photo steps, then send completed sign-ins, social sign-ins, password-reset completion, and returning signed-in app users to Feed.
- Add an **ASH Support** conversation beside **ASH AI** in every member’s Messages. Members can open a support request, continue the same ticket, receive staff replies in the thread, and see a numeric unread badge.
- Reuse the existing Support inbox and ticket records rather than creating a duplicate messaging system.
- Add a live numeric badge beside **Support** in the admin dashboard navigation, based on customer conversations awaiting an admin reply. The Support inbox remains the place where admins read and answer them.
- Add the confirmed biography of CEO Emmanuel Tanga Divine to ASH AI’s founder knowledge, preserving the existing founder attribution.

## Technical details

- Extend the current support server functions with authenticated member reply and read-state operations. Add minimal read timestamps to existing support ticket records so member and admin badges are accurate.
- Keep member access owner-scoped and admin access department-restricted; no client-side admin checks or private data exposure.
- Poll/refetch the support conversation and admin count using the project’s existing query patterns.
- Update notification deep-link tests and add focused support-count tests where practical.
- Verify the member Messages experience on phone and the support badge/inbox on desktop, then confirm the preview build is clean.

## Scope boundaries

- No redesign of Messages, Feed, Wallet, or the admin dashboard.
- No separate support database or duplicate chat infrastructure.
- No change to first-time consent or required profile setup.
