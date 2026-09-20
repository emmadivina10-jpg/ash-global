# Restore Universal Search

## What will change
- Restore the existing universal ecosystem search at `/search`, including businesses, services, freelancers, projects, properties, deals, and events.
- Move the current ASH Markets / FX Analytics screen to its own authenticated `/fx-analytics` page without changing its interface or behavior.
- Update every FX Analytics entry and return link to use `/fx-analytics`, including the Feed shortcut, market-post links, instructor profiles, and Market update cards.
- Keep the desktop Search navigation item pointing to `/search` so it once again opens universal search.

## Technical details
- Reuse the existing `useUniversalSearch` query and prior grouped-results presentation; no database, policy, ranking, or dependency changes.
- Preserve typed TanStack routes by creating the FX Analytics route before changing links.
- Keep activity tracking privacy-safe by recording only search query length, never the search text.
- Add unique page metadata for both Search and FX Analytics.

## Verification
- Check Search results and FX Analytics navigation in an authenticated desktop preview.
- Confirm market detail and instructor back links return to FX Analytics.
- Confirm mobile Feed still opens FX Analytics.
- Verify type checks and the current preview build complete successfully.
