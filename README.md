# ASH Glo

Cameroon’s digital marketplace for services and products. **Refer. Earn. Discover. Grow.**

A mobile-first, bilingual (EN/FR) web application powering service bookings, referral earnings, chat, payments, and an admin console. Built for the Cameroon and Nigeria markets first, with international card support via Stripe.

## Documentation

- [DOCS-INDEX.md](./DOCS-INDEX.md) — start here: every document, code map and common task
- [DELIVERABLES.md](./DELIVERABLES.md) — full inventory of what has been built
- [NATIVE.md](./NATIVE.md) — Capacitor / App Store / Play Store workflow
- [SECURITY.md](./SECURITY.md) and [SECURITY-CHANGELOG.md](./SECURITY-CHANGELOG.md) — security model and hardening log
- `/privacy` — the public privacy policy served by the app

## Features

- **ASH Marketplace** – Book verified service providers (braiders, barbers, nail/lash techs, electricians, nurses, and more).
- **Refer & Earn** – 3-level referral commission system (for eligible regions).
- **Payments** – Mobile Money (MTN MoMo, Orange Money) via TchokoPay and card payments via Stripe.
- **Notifications** – In-app bell plus device push for withdrawals, activation, referral commissions, bookings and chat.
- **Chat & Reviews** – Order-based messaging with real-time notifications and community reviews.
- **Provider Studio** – Upload portfolio, set booking slots, manage services, generate payment links, and share a public storefront.
- **ASH Console** – Admin dashboard for financials, users, providers, bookings, withdrawals, and security audit logs.
- **Native App Ready** – Capacitor configuration included for iOS/Android builds.

## Tech Stack

- **Frontend / Framework**: TanStack Start (React 19, Vite 7, TypeScript)
- **Styling**: Tailwind CSS v4 with OKLCH design tokens
- **Backend / Auth / Storage**: Lovable Cloud (Supabase)
- **Payments**: TchokoPay (Mobile Money) + Stripe (Cards / Connect payouts)
- **Native Shell**: Capacitor

## Development

```sh
# Install dependencies
bun install

# Start the dev server
bun run dev
```

The app runs at `http://localhost:8080` by default.

## Testing

```sh
bun run test          # everything (RLS suite needs backend env vars)
bun run test:unit     # pure unit suites — no network, no secrets
bun run test:security # anonymous-access RLS regression suite
```

CI runs the unit suite, the RLS regression suite and a database self-check
(`.github/workflows/security.yml`).

## Native Builds (Capacitor)

1. Publish the web app so it is live on your production domain.
2. Sync the web build into the native shell:
   ```sh
   bun run build
   npx cap sync
   ```
3. Open the native project:
   - iOS: `npx cap open ios` (requires macOS + Xcode)
   - Android: `npx cap open android` (requires Android Studio)
4. Build, sign, and submit to the App Store / Play Store.

See `NATIVE.md` for the full submission checklist.

## Deployment

The recommended flow is:

1. Build: `bun run build`
2. Deploy via Lovable, or push to GitHub for CI/CD.
3. Connect GitHub in the Lovable editor (`+ → GitHub → Connect project`) for automatic two-way sync.

## Environment Notes

- Server-only variables are read inside `createServerFn` handlers (not at module scope).
- Browser-facing Supabase config is auto-generated in `.env` by Lovable Cloud; do not edit it manually.

## Project URLs

- Published: https://growrefer.app
- Custom domain: https://www.growrefer.app

---

Built with [Lovable](https://lovable.dev).
