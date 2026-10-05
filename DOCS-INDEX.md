# Documentation index — ASH Glo

Start here. Every document in the repository, what it answers, and who it is for.

## Current source-of-truth notice — 5 October 2026

The current in-app legal routes and this repository are authoritative for the current preview. Historical Files copies, native archives and store screenshots are dated snapshots, not proof that the latest app is published. Updated versioned policy/store-copy exports accompany the final publicity report. Do not use the August privacy draft, old `app.growrefer.ashglo` identifier, instant-withdrawal claims or flight/electricity payment claims in publicity.

## Product & setup

| Document | What it covers |
| --- | --- |
| [README.md](./README.md) | Project overview, tech stack, local development, deployment, testing commands |
| [DELIVERABLES.md](./DELIVERABLES.md) | Everything shipped: app surfaces, backend, native assets, store collateral |
| [STORE-SUBMISSION.md](./STORE-SUBMISSION.md) | App Store & Play Store submission pack — listing copy, review notes, App Privacy / Data safety answers, policy checklist |
| [NATIVE.md](./NATIVE.md) | Capacitor workflow — `cap add`, `cap sync`, icons/splash, App Store & Play Store submission |
| [AGENTS.md](./AGENTS.md) | Conventions for automated contributors working in this repo |
| Files: `ASH-Glo-Publicity-Report-2026-10-05.md` | Detailed product overview, publicity copy, availability and verification limits |

## Security

| Document | What it covers |
| --- | --- |
| [SECURITY.md](./SECURITY.md) | Security model, reporting a vulnerability |
| [SECURITY-CHANGELOG.md](./SECURITY-CHANGELOG.md) | Dated log of hardening changes (RLS, storage, SECURITY DEFINER functions) |
| `tests/rls-anonymous-access.test.ts` | Regression suite proving signed-out visitors cannot read protected data |
| `.github/workflows/security.yml` | CI: unit suite, RLS regression suite, database self-check |

## Legal & store

| Location | What it covers |
| --- | --- |
| `/privacy` (in-app route, `src/routes/privacy.tsx`) | Public privacy policy required for App Store / Play Store submission |
| `/terms` (`src/routes/terms.tsx`) | Terms of service / EULA with the zero-tolerance user-content clause Apple requires |
| `/account-deletion` (`src/routes/account-deletion.tsx`) | Public account & data deletion instructions required by Google Play |
| `/console/reports` (`src/routes/console.reports.tsx`) | Trust & Safety moderation queue for in-app reports |
| Files: `store-listing-copy_v2.md` | Current EN/FR listing draft; replaces unqualified payout/referral claims |
| Files: `store-preview-video-script_v2.md` | Current recording script; no invented earnings or store-availability claim |
| Files: `ASH-Glo-Final-Legal-Policies-2026-10-05.md` | Text export of the seven current public policy pages |
| `/mnt/documents/store-screenshots/` | Framed iOS 6.7" and Android store screenshots |

## Code map

| Path | Purpose |
| --- | --- |
| `src/routes/` | File-based routes. `_authenticated/` is the signed-in app, `console.*` the admin suite, `api/public/*` webhooks and cron |
| `src/components/refer/` | Product components: shell, orb, cards, chat, notifications, native bridges |
| `src/lib/` | Domain logic. `*.functions.ts` are server functions, `*.server.ts` are server-only helpers |
| `src/integrations/supabase/` | Generated backend clients and types — do not edit by hand |
| `supabase/migrations/` | Ordered SQL migrations (schema, RLS, triggers, notification functions) |
| `tests/` | Vitest suites — pure unit tests plus the live RLS regression suite |
| `native/`, `resources/`, `capacitor.config.ts` | Native shell, app icon and splash sources, Capacitor configuration |

## Common tasks

| I want to… | Do this |
| --- | --- |
| Run the app | `bun install && bun run dev` |
| Run all tests | `bun run test` |
| Run tests without network/secrets | `bun run test:unit` |
| Run only the security regression suite | `bun run test:security` |
| Build the native apps | Follow [NATIVE.md](./NATIVE.md) |
| Review what changed in security | [SECURITY-CHANGELOG.md](./SECURITY-CHANGELOG.md) |
