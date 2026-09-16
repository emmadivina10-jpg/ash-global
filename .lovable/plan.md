# Pre-release cleanup and explicit-content enforcement

## Goal
Keep ASH clean before store releases and automatically stop explicit-image violations while preserving financial, booking, referral, and audit records.

## Build
- Add a centralized safety check for every new user-uploaded image and video before its public post is created.
- If explicit nudity is detected, remove the uploaded files immediately, create a permanent Trust & Safety case, place the account in a review-only ban state, and prevent further app access.
- Add a clear banned-account screen explaining that the restriction awaits administrator review and linking to Support.
- Extend the Trust & Safety console with a dedicated review queue, evidence metadata, and administrator actions to uphold or remove the ban. Restoring access never restores deleted explicit media.
- Add scheduled housekeeping for expired stories, orphaned social media files, stale rate-limit/cache records, and old temporary operational data only. Never delete wallets, transactions, payments, bookings, referrals, messages, reports, or audit history.
- Add a one-click pre-release cleanup action in the admin safety area and record every cleanup and moderation decision in the audit trail.
- Update the Privacy Policy and Terms to accurately explain automated media screening, immediate removal, temporary review bans, appeals, and human review.

## Safety behavior
- Use a high-confidence explicit-nudity result for automatic removal and review ban; uncertain results go to manual review without publishing.
- Fail closed for media publication if the safety service is unavailable: keep the content unpublished and ask the member to retry.
- Restrict ban removal and cleanup execution to the CEO/super-admin and Trust & Safety staff where appropriate.
- Keep moderation evidence private and never expose removed media to other members.

## Verification
- Test clean media publication, explicit-media rejection and cleanup, banned-account routing, admin review/unban, and safe cleanup boundaries.
- Re-run security checks and verify the app still builds cleanly without changes to payment processing.
