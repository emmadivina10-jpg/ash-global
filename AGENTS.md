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
- Booking commission rate lives in marketplace_settings, changed only via commission.functions.ts (REVENUE/CEO, audit-logged); paid bookings keep the rate saved at payment. Trip arrival times come from trip-eta.functions.ts (Routes API via the Maps connector, only for booking parties). Why: historical earnings never change and Maps calls stay bounded.

- Staff console rules (staff identity, cases, chat, boards, console theme) live in src/components/console/AGENTS.md.
- Staff member metrics/directory share member-insights.functions.ts in the console layout; member-review.server.ts authorizes and audits account review, and per-staff/member AI threads use versioned service-only storage. Why: consistent measurements, no member impersonation, no cross-staff history leaks.
- Human Support conversations reuse support.functions.ts and the existing ticket/read records; support-state.ts owns notification lifecycle predicates. Why: no duplicate messaging or schema changes; AI-agent chat primitives are outside this human-to-human workflow.
- Checkout returns use payment-return.ts's app-owned origin allowlist and booking-specific tracking path; CompassSurface owns the single draggable Map/Wallet launcher; TrackingDock supplies its live map and AshOrb supplies app-wide booking access, with no duplicate launchers. Why: prevent transient-host returns and keep one clear floating control without changing settlement.
- Booking payment actions use booking-payment-state.ts; Stripe/bank status checks refresh saved booking evidence, while mobile-money checks are serialized and show inline outcomes. Why: pending confirmation must never invite duplicate payment or impersonate verified settlement.
- Tracking: parties opt in via share_booking_party_location (active bookings, cleared on end); Leaflet/OSM map client-only. Why: works worldwide, no key or address.
- Service verification uses the atomic code RPC independently of disabled transfers; constraint tests use isolated PGlite, not live inserts. Why: preserve verification and funds.
- Phone alert banners belong to OS delivery, not PushBridge toasts; iOS launch storyboard owns native startup. Why: prevent duplicated notifications and opening screens.
- Personal booking_history_preferences archives/restores/removes terminal history only, never bookings or payments. Why: independent histories and financial retention.
- Verification links carry provider tab and booking ID. Why: reach the correct Received code form.
- Localize interface copy with static dictionaries and explicit tx calls, never DOM rewriting or user-content translation. Why: privacy and stable React state.
