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
- Inventory uses provider_profiles.id as business_id, inventory_can()/inventory_role_of() RLS and inventory_members; stock changes only through inventory_record_movement's append-only ledger. UI /inventory and inventory.queries.ts. Why: tenant isolation and one stock source.

- Shareholders uses shareholders.functions.ts and append-only service-role records; Finance shares computeFinanceLedger. Source reads use allFinanceRows with stable ordering and fail on errors. Why: one complete financial source, no silent truncation or zeros.
- Feed/Stories/Services rank via rotation.ts after safety filtering. Why: no duplicate feed.
- AppShell omits tab-owned headers; MobileNav owns hold/slide. Why: one navigation path.
- Desktop Messages fills the content area beside the sidebar; desktop and mobile navigation both expose Flights. Why: use the available viewport and keep primary destinations accessible on both layouts.
- Market defaults via versioned services-mode at the existing Services URL; Extras is its child route. MarketBrowser reuses discovery/deals/property reads. Why: preserve commerce and URLs.

- Avatar updates reuse safety-filtered StoriesRail; ChatActionDialog owns panels; MemberNavIcon uses token-based SVG strokes. Why: shared safe viewing and branding.
- Identity enforcement uses identity_restrictions, reviewed photo hashes, non-throwing denial triggers and identityMiddleware. Why: durable strikes and server-enforced bans.
- Verified-badge console functions use requireDepartment("TRUST") before privileged access. Why: authorize the staff session, not a second member-admin login.

- Provider balance and reconciliation live in finance-reconciliation.server.ts (snapshots, runs, discrepancies; service-role + deny-all); reconciliation logs discrepancies and never changes balances. Why: TchokoPay is the source of truth for real funds.
- All payment methods (MTN/Orange via TchokoPay, Stripe card, bank) record on payment_transactions (service-role + deny-all) and settle only via settleCollection in payment-settlement.server.ts; bank rows succeed only through Finance confirmation in payments-ledger.functions.ts. Why: one ledger, exactly-once wallet credit.
- Stripe booking releases use a durable service-only webhook inbox and release ledger, source-charge evidence, helper-level live-execution gates and default-off database controls; transfer and bank payout are distinct states, and payout events read current state under connected-account scope. Why: wallet balances cannot prove money moved, stale events cannot prove payout state and ambiguous requests must reconcile rather than repay.
- Booking commission rate lives in marketplace_settings, changed only via commission.functions.ts (REVENUE/CEO, audit-logged); paid bookings keep the rate saved at payment. Trip arrival times come from trip-eta.functions.ts (Routes API via the Maps connector, only for booking parties). Why: historical earnings never change and Maps calls stay bounded.

- Staff console rules (staff identity, cases, chat, boards, console theme) live in src/components/console/AGENTS.md.
