# Stable Messages scrolling and swipe controls

## Changes
- Rebuild each conversation row around a single horizontal drag gesture that distinguishes sideways swipes from vertical scrolling.
- Add a short movement threshold, direction locking, pointer capture, and snap-open/snap-closed behavior so rows do not shake or trigger while the list scrolls.
- Keep archive on the left and delete on the right, with clear fixed-width action areas and a confirmation before destructive deletion.
- Close an open row when another row opens, when the list scrolls, or after an action completes.
- Stabilize the Messages list and active chat as independently scrolling, viewport-bounded surfaces with fixed headers/composers and no page clipping.
- Remove repeated viewport resets that can visibly move the screen while retaining keyboard-safe sizing.

## Validation
- Test vertical list scrolling without accidental sideways movement.
- Test deliberate left and right swipes, action buttons, and delete confirmation.
- Test opening a thread, scrolling messages, and opening/dismissing the keyboard at phone size.
- Confirm the app builds cleanly.

## Technical details
- Use pointer events with touch-action: pan-y and axis locking instead of raw touch events.
- Give chat list/thread wrappers min-height: 0, stable viewport heights, and overscroll containment.
- Keep optimistic preference updates and existing archive, lock, pin, and delete rules unchanged.
