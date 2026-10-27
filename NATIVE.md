# ASH Glo — native apps (App Store & Play Store)

The native builds are Capacitor shells around the live ASH Glo deployment. The
app keeps its server-rendered pages, auth callbacks and realtime chat,
while gaining a native container, splash screen,
status bar, hardware back button and store distribution.

**Current mobile payment release:** MTN Mobile Money and Orange Money through TchokoPay only where eligible (Cameroon/XAF). **Card and bank — coming soon:** card/Stripe payments, saved cards, bank setup and bank withdrawals are unavailable in native apps and phone-sized preview. Desktop website payment availability is separate. Live-transfer safeguards remain unchanged; this is not store-submission clearance.

## After cloning from GitHub

`ios/` and `android/` are **committed** to the repository. They contain
production configuration that `npx cap add` does not recreate: Info.plist
purpose strings, `App.entitlements` (push + universal links), the Android
manifest permissions and deep links, generated icons and splash screens, and
the release signing hooks. A cloud build must compile the exact project that
was reviewed, so never delete and re-add the platforms casually.

You need Node 22+ for Capacitor 8. Xcode is **not** required locally — iOS builds run on
Codemagic's macOS machines.

```bash
git clone <this repo> && cd <repo>
npm install          # or: bun install
npx cap sync         # regenerates web assets, plugins, Package.swift, gradle files
npx cap doctor       # sanity check
```

Only if the native folders are ever lost or deliberately reset:

```bash
npx cap add ios
npx cap add android
npx cap sync
# then re-apply native/ios-info-plist-additions.xml,
# native/android-manifest-additions.xml, ios/App/App/App.entitlements and
# npx @capacitor/assets generate
```

## Cloud builds (Codemagic — no local Xcode)

`codemagic.yaml` at the repository root defines two workflows:

| Workflow | Machine | Output |
| --- | --- | --- |
| `ios-app-store` | macOS (Xcode latest) | signed `.ipa` → TestFlight / App Store |
| `android-play` | Mac mini M2 (JDK 21, Node 22) | signed `.aab` artifact only; no Play upload |

Android uses pinned Bun 1.4.4 with the existing frozen `bun.lock`, verifies the web build without deploying, then runs `npx cap sync android`. iOS installation and signing are unchanged; its existing npm lockfile has been synchronized with the current manifest. The repository has no `packageManager` declaration and intentionally retains both existing install paths rather than switching iOS. Generated assets
(`ios/App/App/public`, `android/app/src/main/assets/public`, `Package.swift`)
are produced in CI and stay out of git.

No certificate, keystore, API key or password is stored in this repository.
Supply them in Codemagic:

- **App Store Connect API key** (Issuer ID, Key ID, `.p8`) as an integration
  named `ASH Glo API Key`; iOS signing uses `distribution_type: app_store` and
  `bundle_identifier: com.ashglogroup.mobile`.
- **Android keystore** uploaded as the signing reference `ash_glo_keystore`
  (existing alias `ashglo-upload`). Locally, Gradle instead reads git-ignored
  `android/keystore.properties` (`storeFile`, `storePassword`, `keyAlias`,
  `keyPassword`); incomplete signing now stops Android release tasks instead of producing an unsigned bundle.
- **Android version:** in Play Console → ASH Glo → Test and release → App bundle explorer, inspect all uploaded bundles across all tracks and record the highest **version code**, not version name. Set `ANDROID_PREVIOUS_VERSION_CODE` to that confirmed maximum in Codemagic's `android_release` group, and leave `ANDROID_VERSION_CODE` unset to compute maximum + positive `BUILD_NUMBER`; `ANDROID_VERSION_CODE_BASE` remains an optional explicit base. Use previous `0` only after confirming no prior uploads. Alternatively provide an explicit `ANDROID_VERSION_CODE` above the confirmed maximum. Codes must be 1–2100000000; overflow fails rather than wraps. CI resolves once and exports through `CM_ENV`; Gradle release refuses a missing code (local debug alone retains 1), and the final AAB manifest must match the resolved code. `ANDROID_VERSION_NAME` still defaults to `1.0`. Reconfirm history across workflow resets or parallel release workflows. No Google Play service-account JSON is needed for artifact-only builds.

See [GOOGLE-PLAY-PREP.md](./GOOGLE-PLAY-PREP.md) for the verified preparation report, exact Codemagic steps and unresolved submission checks.

## Universal links / App Links

`ios/App/App/App.entitlements` declares `applinks:ashglogroup.company` and
`aps-environment`; the Android manifest declares an `autoVerify` intent filter
for the same hosts. For verification to succeed the production domain must
serve:

- `https://ashglogroup.company/.well-known/apple-app-site-association`
  (JSON, no extension, `application/json`) containing `TEAMID.com.ashglogroup.mobile`
- `https://ashglogroup.company/.well-known/assetlinks.json` containing the
  Play App Signing SHA-256 fingerprint for `com.ashglogroup.app` (Android)

Both need values only Apple Developer / Play Console can give you, so they are
not committed with placeholders.

## Everyday workflow

Whenever you change `capacitor.config.ts`, add a plugin, or update the app icon:

```bash
npx cap sync
npx cap open ios       # builds & runs from Xcode
npx cap open android   # builds & runs from Android Studio
```

You do **not** need to rebuild the app for normal product changes — publishing
the web app updates the native apps immediately, because they load
`https://ashglogroup.company`.

To point a build at the preview environment instead:

```bash
CAP_SERVER_URL=https://project--27f7580a-d6af-45a7-9546-ba56b1916cbe-dev.lovable.app npx cap sync
```

## App identity

| Setting | Value |
| --- | --- |
| App ID (bundle id / package name) | `com.ashglogroup.mobile` (iOS) / `com.ashglogroup.app` (Android) |
| App name | ASH Glo |
| Splash / status bar colour | `#080812` |

Do not change either registered identity. Android-specific commands (or `ASH_NATIVE_PLATFORM=android`) select `com.ashglogroup.app`; iOS/default configuration retains `com.ashglogroup.mobile`. Use platform-specific sync for releases.

## Icons and splash screens

Put a 1024×1024 PNG icon and a 2732×2732 splash in `resources/` and generate all
sizes:

```bash
npm install -D @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor '#080812' --splashBackgroundColor '#080812'
```

## Store submission checklist

Full listing copy, review notes and privacy answers live in
[STORE-SUBMISSION.md](./STORE-SUBMISSION.md). Before you submit:

1. **Legal URLs** — privacy https://ashglogroup.company/privacy, terms
   https://ashglogroup.company/terms, account deletion
   https://ashglogroup.company/account-deletion, community guidelines
   https://ashglogroup.company/community-guidelines, marketplace policy
   https://ashglogroup.company/marketplace-policy, referral and wallet terms
   https://ashglogroup.company/referral-wallet-terms, and support
   https://ashglogroup.company/support. Verify all URLs publicly after approved publication; preview changes are not proof of updated live wording.
2. **iOS purpose strings** — paste `native/ios-info-plist-additions.xml` into
   `ios/App/App/Info.plist`. Without them iOS terminates the app when a user taps
   a portfolio upload field (automatic rejection, Guideline 5.1.1).
3. **Android manifest** — merge `native/android-manifest-additions.xml` into
   `android/app/src/main/AndroidManifest.xml`. Never add `QUERY_ALL_PACKAGES`.
4. **Target SDK 36+** for the October 2026 submission requirements, 64-bit AAB, Play App Signing, and verified 16 KB native-library compatibility.
5. **User-generated content controls** (Apple 1.2 / Play UGC policy) exist in code; verify on the release binary:
   zero-tolerance clause in `/terms` §3, in-app report flag on provider profiles,
   reviews and chat, user blocking, and the `/console/reports` moderation queue.
6. **Account deletion** — Menu → Settings → Account. Approval currently only closes a profile; implement and test full account/data erasure and lawful retained-data exceptions before declaring compliance.
7. **Sign in with Apple/Google** — controls exist; hosted settings and signed-device OAuth remain unverified by this audit.
8. **Payments** — mobile real-world services offer eligible MTN Mobile Money/Orange Money via TchokoPay (CM/XAF) only. Card/Stripe payments, saved cards, bank setup and bank withdrawals must show coming soon and must not open on the signed mobile build. Desktop website availability is separate; M-PESA is absent. External digital Promote, paid Verified badge and referral activation are present: resolve native billing rules or legitimately remove these purchases from the native release, including server access, before submission. Mobile Money alone does not resolve digital-purchase billing. No store billing implementation was identified; do not claim universal IAP exemption. Check tutoring/event delivery classification as well.
9. **Demo account** — create a pre-activated reviewer account with a published
   storefront and put the credentials in the App Store Connect review notes and
   the Play Console testing instructions.
10. **Push notifications** — configured categories include social and booking/account activity; remote closed-app delivery remains unverified. The Android
    13 runtime prompt is requested at the point of use.

Apple reviews web-container apps against Guideline 4.2, so keep the native
splash, status bar handling, hardware back button, in-app browser, native share
and push notifications that make this build more than a wrapper.

## Release blockers and disclosures

See STORE-READINESS.md: stored opt-in precise trip tracking must be reflected in the iOS location purpose string and store privacy forms. Android broad photo/video permissions need a permitted core-use justification or system-picker treatment. Check actual native geolocation permissions, manifests, privacy SDK declarations and closed-app delivery on signed devices. No native configuration or real-money setting was changed by this documentation audit.

## What's wired in the codebase

### Notification delivery and launch status

- PushBridge no longer emits a second in-app popup. The native OS owns remote
  push banners; Capacitor foreground presentation is enabled and iOS forwards
  APNs registration callbacks to the plugin.
- Realtime browser alerts only run in a background tab while the web app is
  alive; native realtime events no longer generate duplicate local banners.
  Neither mechanism proves closed-app remote delivery is configured.
- Closed-app sender avatars remain blocked: this repository has no configured
  remote notification sender or iOS Notification Service Extension. Completing
  that requires authorized APNs/FCM delivery configuration and an iOS extension
  using communication notifications; neither is simulated by a browser canvas.
- The iOS launch storyboard now shows a 96-point ASH mark and bottom ASH GLO
  wordmark rather than the oversized Splash bitmap. Native launches do not
  replay WelcomeIntro. These changes require a new signed TestFlight build;
  web publication cannot change an already installed native launch storyboard.

- `capacitor.config.ts` — app identity, remote server URL, allowed domains,
  splash/status-bar/keyboard plugin config.
- `native/www/index.html` — offline bootstrap screen bundled inside the binary.
- `src/lib/native.ts` — `isNativeApp()`, `nativePlatform()`, `initNativeShell()`
  (status bar tint, splash dismiss, Android back button) and `openExternal()`
  which uses the in-app browser on device.
- `src/components/refer/NativeBridge.tsx` — mounted in the root route; inert on
  the web.
- `src/styles.css` — `html.native` safe-area padding for notches and the iOS
  home indicator.

## Built artifacts (iOS com.ashglogroup.mobile)

Native projects are generated and committed: `android/` (Gradle) and `ios/` (Xcode).
Icons/splash are generated from `assets/` via `npx @capacitor/assets generate`.

Historical artifact names (not recompiled, located or signature-verified in this audit):

| File | Use |
|---|---|
| `ASH-Glo-debug.apk` | sideload/test on any phone |
| `ASH-Glo-release.apk` | signed release, direct install/distribution |
| `ASH-Glo-release.aab` | upload to Google Play Console |

Signing must be verified in the authorized release environment. Keep the existing signing identity safe; this audit does not establish which key signed historical artifacts or authorize key/password changes.

Rebuild:
```bash
npx cap sync
cd android && ./gradlew assembleRelease bundleRelease   # needs JDK 21 + Android SDK 36
```

### iOS
Requires macOS + Xcode (cannot be compiled on Linux):
```bash
npx cap sync ios
cd ios/App && pod install   # if using CocoaPods
npx cap open ios            # set team, then Product > Archive > Distribute
```
