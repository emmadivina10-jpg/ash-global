# ASH Glo — native apps (App Store & Play Store)

The native builds are Capacitor shells around the live ASH Glo deployment. The
app keeps its server-rendered pages, payments, auth callbacks and realtime chat
working exactly as on the web, while gaining a native container, splash screen,
status bar, hardware back button and store distribution.

## One-time setup (run on your own machine)

You need Node 20+, Xcode 15+ (iOS) and Android Studio (Android).

```bash
git clone <this repo> && cd <repo>
npm install

# scaffold the native projects (creates ios/ and android/ folders)
npx cap add ios
npx cap add android

# copy web assets + plugin config into both platforms
npx cap sync
```

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

- **Apple**: paid Apple Developer account, App Store Connect listing, privacy
  policy URL, sign-in options (Apple sign-in is already supported, which Apple
  requires when Google sign-in is offered), and a screen-recorded demo of a real
  booking if requested. Apple reviews web-container apps against Guideline 4.2 —
  the native splash, status bar handling, in-app browser for external links and
  push-ready structure are what make the build acceptable, so keep them.
- **Google Play**: Play Console account, signed AAB from Android Studio
  (`Build > Generate Signed Bundle`), data-safety form, and a privacy policy URL.
- Both stores require your payment flows to comply with their rules. ASH Glo
  sells real-world services (bookings, mobile money, provider payouts), which is
  exempt from in-app-purchase requirements — keep it that way; do not sell
  digital-only unlocks through the app without adding IAP.

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
