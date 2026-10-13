import { createFileRoute, Link } from "@tanstack/react-router";
import {
  LEGAL_ENTITY,
  LEGAL_UPDATED,
  LegalIntro,
  LegalLinks,
  LegalList,
  LegalPage,
  LegalPaymentDisclosure,
  LegalSection,
  SUPPORT_EMAIL,
} from "@/components/refer/LegalDocument";

export const Route = createFileRoute("/marketplace-policy")({
  head: () => ({
    meta: [
      { title: "Marketplace, Services, Booking & Refund Policy — ASH Glo" },
      {
        name: "description",
        content:
          "ASH Glo marketplace, provider, booking, cancellation, payment, dispute and refund rules.",
      },
      { property: "og:title", content: "Marketplace, Services, Booking & Refund Policy — ASH Glo" },
      {
        property: "og:description",
        content: "Rules for providers, customers, bookings, payments, cancellations and disputes.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://ashglogroup.company/marketplace-policy" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://ashglogroup.company/marketplace-policy" }],
  }),
  component: MarketplacePolicyPage,
});

function MarketplacePolicyPage() {
  return (
    <LegalPage
      eyebrow={`Effective and updated ${LEGAL_UPDATED}`}
      title="Marketplace, Services, Booking & Refund Policy"
      description="The rules for listing, booking, delivering and resolving real-world services and marketplace offers."
    >
      <LegalIntro>
        ASH Glo is a platform operated by {LEGAL_ENTITY}. It helps customers discover and contact
        independent providers, freelancers, organizers, employers, sellers and property listers.
        Unless a screen expressly says otherwise, the person publishing an offer is responsible for
        it.
      </LegalIntro>

      <LegalSection id="provider-role" title="1. Independent providers">
        <p>
          Providers are independent and are not employees or agents of {LEGAL_ENTITY}. They are
          responsible for their qualifications, licences where required, availability, pricing,
          descriptions, taxes, safe delivery, customer service and compliance with applicable law.
        </p>
        <p>
          ASH verification or profile badges describe completed platform checks only and do not
          guarantee service quality, professional licensing, ownership or future conduct.
        </p>
      </LegalSection>

      <LegalSection id="listings" title="2. Listings and offers">
        <LegalList
          items={[
            "Descriptions, images, prices, availability and material restrictions must be accurate and current.",
            "Providers must have the right to offer the service or publish the listing and to use all uploaded media.",
            "Prohibited, unsafe, deceptive, counterfeit, exploitative or illegal offers may be removed.",
            "Jobs, freelance projects, events, deals and property listings are member-posted opportunities; users must perform appropriate checks before agreeing or paying.",
          ]}
        />
      </LegalSection>

      <LegalSection id="booking" title="3. Booking flow">
        <p>
          A booking request is not confirmed until the provider accepts it and the payment status
          shown by ASH Glo is confirmed. The current flow gives a provider up to 24 hours to accept
          or decline. After acceptance, the customer generally has 24 hours to complete payment.
          Unanswered or unpaid requests may expire automatically. The app displays the controlling
          status and deadline for each booking.
        </p>
        <p>
          After verified payment, the customer sees the receipt and private service code; the
          provider does not see that code. Paid booking parties can access contact and tracking
          information and each can choose to share location. The provider records trip progress and
          enters the code supplied by the customer after service; server validation records
          completion. Payment alone does not complete service or prove payout.
        </p>
        <p>
          Customers must provide accurate scheduling and service details. Providers should not begin
          work unless the booking and payment status supports doing so.
        </p>
      </LegalSection>

      <LegalSection id="payment" title="4. Payments and fees">
        <LegalPaymentDisclosure />
        <p>
          The default booking commission is 15%; authorized CEO/Finance staff can select 12% or 15%.
          The rate saved at payment remains with that booking. Payment-link fees are separate at 1%.
          Automatic Stripe provider transfers are currently disabled: a verified service can
          authorize a held provider payable without proving money reached a bank.
        </p>
        <p>
          The quoted booking currency, Stripe checkout charge currency, card billing currency and
          platform settlement currency can differ. Review checkout before authorizing payment. Your
          issuer may apply exchange rates or fees; the wallet does not convert its recorded
          balances.
        </p>
        <p>
          Available payment methods are shown at checkout. Supported Mobile Money transactions are
          sent to TchokoPay using the phone number, provider/network, amount, currency and
          transaction reference needed to request and verify payment. Where card checkout is
          offered, it is handled through the displayed external checkout provider. ASH Glo does not
          receive or store Mobile Money PINs or full card credentials.
        </p>
        <p>
          ASH Glo retains transaction, booking, wallet and accounting records needed to confirm
          status, calculate platform fees, settle providers, handle disputes and reconcile provider
          callbacks. Any applicable fee is shown in the relevant flow or statement.
        </p>
      </LegalSection>

      <LegalSection id="cancellations" title="5. Cancellations, disputes and refunds">
        <p>
          A user may cancel where the current booking status allows it. A provider may decline a
          pending request. Once payment is confirmed or work has started, outcomes depend on the
          facts, service delivered, provider response and payment status. ASH Glo does not promise
          an automatic refund in every dispute.
        </p>
        <p>
          Submit a dispute promptly through{" "}
          <Link to="/support" className="text-primary hover:underline">
            Support
          </Link>{" "}
          or{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">
            {SUPPORT_EMAIL}
          </a>{" "}
          with the booking reference and relevant evidence. Authorized staff may review messages,
          status history, payment records and supplied evidence. Any approved refund is returned
          through an available method and may depend on provider processing times.
        </p>
      </LegalSection>

      <LegalSection id="property" title="6. Property, jobs and other introductions">
        <p>
          ASH Glo does not collect property rent, deposits or sale proceeds. Property locations may
          be approximate. Inspect the property, verify identity and authority, and do not send money
          before appropriate checks. Job and freelance users decide whether to contact or contract
          with each other; ASH Glo does not guarantee an employer, worker, project or outcome.
        </p>
      </LegalSection>

      <LegalSection id="reviews" title="7. Reviews and enforcement">
        <p>
          Reviews must reflect genuine experience and follow the{" "}
          <Link to="/community-guidelines" className="text-primary hover:underline">
            Community Guidelines
          </Link>
          . Fraud, manipulated reviews, off-platform payment evasion and repeated booking abuse may
          lead to content removal, feature restriction, reversed rewards or account closure.
        </p>
      </LegalSection>

      <LegalLinks />
    </LegalPage>
  );
}
