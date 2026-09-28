# ASH Clean — laundry pickup, weighing and delivery inside ASH Glo

ASH Clean is built as a module of the current app, not a separate company. It reuses ASH accounts, TchokoPay Mobile Money, notifications, messages, the admin console and Support. Prices are in FCFA, and it launches in Buea/Molyko.

## What customers get
- The first round shortcut on Services becomes **ASH Clean** and opens the ASH Clean home screen.
- **Book a pickup**: choose services (wash, dry, fold, iron, special items), then set the pickup spot on a Google map or with the current location, and add a note. Customers do not enter a weight. The screen explains that "your laundry will be weighed at ASH Clean and you approve the final price before washing".
- **Pickup method** is picked automatically by distance:
  - Inside the staff radius: **ASH Staff Pickup**, with no transport fee.
  - Outside it: **ASH Rider**, with the fee shown before confirming.
- **Order ID and QR code**, for example `AC-2026-000124`. The receipt page can be printed or saved as a PDF and shown at the office.
- **Price approval**: after weighing, the customer sees kg × rate, plus special items, plus pickup/delivery fees, which gives the total. They can **Confirm & Pay** (MTN/Orange through TchokoPay) or **Decline / Request return**. Washing never starts before payment.
- **Tracking timeline**: 18 steps, from Booking Confirmed to Delivered. When a rider or staff member is on the way, their live position shows on the map.
- **My orders**, with each order's receipt, payment status and history.

## What ASH staff and riders get
- **Staff/Rider jobs screen**: accept a job, then mark On the way, Arrived, Collected and Delivered. While a job is active, the app shares location.
- **Facility screen**: scan or search an order ID, enter the verified weight and any special items, and send the price. Then move the order through Washing, Drying, Ironing, Folding, Quality check, Packed and Ready.
- Every step is logged with time and staff name, which gives a full order history.

## Admin and customer-service dashboards
- New **Console → ASH Clean**: orders by status (including Awaiting price approval), revenue, riders, staff and settings.
- **Settings**: price per kg (starts at 1,500 FCFA), special-item prices, rider fee, staff pickup radius, facility location, and whether cash is allowed.
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
- Google Maps: link the Google Maps connector. The map shows through the browser key; address search and distance go through authenticated server functions, with debouncing and caching. Staff and rider positions are written to `clean_locations` and followed live.
- QR codes are generated in the browser. The receipt route is `/clean/receipt/$orderId`, with a printable layout.
- Routes: `/clean`, `/clean/book`, `/clean/orders/$id`, `/clean/receipt/$id`, `/clean/jobs`, `/clean/facility`, and `/console/clean`.

## Not in this plan (paused earlier requests)
- Matching TchokoPay totals with the admin dashboard.
- Owner and member withdrawable balances.
- Holding booking payments until the customer confirms.

These stay on the to-do list for right after ASH Clean, unless you want them first.
