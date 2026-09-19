# Automatic 24-hour Story cleanup

## What is currently implemented
- New Stories already receive a 24-hour expiry time.
- Expired Stories are hidden from the Stories screen.
- Automatic hard deletion is incomplete: records are retained for at least seven extra days, and their uploaded media is not automatically removed.

## Changes
- Add a private, authenticated cleanup endpoint dedicated only to Stories.
- Have the cleanup remove expired Story media from the existing private media bucket first, then remove the matching Story records and related Story activity through existing cascades.
- Schedule cleanup every five minutes so content is removed shortly after its 24-hour expiry, without relying on a member opening the app.
- Keep failed media deletions retryable instead of deleting their database references and leaving untracked files.
- Update the existing housekeeping fallback from seven days to immediate expiry handling.
- Add the generated migration to source control and record the completed task in the roadmap.

## Validation
- Confirm the scheduler is active and the cleanup endpoint rejects unauthorized callers.
- Confirm expired rows and matching media are removed while unexpired Stories remain unchanged.
- Check the app build and existing Stories display behavior.

## Scope
No changes to Feed, Spotlight, Messages, Notifications, or any other feature.
