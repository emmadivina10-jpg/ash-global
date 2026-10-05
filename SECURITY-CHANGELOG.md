# Security Changelog

Every change that affects access control, privileged routines, or public
surfaces gets an entry here. Newest first.

Add an entry whenever a migration touches: RLS policies, `GRANT`/`REVOKE`,
`SECURITY DEFINER` routines, storage policies, or a route under
`src/routes/api/public/`.

Template:

```
## YYYY-MM-DD — Short title
**Change:** what changed
**Risk addressed:** what could have gone wrong
**Verification:** how it was proven (scan result, test names)
```

---

## 2026-10-05 — Verified identity restrictions and financial read integrity

**Change:** Added durable identity strike/restriction records, server-reviewed JPG/PNG file/pixel fingerprints, reviewed-avatar replacement prevention, caller-scoped status reads, restricted-member RLS checks and server-function enforcement. Profile denials retain the previous identity instead of raising an exception that would roll back the strike. Identity restoration uses server-side Trust/CEO authorization. Verified-badge console tools now use that same authorized staff session.

**Risk addressed:** Copied verified identities, lost audit attempts, self-restoration, modified reviewed photos, console/member authentication mismatch and false Finance reconciliation from truncated reads.

**Verification:** Rollback-only protected-name/four-strike/restoration database check; exact-image and pagination tests; isolated red Denied/logout browser checks. Financial read-only audit found zero balance mismatches and duplicate reference/type pairs. Cropped/edited copy detection and real verified-account end-to-end checks remain pending. Pre-existing backend security warnings remain outside this review.

## 2026-08-26 — Security operations hardening

**Change:**
- Added the `security_events` audit log (admin-read-only) and recorded refused
  booking/availability actions from `decide_booking`, `cancel_booking`,
  `begin_booking_payment`, `set_booking_progress` and `submit_review`.
- Added Postgres-backed request throttling (`rate_limit_hits`,
  `rate_limit_check`) and applied it to the storefront and payment-link
  surfaces. Visitors are identified by a salted hash, never a raw IP.
- Added `security_selfcheck` plus scheduled runs via pg_cron (daily, 6-hourly)
  and a secret-protected endpoint at `/api/public/security-selfcheck`.
- Added the RLS regression suite and the `Security` page in the admin console.
- Revoked Supabase's automatic default table grants from `rate_limit_hits`
  (service-role only) and write grants from `security_events`.

**Risk addressed:** blind spot around access-control regressions — nothing
recorded refused attempts, nothing throttled scraping, and nothing re-checked
the database after a migration.

**Verification:** `security_selfcheck` → `{ critical: 0, warn: 0 }`;
`bun run test:security` → 9/9 passing.

**Note discovered during this work:** Supabase's default privileges grant table
level `ALL` to `anon` on *every* newly created table in `public`. RLS is what
actually blocks access. The self-check was refined to flag a table only when a
policy genuinely permits anonymous writes, so real findings are not buried.

---

## 2026-08-26 — provider_slots closed to anonymous callers

**Change:** `REVOKE ALL ON FUNCTION public.provider_slots(uuid, date, integer)
FROM PUBLIC, anon`; execution granted to `authenticated` and `service_role`.

**Risk addressed:** the function is `SECURITY DEFINER` and reads `bookings` to
compute free times, so any unauthenticated caller could enumerate exactly which
times a business already had booked. Confirmed no public feature depended on
it — the shareable storefront routes visitors into the signed-in booking flow.

**Verification:** zero SECURITY DEFINER routines in `public` are anon-executable;
covered permanently by `tests/rls-anonymous-access.test.ts`.

---

## 2026-08-25 — Avatar storage

**Change:** private `avatars` bucket; visitors can read, but writes are
restricted to each person's own folder.

**Risk addressed:** users overwriting or deleting each other's profile pictures.
