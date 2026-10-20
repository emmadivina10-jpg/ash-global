# Permanent account deletion with protected financial records

## Confirmed problem
The current approval action marks the profile `CLOSED`; it does not erase the sign-in account or personal data. Read-only checks of the live database confirm that deleting a sign-in account would also delete transactions, withdrawals, activation payments, tickets and bookings. Some booking-release records can instead prevent that deletion.

## What to build
1. Provide an authenticated, explicitly confirmed permanent-deletion action in Settings, plus the existing public Support path for members who cannot sign in. Do not erase any existing member during implementation or testing.
2. Separate ordinary personal data from records that have a documented legal retention basis. Remove profile/contact details, identity uploads, member content, media, personal activity, preferences, device tokens and other unnecessary personal information. Preserve other members' independent records without retaining the deleted member's unnecessary identifying information.
3. Protect required accounting/payment evidence before removing the sign-in account. Preserve original monetary amounts, references and accounting relationships; never settle, transfer, reverse or alter balances as part of deletion. Remove unnecessary personal fields from retained evidence where legally permitted.
4. Handle unresolved funds, active services, disputes and legal holds explicitly. These must not silently turn an erasure request into profile closure. Record any justified delay, what remains, why it remains and what happens next.
5. Make deletion restartable across file cleanup, database cleanup and sign-in removal. Report completion only after all required steps succeed; failed steps remain visible for recovery. Prevent concurrent activity from creating new personal records during erasure.
6. Update Settings, staff review, public deletion instructions, Privacy, Terms and store-review documents to match the verified result. Keep current truthful wording until genuine erasure is available.

## Technical details
- Existing entry points: `src/routes/_authenticated/settings.tsx`, `src/routes/account-deletion.tsx`, `reviewDeletionRequest` in `src/lib/console.functions.ts` and the staff deletion console.
- Add authenticated server functions and a server-only deletion coordinator. Member actions derive the target from verified authentication; staff actions retain server-side department authorization. Privileged clients remain server-only.
- Prepare production-specific migrations covering financial foreign-key retention, deletion state and narrowly protected operations. Inventory all direct and indirect references, JSON personal fields, file ownership and existing immutable-record triggers before selecting the exact cleanup SQL. Do not broadly disable triggers or bypass immutable wallet-credit records.
- Delete files through the storage service and sign-in accounts through the authentication administration API, not direct writes to managed schemas. Bound work into recoverable steps suitable for the hosted runtime.
- Retention requires a concrete record-category/legal-basis schedule; do not invent a universal financial retention period or retain everything indefinitely. Use the established safety-record policy only where it actually applies. Resolve remaining jurisdiction-specific requirements before activating erasure of accounts with financial history.
- Preserve the production safety guard, disabled live transfers, payment settlement, commissions, service codes, wallet-credit controls and webhooks. No publication or store submission is included.

## Verification before activation
- Use an explicitly isolated disposable environment with synthetic members, personal files and representative financial history; never test deletion against a real production account.
- Test self-only authorization, staff restrictions, repeated/concurrent requests, storage failure, database failure, authentication failure and recovery.
- Assert that sign-in identity and ordinary personal data disappear, legally retained monetary records stay intact, other members' records survive, and no new financial movement occurs.
- Exercise Settings → confirmation → deletion → sign-out in the isolated app; verify the deleted identity cannot sign in again and retained records are inaccessible to ordinary members.
- Recheck production dependencies read-only before any approved migration. Report signed-native and external-provider retention limitations separately; this change alone does not establish App Store readiness.

## Review boundary
Approve this approach before implementation because the existing live financial relationships must change to make genuine deletion safe. No schema, account, file or financial record has been changed during this review.