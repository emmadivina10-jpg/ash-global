# Remove page-wide horizontal scrolling

## Changes
- Identify the element causing the document to exceed the viewport on desktop and mobile.
- Constrain the shared app shell and page root without disabling intentional sideways carousels.
- Verify representative desktop and mobile screens have no page-level horizontal overflow.

## Technical details
- Preserve existing navigation, content widths, and horizontal lists.
- Use shared layout constraints rather than page-specific visual redesigns.
