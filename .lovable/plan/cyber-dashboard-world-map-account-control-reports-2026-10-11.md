# Cyber dashboard: World map, Account control, Reports

Preview only. Nothing published. Every Cyber view and action is logged; protected owner/admin accounts stay untouchable.

## 1. New first tab: "World map" (opens by default)
- Full-width map, edge to edge, about half the screen tall, with a cardinal-point compass (N/E/S/W) in the corner.
- Layers you can switch on/off:
  - **Providers**: each provider's profile photo as a round pin; pins group together when zoomed out and split apart when zoomed in.
  - **Devices**: sign-in locations from recorded IP addresses (country + city), coloured red when flagged suspicious.
  - **Live deliveries/trips**: active bookings where both parties are sharing location, moving in real time (refreshes every 10 s).
  - **Airports**: major world airports (built-in list, ~1,000 with IATA codes), ready for when Flights goes live.
- Tapping a pin opens a side panel: photo, name, email, phone, city/country, verification, devices and IPs, compliance status, plus "Open full profile" (goes to the Accounts view to take security actions).
- Tapping a live trip opens a view-only session showing both parties' movement.

**Honest location limits:**
- Providers don't have exact addresses saved, only city and country. Pins sit at the city centre until a provider shares a live location. Exact pins would need providers to set a business location.
- IP locations are approximate (city level), not exact street positions.

## 2. "Ask ASH Intelligence about this account"
- In the account panel and the Accounts tab: one button that sends that account's real records (sign-ins, devices, countries, reports, blocks, restrictions, payments, strikes) to ASH Intelligence, which explains what looks risky and what to do. It says "Data not available" when records are missing.

## 3. New tab: "Account control"
- Search an account, then:
  - **Force logout** of all sessions.
  - **Send password recovery** email to the member's own address.
  - **Require password change** at next sign-in.
  - **Dispute / hold a transaction**: flag a payment or withdrawal as disputed, which pauses the withdrawal and opens a case for Finance. It never moves or changes money.
- Cyber never sees or sets a member's password. All actions are reversible from the CEO "Actions" list.

## 4. New tab: "Reports"
- **Generate daily report** and **Generate weekly report** buttons. Each one produces an audit report from real records: attacks and suspicious activity, blocks, failed sign-ins, payment notice failures, restrictions taken, open gaps and what needs fixing, each with a priority.
- Reports are saved, listed by date, can be printed or saved as PDF, and can be sent to the CEO. Only Cyber can delete them.

## Technical details
- Leaflet + OSM (already used), plus `leaflet.markercluster`, client-only lazy import. Airports from a bundled static JSON (OurAirports large/medium subset).
- Geo: extend `recordFingerprint` to store `city`, `lat`, `lng` from Cloudflare `request.cf` (no third-party geo-IP). Migration adds nullable `city/lat/lng` to `access_fingerprints`, adds `security_reports` (service-role + deny-all) and `security_transaction_holds`. City centres for providers via a bundled world-cities lookup extending `location.ts`.
- New server functions in `cyber-map.functions.ts` and `cyber-reports.functions.ts`, all `requireDepartment("CYBERSECURITY")`, `is_protected_account` checks on mutations, every view of contact details and live trips written to `security_actions`.
- Force logout reuses existing sign-out + lock; recovery uses the auth admin recovery link; withdrawal hold reuses the existing restriction/case paths.
- Tests: protected-account refusal for new actions, report period boundaries (daily/weekly), transaction hold never alters amounts.
