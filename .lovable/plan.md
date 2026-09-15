# ASH premium welcome, Spotlight posting, forum & in-app sounds

## 1. Welcome screen (first screen visitors see)

Rebuild it as a premium, branded entry to the ASH world — not a plain centered box:

- Layered brand backdrop (existing liquid gold/emerald wash) plus a soft "world of ASH" strip showing the ecosystem: Services, Marketplace, Freelance, Property, Events, Deals — small glass chips with icons, gently animated in.
- Large ASH mark with gold ring, headline, tagline, and a short line of social proof-free, factual copy ("Book trusted pros. Sell, rent, hire. Get paid securely.").
- Enterprise-grade buttons: full-width primary with brand gradient, elevated shadow, pressed/active states, clear secondary outline button, both large-tap and keyboard accessible.
- Secure payment assurance row: a lock/shield badge stating payments are processed securely through the app's payment partners, with mobile money and card mentioned (no new claims beyond what the app already does).
- Footer line with a "Privacy & Support" link opening https://ash-glo-support.base44.app in a new tab, alongside the existing in-app Privacy and Terms links.
- Fully bilingual (EN/FR), dark/light safe, uses design tokens only.

## 2. Launch flash screen for signed-in users

The dark screen that appears before the app opens becomes WhatsApp-style:

- ASH logo centered on the plain brand background, nothing else in the middle.
- Small "from ASH Glo" wordmark pinned near the bottom.
- No wasted time: it disappears as soon as the app is ready (short minimum hold, immediate exit once the session is restored), instead of a fixed multi-second animation.

## 3. ASH Spotlight — create a post (Facebook-style)

- A composer row at the top of the Spotlight section: user avatar + "Share a spotlight…" input that opens a full composer sheet.
- Composer supports a caption, one or more photos, and now videos, with preview, progress and validation (size/type limits).
- Posting saves to the backend and the new post appears immediately in the Spotlight feed; the feed plays videos inline (muted autoplay, tap to unmute).
- Only members with a storefront/provider profile post as that business; others post under their own profile.

## 4. Contact-vendor pre-filled message

The pre-written "Hi + reason for contacting" opener already exists in the Spotlight flow. Extend the same opener to every other "contact vendor/provider" entry point (marketplace cards, provider page, property, deals) so every new conversation starts with a friendly, contextual first message.

## 5. Message notification sounds

- A short in-app chime when a new message arrives while the app is open (respects device silent mode on phones, and a mute toggle in Settings).
- Device notifications for messages carry a sound so they are audible when the phone is not silenced.

## 6. ASH Incubator — real forum

Replace the "coming soon" incubator page with a working, branded community forum shaped like a modern posting feed:

- Composer at the top with the member's profile picture, "What are you building?" prompt, optional image, and a space/track selector (Student Innovators, Future Founders, Startup Builders, Tech Builders, plus the existing forum spaces).
- Feed of posts showing author avatar, name, time, text, media, and reply/like counts; tapping a post opens the thread with replies inline.
- Like and reply actions, newest-first feed, smooth loading states and empty states.
- Branded ASH Incubator header retained, with live counts replacing the placeholder "coming soon" tiles.

## Technical notes

- New tables: `spotlight_posts` (author, optional provider, caption, media array with type), `forum_posts`, `forum_comments`, `forum_likes` — each with GRANTs, RLS (public read for published, author-owned writes), and indexes. Videos stored in a new public-read `spotlight` storage bucket with size limits and authenticated-only uploads.
- Spotlight feed query extended to merge the new posts with existing portfolio-based highlights.
- Forum and spotlight data loaded through TanStack Query hooks in `src/lib/`, writes via the browser client under RLS.
- Message sound: small audio asset played from the existing realtime message subscription, plus `sound` on native local notifications.
- No changes to payments, wallet, referral or booking logic.
