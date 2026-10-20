# ASH Glo — App Store & Play Store submission pack

Updated against the current preview on 11 October 2026. ASH Glo is the product; ASH Global Technologies is the legal entity. This is not confirmation of publication, store approval or a completed provider transaction test.

Mobile payment availability revised 19 October 2026: native iOS/Android and phone-sized preview offer MTN Mobile Money and Orange Money only, subject to existing region/account eligibility. Card/Stripe payments, saved cards, bank onboarding and bank withdrawals are unavailable and labelled coming soon. Website payment functionality is unchanged. No new signed binary, publication or store submission is established by this update.

**Status: documentation prepared; NOT ready for unconditional store submission.** Digital external-payment flows, full account/data erasure, signed-device testing and hosted sign-in settings remain release checks/blockers. See [STORE-READINESS.md](./STORE-READINESS.md). No publishing, store submission, keys, payment settings or funds changed in this audit.

## 1. App identity

| Field | Value |
| --- | --- |
| App name | ASH Glo |
| Promotional text | Discover services, connect with people, share moments, explore opportunities and manage bookings in one community. |
| Subtitle / short description | Social. Shop. Earn. Learn. |
| Bundle ID (iOS) / package (Android) | `com.ashglogroup.mobile` / `com.ashglogroup.app` |
| Developer / legal entity | ASH Global Technologies |
| Primary category | Social Networking |
| Secondary category | Shopping |
| Minimum user age in ASH Glo policies | 13+; this does not determine or guarantee the store rating |
| Primary locale | English; French supported in-app |
| Website | https://ashglogroup.company |
| Support URL | https://ashglogroup.company/support |
| Marketing URL | https://ashglogroup.company |
| Privacy policy URL | https://ashglogroup.company/privacy |
| Terms / EULA URL | https://ashglogroup.company/terms |
| Community Guidelines | https://ashglogroup.company/community-guidelines |
| Marketplace / booking / refund policy | https://ashglogroup.company/marketplace-policy |
| Referral / wallet terms | https://ashglogroup.company/referral-wallet-terms |
| Account and data deletion | https://ashglogroup.company/account-deletion |
| Support email | support@ashglogroup.company |
| Privacy contact | privacy@ashglogroup.company |

A public legal business address has not been provided. Do not invent one. If a store field makes one mandatory: **REQUIRES OWNER CONFIRMATION**.

## 2. Description

ASH Glo is a social commerce and opportunity platform operated by ASH Global Technologies.

Connect with people, share Feed posts and Stories, discover Spotlight, message friends and communities, and find real-world services. Browse providers, portfolios and reviews; request bookings; discover jobs, freelance projects, events, deals and property listings; and manage supported payments, referral activity and wallet records.

Providers can build a storefront, publish services and availability, receive booking requests, communicate with customers and follow transaction status. Members can report content, block users and manage privacy and personalization choices.

ASH Markets and FX Analytics provide educational and labelled demo information. ASH Investment is an inactive illustrative member chart, not a live valuation or investment offer; private staff shareholder records are separate. ASH Glo does not execute trades, provide trading signals, guarantee returns or provide personalized investment advice.

ASH AI helps members understand ASH Glo features and their own account activity. AI output can be inaccurate and does not replace professional advice.

Supported features and payment methods vary by account and region. In the mobile app, MTN Mobile Money and Orange Money use TchokoPay in Cameroon (XAF). Card/Stripe, saved cards and bank features are coming soon and unavailable. On the desktop website, card collections use Stripe and bank collection requires verified instructions and Finance confirmation; provider bank setup remains eligibility-gated. M-PESA is not supported. ASH Glo never asks for your Mobile Money PIN. Automatic provider transfers remain disabled.

Flights and Electricity are coming soon, not operational payment services. Referrals are three-level and region/account gated; withdrawals follow review/provider statuses and are not promised as instant. Mobile navigation is Feed, Market/Services, Flights, Messages and Menu, with a single floating ASH Compass (Map/Wallet). Sign-up/sign-in follows email confirmation when required, current Terms acceptance and profile-photo setup before Feed.

Identity protection denies normalized verified-name reuse and exact JPG/PNG photo copies. Attempts restrict access; a fourth attempt bans and signs out. Only authorized admin/Trust staff can restore identity access. This is not facial recognition or a guarantee against edited-image impersonation.

**Keywords:** social,services,booking,marketplace,jobs,freelance,events,property,wallet,community

## 3. App Store Connect review notes

```
ASH Glo is operated by ASH Global Technologies. It combines social networking,
user-generated content and discovery/booking of real-world services.

Demo account:
  email: REQUIRES OWNER CONFIRMATION
  password: REQUIRES OWNER CONFIRMATION

The reviewer account should be pre-activated and able to access Feed, Stories,
Spotlight, Messages, Services, bookings, Settings and reporting controls.

UGC safety:
  • Community Guidelines: /community-guidelines
  • Terms zero-tolerance rules: /terms
  • Members can report content and block users from supported surfaces.
  • Reports and media-moderation cases enter restricted staff review tools.
  • Automated media screening can block explicit uploads; users may contact
    Support to request review.

Account deletion:
  • In app: Menu → Settings → Account deletion
  • Public instructions: /account-deletion
  • Administrative approval currently closes the profile only. Full login/data
    erasure is not automated. Do not submit until a compliant deletion workflow
    and retained-data exceptions have been implemented and tested.

Payments:
  • In this mobile release: MTN Mobile Money and Orange Money via TchokoPay
    (CM/XAF), subject to existing eligibility. These flows are unchanged.
  • Card/Stripe payments, saving cards, bank account setup and bank withdrawals
    are coming soon and unavailable for all mobile users, not only reviewers.
    Wallet → payout setup shows coming soon; no card/bank entry or Stripe setup
    opens. Non-XAF balances/history remain visible, without conversion or mobile
    bank withdrawal. Existing financial records are not altered.
  • Desktop website Stripe/conditional bank availability is separate from the app.
    M-PESA is unavailable. No live provider transfers have been enabled.
  • Collections are verified server-side against provider status or signed callbacks;
    browser redirects and pending prompts are not payment evidence.
  • Stripe provider transfers remain disabled. Collection, held payable and bank
    receipt are separate. Do not claim every completed booking has been paid out.
  • CURRENT BLOCKER: external-payment digital Promote, paid Verified badge and
    referral activation require compliant native billing/eligibility treatment.
    They have NOT been disabled or converted to store billing in this audit.
  • ASH Glo does not receive or store Mobile Money PINs or full card credentials.
  • Referral/wallet terms: /referral-wallet-terms

FX Analytics:
  • Educational information and labelled demo values only.
  • No brokerage, trade execution, deposits for trading, signals, guarantees or
    personalized investment advice.

Privacy:
  • /privacy discloses account/profile data, UGC, messages, transaction records,
    activity_events, interest signals, personalization controls, city permission,
    ASH AI/staff AI context, media screening, ID/selfie review, raw IP/device
    fingerprints, approximate access locations, opt-in precise trip tracking and retention.

Apple/Google sign-in controls exist; confirm hosted provider settings and final
release sign-in before describing them as working to reviewers.
```

## 4. Apple App Privacy answers to verify in App Store Connect

| Data type | Collected | Linked to user | Tracking | Purpose |
| --- | --- | --- | --- | --- |
| Name | Yes | Yes | No | Account and app functionality |
| Email address | Yes | Yes | No | Authentication, account and support |
| Phone number | Yes | Yes | No | Account, booking and supported payments |
| User ID | Yes | Yes | No | Authentication and app functionality |
| Photos / videos | Yes | Yes | No | Profile, UGC, listings, verification and AI when submitted |
| Messages / customer support | Yes | Yes | No | Communications, safety and support |
| Coarse location (city/country and IP-derived location) | Yes for security; optional discovery | Yes | No | Security, nearby discovery and recommendations |
| Precise location | Optional active trip sharing | Yes, linked to booking/account | No | Stored active booking-party tracking; nearby city resolution separately stays on device |
| Purchase / transaction history | Yes | Yes | No | Booking, wallet, referral, withdrawal and reconciliation |
| Product interaction / app activity | Yes | Yes | No | App functionality, safety and personalization |
| Search history | Privacy-minimized event | Yes | No | Discovery and personalization |
| Device ID / access fingerprint / push token | Yes | Yes | No | Security and notifications |
| IP / browser / approximate device location | Yes | Yes where authenticated | No | Restricted security review |
| Crash / diagnostic data | Yes | May vary | No | Reliability and security |
| Sensitive ID/selfie | Applicable verification applicants | Yes | No | Manual review; separate desktop website Stripe onboarding may collect provider identity/bank information, but is unavailable in this mobile release |

These are draft classifications, not submitted console answers. No advertising SDK or cross-app advertising tracking was identified in reviewed code. Re-check all SDKs, hosting diagnostics, map/IP processing, AI and payment providers in the final binary; confirm Apple definitions of collection/linking/tracking. Never answer precise location as device-only for live trip sharing.

## 5. Google Play Data safety notes

- Data is encrypted in transit.
- Deletion requests are accessible in app and at https://ashglogroup.company/account-deletion. Current approval closes the profile only; full account/data erasure must be completed and tested before claiming compliant deletion.
- Declare personal information, UGC/messages, transactions, app activity, push/device identifiers, IP/user-agent/access fingerprints, coarse security location, optional precise trip location and applicable ID/selfie files. Saved staff AI reviews may process limited account/security records.
- In the mobile app, TchokoPay processes supported MTN/Orange transaction data. Card/Stripe payments, saved cards, bank setup and bank withdrawals are unavailable/coming soon. Stripe processing applies separately to desktop website card payments/onboarding and existing financial records, not active mobile card entry. AI services process submitted text/images and relevant context; maps/directions services receive map requests and necessary route data. Classify each under Google’s sharing/service-provider exceptions rather than assuming all processing is “not shared.”
- Data is not sold and is not used for advertising tracking in the inspected implementation.
- ASH Glo policy minimum is 13+. Complete the store’s content-rating and target-audience questionnaires truthfully; do not claim that 13+ guarantees approval or a particular rating.
- Child-safety contact: privacy@ashglogroup.company. Do not describe this address as a formally appointed DPO.

## 6. Chinese law permits field

Leave blank / not applicable unless distribution in mainland China or a store workflow specifically requires permit information. No permit, licence number, regulator or filing has been confirmed. If required: **REQUIRES OWNER CONFIRMATION**.

## 7. Final submission checklist

- [ ] Add real reviewer credentials; never submit placeholders.
- [ ] Confirm all seven canonical documents are live and readable without signing in.
- [ ] Test report/block/moderation and full account/data deletion with retained-data exceptions; profile closure alone is insufficient.
- [ ] Resolve native billing treatment for paid digital Promote, Verified badges, referral activation and any digital content; do not conceal them in review notes.
- [ ] Verify real-world vs digital tutoring/event classification; payment method depends on actual service delivery.
- [ ] Complete age/content questionnaires from actual app content; do not copy an assumed rating.
- [ ] Re-check final-binary privacy manifests and connected provider disclosures.
- [ ] Confirm screenshots and listing copy do not advertise live trading, guaranteed earnings, completed KYC or unsupported payment methods.
- [ ] Verify the signed iOS build shows only MTN/Orange mobile payment choices, card/bank coming soon, no Stripe onboarding/reminder, and no non-XAF bank withdrawal; replace screenshots advertising active mobile Stripe. Source/preview checks do not certify the binary.
- [ ] Provide a business address only if required and confirmed by the owner.
- [ ] Confirm iOS purpose strings (including live booking location), Android permissions/photo-picker compliance, Apple/Google sign-in, deep links, privacy manifests and store-required SDK targets in the signed release.
- [ ] Replace screenshots/copy that show old wallet conversions, duplicate launchers, live investment/flight claims or guaranteed payouts.
- [ ] Verify final public URLs after an explicitly approved publication; this audit changes preview wording only.
