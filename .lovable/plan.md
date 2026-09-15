# ASH Social — stories, social feed, friends, groups, notifications, cleaner navigation

This turns ASH Hub into a social platform with a marketplace inside it. The wallet, referrals and payouts are untouched.

## 1. ASH AI — live, with camera and snapshots

- The AI panel gets a camera button and a photo picker. On phones it opens the camera directly; on desktop it captures a snapshot from the webcam or takes a file.
- Images are sent with the question, so members can ask "how much should I charge for this?" or "what is wrong with this hairstyle?" and get a real answer.
- The assistant keeps its current personality and personalised data, and now also answers about the social feed and stories.

## 2. Spotlight: stories vs vendor posts

Two clearly separate things:

- **Stories (24 h)** — the top horizontal row. The first card is a "Create Spotlight" tile with a rounded plus over the member's own avatar, exactly like Facebook. Tapping a story opens a full-screen viewer with segment progress bars, tap to skip, hold to pause, swipe to close — WhatsApp-style, and it auto-advances to the next person then closes.
- **Story views** — every view is recorded. The owner swipes up on their own story and sees the list of viewers with names and avatars, TikTok-style, with a live count.
- **Vendor Spotlight posts** — the existing "Share a Spotlight" flow stays as the sales post that carries the Contact-vendor button. It is visually distinct (card in the feed, not a ring) and never mixes with the recommended-for-you imagery.
- Stories also appear on the member's profile: tapping their avatar there opens the same viewer.

## 3. Social feed inside ASH Hub

- A new **Feed** tab in ASH Hub: photo-only posts (no video for now), captions, real likes, comments and reposts — all stored in the backend, no seeded or fake accounts.
- **Comments**: each comment shows the author's avatar and name; replies to comments are supported one level deep, like Facebook.
- **Comment safety toggle**: one switch per post ("Filter inappropriate comments"). When on, every new comment is screened by the moderation service and blocked or hidden automatically.
- **Recommendations**: the feed is ranked by a simple algorithm — people you follow/are friends with first, then posts with recent engagement, then posts from your city and categories you interact with, with a freshness decay.

## 4. Friends and direct contact

- Send, accept, decline and cancel friend requests; a Friends screen with requests and your list.
- "Message" on any friend opens a direct chat straight away.

## 5. Groups

- Members create groups, name them, set a photo, and add people (invite-only — nobody joins on their own).
- Group chat shows each sender's avatar beside their message, exactly like one-to-one chat.

## 6. Chat improvements

- **Typing indicator**: the other person's avatar plus animated three dots while they type, disappearing when they stop.
- **Chat wallpaper**: a set of ASH-designed backgrounds plus "choose from my gallery" (gallery only, no links).
- **Encryption**: messages are encrypted at rest and in transit, and I will add per-conversation encryption of message bodies so they are unreadable in the database. Note: true end-to-end encryption (keys only on devices) would break in-app moderation, reporting and admin support, which the app and the app stores rely on. I will implement strong encryption and say so accurately in the app rather than claim E2EE.

## 7. Notifications as their own screen

- A dedicated, beautiful Notifications screen: grouped by Today / This week / Earlier, each row carrying the sender's profile picture, what happened, and the thing it happened to.
- Filter chips: All, Social (likes, comments, stories, friends), Messages, Bookings, Money, System — so anything can be found instantly.
- New triggers: someone posts a picture or story, likes or comments on yours, replies to your comment, reposts, sends or accepts a friend request, adds you to a group.
- The bell keeps its quick preview and gains a "See all" that opens the screen.

## 8. Navigation and layout clean-up

- The centre bottom-bar button becomes **ASH Hub** with a crafted brand mark instead of the plus. The create actions it used to hold stay where they already exist elsewhere.
- **Bubble nav motion**: press and drag along the bottom bar with your thumb and a soft bubble follows your finger between tabs, snapping in on release — like WhatsApp.
- The **More** sheet is reorganised into groups (Marketplace, Work, Money, You) so it is tidy but everything stays reachable, with rounded pill icons matching the ASH Hub top buttons.
- The floating ASH button drops Bank and Location: **ASH Card only**. Location moves into Settings, with an occasional gentle reminder banner on entry when it has never been set.

## Technical notes

- New tables: stories, story_views, social_posts, post_likes, post_comments (self-referencing parent), post_reposts, friendships, groups, group_members, chat_settings; notifications gains richer categories and an actor. All with RLS scoped to the owner/participants, grants, and triggers keeping counts in sync.
- Story media and post photos go to the existing private spotlight bucket with signed URLs and 24 h expiry cleanup for stories.
- Realtime channels power typing indicators, story view counts and live notification badges.
- AI images go through the existing Lovable AI gateway as multimodal messages.

## Sequencing

Given the size, I will ship in this order, verifying each: (1) database + RLS, (2) stories and viewer, (3) social feed with likes/comments/reposts, (4) friends and groups, (5) chat typing/wallpaper/encryption, (6) notifications screen, (7) AI camera, (8) navigation clean-up and bubble motion.
