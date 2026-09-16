# Premium ASH Mobile Navigation

## Goal
Replace only the phone bottom navigation styling and interaction with a compact floating capsule, while preserving the existing five destinations and all routes.

## Changes
- Restyle the bar as a centered translucent pill with restrained border, elevation, pink ambient glow, and safe-area spacing.
- Keep exactly Feed, Messages, ASH Hub, Market, and More in their current order.
- Elevate the existing ASH logo into a larger circular center orb that overlaps the pill and keeps its label centered below.
- Add subtle active treatment for regular tabs without a large filled background.
- Add press/spring feedback, a draggable thumb-follow highlight, neighboring-tab response, route selection on release, and supported haptics.
- Remove the full-width safe-area paint that currently makes the control appear like a rectangular footer.

## Responsive and Quality Checks
- Keep the pill within narrow phone widths without clipping labels or icons.
- Account for iPhone home-indicator space and landscape height.
- Preserve content clearance so the floating bar does not hide actions.
- Verify Feed at mobile viewport sizes, center alignment, all five targets, More opening, gesture selection, and runtime/build health.

## Technical Details
- Limit edits to `MobileNav.tsx` and the mobile-navigation rules in `styles.css`.
- Use existing semantic color tokens, existing ASH logo component, existing routes, and existing More sheet.
- Use pointer events with horizontal interpolation and a spring-like CSS transform; trigger native vibration only when supported.
