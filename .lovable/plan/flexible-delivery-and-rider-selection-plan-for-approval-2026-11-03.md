# Flexible delivery and rider selection — plan for approval

Nothing below has been built or applied yet. Database changes run only after you approve.

## 1. What already exists and can be reused
- **Delivery requests**: one delivery record per request, linked to the shop and customer, with fees, notes, pickup and drop-off.
- **Three ways to fulfil an order today**: ASH Dispatch, shop's own riders (shop-invited ASH riders), and self-pickup.
- **Rider checks**: only verified, active riders marked available can be assigned, and a rider can only have one active delivery at a time.
- **Rider offers**: riders accept or decline, an accept-time eligibility check runs, and every step goes into the event log.
- **Handover**: a private one-time code finishes the delivery. Codes are hashed, attempts are limited and they expire.
- **Live tracking**: only the people on a delivery can see it, and the rider's position is deleted when the delivery ends.
- **Rider documents** stay private, and staff review them on the console Riders page.

## 2. Gaps found during inspection
- **The member delivery screens are missing from the app code.** These are the customer Deliveries, shop Dispatch, Rider and Logistics admin screens. The shared delivery logic and map are still present. They must be restored first.
- **Marketplace orders are not stored as orders.** Product purchases go from cart to chat or booking, so a delivery can't attach to a specific order today. Cleaning orders are the only order records.
- **Riders show as assigned too early.** When a shop picks a rider, the delivery is marked "Assigned" before the rider accepts. Your rule needs "Offered" until they accept.
- **There's no safe public rider listing.** Rider records include licence and phone, so a reduced view is needed for the directory.
- **There are no shop delivery preferences and no "own rider" (external) delivery type.**

## 3. Screens to build
1. Restore Deliveries (customer), Dispatch (shop), Rider and Logistics admin screens.
2. **Delivery method selector** at checkout: ASH Dispatch / Choose an ASH rider / Use my own rider / Self-pickup. It shows only the options the shop allows, with a line on who manages it and what tracking exists.
3. **Rider directory picker**: name, photo, vehicle type, area and availability for verified, available riders only. Ratings show as "not yet rated" because there's no rider rating today.
4. **Own-rider form**: name, phone, vehicle type, optional plate and note. It ends with a collection code and an "Externally managed" label, and there's no live map.
5. **Shop delivery preferences** card in shop settings.
6. If a rider declines or the offer expires, the screen offers "Choose another rider" or "Use ASH Dispatch".

## 4. Database changes (need approval)
- **Shop delivery preferences**: five on/off switches per shop. Only the shop owner can edit them, and default is ASH Dispatch only.
- **Delivery type**: add "Customer-chosen ASH rider" and "External rider" next to the existing types. Also add an "Offered" status so nobody shows as assigned before acceptance.
- **External rider details**: name, phone, vehicle and note, readable only by that delivery's customer, shop and staff. No account is created for them.
- **Safe rider directory**: lists verified, active, available riders with display name, photo, vehicle type, city or zones, and availability. It never includes the licence, phone, documents or location.
- **New actions**, each checked on the server:
  - offer a delivery to a chosen rider: the shop must allow it and the rider must be eligible
  - offer expiry after a set time
  - record an external rider
  - external pickup confirmation and completion using the existing handover code
- The current "assign" action changes to mark deliveries "Offered", and "Assigned" happens only when the rider accepts. The one-active-delivery rule is unchanged.
- **Optional, decision needed:** a link from a delivery to an order. This only works for cleaning orders today. For marketplace goods, the delivery would link to the shop and customer as it does now.

Nothing changes in payments, wallets, commissions, referrals or financial records.

## 5. Security rules
- Shops see and manage only their own deliveries. Customers see only their own.
- The directory never exposes documents, licences, phone numbers or addresses.
- Unavailable or unverified riders can't be offered a delivery, and the server re-checks this when the rider accepts.
- Collection codes stay hashed and are shown only to the person handing over the order.
- External deliveries never show a live map.

## 6. Testing plan
- Isolated database tests for each rule above:
  - shop restrictions are enforced
  - no assignment before acceptance
  - unavailable riders refused
  - one active delivery per rider
  - private fields hidden from the directory
  - external deliveries record no positions
  - expiry and re-offer work
- Screen tests on phone size for each of the four methods, from start to delivered.
- A live check with temporary test accounts runs only with your separate approval, and everything is cleaned up afterward.

## Order of work
1. Restore the missing delivery screens (app code only).
2. Apply the approved database changes.
3. Build the selector, directory, own-rider form and shop preferences.
4. Run the tests and report the results. Nothing is published.
