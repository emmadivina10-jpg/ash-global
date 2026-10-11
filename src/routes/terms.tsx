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
  PRIVACY_EMAIL,
  SUPPORT_EMAIL,
} from "@/components/refer/LegalDocument";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — ASH Glo" },
      { name: "description", content: "Terms governing ASH Glo accounts, community features, services, payments, wallet, referrals, AI and Markets." },
      { property: "og:title", content: "Terms of Service — ASH Glo" },
      { property: "og:description", content: "The agreement governing access to and use of ASH Glo." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://ashglogroup.company/terms" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://ashglogroup.company/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage
      eyebrow={`Effective and updated ${LEGAL_UPDATED}`}
      title="Terms of Service"
      description="The agreement that applies when you create an account or use the ASH Glo platform."
    >
      <LegalIntro>
        These Terms are an agreement between you and {LEGAL_ENTITY}, the legal entity that operates ASH Glo. “ASH Glo” is
        the product and platform. By creating an account or using ASH Glo, you agree to these Terms and the related policies linked below.
      </LegalIntro>

      <LegalSection id="eligibility" title="1. Eligibility and accounts">
        <p>
          You must be at least 13 years old to use ASH Glo. If the law where you live requires parental or guardian consent
          for a person under the age of legal adulthood, you may use ASH Glo only with that consent. Some services, contracts,
          earning features, payments or identity checks may require you to be older or legally capable of entering the transaction.
        </p>
        <p>
          Provide accurate information, protect your credentials and use only accounts you are authorized to control. You are
          responsible for activity through your account. Contact Support promptly if you believe your account has been compromised.
        </p>
        <p>Reusing an active verified member’s name or exact profile-photo copy is denied and restricts access. More than three denied attempts results in a ban and sign-out. Identity restrictions can be restored only by authorized administrators or Trust &amp; Verification following review.</p>
      </LegalSection>

      <LegalSection id="platform" title="2. What ASH Glo provides">
        <p>
          ASH Glo combines social and communications features with discovery of independent services, providers, jobs,
          freelance opportunities, events, deals, products and property listings. It also offers optional referrals, wallet records,
          educational Markets content and ASH AI. Features and payment methods vary by account, region and availability.
        </p>
        <p>
          Except where a screen expressly says otherwise, members and providers—not {LEGAL_ENTITY}—create listings and deliver
          the underlying real-world services, work, events, products or opportunities. Providers are independent and are responsible
          for their offers, qualifications, licences where required, taxes, safety and legal compliance.
        </p>
      </LegalSection>

      <LegalSection id="content" title="3. Your content and community conduct">
        <p>
          You retain ownership of content you create. You grant {LEGAL_ENTITY} a worldwide, non-exclusive, royalty-free licence
          to host, reproduce, process, display and distribute that content only as needed to operate, protect and promote ASH Glo,
          including making content available to the audiences and surfaces you select. This licence ends when the content is deleted,
          except for copies reasonably required for legal, safety, backup or integrity purposes.
        </p>
        <p>
          Follow the <Link to="/community-guidelines" className="text-primary hover:underline">Community Guidelines</Link>.
          Illegal, sexually exploitative, hateful, harassing, violent, fraudulent, impersonating, spam, privacy-invasive or unsafe
          content is prohibited. Never publish content that exploits, sexualizes or endangers a minor.
        </p>
        <p>
          Available controls let members report content and block accounts. Automated systems screen previews of submitted media;
          explicit content can be blocked and create a moderation case. Authorized staff may review reports and restrictions.
          We may remove content, restrict features or close accounts. Fraud, abuse and safety-related records are retained for 24 months,
          unless a longer period is required to resolve a case or comply with law.
        </p>
      </LegalSection>

      <LegalSection id="marketplace" title="4. Marketplace, bookings and payments">
        <LegalPaymentDisclosure />
        
        <p>
          The <Link to="/marketplace-policy" className="text-primary hover:underline">Marketplace, Services, Booking &amp; Refund Policy</Link>
          governs listings, provider duties, booking status, cancellations, disputes and refunds. Booking requests require provider
          acceptance and any required payment confirmation. Refunds are not automatic and are reviewed case by case.
        </p>
        <p>
          Available payment methods are shown at checkout. Supported Mobile Money transactions are processed through TchokoPay.
          Where card payments are offered through Stripe-hosted Checkout, Stripe processes card information on its hosted payment page.
          ASH Glo may receive transaction references, payment status, amounts, currency and related booking information to support
          payment confirmation, refunds, fraud prevention and dispute handling. ASH Glo does not receive or store full card numbers
          or card security codes through this hosted Checkout flow. We do not receive or store Mobile Money PINs.
        </p>
        <p>
          {LEGAL_ENTITY} retains transaction and accounting records needed to administer bookings, wallet entries, referrals,
          commissions, withdrawals, refunds and financial reconciliation. Applicable fees are disclosed in the relevant checkout
          flow or transaction record. Payment confirmation, provider acceptance, cancellations, refunds and provider settlements
          are subject to the applicable Marketplace, Services, Booking &amp; Refund Policy and Referral &amp; Wallet Terms.
        </p>
      </LegalSection>

      <LegalSection id="wallet" title="5. Referrals, wallet and withdrawals">
        <p>
          The <Link to="/referral-wallet-terms" className="text-primary hover:underline">Referral &amp; Wallet Terms</Link> apply.
          The wallet is a platform ledger, not a bank, savings or investment account. Referral rewards are conditional, not guaranteed
          income, and may be corrected or reversed administratively for failed, refunded, duplicate, disputed or abusive activity.
          Withdrawal availability, methods, minimums and status are shown in ASH Glo.
        </p>
      </LegalSection>

      <LegalSection id="ai" title="6. ASH AI and automated systems">
        <p>
          ASH AI can answer questions using messages and images you choose to submit and selected ASH Glo account context relevant
          to the request, which may include profile, wallet, referral, provider, booking, listing and property information. Requests
          are processed through an AI service supporting ASH Glo. ASH AI can be inaccurate and does not replace professional, legal,
          medical, financial or emergency advice. Do not send secrets or information you do not have permission to share.
        </p>
        <p>
          Separate automated image screening assists content moderation. Automated outcomes may prevent publication or create a
          review case. Members can contact Support to request review of a restriction. See the Privacy Policy for more detail.
        </p>
      </LegalSection>

      <LegalSection id="markets" title="7. ASH Markets and FX Analytics">
        <p>
          ASH Markets and FX Analytics provide general educational and informational content, including clearly labelled demo values.
          They do not provide personalized investment advice, trading signals, guaranteed results, brokerage, custody or trade execution.
          Verify market information independently and seek qualified advice appropriate to your circumstances before making financial decisions.
        </p>
      </LegalSection>

      <LegalSection id="investment-preview" title="ASH Investment preview">
        <p>The member ASH Investment chart is an inactive illustration. Its moving lines are decorative, not a live company price, valuation, investment recommendation or invitation to invest. Currency and period controls do not trade, accept investments or change funds. Private staff shareholder records are separate.</p>
      </LegalSection>

      <LegalSection id="verification" title="8. Verification">
        <p>
          Some features may ask for a government ID and selfie/face image for manual verification. Submission does not mean that
          verification is complete. No external KYC provider is claimed unless one is identified in the relevant flow. A badge indicates
          only that the checks described by ASH Glo were completed; it is not a guarantee of identity, licensing, skill, safety or conduct.
        </p>
      </LegalSection>

      <LegalSection id="acceptable-use" title="9. Acceptable use">
        <LegalList items={[
          "Do not scrape, reverse engineer, disrupt, probe or bypass platform safeguards or access controls.",
          "Do not use ASH Glo for money laundering, fraud, fake reviews, fake referrals, spam, unauthorized advertising or unlawful transactions.",
          "Do not upload malware, misuse another person’s data or intellectual property, or evade fees and restrictions.",
          "Do not use ASH AI, Markets or social features to deceive, harass, exploit or cause harm.",
        ]} />
      </LegalSection>

      <LegalSection id="closure" title="10. Suspension, closure and deletion requests">
        <p>
          You may submit an <Link to="/account-deletion" className="text-primary hover:underline">account-deletion request</Link>.
          The request is reviewed by authorized staff and may be delayed or rejected while outstanding balances, withdrawals,
          bookings, disputes, investigations or legal obligations are resolved. Approval currently closes the account; data is then
          handled according to the Privacy Policy and applicable retention obligations. Submission does not cause immediate or automatic deletion.
        </p>
        <p>{LEGAL_ENTITY} may restrict or close an account that violates these Terms, another policy, the rights of others or applicable law.</p>
      </LegalSection>

      <LegalSection id="disclaimers" title="11. Disclaimers and responsibility">
        <p>
          ASH Glo is provided on an “as available” basis. To the extent permitted by law, {LEGAL_ENTITY} does not guarantee uninterrupted
          access, the conduct or identity of members, listing accuracy, provider quality, employment, earnings, event outcomes, property
          ownership, market data or AI output. Nothing in these Terms excludes a right or liability that cannot legally be excluded.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="12. Changes and contact">
        <p>
          We may update these Terms when the platform, law or our practices change. The effective date will be updated and material
          changes may be communicated in the app or through available account contact details. Continued use after the effective date means acceptance where permitted by law.
        </p>
        <p>
          Support: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>. Privacy questions:{" "}
          <a href={`mailto:${PRIVACY_EMAIL}`} className="text-primary hover:underline">{PRIVACY_EMAIL}</a>. We do not publish a physical legal address at this time.
        </p>
      </LegalSection>

      <LegalLinks />
    </LegalPage>
  );
}
