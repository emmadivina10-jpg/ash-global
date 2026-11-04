# ASH Glo tab bar correction: Discover | Shop | ASH Kitchen | Messages | Menu

## What I found (inspected, nothing changed)

The member tab bar is built in one place, and the tab list is defined inside the app frame:

```text
Today:   Feed      | Services/Market | Spotlight   | Messages | Menu
After:   Discover  | Shop            | ASH Kitchen | Messages | Menu
         /discover   /services         /kitchen      /messages  /menu
```

- Tab bar: `src/components/refer/MobileNav.tsx`. Menu (avatar + three lines) is already built in there separately. It stays as it is.
- Tab list: `MOBILE_NAV` in `src/components/refer/AppShell.tsx`. Today it has Feed `/feed`, Services `/services` (it says "Market" when Market mode is on), Spotlight `/spotlight` and Messages `/messages`.
- Desktop sidebar (`DESKTOP_NAV`), the More groups and `DesktopMenu.tsx` have Feed, Spotlight and Services entries.
- Signed-out visitors: `GuestShell.tsx` has its own five tabs (Feed, Services, Spotlight, Search, Sign in).
- Data: there are 17 published posts and 10 Spotlights, and **none of them are videos yet**. There are 4 food sellers: 3 private chefs and 1 caterer. Their opening hours are already saved. All 8 feature switches exist and are **off**.

## What changes

**1. Discover (replaces Feed in tab 1)**
- New premium page at `/discover` with the black, royal-purple and gold look:
  - compact header with search and a create (+) button
  - Stories row, kept at the top
  - category chips: For You, Following, Forex, Crypto, Programming, Maths, Professional
  - a large featured video at the top
  - a "Short videos" row of tall vertical cards
  - "Trending now"
  - "Learn with ASH instructors" (real Campus instructors)
  - "Markets education" (existing ASH market posts)
  - "From the community" (existing posts, with reactions and comments still working)
- It uses real content only. Videos always come first. Because there are no videos yet, it opens with photo content and shows an honest "Share the first video" prompt. Empty sections are hidden. Nothing is invented.
- The + button opens the existing short-video composer (it uploads to the current Spotlight storage), the post composer and the story composer. Nothing is lost from Feed.
- Tapping a video or photo opens the existing full-screen vertical viewer (`/spotlight`). It is no longer a tab, but old shared Spotlight links keep working. Its back button returns to Discover.
- The old `/feed` address automatically forwards to `/discover`. Every existing post, story, reaction and comment stays.

**2. Shop (tab 2: same Market, new name and icon)**
- Only the label changes: "Shop" (French: "Boutique"), with a professional shopping-bag icon. The tab no longer flips between "Services" and "Market".
- The `/services` page, the Market/Services switch inside it, the sellers, products, cart, Extras, bookings and checkout stay exactly as they are.

**3. ASH Kitchen (replaces Spotlight in tab 3)**
- New page at `/kitchen`:
  - search box for a dish or a kitchen
  - chips: All, Open now, Private chefs, Catering
  - "Featured kitchens" cards with a large photo, verified badge, gold stars, city, "Open now" or "Opens Tue 9:00" (from the saved opening hours) and "From X XAF"
  - "Popular dishes" menu with name, description, price and ready time
- **Order** opens the kitchen's existing page with that dish already chosen for the current booking checkout (MTN/Orange). Card and bank stay "coming soon". Payments are not changed.
- A "Sell food on ASH Kitchen" link goes to the existing seller setup.
- Signed-out visitors can browse kitchens. Ordering asks them to sign in and then returns them to the dish.

**4. Messages and Menu: no changes at all.**

**5. Same renames everywhere else**, keeping today's order: the desktop sidebar, More/Menu entries and the visitor tab bar (Discover, Shop, ASH Kitchen, Search, Sign in).

**French labels:** Découvrir | Boutique | ASH Kitchen | Messages | Menu ("ASH Kitchen" stays as the brand name).

## Safety switch (needs your yes)

All three tab changes sit behind the existing **new_nav** switch:
- **Off:** the app works exactly as today (Feed, Services, Spotlight).
- **On:** the new Discover, Shop and ASH Kitchen tabs show.

After you approve, I will turn new_nav on so the preview shows the new tabs. The live app is not affected until you approve publishing, because the published version does not read this switch. After publishing, turning it off restores the old tabs instantly.

No database structure changes, no records deleted, no payment changes, no publishing.

## Testing

- Automatic tests for:
  - exact tab order and labels in English and French, with the switch on and off
  - Shop still opens `/services`
  - Messages and Menu are unchanged
  - Kitchen "open now" and opening-hours logic
  - the food-seller filter
  - Discover putting videos first and its categories
- Phone-size and desktop screen checks, signed in and signed out: each tab opens the right page, `/feed` forwards, old Spotlight links still open the viewer, and Kitchen Order reaches the existing booking step (stopping before any payment).

## Not included (added to the roadmap)

- Linking Kitchen orders to ASH Logistics delivery. This needs a database change you would approve separately.
- Signed-out visitors seeing real Discover posts. This needs the separate public-read approval (Phase 3).
- Uploading through the managed video service. This needs that service's account details.

## Technical details

- New: `src/lib/feature-flags.ts`. It reads `feature_flags` with the public client, loads in the root loader through `ensureQueryData`, and fails safe to off.
- New: `src/lib/member-tabs.ts`. This holds pure tab-resolution logic shared by AppShell and GuestShell, plus its tests.
- `MobileNavItem` gains optional `match` prefixes so Discover stays highlighted on `/spotlight` and `/post/*`.
- New routes: `src/routes/_browse/discover.tsx` and `src/routes/_browse/kitchen.tsx`. They are guest-capable and have their own `head()` metadata. When the switch is off, `beforeLoad` redirects them to `/feed` and `/spotlight`.
- `src/routes/_browse/feed.tsx` gains `beforeLoad` → `/discover` when the switch is on. Its old page body stays in place for rollback.
- New: `src/components/discover/*` and `src/lib/discover.ts`. These handle ranking and categories and reuse spotlight, social and campus queries plus `rotateSessionContent`.
- New: `src/components/kitchen/*`, `src/lib/kitchen.ts` (open-now and food filter for `PRIVATE_CHEF`/`CATERING`) and `src/lib/kitchen.queries.ts`. These read `provider_profiles`, `provider_services` and `provider_availability` with the existing seller-visibility filters. Order goes to `/services/$providerId?book=<serviceId>`.
- Edited: `AppShell.tsx` (MOBILE_NAV, DESKTOP_NAV, MORE_GROUPS, topLevel), `MobileNav.tsx` (match only), `GuestShell.tsx`, `DesktopMenu.tsx`, `src/routes/_browse/spotlight.tsx` (back goes to Discover) and i18n labels.
