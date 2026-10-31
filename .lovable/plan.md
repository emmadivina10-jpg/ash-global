# ASH Dispatch & Pickup

## Goal
Build working customer, vendor, rider and administrative delivery experiences inside ASH Glo, supporting ASH Dispatch, Vendor Dispatch and Self Pickup. Keep professional service appointments separate.

## Audit findings
- All six dispatch tables already exist, with the required `delivery_id` relationships.
- Row-level security is enabled and anonymous access is denied. No dispatch policies are installed; authenticated CRUD grants still exist, but RLS currently blocks ordinary access.
- Vendor references point to account IDs, whereas inventory business IDs identify provider profiles. Resolve and validate that mapping explicitly.
- The pending policy migration references a nonexistent `vendor_profiles` structure, grants broad party updates and exposes pickup hashes. Do not apply it as written.
- No working dispatch screens or server operations exist. The dispatch “test” file contains helper functions but no actual tests.
- Restored the existing staff console from its intact history after an incomplete dispatch placeholder broke it. Staff sign-in renders with no runtime errors; preview build is OK. Staff authenticated operations have not been exercised.

## Phase 2 — Secure foundations
- Reuse existing tables, authentication, profiles and inventory membership; do not create replacement dispatch tables or alter managed authentication structures.
- Prepare additive changes for fulfillment mode, business association, fee quote approval, OTP attempt tracking, timestamps and per-delivery location evidence where absent.
- Implement atomic, authenticated actions for requests, quotes, invitations, assignment/reassignment, acceptance/rejection, pickup, delivery completion and cancellation. Each operation validates its actor, current state and relationships, and records an audit event in the same transaction.
- Vendors set each delivery fee. Customers explicitly approve the current quote before assignment; changing a quote requires fresh approval. Do not invent automatic distance pricing or ETA values.
- Use hashed, securely generated pickup codes with explicit expiry and attempt limits; persist failed attempts and prevent replay. Customer-only issuance returns the code without exposing hashes in any read response.
- Use scoped reads and operation-specific RPCs rather than unrestricted party updates. Mask private contact/address data from unassigned riders. Keep verification hashes inaccessible to members.
- Preserve the requested state chain: REQUESTED → INVITED → ASSIGNED → ACCEPTED → PICKUP_CONFIRMED → IN_TRANSIT → DELIVERED, plus guarded REJECTED and CANCELLED paths. Define a separate valid self-pickup path without inventing a rider.
- Use `has_role()` for member global roles and `inventory_role_of()` for owner/manager checks. Staff actions use individually authenticated, server-checked console seats; the broken migration's assumed staff columns are not trusted.

## Phases 3–6 — Working screens
**Customer:** request delivery/pickup, choose vendor and address, approve quote, view assigned rider and progress, secure pickup code, confirm receipt, delivery history and Support.

**Vendor:** rider invitations and approvals, activation/suspension, dispatch availability, per-job quotes, assignments, progress, tracking and reports derived only from real records.

**Rider:** onboarding and vehicle details, availability, authorized offers, accept/reject, pickup/start/complete actions, consent-based GPS and completed-job history. Earnings display only verified records; dispatch does not create wallet credits or payouts.

**Administration:** guarded job monitoring, platform riders, vendor teams, assignments/reassignments, recorded delays, disputes via existing Support, real statistics and append-only events. No access expansion to unrelated staff departments.

All screens use ASH components/tokens, English/French labels, light/dark themes, accessible controls, clear loading/empty/error states and existing navigation. Customer dispatch connects to Cart/orders where that surface exists, without treating service appointments as goods or claiming a marketplace checkout already exists.

## Phase 7 — Tracking and notifications
- Reuse client-only Leaflet/OpenStreetMap and existing native permission conventions; no new paid map dependency.
- Send location only with permission, for an active assigned delivery. Stop and clear access when completed/cancelled, with graceful denied-permission/offline states and restrained update frequency.
- Reuse existing notifications and Support infrastructure for request, invitation, acceptance/rejection, pickup, transit, completion and cancellation; avoid duplicate native alerts.
- Online tracking outside active jobs remains opt-in and is not visible to customers with no related delivery.
- Report ETA only from a real, supported estimate; otherwise show it as unavailable.

## Phase 8 — Verification and release preparation
- Replace the zero-test helper file with tests importing application rules.
- Test each actor/transition, quote approval, OTP expiry/attempt limits/replay, unauthorized reassignment/completion, private reads, concurrent actions, audit persistence and location shutdown.
- Exercise database/RLS cases in isolated PostgreSQL/PGlite fixtures, never with production inserts.
- Verify customer/vendor/rider/admin flows end-to-end with authorized test identities in an isolated environment, plus phone/desktop layouts and regressions.
- Document changed files, additive SQL, environment requirements, native permission/build requirements, actual test outcomes and remaining blockers. Physical iOS/Android GPS/background behavior needs signed-device testing before release.

## Technical boundaries and approvals
- Use authenticated TanStack server functions and generated database clients; privileged staff work authorizes the seat before loading a service client.
- Preserve `delivery_id`. Existing vendor account references remain intact; add a validated provider-profile association only where needed.
- Handle the invalid pending policy migration through the supported migration workflow, preserving its historical text and documenting why it cannot apply; do not silently rewrite migration history.
- Preview and published app share a production database. **Plan approval authorizes implementation preparation, not applying shared-database changes.** Present exact additive SQL and request separate authorization before application; never apply destructive SQL.
- Until that authorization and isolated validation, keep unavailable actions explicitly disabled rather than presenting a functioning mockup.
- No Stripe, MTN/Orange/TchokoPay, wallet, payout, refund or existing financial-record changes. Fee quotes are operational records only; collecting delivery fees requires separately approved payment integration.
- No publishing, production test jobs, webhook replays or money-moving operations.