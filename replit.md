# Running ASH on Replit

ASH keeps its imported TanStack Start, React, Vite, TypeScript, and Bun stack.
Its existing Supabase/Lovable backend is retained; no database migration or
native iOS/Android changes are part of this setup.
The Node.js 22 module supplies both Node and Bun: Vite and Vitest run under
Node, while Bun remains the package manager. Do not add a separate Bun module;
it can hide Node from PATH and break the native Vite tooling.

## Development

- Click **Run** to start the `Start application` workflow (`bun run dev`).
- Vite binds to `0.0.0.0:5000`, with proxied preview hosts allowed.
- Dependencies use the existing `bun.lock`. For a fresh checkout, run
  `bun install --frozen-lockfile`; the existing postinstall script installs
  the entities compatibility shims.
- First startup processes the routes and dependencies. Wait for the Vite
  ready message before opening the preview.
- The shared logo uses the checked-in `/apple-touch-icon.png` artwork because
  the imported Lovable-only asset endpoint is unavailable on Replit.

## Backend configuration

The ignored imported `.env` contains the existing project's public Supabase
configuration (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and corresponding
`VITE_` variables). Keep it associated with the same backend.

`SUPABASE_SERVICE_ROLE_KEY` must be supplied through Replit Secrets for the
existing Supabase project. It grants privileged server access and must never
be placed in a `VITE_` variable, client code, documentation, or Git.

Payment, email, AI, and other external-service features may require additional
existing-provider credentials. Do not invent values, replace the backend,
apply shared database migrations, or initiate real transactions as setup checks.

## Checks

- `bun run test:unit`: isolated tests, excluding the live anonymous-access suite.
- `bun run test:security`: contacts the configured backend; review before running.
- `bun run build`: existing production build, separate from the preview workflow.
- Verify public routes in the preview. Signed-in screens and real payment flows
  require separate verification; a working landing page does not prove them.

Read `AGENTS.md` and applicable nested instructions before changing app code.

## After task merges

The configured `scripts/post-merge.sh` installs dependencies with the frozen
Bun lockfile and runs the existing postinstall shims. Replit then reconciles
and restarts running workflows. The hook does not apply database migrations
or change external services.
