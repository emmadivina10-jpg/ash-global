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

- Native composer outside scrolling: no clipping.
- Native Android release uses platform-scoped Capacitor identity, one preflight-resolved environment version exported through CM_ENV (explicit or confirmed Play maximum/base plus build counter), no release fallback to debug version, and fail-closed keystore signing in artifact-only CI; iOS workflow stays separate. Why: prevent guessed/stale or mismatched artifact versions while protecting signing and successful iOS builds without publishing.
- Keep Bun's frozen lock for app/Android installs and a synchronized npm lock for the existing iOS npm workflow; do not switch managers to bypass failures. Why: preserve successful native dependency resolution without forcing an iOS migration.
- Native iOS CI exports a signed IPA artifact with the existing Apple integration, without payment-secret groups or automatic TestFlight publishing. Why: the remote app owns payment configuration, while artifact builds must not distribute releases.
- Inventory: business_id=provider_profiles.id; inventory_can()/inventory_role_of() RLS + inventory_members; stock only via inventory_record_movement ledger. /inventory, inventory.queries.ts. Why: tenant isolation, one stock source.

- Shareholders: shareholders.functions.ts, append-only service-role records; Finance: computeFinanceLedger. Read allFinanceRows in stable order; fail on errors. Why: complete source, no silent truncation/zeros.
- Feed/Spotlights: member-keyed caches, rotateSessionContent; explicit-refresh reset; exact IDs in StoriesRail. Why: varied openings, stable scroll/viewer.
- AppShell omits tab headers; MobileNav owns hold/slide; member screens switch instantly, no animation. Why: composer safety.
- Desktop Messages by sidebar; Flights in navs.
- Shared logo, native icons/launch and web icons use one artwork; disabled splashes stay blank. Why: consistent branding, one opening.
- Market defaults via versioned services-mode at the existing Services URL; Extras is its child route. MarketBrowser reuses discovery/deals/property reads. Why: preserve commerce and URLs.

- Avatar updates use StoriesRail; ChatActionDialog owns panels; MemberNavIcon uses token SVG. Why: safe viewing, branding.
- Identity enforcement uses identity_restrictions, reviewed photo hashes, non-throwing denial triggers and identityMiddleware. Why: durable strikes and server-enforced bans.
- Verified badges requireDepartment("TRUST") before privileged access. Why: staff authorization.

- Provider balance and reconciliation live in finance-reconciliation.server.ts (snapshots, runs, discrepancies; service-role + deny-all); reconciliation logs discrepancies and never changes balances. Why: TchokoPay is the source of truth for real funds.
- Payments record on payment_transactions (service-role, deny-all), settle only via settleCollection; bank rows need Finance confirmation. Wallets per currency: XAF in wallets, card in wallet_balances (Stripe settled currency); withdrawals via request_wallet_withdrawal; UI in wallet-currency.ts. Why: exactly-once, no cross-rail payouts.
- Commission rate in marketplace_settings, changed only via commission.functions.ts (audited); paid bookings keep their saved rate. Trip ETAs via trip-eta.functions.ts (Maps connector, parties only). Why: stable earnings, bounded Maps calls.

- Read nested AGENTS.md first. Why: security.
- Staff metrics/presence share member-insights.functions.ts; AppShell awaits authenticated heartbeats; member-review.server.ts guards review; staff AI storage is service-only. Why: accurate status, private history.
- Human Support reuses support.functions.ts and ticket/read records; support-state.ts owns notifications; AI chat stays separate. Why: no duplicate messaging or schema.
- Checkout uses payment-return.ts; CompassSurface owns Map/Wallet in a shared dialog with scoped overlay; BookingTracking is shared inline/Compass. PullToRefresh excludes controls. Why: safe returns, accessible dismissal.
- Booking actions use booking-payment-state.ts; Stripe/bank checks refresh saved evidence; Mobile Money checks are serialized with inline outcomes. Why: pending status must not invite duplicate payment or imply settlement.
- Tracking: parties opt in via share_booking_party_location (active bookings, cleared on end); Leaflet/OSM map client-only. Why: works worldwide, no key or address.
- Service verification uses the atomic code RPC independently of disabled transfers; constraint tests use isolated PGlite, not live inserts. Why: preserve verification and funds.
- OS delivers phone alerts (no PushBridge toasts); iOS storyboard owns startup. Why: no duplicates.
- Personal booking_history_preferences archives/restores/removes terminal history only, never bookings or payments. Why: independent histories and financial retention.
- Verification links carry provider tab + booking ID. Why: correct code form.
- Localize interface copy with static dictionaries and explicit reactive tx calls; shared language preference handles persistence failures and cross-tab updates, never DOM rewriting or user-content translation. Why: immediate consistent switching, privacy and stable React state.

- WalletPayoutSetup reuses guarded Stripe Connect; PayoutSetupReminder saves account-scoped opt-out/cadence locally. Why: visible setup, no card collection or restricted payouts.
- DesktopLanding/MobileOnboarding stay separate from auth and compact WelcomeIntro; use login next and confirmed store links. Why: safe entry.
- Member Investment/currencies are display-only, separate from staff equity records. Why: protect funds.
- LegalDocument shares payment text. Why: accuracy.

- Marketplace reuses chats; lookup errors stop creation. Deletion keeps scoped hiding/sender policies; replies store IDs; voice-playback arbitrates audio/recording. Why: private history, exclusive audio.
- Card/bank use mobile-payment-policy; viewers use useOverlayBack. PostCard photos use portal MediaLightbox. Why: Back keeps feed scroll; rails unchanged.
- Staff wallet credits go only through admin_credit_wallet_audited with an individual seat and a client request ID held until resolved. Why: atomic audit, exactly-once credit.
