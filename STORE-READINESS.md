# ASH Glo — store readiness and verified disclosures

Reviewed 11 October 2026 against current source and official Apple/Google policy pages. **Documentation prepared; submission is not cleared.** No publication, provider transaction, hosted settings mutation, credentials change or store submission was performed. This is not legal advice or a promise of approval.

### Mobile release update — 19 October 2026

Native apps and phone-sized preview now treat card/Stripe payments, saved cards, bank onboarding and bank withdrawals as **coming soon / unavailable**. MTN Mobile Money and Orange Money remain unchanged under existing region/account rules. Payout setup reminders are suppressed on mobile. Non-XAF balances/history remain visible but cannot be withdrawn through a mobile bank action or converted to Mobile Money. Desktop website availability and all settlement, commission, service-code, webhook and live-transfer safeguards are unchanged.

The matrix below describes underlying website/payment capabilities; it does **not** advertise card/bank availability in this mobile release. This presentation update does not resolve external Mobile Money digital-purchase billing, account/data erasure, reviewer access, privacy/permission checks or signed-build verification. App Store submission remains blocked pending those checks; no publish or submission performed.

## Payment and availability matrix

| Surface | Implemented collection | Confirmation / limitations |
| --- | --- | --- |
| Accepted real-world service booking | Stripe card; Cameroon MTN/Orange via TchokoPay; conditional bank transfer | Stripe signed webhook or authenticated provider status check; TchokoPay verified status/callback; bank receipt confirmed by Finance. Payment and service completion are distinct. |
| Wallet Add money | Stripe card, MTN/Orange; conditional bank instructions | Credit only on confirmed collection. Card top-ups use actual gross platform settlement amount/currency; Mobile Money uses XAF. Not guaranteed to match card billing currency. |
| Public payment link | MTN/Orange, Stripe card; conditional bank transfer | Verified provider outcome / Finance confirmation. Separate 1% payment-link fee. Check the actual purpose; a link does not make a digital purchase exempt from native billing. |
| Optional referral activation | Supported Mobile Money or eligible XAF wallet | Current fee 5,000 XAF; region/account gating. No direct card checkout on this screen. Non-XAF card funds cannot automatically pay it. Requires store billing/earning-policy treatment before native submission. |
| Event tickets | TchokoPay Mobile Money | Verified outcome. Physical live event versus digital streamed content must be classified separately for store billing. |
| ASH Promote visibility | TchokoPay Mobile Money | Digital visibility purchase: native billing blocker, not a physical-service exemption. Current plans are 1/7/30 days at 1,000/5,000/15,000 XAF. |
| Paid ASH Verified badge | TchokoPay Mobile Money | Digital badge purchase: native billing blocker. Current monthly tiers are 3,500/9,000/25,000 XAF; do not confuse payment with identity assurance. |
| Mobile Money withdrawal | MTN/Orange, funded XAF rail | 100 XAF minimum; available balance, destination, account and review/provider checks. Stripe funds cannot fund this payout rail. |
| Stripe bank withdrawal/setup | Approved providers only, matching currency and saved controls/capabilities | Onboarding helper enabled, transfers helper disabled. No direct saved-card withdrawal or automatic e-Transfer. An ineligible customer can hold card funds without an eligible bank payout destination: resolve this limitation before advertising unrestricted cash-out. |
| Flights / Electricity | Coming soon | No operational flight booking/payment or bill-payment service. Do not advertise as active. |
| M-PESA | Not implemented | Do not list as an ASH payment option; Kenyan country/currency display is not integration evidence. |
| ASH Investment | Inactive member chart | Decorative three-line chart, no live price, trading, deposits, returns or investment recommendations. Private staff shareholder records are separate. |

Availability above is code evidence, not proof of a successful current provider transaction in every region. Bank collections require enabled, verified bank instructions. Marketplace uses the established TD-linked Stripe arrangement; the separate Flights/CIBC arrangement must never be substituted for Marketplace collections or payouts. This audit did not reverify account ownership, current balances or hosted webhook deliveries.

## Current blockers / owner decisions

1. **Digital billing:** paid Promote, Verified badges and referral activation use external payments. Resolve with compliant Apple/Google billing, a properly enforced native release without those purchases, or an applicable permitted regional program with documented eligibility. Do not silently hide purchases only from reviewers; do not assume a physical-service exemption covers them. Decide with qualified store-policy/legal review, especially paid referral earning access. Review digital tutoring, subscriptions and streamed events too.
2. **Deletion:** Settings/public Support accept requests. New approval is now blocked in preview code rather than claiming profile closure is deletion. A restartable server-only coordinator has isolated fixture coverage but no live persistence adapter. Genuine erasure remains blocked by missing legally approved field-level retention/expiry rules and cascade-safe database changes; authentication, files and personal data have not been erased or verified end-to-end. Published code is unchanged. Do not advertise completed erasure or App Store readiness.
3. **Native permissions:** iOS location wording currently describes nearby discovery, not optional server-stored live booking sharing. Update purpose strings before a new signed build. Android source requests broad photo/video access; use a system picker or justify eligible core functionality under Play photo/video permissions rules. Verify actual native geolocation permissions and microphone/video functionality. No permissions changed in this documentation-only audit.
4. **Release verification:** check Apple/Google hosted sign-in settings, signed-device OAuth, privacy manifests/required-reason APIs, SDK requirements, universal/app links, photo capture/upload, full report/block/moderation and deletion flows. Existing source configuration is not evidence of hosted provider settings or a completed signed release.
5. **Funds:** automatic provider transfers remain disabled. Complete authorized real provider onboarding/collection/service verification/payout tests before advertising working provider bank payouts. Confirm card-wallet cash-out eligibility, holds and restrictions clearly before collecting funds; no real-money test is authorized by this document.
6. **Store access:** reviewer account, confirmed legal address if required, final age/content answers, Play financial-features declaration as applicable, social-app child safety standards/contact and current signed screenshots remain owner/release inputs. Never submit placeholders or promise a store rating based on the app’s 13+ policy.
7. **Notifications:** remote closed-app sender photos and ASH badge are not proven by browser notifications; remote configuration, an iOS communication notification extension and signed device tests remain needed. Do not claim that this feature is ready in listing copy.

## Privacy / data safety evidence

- Personal/profile/contact data, UGC, messages, booking/payment histories and support records are linked to accounts.
- City personalization is optional. Nearby city resolution uses device coordinates locally, **but opt-in live booking tracking stores precise coordinates/accuracy/time** linked to active bookings. Booking parties and authorized security staff can access relevant tracking records; sharing is cleared on booking end.
- Cyber access records include raw IP, user-agent, access fingerprint and approximate IP-derived location. Rate-limit counters use hashed IP separately; not all security data is IP-free.
- Stripe processes hosted card details and eligible provider onboarding identity/bank information. TchokoPay processes Cameroon MTN/Orange requests. Map tiles/directions involve external services. AI handles selected images/text/account context; restricted staff AI reviews may be saved.
- Wallet currency, Compass visibility/position, payout reminder preferences, language/theme and session state use device storage; session cookies may be used. Unfunded currency choices show zero and do not convert funds.
- Draft Apple/Play classifications are in STORE-SUBMISSION.md. Check each final SDK/provider against definitions of collection, linking, service-provider sharing and tracking. “Not sold” is not the same as “not processed by another provider.”
- The public safety policy specifies 24-month retention with case/law exceptions. Actual installed cleanup schedules and full erasure execution need hosted verification; do not infer them from old changelog statements.

## Reviewer journey to verify on the final release

1. Open Support, Privacy, Terms, Community Guidelines, Marketplace Policy, Referral/Wallet Terms, Contact and Account Deletion without signing in.
2. Sign in using owner-provided reviewer access, then inspect Feed, Stories, Messages, Market/Services, reporting/blocking and Settings.
3. On the signed mobile build, confirm MTN/Orange only where eligible, card/bank coming soon, no Stripe setup or reminders and no bank withdrawal for non-XAF balances. Review only authorized real-world Mobile Money flows; never create unapproved charges. Check checkout/receipt/wallet currencies. Website card flows are separate.
4. Customer alone sees service code; provider progresses trip, both optionally share location, and authorized server validation completes service without falsely claiming bank payout.
5. Currency switching preserves actual amounts and shows zero for unfunded currencies; withdrawals enforce matching rail and eligibility. Explain held card funds and disabled bank execution truthfully.
6. Test genuine deletion and retained-data exceptions after implementing the missing erasure workflow; inspect public request access.
7. Use fresh screenshots of this release. No invented earnings, live investment values, active Flights/Electricity/M-PESA, unrestricted bank cash-out or guaranteed returns.

## Official references

Pages retrieved successfully on 11 October 2026; policies/program exceptions can change, so recheck before submitting.

- [Apple App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) — 1.2 UGC, 3.1.1 digital IAP, 3.1.3(e) outside-app goods/services, 3.1.3(g) same-app advertising/boosts, 4.2 minimum functionality, 4.8 login and 5.1.1(v) deletion.
- [Google Play Payments](https://support.google.com/googleplay/android-developer/answer/9858738) — digital features versus physical goods/services and applicable program exceptions.
- [Google Play account deletion](https://support.google.com/googleplay/android-developer/answer/13327111) — in-app and outside-app request paths and associated-data deletion.
- [Google Play UGC](https://support.google.com/googleplay/android-developer/answer/9876937) — terms, reporting, blocking and ongoing moderation.
- [Google Play photo/video permissions](https://support.google.com/googleplay/android-developer/answer/14115180) — broad access eligibility versus system photo picker.

## Audit verification

Eight public policy/help pages and the welcome page opened without login, horizontal overflow or runtime errors; unique titles/descriptions/Open Graph metadata were verified. Privacy, wallet terms and Support screenshots were visually inspected. 94 focused payment/currency/region tests passed; the latest preview build reported OK. No hosted signup settings, signed binary or completed provider payout is established by source inspection. No new downloadable policy export was requested; existing Files copies remain historical.