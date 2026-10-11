import { createFileRoute, Link } from "@tanstack/react-router";
import {
  LEGAL_ENTITY,
  LEGAL_UPDATED,
  LegalIntro,
  LegalLinks,
  LegalList,
  LegalPage,
  LegalSection,
  PRIVACY_EMAIL,
  SUPPORT_EMAIL,
} from "@/components/refer/LegalDocument";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — ASH Glo" },
      {
        name: "description",
        content: "How ASH Global Technologies collects, uses, shares, protects, retains and deletes data in ASH Glo.",
      },
      { property: "og:title", content: "Privacy Policy — ASH Glo" },
      {
        property: "og:description",
        content: "ASH Glo privacy, AI, personalization, payments, location, verification and deletion practices.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://ashglogroup.company/privacy" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://ashglogroup.company/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage
      eyebrow={`Effective and updated ${LEGAL_UPDATED}`}
      title="Privacy Policy"
      description="How ASH Glo collects, uses, shares, protects, retains and deletes personal information."
    >
      <LegalIntro>
        {LEGAL_ENTITY} is responsible for the personal information described in this Policy and operates the ASH Glo
        product and platform. This Policy applies to the website, mobile apps, social and messaging features, services
        marketplace, payments, wallet, referrals, ASH AI, Markets, verification and support tools.
      </LegalIntro>

      <LegalSection id="age" title="1. Age">
        <p>
          ASH Glo is for users aged 13 and older. Where local law requires parental or guardian consent for a younger
          user, the user may access ASH Glo only with that consent. Some transactions, earning features, identity checks
          and contracts may require an older age or legal capacity. Contact us if you believe a child below the
          applicable minimum has provided personal information.
        </p>
      </LegalSection>

      <LegalSection id="collection" title="2. Information we collect">
        <LegalList
          items={[
            "Account and profile information, such as user ID, name, email, phone number, birthday, profile photo, biography, city, country, language, account status and verification status.",
            "Content and communications, including posts, photos, Stories/Status, Spotlight, comments, replies, reactions, reviews, groups, messages, reports, blocks, support requests and related metadata.",
            "Commerce information, including services, provider profiles, products, jobs, freelance projects, events, deals and property listings; booking details; prices; status history; and dispute evidence.",
            "Transaction and accounting information required for payments, wallet, referrals, commissions, activation, withdrawals and reconciliation, including payment provider, amount, currency, transaction reference, booking reference and transaction status. For card payments through Stripe-hosted Checkout, Stripe processes card information on its checkout page. ASH Glo may receive related transaction and payment-status information. ASH Glo does not receive or store full card numbers or card security codes through this hosted Checkout flow. We do not receive or store Mobile Money PINs.",
            "Verification information where applicable, including private government-ID and selfie/face files, application answers, review status and reviewer notes. Submission is manually reviewed and is not a claim of completed external KYC.",
            "Device and technical information needed to run and secure the service, such as session, browser or app information, request and error data, notification token and security events. Restricted security records can include raw IP addresses, user-agent strings, device/access fingerprints, approximate IP-derived city/country/coordinates, access timestamps and audited restrictions.",
            "Profile-photo file and decoded-pixel fingerprints used to detect exact JPG/PNG copies of an active verified member’s photo; denied identity attempts and account restriction/restoration records. This matching is not facial recognition and does not reliably detect cropped, resized or edited copies.",
            "For nearby discovery, coordinates resolve a city on the device; personalization receives a cached city/country when enabled. Separately, opt-in active booking tracking transmits and stores precise coordinates, accuracy and update time so booking parties can see each other. Authorized security staff can access active trip locations for safety review. Sharing records are cleared when the booking ends; you can stop sharing through booking controls or device permissions.",
          ]}
        />
      </LegalSection>

      <LegalSection id="personalization" title="3. Activity and personalized recommendations">
        <p>
          ASH Glo records meaningful activity in <strong className="text-foreground">activity_events</strong>, including
          impressions, views, viewing time where appropriate, reactions, comments, replies, reposts, saves, shares,
          searches, profile and provider views, service/category/listing interactions, bookings, follows, friend
          requests, group interactions and reports or hides as negative feedback. Search tracking records
          privacy-minimized information such as query length rather than the full search text where implemented.
        </p>
        <p>
          From this activity, <strong className="text-foreground">user_interest_signals</strong> can summarize weighted,
          time-decayed interests such as categories, hashtags, creators, content types, surfaces and permitted city or
          country signals.
          <strong className="text-foreground"> content_popularity</strong> stores aggregated discovery signals.{" "}
          <strong className="text-foreground">recommendation_prefs</strong>
          stores your choices about personalization, activity history and city use. Activity weights and directions are
          calculated by the backend, not supplied by users.
        </p>
        <p>
          In Settings you can turn personalized recommendations off, turn activity-history use off, turn city use off,
          or clear personalization history. Clearing removes activity events and derived interest signals covered by
          that control; it does not delete posts, comments, messages, bookings, wallet records, referrals, friendships
          or other account data. Raw activity events are scheduled for deletion after 180 days, while older signals lose
          influence through time decay and derived data is refreshed. Raw events are private from other members;
          authorized administrators can access them for platform administration, security and support. Current Feed,
          Stories/Status, Spotlight and Services ordering may continue using their existing non-personalized or
          relationship-based ordering until a personalized ranker is connected.
        </p>
      </LegalSection>

      <LegalSection id="use" title="4. How we use information">
        <LegalList
          items={[
            "Create, authenticate, maintain and secure accounts.",
            "Display profiles and member content to the audiences and surfaces selected by the user.",
            "Provide messages, notifications, friends, groups, discovery, search and personalized recommendations where enabled.",
            "Create and manage bookings, payments, wallet entries, referral commissions, withdrawals, disputes and financial reconciliation.",
            "Review provider and instructor applications, identity materials and account eligibility.",
            "Operate ASH AI and automated media screening, respond to support, investigate reports, prevent fraud and enforce policies.",
            "Measure reliability, diagnose errors, improve performance and comply with legal obligations.",
          ]}
        />
      </LegalSection>

      <LegalSection id="ai" title="5. ASH AI and automated content screening">
        <p>
          When you use ASH AI, the service sends your selected messages and up to two submitted images, together with a
          limited recent conversation and relevant ASH Glo account context, to a Google AI model through the Lovable AI
          Gateway. Context can include profile, wallet, referral, provider, booking, listing and property information.
          The inspected assistant function does not itself save a separate server-side conversation history, although
          your request is transmitted for processing and the provider may process operational request data.
        </p>
        <p>
          For media safety, a resized preview—not the original file—of a submitted image is sent to the same AI service
          for classification. High-confidence explicit content is blocked and recorded as a moderation case; uncertain
          or reported content may be reviewed by authorized staff. Automated results can be wrong. Contact Support to
          request review of a restriction.
        </p>
      </LegalSection>

      <LegalSection id="staff-ai" title="Staff account and security review">
        <p>Authorized staff AI can process limited account, booking, access and audit information needed for their role. Staff conversations and generated reports may be saved in restricted records, separately from the member assistant. AI suggestions do not establish a security certification or replace authorized human review.</p>
      </LegalSection>

      <LegalSection id="sharing" title="6. When information is shared">
        <LegalList
          items={[
            "With other members according to the feature used—for example public or selected-audience profiles, posts, listings, reviews, group activity and messages to recipients.",
            "With TchokoPay for MTN MoMo and Orange Money collection/disbursement in Cameroon (XAF). M-PESA is not integrated. Transaction outcomes must be verified; a pending prompt is not confirmed payment.",
            "With Stripe for eligible provider hosted bank-account onboarding, identity/capability checks and available payout processing. This is separate from card checkout; direct saved-card withdrawals and automatic provider transfers are not enabled.",
            "With map/directions services for booking maps and route estimates. Tile requests can reveal your IP and requested map area to the map provider; routes use relevant party locations. Precise sharing is optional and separate from approximate IP-based security location.",
            "With Stripe when customers choose card payments through Stripe-hosted Checkout, to process payments and support transaction confirmation, refunds, fraud prevention and dispute handling. Stripe processes payment information under its applicable terms and privacy policy. ASH Glo may receive transaction references, payment status, amounts, currency and related booking information, but does not receive or store full card numbers or card security codes through the hosted Checkout flow.",
            "With the AI service supporting ASH AI and media screening for the processing described above.",
            "With hosting, storage, notification, email and technical service providers needed to run and secure ASH Glo.",
            "With authorities or other parties when reasonably necessary to comply with law, protect people and rights, investigate abuse, or defend legal claims.",
          ]}
        />
        <p>
          We do not sell personal information. We do not claim that any service provider stores or uses data beyond the
          functions verified and described here.
        </p>
      </LegalSection>

      <LegalSection id="device-storage" title="7. Device storage, diagnostics and tracking">
        <p>
          ASH Glo uses local storage on your device for items such as authentication state, language, theme, onboarding
          choices, sound and interface preferences, selected currency, payout-reminder choices, Compass visibility/position and cached location choices. Authentication and service delivery may also use session cookies. No advertising SDK was identified in reviewed app code. Technical request, error, reliability and security information may
          still be processed to operate and protect the service. ASH Glo does not use this information for cross-app
          advertising tracking.
        </p>
      </LegalSection>

      <LegalSection id="visibility" title="8. Visibility and member choices">
        <p>
          Content visibility depends on the feature. Other members may see profile details, verification badge,
          approximate presence, posts, Stories/Status, Spotlight, comments, reviews, listings and group activity where
          the product displays them. Direct messages are limited to conversation participants and authorized safety
          access. Verification files are stored privately and are available only to the applicant and authorized
          reviewers through controlled access.
        </p>
        <p>
          You can edit available profile fields, manage personalization and city settings, block members, report
          content, delete eligible content, and manage notification or location permissions through ASH Glo or device
          settings. A block does not erase information that must remain for safety, disputes or legal obligations.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="9. Retention">
        <p>
          We keep information only as long as needed for the purpose collected and the safeguards or obligations
          described here.
        </p>
        <LegalList
          items={[
            "Raw personalization activity events are scheduled for deletion after 180 days and may be cleared sooner through Settings.",
            "Stories/Status are designed to expire after 24 hours; an automated cleanup removes expired records and associated media. Temporary or backup copies may persist until systems rotate them.",
            "Fraud, abuse, reports, blocks, moderation and safety-related records are retained for 24 months, unless longer retention is required for an active case or by law.",
            "Account, content, booking, message, wallet, referral, transaction, withdrawal, dispute, verification and support records are retained while the account or feature is active and afterward only as needed for closure, financial reconciliation, disputes, safety, security and applicable legal obligations.",
            "No unverified universal deletion deadline or financial-record retention period is promised by this Policy.",
          ]}
        />
      </LegalSection>

      <LegalSection id="deletion" title="10. Account and data deletion">
        <p>
          An account-deletion submission is a request, not immediate deletion. Authorized staff review it and may
          require pending balances, withdrawals, bookings, disputes, investigations or other obligations to be resolved.
          Approval currently closes the profile account. Data is then deleted, anonymized, restricted or retained
          according to its purpose and the retention rules above. See{" "}
          <Link to="/account-deletion" className="text-primary hover:underline">
            Account &amp; Data Deletion
          </Link>{" "}
          for the exact flow.
        </p>
      </LegalSection>

      <LegalSection id="security" title="11. Security">
        <p>
          ASH Glo uses access controls, private storage for sensitive verification media, row-level database rules,
          signed access links, provider callback verification and administrative role restrictions. No system is
          perfectly secure. Use a unique password, protect your device and never send a password, one-time code, Mobile
          Money PIN or card security code to another member or Support.
        </p>
      </LegalSection>

      <LegalSection id="rights" title="12. Access, correction and questions">
        <p>
          Depending on applicable law, you may request access, correction, export, restriction, objection or deletion of
          personal information. Some requests may require identity verification and some records cannot be removed
          immediately for the reasons described above. Use the{" "}
          <Link to="/support" className="text-primary hover:underline">
            official support form
          </Link>{" "}
          or contact{" "}
          <a href={`mailto:${PRIVACY_EMAIL}`} className="text-primary hover:underline">
            {PRIVACY_EMAIL}
          </a>
          . This address is the privacy contact and is not described as a formally appointed data protection officer.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="13. Changes and contact">
        <p>
          We may update this Policy when ASH Glo, the law or our practices change. The effective date will be updated
          and material changes may be communicated through the app or available account contact details. General support
          is available at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">
            {SUPPORT_EMAIL}
          </a>
          . We do not publish a physical legal business address at this time.
        </p>
      </LegalSection>

      <LegalLinks />
    </LegalPage>
  );
}
