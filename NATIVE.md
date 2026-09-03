# ASH Glo — native apps (App Store & Play Store)

The native builds are Capacitor shells around the live ASH Glo deployment. The
app keeps its server-rendered pages, payments, auth callbacks and realtime chat
working exactly as on the web, while gaining a native container, splash screen,
status bar, hardware back button and store distribution.

## After cloning from GitHub

`ios/` and `android/` are **committed** to the repository. They contain
production configuration that `npx cap add` does not recreate: Info.plist
purpose strings, `App.entitlements` (push + universal links), the Android
manifest permissions and deep links, generated icons and splash screens, and
the release signing hooks. A cloud build must compile the exact project that
was reviewed, so never delete and re-add the platforms casually.

You only need Node 20+. Xcode is **not** required locally — iOS builds run on
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
| `android-play` | Linux (JDK 21) | signed `.aab` → Play internal track |

Both run `npm install` then `npx cap sync` before building, so generated assets
(`ios/App/App/public`, `android/app/src/main/assets/public`, `Package.swift`)
are produced in CI and stay out of git.

No certificate, keystore, API key or password is stored in this repository.
Supply them in Codemagic:

- **App Store Connect API key** (Issuer ID, Key ID, `.p8`) as an integration
  named `ASH Glo API Key`; iOS signing uses `distribution_type: app_store` and
  `bundle_identifier: com.ashglogroup.app`.
- **Android keystore** uploaded as the signing reference `ash_glo_keystore`
  (alias `ashglo`). Locally, Gradle instead reads git-ignored
  `android/keystore.properties` (`storeFile`, `storePassword`, `keyAlias`,
  `keyPassword`); with neither present the release build is simply unsigned.
- **Google Play service account JSON** as `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS`
  in the `google_play` group.

## Universal links / App Links

`ios/App/App/App.entitlements` declares `applinks:ashglogroup.company` and
`aps-environment`; the Android manifest declares an `autoVerify` intent filter
for the same hosts. For verification to succeed the production domain must
serve:

- `https://ashglogroup.company/.well-known/apple-app-site-association`
  (JSON, no extension, `application/json`) containing `TEAMID.com.ashglogroup.app`
- `https://ashglogroup.company/.well-known/assetlinks.json` containing the
  Play App Signing SHA-256 fingerprint for `com.ashglogroup.app`

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
| App ID (bundle id / package name) | `com.ashglogroup.app` |
| App name | ASH Glo |
| Splash / status bar colour | `#080812` |

Change these in `capacitor.config.ts`, then re-run `npx cap sync`. Changing the
App ID after a store release is not possible, so confirm it before first submit.

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
   https://ashglogroup.company/account-deletion, support
   https://ashglogroup.company/support. All four are live public routes.
2. **iOS purpose strings** — paste `native/ios-info-plist-additions.xml` into
   `ios/App/App/Info.plist`. Without them iOS terminates the app when a user taps
   a portfolio upload field (automatic rejection, Guideline 5.1.1).
3. **Android manifest** — merge `native/android-manifest-additions.xml` into
   `android/app/src/main/AndroidManifest.xml`. Never add `QUERY_ALL_PACKAGES`.
4. **Target SDK 35+**, 64-bit AAB, and Play App Signing enabled.
5. **User-generated content controls** (Apple 1.2 / Play UGC policy) are shipped:
   zero-tolerance clause in `/terms` §3, in-app report flag on provider profiles,
   reviews and chat, user blocking, and the `/console/reports` moderation queue
   with a 24-hour SLA. Do not remove them.
6. **Account deletion in-app** — More → Settings → Delete account (Apple 5.1.1(v)).
7. **Sign in with Apple** ships alongside Google sign-in (Apple 4.8).
8. **Payments** — ASH Glo sells real-world services, so mobile money and cards are
   allowed and in-app purchase is not required. Never add digital-only unlocks
   without adding IAP first.
9. **Demo account** — create a pre-activated reviewer account with a published
   storefront and put the credentials in the App Store Connect review notes and
   the Play Console testing instructions.
10. **Push notifications** — booking, payment and payout events only; the Android
    13 runtime prompt is requested at the point of use.

Apple reviews web-container apps against Guideline 4.2, so keep the native
splash, status bar handling, hardware back button, in-app browser, native share
and push notifications that make this build more than a wrapper.

## What's wired in the codebase

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

## Built artifacts (com.ashglogroup.app)

Native projects are generated and committed: `android/` (Gradle) and `ios/` (Xcode).
Icons/splash are generated from `assets/` via `npx @capacitor/assets generate`.

Android builds produced from this repo:

| File | Use |
|---|---|
| `ASH-Glo-debug.apk` | sideload/test on any phone |
| `ASH-Glo-release.apk` | signed release, direct install/distribution |
| `ASH-Glo-release.aab` | upload to Google Play Console |

Signed with `ash-glo-release.keystore` (alias `ashglo`). **Keep this keystore safe —
Play requires the same key for every future update.** Rotate the password after download.

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
