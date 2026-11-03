# ASH Rider — React Native / Expo implementation requirements

Status: requirements only. The separate app is NOT authorised for build yet. It must reuse the existing ASH Glo accounts and delivery backend — no new sign-in system, user database or delivery database. See also `docs/ash-rider-integration.md`.

## 1. Stack
- Expo SDK (latest stable), TypeScript, Expo Router, EAS Build for Android/iOS.
- `@supabase/supabase-js` with `expo-secure-store` for session storage.
- `expo-location` + `expo-task-manager` (background GPS), `expo-notifications` (push), `expo-camera` (QR), `expo-image-picker` / `expo-document-picker` (identity documents).
- Branding: ASH black, royal purple #4B0082, gold #D4AF37. English and French.

## 2. Authentication integration
- Same ASH Glo accounts: email/password sign-in against the shared backend URL with the **publishable** key only.
- Never ship service-role keys, payment keys or webhook secrets in the app.
- Sessions stored in Secure Store; token refresh handled by the client library; sign-out clears storage and stops location tasks.
- Google/Apple sign-in only if later approved and configured for the app's bundle IDs (`com.ashglogroup.rider` proposed).
- Account deletion link required in-app (Apple/Google rule) → existing `https://ashglogroup.company/delete-account`.

## 3. Backend actions (API) — all called as the signed-in rider
| Purpose | Action | Notes |
|---|---|---|
| Register / edit rider + vehicle | `dispatch_rider_register(full_name, phone, city, vehicle_type, plate)` | Edits after approval send rider back to review |
| Upload document | storage `rider-documents/<user_id>/...` then `dispatch_rider_add_document(type, path)` | Private; ≤10 MB image/PDF |
| Submit for review | `dispatch_rider_submit_verification()` | Needs ID, selfie, licence for motor vehicles |
| Availability / zones | `dispatch_rider_set_availability(status)`, `dispatch_rider_set_zones(zones[])` | Only verified riders can go Available |
| Join a shop | `dispatch_rider_redeem_invite(code)`, `dispatch_rider_leave_vendor(vendor)` | Code from QR or typed |
| Accept / decline | `dispatch_rider_respond(job, accept)` | Rechecks approval/active/available at accept |
| Progress | `dispatch_rider_progress(job, 'PICKUP_CONFIRMED'|'IN_TRANSIT')` | |
| Complete | `dispatch_complete_with_code(job, code)` | Returns OK/WRONG/EXPIRED/LOCKED/USED/NO_CODE |
| Share position | `dispatch_rider_update_location(job, lat, lng, accuracy)` | Only while delivery active |
| Stop sharing | `dispatch_rider_stop_location(job)` | Also erased automatically at end |
| Read own data | tables `dispatch_jobs`, `dispatch_riders`, `dispatch_job_events`, `dispatch_vendor_riders` | Access rules return only the rider's own rows |

Errors are short codes (`NOT_ALLOWED`, `INVALID_STATUS`, `RIDER_UNAVAILABLE`, `NOT_ON_DELIVERY`, `INVALID_INPUT`, …) mapped to EN/FR messages.

## 4. Background GPS
- Android: `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`; a visible ongoing notification ("ASH Rider is sharing your location for delivery …"). Google Play background-location declaration + video is required.
- iOS: `NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`, `UIBackgroundModes: location`; blue status indicator shown.
- Start the task only after accepting a delivery; stop on Delivered, Cancelled, Rejected, reassignment, sign-out or rider tap. Server refuses positions outside an active delivery anyway.
- Send at most every ~10 s / 25 m, batch-retry offline, drop points older than 2 minutes.
- Prominent in-app disclosure before asking permission (store requirement), in EN/FR.

## 5. Push notifications
- New backend pieces required (separate migration + approval): a `push_tokens`-style registration for rider devices (existing `push_tokens` table may be reused after review), and a server route that sends Expo/FCM/APNs pushes on: delivery offered, fee/assignment changes, cancellation, verification decision.
- Needs: Firebase project (FCM server key) and Apple APNs key — stored as server secrets only.
- No push content contains addresses or codes; tapping opens the delivery.

## 6. Store & release
- Separate store listings: "ASH Rider" (Android + iOS); reviewer test account (verified QA rider) needed.
- Privacy labels: precise location (app functionality, linked to user, not tracking), identity photos, contact info.
- Artifact-only CI first, like the existing ASH Glo builds; no automatic store publishing.

## 7. Open items needing decisions/credentials
1. Approval to start the separate app project.
2. Push provider credentials (Firebase, APNs) and the push-sending backend change.
3. Final bundle IDs and store accounts.
4. Whether riders see earnings in-app (read-only from verified delivery records; no payouts until payments are re-approved).
