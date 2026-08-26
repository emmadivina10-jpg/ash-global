# ASH Glo — Security Operations

How this project detects and prevents access-control regressions.

## 1. Automated RLS regression tests

`tests/rls-anonymous-access.test.ts` runs against the live project using **only
the publishable (anon) key**, so it exercises exactly what a stranger on the
internet can reach.

```bash
bun run test:security     # anonymous-access suite
bun run test              # everything
```

Locked-in invariants:

| Invariant | Why it matters |
| --- | --- |
| `provider_slots` RPC is refused for signed-out callers | It reads `bookings` to compute free times; public access let anyone map out a business's booked-out schedule |
| `bookings` returns zero rows anonymously | Prevents inferring the same schedule by reading the table directly |
| Anonymous `bookings` insert and `request_booking` are refused | No ghost bookings |
| `security_events` and `rate_limit_hits` are unreadable anonymously | The audit log must not leak to the people it is watching |
| `security_selfcheck`, `console_financials`, `console_counts`, `rate_limit_check` are not anon-callable | Privileged routines stay privileged |

These tests are **non-vacuous**: restoring the old `GRANT EXECUTE ... TO anon`
makes them fail immediately.

## 2. Request throttling on public surfaces

Counters live in Postgres (`rate_limit_hits`), not memory, because the app runs
on stateless edge workers where an in-memory map resets on every cold start and
is not shared between instances — precisely what a scraper relies on.

| Surface | Budget (per visitor / minute) |
| --- | --- |
| Storefront page `/s/:slug` | 40 |
| Payment link page `/pay/:code` | 20 |
| Payment link verification | 30 |
| Starting a payment | 5 |

Visitors are identified by a **salted SHA-256 of the IP** (`RATE_LIMIT_SALT`),
so neither the counters nor the audit log ever store a raw IP address.
Throttling fails **open** — if the counter itself errors the request is served
rather than taking storefronts down — and blocked bursts are written to the
audit log (with flood protection so an attacker cannot spam the log).

## 3. Security audit log

`security_events`, readable by admins only, at **Console → Security**.

Recorded automatically:

- `BOOKING_AUTHZ_DENIED` — someone tried to accept, cancel, progress, pay for,
  or review a booking that is not theirs (from `decide_booking`,
  `cancel_booking`, `begin_booking_payment`, `set_booking_progress`,
  `submit_review`)
- `RATE_LIMIT_BLOCKED` — a throttled burst, escalating to CRITICAL past 5× the budget
- `SELFCHECK_AUTH_FAILED` — a bad secret on the scan endpoint
- `SELFCHECK` — every automated scan result

The console highlights **suspicious visitors**: any fingerprint with 3+ refused
attempts in the window, with the mix of event types.

## 4. Periodic re-scan

Three layers, so a bad migration cannot slip through:

1. **Database schedule (pg_cron)** — no external infrastructure required:
   - `ash-security-selfcheck-daily` — 03:15 UTC daily
   - `ash-security-selfcheck-6h` — every 6 hours
   - `ash-security-housekeeping` — weekly cleanup (counters > 1 day, audit > 180 days)
2. **CI** (`.github/workflows/security.yml`) — runs the RLS suite and calls the
   scan endpoint on every change to `supabase/migrations/`, `src/lib/`,
   `src/routes/api/`, plus daily. The endpoint returns **409** on critical
   findings, which fails the build.
3. **On demand** — “Run scan now” in Console → Security.

The scan checks for:

- SECURITY DEFINER routines callable without signing in
- public tables with RLS switched off
- RLS enabled but no policies, while still reachable by an app role
- tables an anonymous visitor could genuinely write to

### Calling the endpoint manually

```bash
curl -X POST https://growrefer.app/api/public/security-selfcheck \
     -H "x-security-scan-secret: $SECURITY_SCAN_SECRET"
```

Compares the secret in constant time and logs failed attempts. Required CI
secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `APP_URL`,
`SECURITY_SCAN_SECRET`.

## Known and accepted

- **`rate_limit_hits` has RLS enabled with no policies.** Deliberate: it is
  service-role only and all `anon`/`authenticated` grants are revoked, so "no
  policy" means "no access". Supabase's linter reports this as INFO 0008.
- **`provider_availability` is anonymously readable.** These are published
  opening hours, needed by shareable storefronts. Which slots are *taken* stays
  private — that lives in `bookings`.
- **17 SECURITY DEFINER routines are callable by signed-in users** (linter
  0029). Intentional: each one authorises internally (`auth.uid()` ownership
  checks or `has_role(..., 'admin')`). This is the standard pattern for
  privileged operations that must be reachable by the app.

## Adding a new public surface

1. Wrap the handler with `guardPublicRequest` from `src/lib/rate-limit.server.ts`.
2. Add an invariant to the regression suite.
3. Run `bun run test:security`, then a scan.
4. Add an entry to `SECURITY-CHANGELOG.md`.
