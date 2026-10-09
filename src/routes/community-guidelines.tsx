import { createFileRoute, Link } from "@tanstack/react-router";
import {
  LEGAL_ENTITY,
  LEGAL_UPDATED,
  LegalIntro,
  LegalLinks,
  LegalList,
  LegalPage,
  LegalSection,
  SUPPORT_EMAIL,
} from "@/components/refer/LegalDocument";

export const Route = createFileRoute("/community-guidelines")({
  head: () => ({
    meta: [
      { title: "Community Guidelines — ASH Glo" },
      { name: "description", content: "Rules for safe, authentic participation in the ASH Glo community." },
      { property: "og:title", content: "Community Guidelines — ASH Glo" },
      {
        property: "og:description",
        content: "Rules for posts, Stories, Spotlight, messages, reviews and marketplace content.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://ashglogroup.company/community-guidelines" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://ashglogroup.company/community-guidelines" }],
  }),
  component: CommunityGuidelinesPage,
});

function CommunityGuidelinesPage() {
  return (
    <LegalPage
      eyebrow={`Effective and updated ${LEGAL_UPDATED}`}
      title="Community Guidelines"
      description="The standards for safe, respectful and authentic participation on ASH Glo."
    >
      <LegalIntro>
        These Guidelines apply to profiles, Feed posts, Stories/Status, Spotlight, comments, replies, reviews, messages,
        groups, listings and every other contribution to ASH Glo. They form part of the Terms of Service between you and{" "}
        {LEGAL_ENTITY}.
      </LegalIntro>

      <LegalSection id="respect" title="1. Be respectful and safe">
        <p>Do not post, request, promote or send:</p>
        <LegalList
          items={[
            "harassment, threats, bullying, stalking, humiliation or targeted abuse;",
            "hate speech or attacks based on protected or personal characteristics;",
            "graphic violence, encouragement of self-harm, or credible threats of harm;",
            "sexual exploitation, non-consensual intimate content, sexually explicit content, or any content that sexualizes or endangers a minor;",
            "another person’s private or identifying information without permission;",
            "dangerous, illegal, fraudulent or deceptive activity.",
          ]}
        />
      </LegalSection>

      <LegalSection id="authenticity" title="2. Be authentic">
        <LegalList
          items={[
            "Do not impersonate a person, business, provider or ASH representative.",
            "Do not reuse an active verified account’s name or profile photo. Detected attempts may be marked Denied and access may be restricted. Repeated or deliberate attempts, including a fourth denied attempt, may result in account suspension or termination and sign-out. An identity restriction may be reviewed by an authorized administrator or Trust & Verification. Photo comparison currently detects exact JPG/PNG file or decoded-pixel copies; it may not detect cropped, resized or otherwise edited variants.",
            "Do not create fake accounts, buy or manipulate engagement, publish fabricated reviews, or coordinate fake referrals.",
            "Do not misrepresent qualifications, identity checks, prices, availability, ownership, work history or results.",
            "Verification badges indicate only the checks described in the relevant ASH flow; they are not guarantees of skill, safety, ownership or future conduct.",
          ]}
        />
      </LegalSection>

      <LegalSection id="commerce" title="3. Keep commerce professional">
        <LegalList
          items={[
            "Listings must be accurate, current and lawful, with clear prices and material conditions.",
            "Do not offer prohibited goods, unlawful services, scams, counterfeit items, misleading investments or guaranteed financial returns.",
            "Providers and customers must communicate honestly, keep appointments where reasonably possible and use the booking and payment status shown in ASH Glo.",
            "Report suspicious listings or requests for unusual payments. Before paying a property owner or agent, inspect the property where possible and independently verify the person’s authority and ownership. ASH Glo does not collect rent, deposits or property sale proceeds, and users should take appropriate care before making payments outside the platform.",
          ]}
        />
      </LegalSection>

      <LegalSection id="markets" title="4. Markets and educational content">
        <p>
          ASH Markets and FX Analytics are for general information and education. Do not present content as guaranteed,
          risk-free, personalized investment advice, managed trading, or an offer to execute a trade through ASH Glo.
          Instructors must disclose uncertainty and avoid fabricated performance claims.
        </p>
      </LegalSection>

      <LegalSection id="moderation" title="5. Reporting, blocking and moderation">
        <p>
          Members can use available report and block controls. Reports may include the reported content, account
          details, reason and supporting information and are reviewed by authorized staff. Automated checks screen
          previews of newly submitted images for explicit content. A high-confidence explicit result can block
          publication and create a moderation case; uncertain or reported material may be held for review. Automated
          checks can make mistakes.
        </p>
        <p>
          Depending on severity, context, repetition and applicable requirements, {LEGAL_ENTITY} may remove or limit
          content, restrict features, suspend or close an account, preserve relevant evidence, or make a report where
          required. Members may ask Support to review an automated restriction. Fraud, abuse and safety records are
          generally retained for 24 months unless a longer period is needed to resolve a case or comply with law, as
          described in the Privacy Policy.
        </p>
      </LegalSection>

      <LegalSection id="appeals" title="6. Appeals and contact">
        <p>
          To appeal a restriction or report urgent safety concerns, use the{" "}
          <Link to="/support" className="text-primary hover:underline">
            official support form
          </Link>{" "}
          or email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">
            {SUPPORT_EMAIL}
          </a>
          . Include the relevant content or account reference, but never send a password, verification code or Mobile
          Money PIN. Appeals are reviewed in context; submitting an appeal does not guarantee that a restriction will be
          removed.
        </p>
      </LegalSection>

      <LegalLinks />
    </LegalPage>
  );
}
