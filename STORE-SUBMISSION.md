# ASH Glo — App Store & Play Store submission pack

Everything a reviewer asks for, in one place. Keep this file updated with each
release. Companion docs: [`NATIVE.md`](./NATIVE.md) (building), [`SECURITY.md`](./SECURITY.md),
[`DOCS-INDEX.md`](./DOCS-INDEX.md).

## 1. App identity

| Field | Value |
| --- | --- |
| App name | ASH Glo |
| Subtitle / short description | Book braiders, barbers & home pros |
| Bundle ID / package | `com.ashglogroup.mobile (iOS) · com.ashglogroup.app (Android)` |
| Developer | ASH Global Technologies |
| Category | Lifestyle (secondary: Business) |
| Age rating | 18+ (unrestricted web access in-app + user-generated content + marketplace) |
| Primary locale | English; French supported in-app |
| Website | https://ashglogroup.company |
| Support URL | https://ashglogroup.company/support |
| Marketing URL | https://ashglogroup.company |
| Privacy policy URL | https://ashglogroup.company/privacy |
| Terms / EULA URL | https://ashglogroup.company/terms |
| Account deletion URL (Play requirement) | https://ashglogroup.company/account-deletion |
| Support email | support@ashglogroup.company |
| Privacy email | privacy@ashglogroup.company |

## 2. Description (paste into both stores)

> ASH Glo is the marketplace for real-world services. Discover verified braiders,
> barbers, nail and lash technicians, electricians, nurses and other professionals
> near you, browse their photo and video portfolios, read verified reviews, chat
> directly, book a slot and pay securely with mobile money or card. Providers get a
> free storefront, booking calendar, payment links and payouts. ASH Glo takes a 1%
> platform commission on completed bookings — no subscription.

Keywords: braider, barber, nails, lashes, booking, marketplace, mobile money, services, Africa, provider.

## 3. Review notes (paste into App Store Connect "Notes")

```
ASH Glo is a real-world services marketplace (bookings for hairdressing,
barbering, nails, electrical and nursing work). All goods and services are
consumed in the physical world, so payments use mobile money and cards rather
than in-app purchase (App Store Review Guideline 3.1.3(e) / 3.1.5(a)).

Demo account (full customer + provider access):
  email: <reviewer demo email>
  password: <reviewer demo password>
The demo account is pre-activated, has a published storefront, and can complete
a booking end to end in sandbox mode.

User-generated content controls (Guideline 1.2):
  - Terms with an explicit zero-tolerance clause: /terms section 3
  - Flag/report control on provider profiles, reviews and chat threads
  - Block user control in the same dialog
  - Reports reach the ASH Trust & Safety console and are actioned within 24h
  - Account deletion: More > Settings > Delete account, and /account-deletion

Sign in with Apple is offered alongside Google sign-in (Guideline 4.8).
Push notifications are used for booking, payment and payout events only.
```

## 4. Apple App Privacy answers

| Data type | Collected | Linked to user | Used for tracking | Purpose |
| --- | --- | --- | --- | --- |
| Name | Yes | Yes | No | App functionality |
| Email address | Yes | Yes | No | App functionality, account management |
| Phone number | Yes | Yes | No | App functionality (bookings, mobile money) |
| Photos / videos | Yes | Yes | No | App functionality (provider portfolios) |
| Coarse location (city, typed or approximate) | Yes | Yes | No | App functionality (nearby providers) |
| Purchase / payment history | Yes | Yes | No | App functionality, financial records |
| Customer support / messages | Yes | Yes | No | App functionality, support |
| Device ID (push token) | Yes | Yes | No | App functionality (notifications) |
| Crash / performance data | Yes | No | No | Analytics |

No data is used for third-party advertising or tracking. No ad SDKs are bundled,
so App Tracking Transparency is not required.

## 5. Google Play Data safety answers

- Data is encrypted in transit (HTTPS/TLS everywhere).
- Users can request deletion of their data: yes — https://ashglogroup.company/account-deletion
- Data collected: personal info (name, email, phone), photos and videos, messages,
  financial info (transaction history, payout account reference), app activity,
  device IDs (push token), approximate location (user-entered city).
- Data shared with: payment processors (TchokoPay, Stripe) for processing payments only.
- Data is not sold, and not used for advertising or tracking.
- Independent security review / following Play Families policy: not a Families app (18+).

## 6. Play declarations checklist

- [x] Privacy policy URL set in Play Console → App content
- [x] Data safety form completed as above
- [x] Account deletion URL provided
- [x] Financial features declaration: app facilitates payments for real-world
      services; ASH Glo is not a lender and offers no credit products
- [x] Ads declaration: contains no ads
- [x] Content rating questionnaire: user interaction + user-generated content +
      unrestricted internet → expect Mature 17+/18+
- [x] Target audience: 18 and over; no child-directed content
- [x] Child safety standards: policy published in /terms §3, reporting and
      blocking shipped in-app, CSAE contact privacy@ashglogroup.company
- [x] Government/financial app declaration: N/A
- [x] Target SDK 35+ and 64-bit AAB from Android Studio

## 7. Store policy loopholes that are now closed

| Risk | Guideline | Fix in this repo |
| --- | --- | --- |
| No terms / EULA link | Apple 1.2, 3.1.2 | `/terms` route, linked from footer and Settings |
| No zero-tolerance UGC clause | Apple 1.2 | `/terms` §3 |
| No way to report content | Apple 1.2, Play UGC | `ReportDialog` on provider profiles, reviews, chat |
| No way to block a user | Apple 1.2, Play UGC | Block action in the same dialog + DB trigger refusing blocked messages |
| No moderation workflow | Apple 1.2 | `/console/reports` Trust & Safety queue, 24h SLA |
| No public account deletion URL | Play Data deletion | `/account-deletion` |
| No in-app account deletion | Apple 5.1.1(v) | More → Settings → Delete account |
| Missing iOS purpose strings → crash on upload | Apple 5.1.1 | `native/ios-info-plist-additions.xml` |
| Missing Android permissions/queries | Play | `native/android-manifest-additions.xml` |
| Digital-purchase confusion | Apple 3.1.1 | Real-world services only, stated in `/terms` §4 and review notes |
| Google sign-in without Apple sign-in | Apple 4.8 | Sign in with Apple shipped |
| Thin web wrapper | Apple 4.2 | Native splash, status bar, hardware back, push notifications, in-app browser, native share |
| Broken/incomplete PWA manifest | Play TWA / install | `public/manifest.webmanifest` rewritten with id, scope, maskable icons |

## 8. Assets needed before you press submit

- iOS screenshots: 6.7" and 6.5" iPhone (3–10 each), optional 12.9" iPad
- Android screenshots: phone (2–8), 1024×500 feature graphic, 512×512 icon
- App icon: 1024×1024 PNG, no alpha, no rounded corners (in `resources/`)
- Demo account credentials filled into the review notes above
- Signed builds: `.ipa` via Xcode → Distribute, `.aab` via Android Studio →
  Generate Signed Bundle
