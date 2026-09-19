# Spotlight, Feed, and Menu refinements

## Changes
- Make Spotlight use each member’s real display name and profile picture from the shared member directory, including members without a vendor profile.
- Show “See more” as soon as Feed or Spotlight text exceeds two lines, with “See less” after expansion.
- Remove the descriptive sentence under the Feed title.
- Replace the mobile “More” sheet with a dedicated `/menu` page.
- Style the Menu tab like Facebook: the signed-in member’s round profile photo with a small three-line menu badge at the corner, labeled “Menu.”
- Build the Menu page from the existing destinations and permissions without changing their functionality.

## Validation
- Check mobile Feed, Spotlight, and Menu navigation in the preview.
- Confirm profile photos/names, two-line expansion, active Menu state, and existing links work.
- Confirm the app builds without errors.
