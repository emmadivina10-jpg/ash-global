# Full-screen status and balanced media fix

## Changes
- Make Story and Spotlight viewers cover the complete screen above the top bar, bottom navigation, and floating controls on web and mobile.
- Keep owner controls inside the viewer, with working delete actions for both Stories and member-created Spotlights.
- Preserve vendor portfolio Spotlights while only showing delete for content the signed-in member owns.
- Balance photo grids for one, two, three, or four images: one fills the frame, two split evenly, three use one wide image above two equal images, and four use a balanced 2×2 grid.
- Apply the same balanced treatment to posting previews so three selected photos never reserve an empty fourth tile.

## Validation
- Check Story and Spotlight playback at phone size and confirm no app navigation remains visible.
- Check owner versus non-owner delete controls and deletion refresh behavior.
- Check 1–4 image posts and posting previews for equal, gap-free layouts.
- Confirm the app builds cleanly.

## Technical details
- Use fixed viewport layers with a higher stack level than the shared app shell.
- Add a Spotlight owner-delete mutation that deletes the database row and its uploaded media, then refreshes the Spotlight feed.
- Use image-count-aware CSS grid spans and stable aspect ratios.
