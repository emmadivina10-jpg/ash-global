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

- Native composer stays outside scrolling. Why: no clipping.
- Inventory: business_id=provider_profiles.id; inventory_can()/inventory_role_of() RLS + inventory_members; stock only via inventory_record_movement ledger. /inventory, inventory.queries.ts. Why: tenant isolation, one stock source.

- Shareholders: shareholders.functions.ts, append-only service-role records; Finance: computeFinanceLedger. Read allFinanceRows in stable order; fail on errors. Why: complete source, no silent truncation/zeros.
- Feed/Stories/Services rank via rotation.ts after safety filtering; Feed opens exact IDs in StoriesRail. Why: one viewer.
- AppShell omits tab headers; MobileNav owns hold/slide; member screens switch instantly with no slide animation. Why: fixed-composer safety.
- Desktop Messages beside sidebar; Flights in navs. Why: access.
- Shared logo pointer, native icons/launch and web icons derive from one artwork; disabled splashes stay blank. Why: consistent branding, one opening.
- Market defaults via versioned services-mode at the existing Services URL; Extras is its child route. MarketBrowser reuses discovery/deals/property reads. Why: preserve commerce and URLs.

- Avatar updates use StoriesRail; ChatActionDialog owns panels; MemberNavIcon uses token SVG. Why: safe viewing, branding.
- Identity enforcement uses identity_restrictions, reviewed photo hashes, non-throwing denial triggers and identityMiddleware. Why: durable strikes and server-enforced bans.
- Verified badges requireDepartment("TRUST") before privileged access. Why: staff authorization.

- Provider balance and reconciliation live in finance-reconciliation.server.ts (snapshots, runs, discrepancies; service-role + deny-all); reconciliation logs discrepancies and never changes balances. Why: TchokoPay is the source of truth for real funds.
- All payments record on payment_transactions (service-role, deny-all) and settle only via settleCollection; bank rows succeed only by Finance confirmation. Wallet money is per currency: XAF (Mobile Money) in wallets, card money in wallet_balances at Stripe's settled currency; withdrawals use request_wallet_withdrawal; UI helpers in wallet-currency.ts. Why: exactly-once credit, no cross-rail payouts or conversions shown as balances.
- Booking commission rate lives in marketplace_settings, changed only via commission.functions.ts (REVENUE/CEO, audit-logged); paid bookings keep the rate saved at payment. Trip arrival times come from trip-eta.functions.ts (Routes API via the Maps connector, only for booking parties). Why: historical earnings never change and Maps calls stay bounded.

- Read nested AGENTS.md before edits. Why: security.
- Staff metrics share member-insights.functions.ts; member-review.server.ts authorizes/audits account review; staff AI threads use service-only storage. Why: consistent numbers, no impersonation or history leaks.
- Human Support reuses support.functions.ts and ticket/read records; support-state.ts owns notifications; AI chat stays separate. Why: no duplicate messaging or schema.
- Checkout uses payment-return.ts; CompassSurface owns Map/Wallet in a shared dialog with scoped overlay; BookingTracking is shared inline/Compass. PullToRefresh excludes controls. Why: safe returns, accessible dismissal.
- Booking actions use booking-payment-state.ts; Stripe/bank checks refresh saved evidence; Mobile Money checks are serialized with inline outcomes. Why: pending status must not invite duplicate payment or imply settlement.
- Tracking: parties opt in via share_booking_party_location (active bookings, cleared on end); Leaflet/OSM map client-only. Why: works worldwide, no key or address.
- Service verification uses the atomic code RPC independently of disabled transfers; constraint tests use isolated PGlite, not live inserts. Why: preserve verification and funds.
- OS delivers phone alerts (no PushBridge toasts); iOS storyboard owns startup. Why: no duplicates.
- Personal booking_history_preferences archives/restores/removes terminal history only, never bookings or payments. Why: independent histories and financial retention.
- Verification links carry provider tab and booking ID. Why: reach the correct Received code form.
- Localize interface copy with static dictionaries and explicit tx calls, never DOM rewriting or user-content translation. Why: privacy and stable React state.

- WalletPayoutSetup reuses guarded Stripe Connect; PayoutSetupReminder saves account-scoped opt-out/cadence locally. Why: visible setup, no card collection or restricted payouts.
- WebsiteAppShowcase stays separate from MobileOnboarding; confirmed store links only. Why: honest native entry/downloads.
- Member Investment/currencies are display-only, separate from staff equity records. Why: protect funds.
- LegalDocument shares payment disclosures. Why: accuracy.

- Marketplace reuses chats; lookup errors stop creation. Deletion keeps scoped hiding/sender policies; replies store IDs; voice-playback arbitrates audio/recording. Why: private history, exclusive audio.
- Card/bank show via useCardBankAvailable (flag or web); viewers use useOverlayBack. Why: app-only restriction; Back closes viewers.
