import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicInfoShell } from "@/components/refer/PublicInfoShell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — ASH Glo" },
      {
        name: "description",
        content:
          "ASH Glo terms of service and end-user licence agreement: marketplace rules, payments, fees, user content, zero-tolerance policy and account termination.",
      },
      { property: "og:title", content: "Terms of Service — ASH Glo" },
      {
        property: "og:description",
        content: "Marketplace rules, payments and fees, user content policy and account termination.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://ashglogroup.company/terms" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://ashglogroup.company/terms" }],
  }),
  component: TermsPage,
});

const LAST_UPDATED = "16 September 2026";
const SUPPORT_EMAIL = "support@ashglogroup.company";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <h2 className="text-lg font-semibold text-foreground sm:text-xl">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function TermsPage() {
  return (
    <PublicInfoShell
      eyebrow={`Effective 16 September 2026 · Updated ${LAST_UPDATED}`}
      title="Terms of Service & End-User Licence"
      description="The rules that protect ASH members, providers and the community across our website and mobile apps."
    >
      <header className="mb-8 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          These terms are the agreement between you and ASH Global Technologies (&ldquo;ASH Glo&rdquo;, &ldquo;we&rdquo;)
          covering the ASH Glo website and the ASH Glo mobile apps distributed through the Apple App Store and Google
          Play. By creating an account, browsing the marketplace or paying for a service you accept them.
        </p>
      </header>

      <div className="space-y-8">
        <Section id="service" title="1. What ASH Glo is">
          <p>
            ASH Glo is a marketplace that connects customers with independent real-world service providers — braiders,
            barbers, nail and lash technicians, electricians, nurses and other professionals — and lets them chat,
            book, pay and review. ASH Glo also runs an optional referral programme in supported countries.
          </p>
          <p>
            Providers are independent businesses, not employees or agents of ASH Glo. We are not a party to the service
            contract between a customer and a provider; we provide the platform, payment rails and dispute support.
          </p>
        </Section>

        <Section id="eligibility" title="2. Eligibility and accounts">
          <p>
            You must be at least 18 years old to create an ASH Glo account. You are responsible for keeping your
            credentials secure and for everything done through your account. Provide accurate information — false
            identity, business or payout details lead to suspension.
          </p>
        </Section>

        <Section id="content" title="3. User content and zero-tolerance policy">
          <p>
            You keep ownership of the photos, videos, service descriptions, social posts, Spotlight stories, comments,
            chat messages and reviews you post, and you grant ASH Glo a worldwide, non-exclusive licence to host and
            display that content inside the product.
          </p>
          <p>
            ASH social features — the photo feed, comments and replies, likes and reposts, friend requests, group chats
            and Spotlight stories that disappear after 24 hours — are for real members only. Fake accounts, bought
            engagement and impersonation are prohibited. Video posting is not available in the feed at this time. If you
            publish a post you may switch on its comment filter; ASH will then block comments an automated check finds
            abusive, and you remain responsible for moderating your own threads.
          </p>
          <p className="font-medium text-foreground">
            There is zero tolerance for objectionable content or abusive behaviour. You may not post or send content
            that is illegal, sexually explicit, hateful, harassing, violent, fraudulent, impersonating, spam, or that
            depicts or endangers minors.
          </p>
          <p>
            Every profile, portfolio item, review, social post, comment, story and chat message can be reported from inside the app using the flag
            control, and any user can block another user immediately. Reports are reviewed by the ASH Trust &amp; Safety
            team within 24 hours; content that breaches this policy is removed and the account is suspended or
            terminated without refund. Repeat or severe breaches are reported to the competent authorities.
          </p>
          <p>
            ASH automatically screens newly submitted images and video previews before publication. High-confidence
            explicit nudity is deleted immediately and the account is restricted until an authorized administrator
            reviews the case. Uncertain media is not published. You may appeal a restriction through Support.
          </p>
        </Section>

        <Section id="bookings" title="4. Bookings, payments and fees">
          <p>
            Bookings are made in the app. Providers accept or decline; customers pay after acceptance within the stated
            window. Payments are currently processed through Mobile Money (MTN MoMo and Orange Money) by our licensed
            payment partner. Bank transfers and card payments are not available yet. ASH Glo never stores your Mobile Money PIN.
          </p>
          <p>
            ASH Glo charges providers a 1% platform commission on completed marketplace transactions. Referral
            programme fees, where offered, are shown before payment. Withdrawals from your ASH wallet are paid to Mobile
            Money; bank transfers are shown in the app as a coming-soon feature and are not available yet. All prices are shown inclusive of the fees that
            apply to you before you confirm.
          </p>
          <p>
            Everything sold through ASH Glo is a real-world service or physical product delivered outside the app, so
            in-app purchases are not used. Refunds and disputes are handled case by case; contact{" "}
            <a className="text-primary hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>{" "}
            within 7 days of the booking.
          </p>
        </Section>

        <Section id="conduct" title="5. Acceptable use">
          <p>
            Do not misuse the platform: no scraping, reverse engineering, security probing, spam, money laundering,
            circumventing fees by moving payment off-platform, or creating fake reviews, fake accounts or fake
            referrals. Referral rewards obtained through fraud are reversed.
          </p>
        </Section>

        <Section id="termination" title="6. Suspension, termination and deletion">
          <p>
            You can delete your account at any time from Settings inside the app, or by visiting{" "}
            <Link to="/account-deletion" className="text-primary hover:underline">
              ashglogroup.company/account-deletion
            </Link>
            . We may suspend or terminate accounts that breach these terms, the law or store policies.
          </p>
        </Section>

        <Section id="warranty" title="7. Disclaimers and liability">
          <p>
            The platform is provided &ldquo;as is&rdquo;. ASH Glo does not guarantee the quality, safety or legality of
            services offered by providers, and to the extent permitted by law our aggregate liability is limited to the
            fees you paid to ASH Glo in the three months before the claim.
          </p>
        </Section>

        <Section id="stores" title="8. App store terms">
          <p>
            The mobile apps are licensed, not sold, to you for personal, non-transferable use on devices you own or
            control. Apple and Google are not responsible for the app or its content, have no obligation to provide
            support or maintenance, and are third-party beneficiaries of this licence with the right to enforce it. You
            confirm you are not located in a country subject to an applicable embargo and are not on a prohibited-party
            list.
          </p>
        </Section>

        <Section id="law" title="9. Governing law and contact">
          <p>
            These terms are governed by the laws of the Republic of Cameroon. Questions, complaints and legal notices:{" "}
            <a className="text-primary hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <p className="pt-4 text-sm text-muted-foreground">
          See also our{" "}
          <Link to="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </PublicInfoShell>
  );
}
