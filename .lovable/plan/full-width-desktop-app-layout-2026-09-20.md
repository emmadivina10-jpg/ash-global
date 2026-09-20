# Full-width desktop app layout

## Change
- Remove the desktop app frame’s maximum-width cap so the signed-in experience fills the full browser width and height on laptops and desktops.
- Keep the existing sidebar, top bar, right rail, spacing, page-specific content widths, and all mobile/tablet behavior unchanged.

## Validation
- Check authenticated pages at desktop and laptop widths to confirm the shell reaches every screen edge without horizontal overflow.
- Confirm the mobile layout remains unchanged and the app builds cleanly.
