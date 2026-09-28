# ASH Clean — laundry pickup, weighing and delivery inside ASH Glo

ASH Clean is built as a module of the current app, not a separate company. It reuses ASH accounts, TchokoPay Mobile Money, notifications, messages, the admin console and Support. Prices are in FCFA, and it launches in Buea/Molyko.

## What customers get
- The first round shortcut on Services becomes **ASH Clean** and opens the ASH Clean home screen.
- **Book a pickup**: choose services (wash, dry, fold, iron, special items), then set the pickup spot on a Google map or with the current location, and add a note. Customers do not enter a weight. The screen explains that "your laundry will be weighed at ASH Clean and you approve the final price before washing".
- **Pickup method is chosen for the customer**, who never has to pick between staff and rider:
  - Their location comes from the phone's GPS, a pin on the map, an address search, or a typed address.
  - The app then works out the **real road distance** to the facility with Google Routes. It only falls back to a straight-line distance if Google can't answer.
  - Inside the staff radius, it shows "ASH STAFF PICKUP — FREE".
  - Outside it, it shows "ASH RIDER PICKUP" and the rider fee from the distance bands (0–3 km staff, 3–5 km 1,000, 5–8 km 1,500, 8–12 km 2,000, 12+ km custom). Admin can change every one of these values.
  - The customer sees the distance, the method, the fee and the arrival time before confirming.
- **Change of address** updates distance, method, fee and arrival time straight away, with no page refresh.
- **Delivery is calculated separately** from the customer's saved delivery address with the same rules. Pickup and delivery can use different methods and different people. For example, a staff member picks up for free and a rider delivers for 1,500 FCFA.
- **Order ID and QR code**, for example `AC-2026-000124`. The receipt page can be printed or saved as a PDF and shown at the office.
- **Price approval**: after weighing, the customer sees kg × rate, plus special items, plus pickup/delivery fees, which gives the total. They can **Confirm & Pay** (MTN/Orange through TchokoPay) or **Decline / Request return**. Washing never starts before payment.
- **Tracking timeline**: 18 steps, from Booking Confirmed to Delivered.
- **Live map during an active pickup or delivery**:
  - The customer sees the staff member's or rider's marker, their own location, the route, the distance left, the arrival time and the current status.
  - The staff member or rider sees the customer's location, the route, the distance, the arrival time, a Navigate button (opens Google Maps) and the order details.
  - Tracking only runs while a job is active. It stops automatically when the job is marked Collected or Delivered, and workers are never tracked off duty.
- **My orders**, with each order's receipt, payment status and history.

## What ASH staff and riders get
- **Staff/Rider jobs screen**: accept a job, then mark On the way, Arrived, Collected and Delivered. While a job is active, the app shares location.
- **Facility screen**: scan or search an order ID, enter the verified weight and any special items, and send the price. Then move the order through Washing, Drying, Ironing, Folding, Quality check, Packed and Ready.
- Every step is logged with time and staff name, which gives a full order history.

## Admin and customer-service dashboards
- New **Console → ASH Clean**: orders by status (including Awaiting price approval), revenue, riders, staff and settings.
- **Settings**: price per kg (starts at 1,500 FCFA), special-item prices, and whether cash is allowed.
- **Transportation settings**:
  - Facility location, picked on a map (Molyko, Buea).
  - Staff service radius (3 km to start), maximum staff distance, and distance pricing bands.
  - Minimum rider fee, and base pickup and delivery fees.
  - Switches for staff pickup, staff delivery and rider availability. If staff are switched off, the job goes to a rider automatically.
- **Support** sees ASH Clean orders and receipts, so they can answer customers.
- Payment and receipt use one shared record. The amount on the receipt, the TchokoPay charge and the admin totals always come from the same saved price quote.

## Build order (MVP from the brief)
1. Database, roles, settings and the pricing engine.
2. Customer booking with a map and automatic pickup choice.
3. Order ID, QR code and receipt.
4. Facility weighing, then price approval, then TchokoPay payment.
5. Process tracking and notifications.
6. Staff/rider jobs with live location.
7. Admin and Support dashboards.

## Technical details
- Tables: `clean_settings`, `clean_services`, `clean_orders`, `clean_order_items`, `clean_price_quotes`, `clean_status_events`, `clean_assignments`, `clean_locations` (live positions). All have RLS and grants. Staff roles use the existing `staff_accounts` departments plus a new CLEAN department; riders are users with a `clean_rider` role in `user_roles`.
- The price is calculated only on the server, from the saved weight and the settings at that moment, and is stored in `clean_price_quotes`. Payment reuses the TchokoPay charge and webhook with a `CLN-` reference, and a database function confirms it idempotently. The 5-minute reconcile job also covers these payments.
- Google Maps: link the Google Maps connector.
  - Maps JavaScript displays through the browser key.
  - Address search (Places Autocomplete, New), reverse geocoding and road distance/arrival time (Routes `computeRoutes`) go through authenticated server functions, with debouncing and caching.
  - The pickup and delivery quotes are recalculated on the server whenever the address changes, and stored on the order.
- Transport tables: `clean_transport_settings` and `clean_distance_bands`. Separate `pickup_*` and `delivery_*` fields on `clean_orders` (method, distance, fee, arrival time) record the two directions independently. Each direction also has its own `clean_assignments` row.
- Live tracking: workers write to `clean_locations` only while their assignment is active; RLS blocks writes otherwise. Customers follow it live, and the row is removed when the job completes.
- QR codes are generated in the browser. The receipt route is `/clean/receipt/$orderId`, with a printable layout.
- Routes: `/clean`, `/clean/book`, `/clean/orders/$id`, `/clean/receipt/$id`, `/clean/jobs`, `/clean/facility`, and `/console/clean`.

## Not in this plan (paused earlier requests)
- Matching TchokoPay totals with the admin dashboard.
- Owner and member withdrawable balances.
- Holding booking payments until the customer confirms.

These stay on the to-do list for right after ASH Clean, unless you want them first.
