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
- Employee operations (terms gate, staff notifications, ticket assignment/escalation/internal notes, staff DMs, ASH Intelligence) live in src/lib/staff-ops.functions.ts with staff-only tables guarded by service-role + deny-all client policies; console UI pieces in src/components/console/ (EmployeeTermsGate, StaffNotificationCenter, TicketBoard, StaffDirectMessages, AshIntelligencePanel). Why: one cohesive staff-ops module instead of scattering across ops/support functions.
- Employee workspace (My Day, identity confirmation, availability, My Tasks on department_tasks, task comments, daily reports, ticket SLA) lives in src/lib/workspace.functions.ts and /console/workspace; staff-only tables are service-role + deny-all. Why: extends existing tasks/tickets instead of a parallel system.
- Case management and department workflows live in src/lib/cases.functions.ts and /console/cases (ops_cases, ops_case_events timeline/audit, ops_workflows, ops_workflow_runs); service-role + deny-all. Case visibility = involved department/employee/creator or CEO; safety reports linkable only by Trust/CEO; workflows configured by CEO only. Why: cross-department work without bypassing RBAC.
- Business inventory (Phase 1) uses provider_profiles.id as business_id; inventory_* tables are RLS-scoped via inventory_can()/inventory_role_of() (owner = provider owner, others via inventory_members), and stock changes only through the inventory_record_movement RPC which writes the append-only ledger. UI at /inventory with src/lib/inventory.queries.ts. Why: reuse existing businesses, database-enforced tenant isolation, ledger is the source of truth for future inbox/report phases.
- Staff Team chat uses a presentational StaffChatWorkspace with existing ops.functions channel transport; scoped team color tokens do not change the global theme. Why: restyle internal chat without duplicating messaging or modifying access rules.
- Team chat resolves sender names, positions and private signed photos from staff_accounts by author_staff_id; ownership uses staff IDs and profile saves invalidate chat queries. Why: show current employee profiles without exposing private storage paths or matching people by names.

- Employee console uses scoped `.console-premium` branding on `<html>` only while console routes are mounted via useConsoleTheme(); dark surface overrides require `.console-premium.dark`, while light mode inherits the light tokens. Why: preserve the light/dark switch and ASH branding without changing the member app theme.
- Private staff avatar paths must be resolved to signed URLs server-side before rendering; profile edits invalidate workspace and command-center queries. Why: private photos cannot render as raw storage paths and dashboard identity must stay current.
- Expansion opportunities live in src/lib/expansion.functions.ts (expansion_opportunities + append-only events, service-role + deny-all); linked tasks reuse department_tasks.expansion_opportunity_id; only the CEO can approve. Why: no parallel task system.
- The merchant board is nested inside Operations: /console/merchant sits under the OPERATIONS department in console nav, and workforce.functions lets the OPERATIONS seat read/manage MERCHANT leads; the standalone merchant staff seat is deactivated (record kept). Why: one login (Operations) for both dashboards.
- Department board access (getWorkBoard/saveLead/moveLeadStage) goes through canUseDept: own dept, staff_accounts.extra_departments, or Operations→Merchant; the ads seat's Content & Growth boards live inside the unified /console/advertising command center (marketing.functions.ts). Why: one login per person without duplicating boards.
- Shareholder data (shareholders + append-only shareholder_events, service-role + deny-all) lives in shareholders.functions.ts; company figures come from computeFinanceLedger in finance.server.ts, shared with the Finance page. Why: one financial source of truth.
- Feed, Stories and Services (Nearby sort) ordering goes through src/lib/rotation.ts after the existing safety-filtered queries: real-signal relevance + per-user/session seed + local exposure cooldown + creator diversity. Why: personalised rotation without a second feed or moderation system.
