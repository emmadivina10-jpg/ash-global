# App Store public information screens

## What I’ll add
- Keep the existing public **Support**, **Privacy Policy**, and **Terms** pages, but give them a consistent polished ASH presentation that works on phones and desktop browsers.
- Add a dedicated public **Contact** page with clear support, privacy, safety, and business contact options.
- Add a compact public-page navigation so reviewers can move between Support, Privacy Policy, Terms, Contact, and account deletion without signing in.
- Replace the welcome screen’s external help link with these permanent public pages and expose all four links clearly.
- Add Contact to the public sitemap and give it complete page metadata for search and App Store review links.

## App Store readiness checks
- Confirm every page opens without an account at a stable `ashglogroup.company` URL.
- Verify the support form still submits correctly and the legal pages clearly identify ASH, contact channels, account deletion, Mobile Money availability, and user-generated-content safeguards.
- Check the four pages at phone and desktop sizes, then confirm the current build is healthy.

## Technical details
- Reuse the current ASH design tokens, logo, bilingual preference controls, and existing support-ticket service.
- Use TanStack public routes and per-page metadata; no payment, wallet, referral, booking, or account logic will be changed.
