# ASH Rider — Integration Guide (ASH Glo Group production backend)

Status: DRAFT for review. Phase-2 rider actions below are PROPOSED (`docs/proposed/dispatch_riders_phase2.sql`)
and are not live until separately approved. Phase-1 delivery actions are live.

ASH Rider is a separate mobile-first app (separate Lovable project). It does **not** have its own sign-in system
or database. It signs riders in with their existing ASH Glo account and calls the same backend.
Never connect it to ASH Glo Payments Staging.

## 1. Authentication

- Provider: the ASH Glo backend's built-in auth (email + password; same accounts as ASH Glo).
- The Rider app uses the backend's official JavaScript client with:
  - `BACKEND_URL` — ASH Glo production backend address (public).
  - `BACKEND_PUBLISHABLE_KEY` — public browser key (`sb_publishable_…`). Safe in app code; it grants nothing by itself.
- Every call after sign-in carries the user's short-lived access token. All permissions are enforced in the
  database (row rules + checked actions), never in the app.
- Sign-up from ASH Rider creates a normal ASH Glo account (same email confirmation rules). No separate rider accounts.
- Sessions: tokens refresh automatically; signing out in ASH Rider does not affect other devices.
- Redirect URLs for email links must be added to the backend's allowed list for the Rider app's domain (request from ASH Glo staff).

## 2. Credentials required

| Name | Kind | Where it lives | Notes |
|---|---|---|---|
| Backend URL | Public | Rider app config | Production only |
| Publishable key | Public | Rider app config | `sb_publishable_…` |
| Map tiles | None | — | OpenStreetMap/Leaflet, no key |

**Not required and must never be given to ASH Rider:** service-role/secret backend keys, database password,
Stripe keys, TchokoPay/MTN/Orange credentials, webhook secrets. The Rider app performs no privileged work,
so it needs no secret. If a future feature needs one (e.g. push notifications), it is requested via the
secure secrets form in the Rider project, never pasted in chat or written in documents.

## 3. Data the Rider app can read (row rules)

| Table | Rider sees |
|---|---|
| `dispatch_riders` | Own profile only |
| `dispatch_rider_documents` | Own document records only (phase 2) |
| `dispatch_vendor_riders` | Own shop memberships |
| `dispatch_jobs` | Deliveries assigned to them |
| `dispatch_job_assignments` | Own offers/assignments |
| `dispatch_job_events` | History of their deliveries |
| `dispatch_pickup_verifications`, `dispatch_rider_invites` | Never (hashes) |

Direct inserts/updates/deletes are refused. All changes go through the actions below.

## 4. Actions (call with `rpc(name, args)`)

Errors come back as short codes (e.g. `NOT_ALLOWED`, `INVALID_STATUS`); show a friendly message per code.

### Onboarding & verification (phase 2, proposed)
| Action | Args | Result / rules |
|---|---|---|
| `dispatch_rider_register` | `_full_name, _phone, _city, _vehicle_type, _plate?, _model?, _color?, _licence?` | Creates/updates own profile. Plate required for MOTORCYCLE/CAR. Editing after review → PENDING + offline |
| upload file | storage bucket `rider-documents`, path `<user_id>/<file>` | Private; only the rider and staff can read |
| `dispatch_rider_add_document` | `_doc_type, _path` | NATIONAL_ID, PASSPORT, DRIVER_LICENCE, VEHICLE_REGISTRATION, SELFIE |
| `dispatch_rider_submit_verification` | — | Needs ID or passport + selfie (+ licence for motor vehicles) → PENDING |
| `dispatch_rider_review` | `_rider, _decision, _note?` | **Staff only** (ASH Glo console). VERIFIED / REJECTED / SUSPENDED / REINSTATE |

### Availability & zones (phase 2, proposed)
| `dispatch_rider_set_availability` | `_status` | AVAILABLE/BUSY need VERIFIED; cannot go OFFLINE mid-delivery |
| `dispatch_rider_set_zones` | `_zones text[]` | Up to 10 neighbourhood names |

### Shop riders (phase 2, proposed)
| `dispatch_vendor_create_invite` | — | Shop owner only (ASH Glo app). Returns a 12-character code once, valid 72h |
| `dispatch_vendor_list_invites` / `dispatch_vendor_revoke_invite` | — / `_invite` | Shop's own invites only |
| `dispatch_rider_redeem_invite` | `_code` | Rider joins the shop; single use; generic `INVITE_INVALID` on any failure |
| `dispatch_vendor_set_rider_status` | `_rider, _status` | Shop suspends/reinstates its rider; pending offers are withdrawn |
| `dispatch_rider_leave_vendor` | `_vendor` | Not allowed mid-delivery |

### Deliveries (phase 1, live)
| `dispatch_rider_respond` | `_job, _accept` | Accept/decline an offer |
| `dispatch_rider_progress` | `_job, _step` | Pickup confirmed → in transit |
| `dispatch_complete_with_code` | `_job, _code` | Customer's 6-digit code; 30 min, 5 tries, single use |

Assignment (`dispatch_assign_rider`, done by shop/staff) requires an approved fee, and after phase 2 a
VERIFIED, active, AVAILABLE rider; shop-delivery jobs also require an ACCEPTED shop membership.
Only one live rider per delivery is enforced by a unique database index.

## 5. Location & background tracking

- The web/PWA build uses the browser location API only while the app is open and the rider has granted permission.
- Browsers cannot track in the background; ASH Rider must not claim to. Background tracking requires a
  native Android/iOS build (Capacitor + background-location plugin, Android foreground service with
  persistent notification, iOS "Always" permission with App Store justification). Planned for a later phase.
- Location sharing uses the existing consent-based booking location sharing; nothing is shared after delivery ends.

## 6. Money

ASH Rider has **no** access to payments, wallets, payouts or financial records. Delivery fees are recorded on
the delivery only. Any rider earnings/payout feature needs a separate reviewed design and approval.

## 7. Change process

Each database change is shown as exact SQL with isolated tests and a rollback file, and is applied only after
written approval.

## Next stage: separate ASH Rider app (prepared, not built)

Status at this stage: rider, shop, customer and staff screens live inside ASH Glo (`/rider`, `/dispatch`, `/deliveries`, `/logistics-admin`) using only the backend actions below. The separate ASH Rider app must reuse exactly the same actions and must not add tables, accounts or databases.

### Actions the Rider app calls (signed-in ASH Glo account, user's own access token)
- `dispatch_rider_register`, `dispatch_rider_add_document`, `dispatch_rider_submit_verification`
- `dispatch_rider_set_availability`, `dispatch_rider_set_zones`
- `dispatch_rider_redeem_invite`, `dispatch_rider_leave_vendor`
- `dispatch_rider_respond`, `dispatch_rider_progress`, `dispatch_complete_with_code`
- Reads (row rules apply): `dispatch_riders` (own row), `dispatch_jobs` / `dispatch_job_events` (assigned only), `dispatch_vendor_riders` (own memberships), `dispatch_rider_documents` (own list).

### Identity documents
- Upload to private folder `rider-documents/<user id>/<type>-<timestamp>.<jpg|png|webp|pdf>`, max 10 MB, never overwrite.
- Then call `dispatch_rider_add_document(type, path)`.
- Signed links: 60 seconds maximum. Only the owner and ASH staff can create them; public URLs return an error.

### Pending (needs separate approval): `docs/proposed/dispatch_phase3_accept_guard.sql`
- Re-checks approved + active + available at the moment a rider accepts (today the check happens when the delivery is offered).
- `dispatch_rider_update_location(lat, lng)` — only while on an active delivery.
- `dispatch_job_rider_location(job)` — customer, shop or staff of that delivery see rider first name, vehicle and last position.
- Rollback: `docs/proposed/dispatch_phase3_accept_guard_rollback.sql`. Tests: `tests/dispatch-phase3.test.ts`.

### Native requirements (later build)
- Browsers only share GPS while the page is open. Background tracking needs a native Android/iOS build with location permission ("while using" + background), a foreground service on Android and the background location mode on iOS, plus store disclosures.
- Credentials: backend address + public key only. Never the admin key, database password, or any Stripe/TchokoPay/MTN/Orange keys.
