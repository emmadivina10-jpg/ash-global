# ASH Campus — Global Learning & Exam-Prep Marketplace

Expands the existing Find an Instructor system into a global marketplace: academic tutoring, languages, international exam preparation, professional, technical and creative instruction. Everything keeps running on the existing services, bookings, messaging, reviews, wallet, search and admin systems — nothing is rebuilt.

## What changes for people using ASH

**Find an Instructor becomes the front door**
- New headline "Find Someone Who Can Teach You." with the subline about school, university, languages, professional skills and international exam preparation.
- Seven category rails: Academic, Languages, Exam Preparation, Professional, Technology, Engineering, Creative Skills.
- One-tap search shortcuts: TCF Canada, TEF Canada, IELTS, CELPIP, French, English, German, Mathematics, Physics, Programming, Cybersecurity.
- Filters gain country, exam, skill and language-level alongside the existing level, subject, mode, city, price, availability and verified-only.
- Instructor cards show country flag, city (when in-person), languages, exams taught, real experience, real rating only when reviews exist, and the starting price in the instructor's own currency. Nothing is invented — missing data is omitted.

**Accurate titles, never inflated**
- Badges read ASH Verified Instructor, ASH Language Instructor, ASH Exam Preparation Instructor, ASH Academic Tutor, ASH Professional Instructor or ASH Technical Instructor, derived from the instructor type an admin approved.
- Never Professor, Doctor, Certified, Licensed or Expert. Exam names always appear as "TCF Canada Preparation" style wording, with a visible note that ASH instructors are independent and not affiliated with or endorsed by any examination organisation.

**Instructor application**
- Step one now asks for instructor type (Academic, Language, Exam Preparation, Professional, Technical, Creative, Other), then multi-select subjects, languages with levels, exams, skills and education levels, all drawn from the admin-managed catalogue.
- Country plus teaching timezone, online/in-person/both, service areas for in-person only. Registration, application, verification and listing stay free, stated on the page.

**Instructor dashboard**
- Adds an Earnings panel showing Gross revenue, ASH commission (10%), Net earnings, Pending and Available, all read from the existing wallet and booking ledger — no new money system.
- Adds Availability, Reviews, Messages and Educational content sections linking into the existing screens.

**Global booking with time zones**
- Instructor publishes hours in their own timezone; learners see each slot in both the instructor's zone and their own device zone, with the offset labelled. Bookings keep storing a single canonical UTC timestamp.

**Off-platform protection**
- Messages in instructor conversations are scanned for obvious attempts to move the deal off ASH (WhatsApp/phone numbers, external payment or booking links, "pay me directly", "book outside ASH"). First match shows the sender a warning; repeated or clear-cut matches raise a flag for admin review. No auto-bans, no censoring of legitimate lesson content.

**Discovery everywhere — not hidden**
- ASH Campus gets its own Learn entry in the desktop sidebar, a Campus card on the Services page, and a compact "Learn something new" entry point on the Feed alongside the existing shortcuts.
- Universal search keeps and widens its instructor bucket so "TCF Canada", "German" or "Physics" return instructors and their teaching services.

**Admin**
- New Campus catalogue tab in the console: add or retire categories, subjects, languages, exams, skills and education levels, so future additions (PTE, TOEFL, SAT, AWS, Cisco…) need no rebuild. Nothing is offered until an admin activates it.
- The existing Campus instructor review queue gains the new fields (type, exams, skills, languages) and keeps signed private document links plus audit logging.

## Technical notes

Database (migration):
- `campus_subjects` gains `kind` (`SUBJECT | LANGUAGE | EXAM | SKILL | LEVEL`), `code`, `parent_category`, keeping existing rows as `SUBJECT`. Seeded with the language, exam and skill entries listed above; admin-writable through a Trust-restricted server function.
- `campus_instructor_profiles` and `campus_instructor_applications` gain `instructor_types text[]`, `exams text[]`, `skills text[]`, `language_levels jsonb`, `timezone text`. Existing columns untouched.
- Instructor-linked provider services get identified through the instructor's `provider_id`, so no duplicate service table.
- 10% commission: a server-side rule in the existing `charge_platform_commission` trigger and the `commerce` fee calculation applies 0.10 when the booking's provider belongs to an approved Campus instructor, 1%/2% otherwise. The rate is never read from the client; `platform_fee` and `provider_amount` stay server-computed.
- New `campus_offplatform_flags` table (message id, conversation, matched rule, status) written by a SECURITY DEFINER function; readable only by Trust staff.
- GRANTs, RLS and owner/self-approval restrictions follow the existing Campus pattern: no self-verification, no editing another instructor's rows, private documents stay admin-signed-URL only.

Frontend:
- Extends `src/lib/campus.queries.ts`, the four `/campus` routes, `console.campus-instructors.tsx` plus a new catalogue console tab, `src/lib/timezone.ts` for dual-zone display, `useUniversalSearch` in `src/lib/ash.queries.ts`, and nav entry points in `AppShell`/`DesktopMenu`/Services/Feed.
- Bilingual EN/FR labels throughout, existing ASH palette and components only.

Untouched: Feed content, Messages, Wallet, Referral, Marketplace, Stories, Spotlight, Notifications, Profile, Auth, existing Booking flow and bottom navigation.
