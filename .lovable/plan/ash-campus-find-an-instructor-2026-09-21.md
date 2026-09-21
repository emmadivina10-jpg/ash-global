# ASH Campus — Find an Instructor

ASH Campus does not exist yet in the app, so this plan creates it and builds the instructor ecosystem inside it, reusing the existing ASH systems (profiles, services, bookings, messages, reviews, follow, notifications, admin review, wallet) rather than duplicating them.

## What members will get

**ASH Campus landing** (More → ASH Campus)
- Premium ASH-styled hub with the twelve sections: GCE, HND, University, Study Materials, Past Questions, AI Tutor, Find an Instructor, Study Groups, Scholarships & Opportunities, Internships & Jobs, Student Projects, Student Marketplace.
- The "Find the Right Instructor" card sits at the top with "Find an Instructor" and "Become an Instructor" buttons.
- Sections that map to things ASH already has link straight to them (AI Tutor → ASH AI assistant, Study Groups → Groups, Internships & Jobs → Jobs, Student Marketplace → Services, Student Projects → Freelance/Incubator). Sections with no data yet (GCE, HND, University, Study Materials, Past Questions, Scholarships) open a filtered Campus content view with an honest empty state — no invented material.

**Find an Instructor**
- Search box ("What do you want to learn?") plus filters: education level, subject/skill, teaching mode, country/city, language, availability, price, verified-only, and sorting by relevance, rating, price, experience.
- Instructor cards showing photo, real name, username, ASH Verified Instructor badge, subjects, levels, location, mode, languages, years of experience, rating and review count (only when real reviews exist), and starting price. No fabricated numbers — missing data is simply omitted.
- Desktop gets a filter sidebar and a card grid; mobile gets stacked cards with a filter sheet.
- A "Looking for an instructor for your child?" flow that collects level, subject, mode, location, schedule, budget and language, then shows matching instructors. The parent stays the account holder for messaging, booking, payment and reviews; no separate child accounts or child-to-instructor contact.

**Instructor profile**
- Profile, qualifications, experience, teaching (mode, areas served, methodology), weekly availability, services, reviews, and educational posts.
- Actions Message, Book a Session, View Services and Follow all call the existing ASH messaging, booking, services and follow systems.

**Become an Instructor**
- Multi-step application: personal info, teaching info, qualifications, and document upload (identity + qualification documents) into a new private storage bucket with signed-URL admin access only.
- Statuses: Draft, Submitted, Under Review, Additional Information Required, Approved, Rejected. The applicant sees status and any admin note.

**Instructor dashboard** (approved instructors)
- Profile completion, verification status, services, upcoming and completed bookings, reviews, availability, educational content, and earnings read from the existing wallet/booking records. No new wallet.

**Admin review** — a Campus Instructors tab in the existing Console Trust area listing applicant, date, subjects, qualifications, experience, signed document links, status and notes, with Approve / Request more information / Reject, every decision written to the existing admin audit log.

## Technical notes

New tables (everything else reuses existing ones):
- `campus_instructor_applications` — application fields, document paths, status, admin note, reviewed_by/at.
- `campus_instructor_profiles` — user_id, linked provider_id (optional), bio, methodology, subjects[], levels[], languages[], teaching mode, country/city, areas served, years of experience, hourly/session starting price, is_active, approved_at.
- `campus_instructor_qualifications` — degree/diploma/certification, institution, year.
- `campus_instructor_availability` — day of week, time range.
- `campus_subjects` — data-driven category/subject catalogue (academic, technology, engineering, professional, languages, creative) so admins can add more later.

Security:
- Applicants can insert/update only their own application while it is Draft or Additional Information Required; status, approval and verification columns are forced server-side by triggers and a `review_campus_instructor_application` SECURITY DEFINER function callable only by Trust staff via server functions.
- Instructor profiles are created only by the approval function; owners may edit content fields but never `is_verified`/`approved_at`.
- Documents live in a private `campus-verification` bucket; only the owner can upload, only admin server functions mint short-lived signed URLs.
- Public reads are limited to approved, active instructor profiles with safe columns; qualifications and availability readable for those profiles only.
- GRANTs on every new table, RLS on, rate limiting on application submission via the existing `rate_limit_check`.

Reuse:
- Services = `provider_services` on the instructor's existing provider profile; booking = existing booking flow and payments; reviews = existing `reviews` on completed bookings; messaging = existing conversations; follow = existing friendship/follow; reporting/blocking = existing `content_reports` and `user_blocks`.
- Search: instructors added as a bucket to `useUniversalSearch` and surfaced in Services discovery, using the existing search architecture.
- Activity tracking uses the existing `trackEvent` helper.

Untouched: Feed, Messages, Wallet, Referral, Marketplace, Stories, Spotlight, Notifications, Profile, Auth, existing Booking and Admin screens, and the bottom navigation (Campus is reached from More).

Labels stay accurate: only "ASH Verified Instructor" after real admin approval — no background-check, government-verified or licensing claims.
