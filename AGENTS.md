<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the full-screen post comment composer outside the post scroll pane and position it against the visible native viewport; nested sticky elements are clipped by the post card and can fall under mobile chrome.
- Staff authentication audit data must use a server-side super-admin guard and safe column projections; historical credential test results must never contain passwords or hashes.
- Staff identity (employee name, position, employee ID, extra departments) lives on staff_accounts; seats without an employee name are shared team logins. Why: one source of truth for console headers and per-person performance.
- Staff performance figures are computed only from existing records in staff-performance.functions.ts; workspace and department dashboards reuse getMyCommandCenter and PerformanceChart, showing an insufficient-data state otherwise. Why: one authorized source and no fabricated KPIs.
- Employee terms, notifications, tickets, DMs and ASH Intelligence use staff-ops.functions.ts; workspace uses workspace.functions.ts + department_tasks; staff-only tables are service-role + deny-all. Why: one module each, reuse tasks.
- Case management and department workflows live in src/lib/cases.functions.ts and /console/cases (ops_cases, ops_case_events timeline/audit, ops_workflows, ops_workflow_runs); service-role + deny-all. Case visibility = involved department/employee/creator or CEO; safety reports linkable only by Trust/CEO; workflows configured by CEO only. Why: cross-department work without bypassing RBAC.
- Inventory uses provider_profiles.id as business_id, inventory_can()/inventory_role_of() RLS and inventory_members; stock changes only through inventory_record_movement's append-only ledger. UI /inventory and inventory.queries.ts. Why: tenant isolation and one stock source.
- Staff Team chat: presentational StaffChatWorkspace over ops.functions transport; scoped tokens only. Why: no duplicate messaging.
- Team chat resolves sender names, positions and private signed photos from staff_accounts by author_staff_id; ownership uses staff IDs and profile saves invalidate chat queries. Why: show current employee profiles without exposing private storage paths or matching people by names.

- Employee console uses scoped `.console-premium` branding on `<html>` only while console routes are mounted via useConsoleTheme(); dark surface overrides require `.console-premium.dark`, while light mode inherits the light tokens. Why: preserve the light/dark switch and ASH branding without changing the member app theme.
- Private staff avatar paths must be resolved to signed URLs server-side before rendering; profile edits invalidate workspace and command-center queries. Why: private photos cannot render as raw storage paths and dashboard identity must stay current.
- Expansion opportunities live in src/lib/expansion.functions.ts (expansion_opportunities + append-only events, service-role + deny-all); linked tasks reuse department_tasks.expansion_opportunity_id; only the CEO can approve. Why: no parallel task system.
- The merchant board is nested inside Operations: /console/merchant sits under the OPERATIONS department in console nav, and workforce.functions lets the OPERATIONS seat read/manage MERCHANT leads; the standalone merchant staff seat is deactivated (record kept). Why: one login (Operations) for both dashboards.
- Department board access (getWorkBoard/saveLead/moveLeadStage) goes through canUseDept: own dept, staff_accounts.extra_departments, or Operations→Merchant; the ads seat's Content & Growth boards live inside the unified /console/advertising command center (marketing.functions.ts). Why: one login per person without duplicating boards.
- Shareholders uses shareholders.functions.ts and append-only service-role records; Finance shares computeFinanceLedger. Source reads use allFinanceRows with stable ordering and fail on errors. Why: one complete financial source, no silent truncation or zeros.
- Feed/Stories/Services rank via rotation.ts after safety filtering. Why: no duplicate feed.
- AppShell omits tab-owned headers; MobileNav owns hold/slide. Why: one navigation path.
- Market defaults via versioned services-mode at the existing Services URL; Extras is its child route. MarketBrowser reuses discovery/deals/property reads. Why: preserve commerce and URLs.

- Avatar updates reuse safety-filtered StoriesRail; ChatActionDialog owns panels; MemberNavIcon uses token-based SVG strokes. Why: shared safe viewing and branding.
- Identity enforcement uses identity_restrictions, reviewed photo hashes, non-throwing denial triggers and identityMiddleware. Why: durable strikes and server-enforced bans.
- Verified-badge console functions use requireDepartment("TRUST") before privileged access. Why: authorize the staff session, not a second member-admin login.

- Provider balance and reconciliation live in finance-reconciliation.server.ts (snapshots, runs, discrepancies; service-role + deny-all); reconciliation logs discrepancies and never changes balances. Why: TchokoPay is the source of truth for real funds.
- All payment methods (MTN/Orange via TchokoPay, Stripe card, bank) record on payment_transactions (service-role + deny-all) and settle only via settleCollection in payment-settlement.server.ts; bank rows succeed only through Finance confirmation in payments-ledger.functions.ts. Why: one ledger, exactly-once wallet credit.
