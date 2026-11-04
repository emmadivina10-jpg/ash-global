# Discover video, Spotlight return, one ASH colour

## What you will see
1. **Upload video has its own setup**: "Upload video" in Discover opens a short Discover-only flow (choose video, title, description, category, optional price for instructors, cover image). It no longer opens Professional Studio or the Shop listing form. No length limit is set in the app; uploads resume if the connection drops.
2. **YouTube-style Discover**:
   - Videos fill the screen from left to right.
   - The "ASH Glo" title is removed from the top.
   - The top bar fades away as you scroll down and comes back when you scroll up.
   - Popular courses stay. Instructor videos show in the main list.
3. **Instructor pages**: tapping a featured instructor opens their profile with their videos. Each video shows Watch, Buy (MTN / Orange Money only), star rating and reviews.
4. **Spotlight tab is back in the middle**: Discover | Shop | Spotlight | Messages | Menu.
   - A row of round profile bubbles at the top (styled like Featured Instructors) opens each person's stories and Spotlights.
   - Underneath is a polished scroll of photo posts and Spotlights, including photos from the old feed, with likes and comments working as before.
5. **One colour everywhere**: the Shop colours become the app colours, including Messages, where the green goes away.
6. **Payments**: card and bank stay blocked everywhere and MTN / Orange Money stay on every checkout. This is already the case; I will only check new Buy buttons follow it.

## Needs your OK
- **Video storage and paid lessons** need new database tables (videos, purchases, reviews) and a video provider. Without one, video files go to private app storage. That works for long videos but plays less smoothly than a streaming service like Cloudflare Stream. I'll show you the exact SQL before applying anything.
- Nothing will be published.

## Technical notes
- New `discover.upload` route plus `discover_videos`, `video_purchases`, `video_reviews` tables, protected by access rules. Paid playback uses short-lived signed links, released only after a settled MTN/Orange payment through the existing settlement path.
- Uploads use resumable (TUS) storage uploads with no client size cap. The server's per-file limit is raised on the private bucket.
- `member-tabs.ts` gains Spotlight at index 2. Tests are updated.
- The Shop palette tokens are promoted to the global theme. The green tokens in the Messages/member surfaces are replaced. The memory rule "member app blends subtle green" is updated to match.
