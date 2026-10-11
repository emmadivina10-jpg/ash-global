# Full Cybersecurity Command Center + on-page SEO

Preview only. Nothing is published, no money is moved, and no existing records are deleted.

## 1. Account view and safe edits
- Cyber can look up any member or provider and see their profile, provider profile, verification state, recent sign-ins, devices/browsers, reports, blocks and a compliance checklist (verified ID, real photo, no off-platform flags, no open reports, no copied-identity strikes).
- Edits are limited to security fields: restriction level, wallet freeze, transaction stop, forced sign-out, notes. Cyber cannot edit names, balances, bookings or payments.
- **Protected accounts:** the CEO (Emmanuel) and every super-admin seat can never be viewed for editing, restricted, frozen or signed out by Cyber. This is checked on the server, not just hidden in the screen.

## 2. Restriction levels (one click, reversible)
| Level | Effect |
|---|---|
| 1 Watch | Flag only, more logging |
| 2 Limit posting | No posts, comments, stories, messages |
| 3 Limit commerce | No new bookings, listings, payment links |
| 4 Freeze wallet | No withdrawals, transfers or top-ups; balance untouched |
| 5 Stop all transactions | Every payment path refused |
| 6 Sign out and lock | All sessions ended, sign-in refused |

Levels can be combined. Every action records who, what, why and the before-state.

## 3. One-click revert (CEO/super admin)
- Every Cyber action appears in a "Cyber actions" list on the CEO console with a **Revert** button that restores the exact previous state. A "Revert all from this day/analyst" button is also included.
- Reverts are logged as well. Nothing is ever hard-deleted.

## 4. IP and browser blocking
- Records the IP address and browser fingerprint (browser, OS, device) of sign-ins and sensitive actions.
- Cyber can block an IP, an IP range or a browser fingerprint, for a set time or permanently. Blocked visitors get a plain "Access blocked" response before any page or action runs.
- The suspicious-activity feed flags many failed logins, new countries, impossible travel, many accounts on one device, automation browsers, rate-limit spikes and rejected payment webhooks.
- Limitation: this is blocking inside the app. Blocking at the network edge (before traffic reaches the app) would need a separate firewall service.

## 5. Daily ASH Intelligence review
- Each morning an AI summary is generated from real system data: security events, failed logins, blocks, reports, payment-webhook failures, staff sign-ins and overdue password rotations. Each item gets a recommended action and a "Mark handled" button.
- The Cyber analyst has to open and acknowledge it. Missed reviews are shown to the CEO.
- An ASH Intelligence chat panel on the dashboard answers questions using the same data.
- When there isn't enough data, it says "Data not available". Nothing is made up.

## 6. Security posture: what's in place and what's missing
- A live checklist mapped to OWASP ASVS / NIST CSF areas: in place (row-level access rules, hashed staff passwords, signed webhooks, rate limits, audit log, daily self-check) and missing (2-factor for staff, edge firewall, formal certification, backup restore drills and so on).
- A "Report to CEO" button sends selected gaps to the super admin only, for now.

## 7. Staff password rotation every 14 days
- Each staff login shows its last password change and the days left. Overdue logins are flagged red, and Cyber gets a daily reminder.
- Cyber can force a reset. The new password is created securely and shown once, only to the CEO, never in logs. The CEO and super-admin logins can only be rotated by the CEO.

## 8. Security alerts to teams and members
- Cyber can message a staff department (Support, Trust, Verification, any team) or specific members.
- Members get an in-app banner that fades after 20 seconds and can be dismissed. It stays in Notifications until opened. Opening it leads to a **Security Update** screen.
- Security updates can only be deleted by Cyber, from their dashboard. Readers can only view and acknowledge.

## 9. Awareness training every 6 months
- Cyber publishes a training module (lessons plus a short quiz) for staff.
- Each employee's completion date is tracked, and they're due again after 6 months. Overdue staff are reminded and listed for Cyber and the CEO.

## 10. On-page SEO
- Each public page (home, login, register, privacy, terms, support, contact, policies, storefronts) gets a unique title, description, canonical, Open Graph and Twitter tags.
- Structured data: Organization and WebSite on the home page, LocalBusiness/Service on storefronts.
- The home page gets one clear heading in the right order, descriptive image alt text and keyword-relevant copy (marketplace, bookings, referrals, Cameroon/global).
- The sitemap and robots file are checked. The SEO scanner is run before and after.
- Note: on-page work helps, but ranking also depends on Google indexing, backlinks and time. Connecting Google Search Console is recommended.

## Technical details
- New tables (service-role + deny-all, accessed only via `requireDepartment("CYBERSECURITY")`): `security_restrictions` (user_id, levels jsonb, reason, before_state, actor, reverted_at), `security_actions` (append-only audit + revert payload), `ip_blocks` (cidr/fingerprint, expires_at), `access_fingerprints`, `security_daily_reviews`, `security_bulletins` + `security_bulletin_reads`, `security_trainings` + `security_training_completions`. Add `password_changed_at` to `staff_accounts`.
- Enforcement: extend the existing identity middleware/`identity_restrictions` pattern to read restriction levels. Use non-throwing denial triggers on posts/messages/bookings/withdrawals/payment_transactions inserts. Wallet freeze blocks `request_withdrawal` and settlement credit-out paths only, with no balance writes. Sign-out uses the admin sign-out + lock flag.
- Protected-owner check: a SQL helper `is_protected_account(uid)` (CEO profile + super-admin linked users), used in every cyber mutation and trigger.
- IP/fingerprint block: request middleware in `src/start.ts` reads `cf-connecting-ip` + UA hash and checks a cached `ip_blocks` lookup.
- Revert: `revertSecurityAction(id)` / `revertBatch` gated by `requireSuperAdmin`, which restore `before_state`.
- Daily review: `/api/public/cyber-daily-review` cron (shared-secret, like security-selfcheck) runs the Lovable AI Gateway summary and stores it. The chat reuses ASH Intelligence in staff-ops.functions.ts.
- Bulletins reuse `notifications` with type `SECURITY_UPDATE` and a new `/security-update/$id` route. The 20s fade lives in the existing in-app banner. The delete RLS is Cyber-only via a server function.
- Tests: protected-owner refusal, each restriction level enforcement, revert restores state, 14-day rotation due calc, 6-month training due calc, bulletin undeletable by non-cyber.
- New `src/lib/cyber-*.functions.ts` modules, plus rules recorded in console AGENTS.md.
