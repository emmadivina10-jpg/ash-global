# ASH Console upgrade + wallet statements + feed discovery

## 1. Payment flow check (no changes)
Read-only verification of activation, booking, ticket, link and subscription payments: confirm every settlement function, webhook and wallet credit path is intact, and report findings. No file in the payment/wallet/referral/payout chain is edited.

## 2. Admin console — premium redesign and tightened numbers
- New console shell: refined sidebar with grouped sections, seat card, command bar, and a consistent page header/metric/table kit used by every console page.
- One shared metric component set (KPI tiles, trend rows, empty/loading/error states) so all dashboards look and behave the same.
- Numbers consistency pass: every console page reads its figures from the same server aggregates (overview, financials, ledger), so revenue, payouts, users, bookings and withdrawals agree across pages. Any page still showing a locally-computed number is switched to the shared source.
- The eight placeholder department pages (Growth, Sales, Advertising, Partnerships, Content, Merchants, Expansion, Revenue) become real dashboards built on the existing work board, leads and marketplace/revenue data.
- Loose ends: every action button gets confirm + success/error feedback, tables get search/filter/pagination where lists can grow, and restricted sections keep the department gate.

## 3. Printable financial records
- Members: a "Statement" action in Wallet and Transactions that opens a clean printable statement (logo, member, period filter, running totals, transaction table) and prints / saves as PDF via the browser. Also a CSV download.
- Admins: the same statement generator for any member from the console user page, plus printable ledger, payouts and withdrawals reports.

## 4. Direct messaging to members
- Admin, support and security seats can open a direct conversation with any individual member from the console (user row, ticket, security event) using the existing member chat, plus an in-app notification.
- Security alerts get a dedicated "Alert this user" action with an alert-styled message and notification category.

## 5. Unified staff chat in the console
- A new staff chat surface available in every console dashboard: one general channel plus one channel per department, live updates, author name/department, unread badge.
- New backend table for staff channel messages with access limited to console seats.

## 6. Daily tickets + AI daily briefing
- New backend table for department tasks (title, detail, department, due date, status, assignee, source).
- Admin gets a one-click "Issue today's tickets" that creates the day's task set for every dashboard; each department sees its own list and can tick items done.
- An AI daily briefing panel on the overview reads live platform numbers (signups, activations, revenue, pending withdrawals, open tickets, stalled bookings) and proposes the day's priorities per department; the admin reviews and sends them in as tickets with one click.

## 7. App-side polish
- The floating round "A" button gets an on/off switch in Settings (and a quick hide action on the button itself); the choice is remembered.
- Feed becomes an organized discovery stream: after every few posts, a single tidy section card surfaces jobs, events, property, deals, freelance projects or providers — labelled, swipeable, and easy to scroll past.
- General UI cleanup pass on flagged rough edges (spacing, empty states, disabled actions, mobile touch targets).

## Technical notes
- New tables `staff_channel_messages` and `department_tasks` with grants + RLS scoped to console seats; nothing in `wallets`, `transactions`, `withdrawals`, `activations`, `bookings` payment logic is altered.
- AI briefing runs through a server function on the Lovable AI gateway; it only suggests, it never writes tickets by itself.
- Statements render as a print-styled route/dialog (no PDF library), plus CSV export.
- Feed discovery blocks reuse existing hub/property/deal queries; no new payment or wallet reads.
