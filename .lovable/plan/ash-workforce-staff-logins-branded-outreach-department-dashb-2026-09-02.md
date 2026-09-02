# ASH Workforce: Staff Logins, Branded Outreach & Department Dashboards

Turn the single-password console into a multi-seat staff console where each employee logs in with their own credentials, edits only their department, and can view everything else. You remain super admin with a one-click "Elevate privileges" switch.

## Phase 1 — Staff accounts & permissions (foundation)

New `staff_accounts` table: name, email, username, password hash, department, active flag, last login. Departments:

`SUPER_ADMIN, SUPPORT, GROWTH, SALES, MARKETPLACE_OPS, ADVERTISING, PARTNERSHIPS, CONTENT, MERCHANT, EXPANSION, REVENUE, TRUST`

Login change: the console unlock screen asks for **username + password** (your existing `CONSOLE_PASSWORD` still works and signs you in as super admin, so you never get locked out). The session stores the staff id and department.

Access model, enforced on the server for every console action (not just hidden in the UI):
- Every seat can **view** all existing sections (Overview, Security, Payments, Withdrawals, Payout, Ledger, Users, Providers, Bookings, Deletions).
- Write actions (approving withdrawals, verifying providers, payouts, deletion decisions, ticket replies) require the matching department.
- Super admin can click **Elevate privileges** to gain write access anywhere for the session; every elevated action is written to `admin_audit_log`.
- A new **Staff** page (super admin only) to create seats, set/reset passwords, assign departments, deactivate.

## Phase 2 — Branded support outreach

In Support, selecting a ticket shows a **Contact card**: full name, email, phone, WhatsApp, account status, wallet, bookings count, provider status, join date — pulled automatically from the user record when the email matches.

Two outreach actions:
- **Email** — sends a fully branded ASH Glo HTML email (emerald/gold header, stamped ASH logo, footer with support address and site link) through the existing notify domain.
- **WhatsApp** — opens `wa.me` with the pre-filled script.

Script library with fill-in variables (`{{name}}`, `{{amount}}`, `{{booking}}`, `{{provider}}`), each in English and French:
- Welcome / account activated
- Payment issue being investigated
- Withdrawal approved / on the way
- Booking dispute follow-up
- Provider verification approved / more info needed
- Provider inactivity nudge
- General reply

Agent picks a script, it renders into the editor pre-filled, they can edit, then send. Every outreach is logged on the ticket thread and in an `outreach_log` so you can see who contacted whom, when, on which channel.

## Phase 3 — Workforce CRM core (shared engine)

One shared engine powers every department dashboard instead of ten separate systems.

`leads` table: name, type (business / provider / creator / merchant / partner / advertiser), category, city, country, phone, whatsapp, email, source, notes, assigned staff, department, pipeline stage, value, next follow-up date, converted user/provider id.

Stages: `NEW → CONTACTED → INTERESTED → DEMO/PROPOSAL → REGISTERED → VERIFIED → PAID → LOST`

`lead_activities` table: every call, WhatsApp, email, visit, note — with timestamp and staff id.

`staff_targets` table: per staff, per day/month targets (contacts, recruits, ads sold, revenue) so each dashboard can show "Today's target vs actual".

Shared UI pieces used by all departments:
- Target strip (today's goals with progress bars)
- Lead queue table with filters (city, category, stage, follow-up due)
- Lead drawer: contact details, one-tap Call / WhatsApp / Email with the department's script, stage buttons, follow-up scheduler, "Send registration link"
- Leaderboard (staff ranked by conversions and revenue this month)
- Import leads (paste/CSV) and manual add

## Phase 4 — Department dashboards

Each is the shared engine tuned to its own pipeline, targets, scripts and metrics:

| Dashboard | Focus |
|---|---|
| Growth & Acquisition | Businesses/providers contacted, recruited, users acquired |
| Sales | Pipeline counts, deals, revenue, commission, leaderboard |
| Marketplace Ops | Live queues from real data: providers with zero bookings, no portfolio, weak descriptions, unverified, disputes, failed/cancelled bookings |
| Advertising | Ad leads, packages (Starter/Business/Premium), ads sold, revenue, commission |
| Partnerships | Higher-value pipeline: meeting → proposal → negotiation → agreement → payment |
| Content & Creator | Creators discovered → contacted → joined → posted → active |
| Merchant | Shops/restaurants recruited, transaction volume from converted merchants |
| Expansion | Territory view by city with per-city coverage progress |
| Revenue Intelligence | GMV, ASH revenue, advertising, activations by day; revenue by city; employee performance table |
| Trust & Verification | Verification queue, approve/reject with reason, verification SLA stats |

Marketplace Ops, Revenue and Trust read live platform data; the acquisition-style dashboards run on the CRM engine.

## Technical notes

- Staff auth uses the existing signed console cookie session (extended with `staffId` + `department` + `elevated`), password hashing with scrypt.
- Permission checks live in `console.server.ts` as `requireDepartment(...)`, called by every write server function — the UI only mirrors what the server enforces.
- All new tables get row-level security plus explicit grants; console access goes through the admin client behind the session check, exactly like today.
- Branded email uses the existing React Email template setup so it matches auth/support mails.
- Sidebar gets a "Workforce" group; each dashboard is a route under `/console/*`.

## Suggested delivery order

1. Phase 1 + Staff page (unblocks every login)
2. Phase 2 branded support outreach
3. Phase 3 CRM engine + Growth, Sales, Provider Acquisition
4. Phase 4 remaining dashboards (Advertising, Partnerships, Content, Merchant, Expansion, Revenue, Trust, Marketplace Ops)
