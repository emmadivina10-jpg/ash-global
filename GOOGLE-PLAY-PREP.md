# ASH Glo — Google Play preparation report

Reviewed October 26, 2026. **Configuration prepared, not verified build-ready or store-ready. No AAB was generated, build started in Codemagic, store upload, deployment or financial operation performed.**

## Follow-up: lockfile repair and artifact verification

### October 27: missing release-version preflight

The uploaded log confirms Codemagic now starts on Mac mini M2 but fails before Gradle. The old preflight reads an absent/empty `ANDROID_VERSION_CODE` and no configured `ANDROID_VERSION_CODE_BASE`; it does **not** default to 1. Its “from 1 to 2100000000” message describes a range. Gradle separately had a fallback to 1, which did not cause that preflight failure but could hide missing release input when Gradle was run directly.

The Android-only correction gives missing-input instructions, allows confirmed `ANDROID_PREVIOUS_VERSION_CODE + BUILD_NUMBER` without requiring a second base variable, retains explicit/base modes and validates the previous maximum and overflow. CI resolves once, exports the exact result through `CM_ENV`, and verifies it in the AAB. Gradle now reserves fallback 1 for debug and rejects release without the resolved environment code. Signing, package, artifact paths and iOS are preserved.

**Selected production release version: not selected.** Repository/configuration contains no verified Play upload maximum, and no Play history was accessed. To unblock: Play Console → ASH Glo (`com.ashglogroup.app`) → Test and release → App bundle explorer → inspect all uploaded bundles, including testing and inactive releases; record the highest version code. In Codemagic's `google_play` group, set `ANDROID_PREVIOUS_VERSION_CODE` to that value, remove/unset a stale `ANDROID_VERSION_CODE`, and let CI add its positive `BUILD_NUMBER`. For a confirmed first-ever upload only, previous may be 0. The final code is logged and must not exceed 2100000000. Fixture examples such as 100 + 7 = 107 are tests, not chosen release values.

No Codemagic run or signed `.aab` is established by these local changes. Use the latest saved/synced `main` configuration in `emmadivina10-jpg/ash-global`, run **ASH Glo Android — signed AAB only (no publishing)** manually after confirming history, and inspect its artifact. No remote GitHub commit or Codemagic build success is claimed by this report.

**Local validation executed:** `bunx vitest run tests/android-release.test.ts` — **29/29 passed**, including missing, invalid, out-of-range, explicit/automatic, history and numeric CLI propagation cases; `node --check scripts/android-release-preflight.mjs` passed; installed JavaScript YAML parser validated the workflow; all five Android scripts passed `bash -n`; iOS workflow matched the saved pre-edit bytes; package, keystore reference, artifact path and no-publishing checks passed. Python YAML validation was initially unavailable (missing module); the installed JavaScript parser completed the check instead. Automatic preview reports build OK. No Gradle compilation, real signing, GitHub main synchronization or hosted Codemagic run was executed/verified.

**Changed files for this correction:** `scripts/android-release-preflight.mjs`, `android/app/build.gradle`, Android section only of `codemagic.yaml`, `tests/android-release.test.ts`, `NATIVE.md`, `GOOGLE-PLAY-PREP.md`, `AGENTS.md`, `roadmap.md`. No app/payment code, keystore, credentials, iOS configuration, dependency or production setting changed. Existing alias `ashglo-upload` is preserved rather than overridden.

### Exact failure and fix

The uploaded brief did not include a Codemagic build log. The current Android command was independently verified by a clean temporary **Bun 1.4.4 frozen installation: 868 packages installed with lifecycle scripts disabled**; no stale Bun lockfile error was reproduced. `package.json` has no `packageManager` field. Existing app/security CI and Android use Bun; the existing successful iOS workflow uses npm 11. Neither manager was changed, and neither lockfile was deleted.

The stale **npm** lockfile failure was reproduced against a clean copy:

```text
npm 10.9.9: Cannot read properties of null (reading 'edgesOut')
npm 11.21.1: EUSAGE
`npm ci` can only install packages when your package.json and package-lock.json ... are in sync.
Missing: @capacitor/app-launcher@8.0.1 from lock file
Invalid: @tanstack/react-start@1.168.32 does not satisfy @tanstack/react-start@1.168.60
Invalid: @lovable.dev/vite-tanstack-config@2.21.0 does not satisfy ...@2.26.5
```

`package-lock.json` was repaired in a temporary copy using the iOS workflow's npm 11, with `npm install --package-lock-only --ignore-scripts --no-audit --no-fund`, then copied back after a clean `npm ci --ignore-scripts --no-audit --no-fund` succeeded (**865 packages**). Root declarations now exactly match `package.json`. No dependency declaration, Bun resolution, Capacitor/plugin version, iOS native file, or iOS workflow text changed.

The npm lock now adds 364 package records and removes 6. It updates 28 existing version records, not a blanket upgrade: the already-declared TanStack/config changes and their dependency trees, root entities 4.5.0 → 6.0.1, nanoid 3.3.18 → 6.0.2, source-map-js 1.2.1 → 1.2.2 to satisfy the existing override, and dependencies introduced by the manifest additions. These are npm lock alignment changes, not changes to the app's current Bun-installed dependencies. New packages resolve within existing manifest ranges. A signed iOS compile was not executed, so install compatibility is verified, not a new successful iOS archive.

### Android workflow changes

- Keeps existing Bun 1.4.4 frozen install, project postinstall shim, compilation-only web build and Android-only Capacitor sync. `native/www` remains the shipped offline bootstrap; this SSR application's generated server output is not embedded or deployed.
- Supports an explicit `ANDROID_VERSION_CODE` or automatic `ANDROID_VERSION_CODE_BASE + BUILD_NUMBER`; exports it through `CM_ENV` for subsequent Gradle steps. Optional `ANDROID_PREVIOUS_VERSION_CODE` fails closed unless the result exceeds confirmed Play history. No previous Play version was invented; owner must confirm the base/current maximum.
- Retains Java 21, SDK 36, existing `ash_glo_keystore`, fail-closed release signing and `bundleRelease`.
- Checks nonempty AAB, JAR signature, every payload's signing certificate against the configured upload alias, bundletool structural validity, actual manifest **com.ashglogroup.app**, and exact generated versionCode. Bundletool 1.18.3 download is pinned by SHA-256 `a099cfa1543f55593bc2ed16a70a7c67fe54b1747bb7301f37fdfd6d91028e29` and verified locally.
- Android has no publishing or automatic-trigger block. Existing iOS workflow remains byte-identical, including its pre-existing TestFlight configuration; no iOS build was started.

### Checks executed in this follow-up

- **41/41 Vitest tests:** Android release 15, mobile payment policy 7, payment return 4, push 15.
- **4/4 isolated Java signature checks:** accepts configured signer; rejects wrong signer, unsigned payload and tampered payload. Disposable test keystore only, generated under `/tmp` and removed; no real signing key used.
- Clean frozen Bun installation and clean repaired npm installation passed with lifecycle scripts disabled; project postinstall shim executed separately and passed. A frozen Bun lock-only recheck also passed.
- Android Capacitor sync passed with 10 plugins; generated configuration confirms exact Android package and approved HTTPS host.
- YAML parses, all Android shell snippets pass `bash -n`, Android artifact-only configuration verified, iOS workflow and native file hashes unchanged, package.json and bun.lock hashes unchanged.
- Latest automatic preview build reports **build OK**. No manual web build/typecheck, iOS archive or native Gradle compilation was run.

### Changed files in this follow-up

`package-lock.json`, `codemagic.yaml`, `scripts/android-release-preflight.mjs`, new `scripts/VerifyAndroidBundle.java`, `tests/android-release.test.ts`, new `tests/verify-android-bundle.mjs`, `NATIVE.md`, `GOOGLE-PLAY-PREP.md`, `AGENTS.md`, `roadmap.md`. Android sync regenerated existing plugin integration files without changing registered identity or plugin versions.

### Actual artifact result and remaining action

**Signed `.aab`: NOT GENERATED or verified.** No Codemagic API credential/application access or real upload keystore was available. Java 21 was obtained temporarily for fixture verification, but the Android SDK is unavailable. There is no remaining reproduced dependency-install error; a native build result cannot be claimed. No production configuration, payment, transfer, refund, payout, key or deployment changed.

In Codemagic, confirm the existing `ash_glo_keystore` injects **CM_KEYSTORE_PATH, CM_KEYSTORE_PASSWORD, CM_KEY_ALIAS, CM_KEY_PASSWORD** into `android-play` and that `google_play` supplies the confirmed version code/base. Do not replace the registered upload key. Manually run the updated artifact-only workflow from the branch containing these changes, then download `android/app/build/outputs/bundle/release/app-release.aab` only after all package/version/signature checks pass. If it fails, provide that build's failed-step log; the original Codemagic error cannot be attributed to the now-verified Bun install without that evidence. No Play service-account key is required.

The earlier preparation record below is historical; its stale-lock and tool-availability findings are superseded by this follow-up. All store/device blockers remain unresolved unless explicitly verified below.

## Existing configuration

- Android native project already exists; no replacement or platform regeneration was needed.
- React 19 / TanStack Start with Capacitor 8.5.0 confirmed from package/configuration and installed dependencies.
- Android application ID and namespace remain exactly **com.ashglogroup.app**; MainActivity and resources agree. iOS retains **com.ashglogroup.mobile**.
- Android min SDK 24, compile/target SDK 36, AGP 8.13.0, wrapper Gradle 8.14.3, Java source/target 21 already exist.
- Native apps load **https://ashglogroup.company**. `native/www` is the offline bootstrap, not an exported static replacement for this server-rendered app. The CI web build checks compilation only and does not deploy or copy server code into Android.
- Existing icons, splash, FileProvider and HTTPS link filters exist. Internet permission exists; cleartext and mixed content are disabled.
- Existing Codemagic Android workflow and `ash_glo_keystore` reference already existed. Actual signing identity/group availability in the owner's Codemagic account was not accessible to verify.

## Issues found and changes

| Finding | Change / remaining limitation |
| --- | --- |
| Capacitor default appId was iOS-only | Android-specific CLI commands or ASH_NATIVE_PLATFORM=android now select com.ashglogroup.app; default/iOS ID unchanged. |
| Android CI used Node 20 but installed Capacitor CLI requires Node >=22 | Android only now uses Node 22; Java 21 preserved. |
| Release could silently be unsigned | Gradle now requires all signing inputs and an existing keystore for release tasks. CI additionally verifies the AAB JAR signature. No keys/passwords changed. |
| Version code fixed at 1 | Gradle accepts ANDROID_VERSION_CODE, validates 1–2100000000; CI requires it explicitly. Owner must verify it exceeds all previous Play uploads. ANDROID_VERSION_NAME optional, default 1.0. |
| Android CI previously uploaded to Play internal track | Removed Android publishing section; manual artifact-only workflow, no automatic trigger. Existing iOS workflow unchanged. |
| npm package-lock differs from package.json; npm ci dry-run failed even in a clean directory | Android uses pinned Bun 1.4.4 and existing current bun.lock with --frozen-lockfile. Frozen lock-only validation passed. Neither lockfile nor dependency versions were replaced; clean full CI installation remains unverified. |
| Android plugin files were stale | cap sync android succeeded and found all 10 plugins including App Launcher. Generated plugin paths are machine-specific and regenerated in CI; do not rely on sandbox paths for a local build. |
| Android SDK/JDK unavailable in this sandbox | CI installs platform 36/build-tools 35.0.0 and uses Java 21. Native compilation/signing not executed here. |

Changed files: `capacitor.config.ts`, `android/app/build.gradle`, `codemagic.yaml`, `scripts/android-release-preflight.mjs`, `tests/android-release.test.ts`, generated `android/app/capacitor.build.gradle` / `android/capacitor.settings.gradle`, `NATIVE.md`, `GOOGLE-PLAY-PREP.md`, `AGENTS.md`, `roadmap.md`. No application screens, backend/payment logic, production variables or iOS native files changed.

## Exact Codemagic steps

1. Use the existing connected Git repository. Select the owner-confirmed production/release branch containing these changes. The sandbox branch is an editor branch, **not a verified production branch**; no branch trigger or guessed branch was added.
2. In Codemagic Android code-signing identities, confirm the **existing** upload keystore is registered as `ash_glo_keystore`. Supply its real alias, keystore password and key password securely. Do not generate/overwrite a replacement key for an existing app.
3. Ensure variable group `google_play` exists and is available to `android-play`. Set **ANDROID_VERSION_CODE** higher than every prior code in Play Console (first-ever upload can use 1). Optionally set **ANDROID_VERSION_NAME** (e.g. your intended release label). Update the code for each subsequent upload, including across workflows; BUILD_NUMBER alone was not used because it cannot establish prior Play history.
4. Keep workflow-provided **ASH_NATIVE_PLATFORM=android** and **CAP_SERVER_URL=https://ashglogroup.company**. Keep existing production build variables available where the web build requires them; do not copy private backend secrets into browser variables. Hosted auth/Stripe/TchokoPay configuration remains unchanged.
5. If Android remote push is required, obtain the real Firebase Android `google-services.json` registered for **com.ashglogroup.app**, and supply it securely to `android/app/google-services.json` during CI. It is absent in this checkout; no Firebase credentials or project were invented. Review whether client configuration may be committed under your policy; never put a service-account private key in that file or source.
6. Manually start **android-play — signed AAB only (no publishing)**. It installs pinned Bun/current frozen dependencies, checks release inputs, installs Android SDK, compiles web without deploying, synchronizes **Android only**, builds `bundleRelease` and verifies a signed non-empty bundle.
7. Download **android/app/build/outputs/bundle/release/app-release.aab** from Codemagic artifacts after a successful build. Review effective manifest/package/version, signing certificate, dependency/native library report and install generated APKs on devices before uploading manually to Play when authorized.

### Signing environment inputs

Codemagic injects **CM_KEYSTORE_PATH**, **CM_KEYSTORE_PASSWORD**, **CM_KEY_ALIAS**, **CM_KEY_PASSWORD** from the referenced Android signing identity. Never print them, add them to source, or place passwords in Gradle command-line arguments. `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS` is **not needed** because this workflow does not publish. No signing credential values were inspected or changed.

## Checks actually executed

- **36/36 tests passed**: android-release (10), mobile-payment-policy (7), payment-return (4), push (15), via Vitest.
- **cap sync android passed**: bootstrap copied, correct Android ID/HTTPS server confirmed from generated JSON, 10 plugins registered.
- Codemagic YAML parsed; each Android shell script passed `bash -n`; Android has no publishing/trigger section. iOS identity verified and no iOS workflow edit made.
- Frozen Bun **lock-only validation passed in a clean temporary directory**; this is not a full dependency installation or native build. Existing npm dry-run failed with `Cannot read properties of null (reading 'edgesOut')`, and direct comparison confirmed stale root dependency declarations. A lockfile package URL followed to HTTP 200, but this does not prove every CI download succeeds.
- Latest automatic preview build log reports **build OK**. No separate manual web build, lint or typecheck was run; CI now includes the web build before native compilation.
- Public app-links URLs on both production hosts returned **HTTP 404**. No domain files or production settings changed.

## Remaining blockers and manual verification

- **Signed AAB / installed device:** cannot be certified until Codemagic succeeds with real existing signing credentials and devices are tested. No Gradle/native build ran in this sandbox, which has no available Java/Android SDK.
- **App Links:** publish correct `/.well-known/assetlinks.json` on both declared hosts with com.ashglogroup.app and the actual **Play App Signing certificate SHA-256**, not an invented/upload-key-only fingerprint. Requires separately authorized hosted change; no file fabricated.
- **Authentication/API:** configuration uses HTTPS and existing integrations, but hosted Google/Apple settings and signed-Android OAuth/deep-link returns remain unverified. Test sign-in, logout, refresh, Browser return, permissions, uploads, voice, opt-in booking tracking and network/offline handling without unapproved payments.
- **Permissions/privacy:** manifest requests camera, microphone, notifications, broad READ_MEDIA_IMAGES/VIDEO and legacy storage. Broad media permissions need Play core-use eligibility or a tested system-picker migration; nothing was removed that could break features. Location permissions are absent; verify actual Android tracking/geolocation behavior before choosing any change. Complete accurate Data safety/permissions declarations and check backup exposure (`allowBackup=true`).
- **Remote push:** no google-services.json in checkout; remote closed-app sender setup/device delivery not verified. Sync/plugin presence does not prove push works.
- **Account deletion and digital billing:** previously documented full-erasure persistence/retention blockers and paid digital Promote/Verified/referral activation billing treatment remain unresolved. A signed AAB does not clear these store-policy issues. Preserve MTN/Orange mobile behavior and card/bank coming-soon rules; no payment behavior was altered here.
- **16 KB support / SDK:** API 36 matches current Play submission rules. AGP 8.13/Gradle 8.14.3 declarations are retained, not upgraded. Check packaged native .so alignment and 64-bit support and test a 16 KB emulator/device; SDK level alone is not evidence of page-size compliance.
- **Listing/reviewer:** final privacy/deletion URLs, Data safety, financial features, social-app child safety, content rating, reviewer access and actual signed-build screenshots must be completed. Any required account-specific testing/production-access eligibility in Play Console remains unverified.

## Official requirements checked

- [Play target API policy](https://support.google.com/googleplay/android-developer/answer/11926878): August 31, 2026 new apps/updates require API 36 for standard Android apps; extension to November 1, 2026 if approved. Source retrieved HTTP 200.
- [Android 16 KB pages](https://developer.android.com/guide/practices/page-sizes): API 35+ apps require 16 KB support; page states updates without support cannot release starting February 1, 2027. Do not defer compatibility validation for this release. Source retrieved HTTP 200.
- [Codemagic Android signing](https://docs.codemagic.io/yaml-code-signing/signing-android/) and [Capacitor workflow](https://docs.codemagic.io/yaml-quick-start/building-an-ionic-app/).
- [Play account deletion](https://support.google.com/googleplay/android-developer/answer/13327111), [photo/video permissions](https://support.google.com/googleplay/android-developer/answer/14115180), [User Data](https://support.google.com/googleplay/android-developer/answer/10144311).

**Safest next action:** confirm the existing Codemagic keystore and version code, run the artifact-only Android workflow, and review its actual output/errors before any Play upload. iOS, production settings and financial safeguards are preserved.