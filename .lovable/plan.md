# Services ↔ Market

## Changes
- Replace the musical tab chime with a short, dry tap/pop inspired by Facebook’s tab sound. This will be an original ASH sound, not a verified exact copy of Facebook’s recording. Keep existing mute settings and message/notification sounds unchanged.
- Remove the “Find Someone Who Can Teach You” banner. Add a rounded tutoring shortcut immediately after Netflix, opening the existing ASH Campus instructors page.
- Add a rounded **Market** shortcut. Selecting it switches the Services destination to **Market**, including its tab label and storefront icon. Provide a clear Services control to switch back; keep the selected mode when visiting other tabs.
- Build a Facebook Marketplace-style browsing view in ASH colours: prominent Market heading, search, location and category filters, image-first two-column listings, listing details, selling and messaging entry points, and personal activity.
- Reuse real ASH offers, properties and provider records, plus their existing listing creation, detail and contact screens. Display honest empty states when there are no matching records; no sample products or invented prices.

## Boundaries
This delivers the familiar Marketplace browsing experience using the commerce features ASH already supports, not every Facebook feature. General secondhand-product listings, shipping and Facebook integrations are not included. Authentication, safety rules, wallets, payments and existing services stay unchanged. Nothing will be published.

## Technical details
- Keep the marketplace view under the existing Services destination with a shared, persisted Services/Market mode used by the page and navigation.
- Add a focused marketplace browsing component backed by existing safety-filtered queries, without new tables or duplicate commerce logic.
- Verify switching, tutoring placement, search/filter states, mobile/desktop containment and the tab sound/mute path in preview.
