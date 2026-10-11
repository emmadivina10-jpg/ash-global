# Cyber dashboard: Control teams, Endpoint security, Trust & Verification

Preview only. Nothing published. Database additions apply to the shared live database.

## People
- **Wallace Divine** — Head of Cybersecurity, new employee ID ASH-CYB-011, named on the existing `cybersecurity_analyst` login (password unchanged). Full Cyber permissions.
- **Armstrong Akuro** — Trust & Verification Officer. His existing `trust` login (unchanged, Apple reviewer) also opens the Cyber dashboard in **limited mode**: he sees everything, but cannot use:
  - Restrictions and locks (freeze wallet, stop transactions, sign out and lock, force logout)
  - Staff login rotation requests and undoing actions
  He keeps IP/browser blocks, Control teams and audits. Buttons he can't use are shown greyed with "Head of Cybersecurity only"; the server refuses them too.

## 1. New tab: "Control teams"
- Lists every employee dashboard (Operations, Support, Revenue, Marketplace Ops, Marketing, Trust, Merchant, Investor) except the CEO's.
- Opening one shows that department's real dashboard in **view-only mode**: all edit/save/send buttons hidden and refused on the server. Every view is logged.
- **Audit run** button per team or "Whole system": produces a saved audit from real records — staff sign-ins, failed logins, overdue password rotations, privileged actions, open tasks/cases, data-access logs — plus ASH Intelligence findings: mechanisms in place, tools used, vulnerabilities, compliance gaps (OWASP / NIST), each with priority. Printable/PDF, sendable to the CEO, listed in Reports.

## 2. New tab: "Endpoint security"
- Device inventory of every browser/device that signs in (members and staff): device type, browser and version, OS, country/city, first/last seen, accounts using it.
- Flags: outdated browser, bot/automation browser, one device on 3+ accounts, staff login from a new device or new country.
- Actions: block the device (reuses browser blocks) or sign the account out (Wallace only). Owner/admin accounts stay protected.
- Honest limit: the app cannot install antivirus or scan phones/laptops; it only sees devices when they sign in.

## 3. New tab: "Trust & Verification"
- Inside the Cyber dashboard: pending identity reviews, verified-badge requests, open safety reports, identity strikes/bans and copied-identity attempts, with links into the existing Trust pages. Armstrong is shown as the responsible officer.

## Technical details
- Staff identity: update `staff_accounts` rows (employee name/position/ID) for the cyber seat; add `CYBERSECURITY` to `extra_departments` for the trust seat. Add a `cyber_role` concept derived server-side: `HEAD` for the cyber seat/CEO, `TRUST_OFFICER` for the trust seat.
- New guard `requireCyberHead()` in `console.server.ts`; applied to restriction, lock, force-logout, rotation and revert functions in `cyber-control.functions.ts` / `cyber-map.functions.ts`.
- View-only team mode: console layout reads a `?audit=1` view flag plus a server-side `auditViewer` actor flag; all department mutation functions refuse when the actor is in audit view. Department reads gain the cyber seat via `canUseDept` (read-only).
- New `cyber-audit.functions.ts` (audit run, reuses `security_reports` with a `kind` of TEAM_AUDIT/SYSTEM_AUDIT) and `cyber-endpoint.functions.ts` (aggregates `access_fingerprints` + user-agent parsing).
- Tests: trust officer refused on head-only actions; audit view refuses mutations; CEO dashboard excluded; owner accounts still protected.
- Update memory staff directory and console AGENTS.md rule.
