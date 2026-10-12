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

- Full-screen composer stays outside scrolling, against the native viewport. Why: prevent mobile clipping.
- Inventory uses provider_profiles.id as business_id, inventory_can()/inventory_role_of() RLS and inventory_members; stock changes only through inventory_record_movement's append-only ledger. UI /inventory and inventory.queries.ts. Why: tenant isolation and one stock source.

- Shareholders uses shareholders.functions.ts and append-only service-role records; Finance shares computeFinanceLedger. Source reads use allFinanceRows with stable ordering and fail on errors. Why: one complete financial source, no silent truncation or zeros.
- Feed/Stories/Services rank via rotation.ts after safety filtering. Why: no duplicate feed.
- AppShell omits tab-owned headers; MobileNav owns hold/slide. Why: one navigation path.
- Desktop Messages fills the viewport beside the sidebar; all navs expose Flights. Why: space and access.
- Market defaults via versioned services-mode at the existing Services URL; Extras is its child route. MarketBrowser reuses discovery/deals/property reads. Why: preserve commerce and URLs.

- Avatar updates reuse safety-filtered StoriesRail; ChatActionDialog owns panels; MemberNavIcon uses token-based SVG strokes. Why: shared safe viewing and branding.
- Identity enforcement uses identity_restrictions, reviewed photo hashes, non-throwing denial triggers and identityMiddleware. Why: durable strikes and server-enforced bans.
- Verified-badge functions requireDepartment("TRUST") before privileged access. Why: authorize staff, not a second member-admin login.

- Provider balance and reconciliation live in finance-reconciliation.server.ts (snapshots, runs, discrepancies; service-role + deny-all); reconciliation logs discrepancies and never changes balances. Why: TchokoPay is the source of truth for real funds.
- All payments record on payment_transactions (service-role, deny-all) and settle only via settleCollection; bank rows succeed only by Finance confirmation. Wallet money is per currency: XAF (Mobile Money) in wallets, card money in wallet_balances at Stripe's settled currency; withdrawals use request_wallet_withdrawal; UI helpers in wallet-currency.ts. Why: exactly-once credit, no cross-rail payouts or conversions shown as balances.
- Booking commission rate lives in marketplace_settings, changed only via commission.functions.ts (REVENUE/CEO, audit-logged); paid bookings keep the rate saved at payment. Trip arrival times come from trip-eta.functions.ts (Routes API via the Maps connector, only for booking parties). Why: historical earnings never change and Maps calls stay bounded.

- Read nested AGENTS.md before editing subdirectories. Why: scoped security rules.
- Staff metrics share member-insights.functions.ts; member-review.server.ts authorizes/audits account review; staff AI threads use service-only storage. Why: consistent numbers, no impersonation or history leaks.
- Human Support reuses support.functions.ts and ticket/read records; support-state.ts owns notifications; AI chat stays separate. Why: no duplicate messaging or schema.
- Checkout uses payment-return.ts allowlist; CompassSurface owns Map/Wallet (TrackingDock/AshOrb). PullToRefresh handles content-only vertical gestures, excluding controls/cancels. Why: safe returns, no drag conflicts.
- Booking actions use booking-payment-state.ts; Stripe/bank checks refresh saved evidence; Mobile Money checks are serialized with inline outcomes. Why: pending status must not invite duplicate payment or imply settlement.
- Tracking: parties opt in via share_booking_party_location (active bookings, cleared on end); Leaflet/OSM map client-only. Why: works worldwide, no key or address.
- Service verification uses the atomic code RPC independently of disabled transfers; constraint tests use isolated PGlite, not live inserts. Why: preserve verification and funds.
- Phone alert banners belong to OS delivery, not PushBridge toasts; iOS launch storyboard owns native startup. Why: prevent duplicated notifications and opening screens.
- Personal booking_history_preferences archives/restores/removes terminal history only, never bookings or payments. Why: independent histories and financial retention.
- Verification links carry provider tab and booking ID. Why: reach the correct Received code form.
- Localize interface copy with static dictionaries and explicit tx calls, never DOM rewriting or user-content translation. Why: privacy and stable React state.

- WalletPayoutSetup reuses guarded Stripe Connect; PayoutSetupReminder saves account-scoped opt-out/cadence locally. Why: visible setup, no card collection or restricted payouts.
- WebsiteAppShowcase stays separate from MobileOnboarding; use only confirmed store links. Why: preserve native entry and honest downloads.
- Member Investment/currencies are display-only, separate from staff equity records. Why: protect funds.
- LegalDocument shares payment disclosures. Why: truthful claims.

- Marketplace resolves seller/member chats before creating threads; lookup failures stop creation. Why: preserve history.
