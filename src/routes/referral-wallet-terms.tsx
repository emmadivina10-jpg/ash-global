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

export const Route = createFileRoute("/referral-wallet-terms")({
  head: () => ({
    meta: [
      { title: "Referral & Wallet Terms — ASH Glo" },
      {
        name: "description",
        content:
          "Terms for ASH Glo referrals, activation, commissions, wallet records and withdrawals.",
      },
      { property: "og:title", content: "Referral & Wallet Terms — ASH Glo" },
      {
        property: "og:description",
        content: "Rules for referral rewards, wallet balances and supported withdrawals.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://ashglogroup.company/referral-wallet-terms" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://ashglogroup.company/referral-wallet-terms" }],
  }),
  component: ReferralWalletTermsPage,
});

function ReferralWalletTermsPage() {
  return (
    <LegalPage
      eyebrow={`Effective and updated ${LEGAL_UPDATED}`}
      title="Referral & Wallet Terms"
      description="How eligibility, referral attribution, wallet records and withdrawals work on ASH Glo."
    >
      <LegalIntro>
        These terms apply to the optional referral and wallet features made available by{" "}
        {LEGAL_ENTITY} through ASH Glo. Availability, amounts, fees, countries, payment methods and
        minimums are those displayed in the app when you use the feature.
      </LegalIntro>

      <LegalSection id="eligibility" title="1. Eligibility and availability">
        <p>
          Referral earning is available only in supported regions and to accounts that meet the
          status and activation requirements shown in ASH Glo. Access to other ASH Glo features does
          not guarantee eligibility to earn, withdraw or receive a particular payment method.
        </p>
      </LegalSection>

      <LegalSection id="activation" title="Optional referral activation">
        <p>
          Referral earning is region-gated to Cameroon and Nigeria. Optional activation costs 5,000
          XAF, not a general registration fee. The current activation screen accepts supported
          Mobile Money or eligible XAF wallet funds, not direct card checkout. Card top-ups settled
          in another currency cannot automatically pay an XAF activation fee.
        </p>
      </LegalSection>

      <LegalSection id="referrals" title="2. Referral attribution and rewards">
        <LegalList
          items={[
            "A referral is attributed using a valid referral code or link recorded during the supported registration flow.",
            "The current programme can calculate rewards across up to three referral levels for eligible activated accounts.",
            "The amount and eligibility rules displayed in the app at the relevant time control; rewards are not guaranteed income.",
            "A pending or displayed amount may be corrected or reversed when a payment fails, is refunded, duplicated, disputed, unauthorized or linked to abuse.",
          ]}
        />
      </LegalSection>

      <LegalSection id="prohibited" title="3. Prohibited referral conduct">
        <p>
          Self-referral, duplicate or fake accounts, misleading income claims, paid or coerced
          sign-ups, identity misuse, automated registrations and manipulation of payment or referral
          records are prohibited. {LEGAL_ENTITY} may hold, reverse or remove affected rewards and
          restrict an account while the matter is reviewed.
        </p>
      </LegalSection>

      <LegalSection id="wallet" title="4. Wallet records">
        <LegalPaymentDisclosure />
        <p>
          One wallet has a currency dropdown: Mobile Money funds are recorded in XAF; desktop website card top-ups
          use the gross amount and currency actually settled into ASH’s Stripe balance, not
          necessarily your card’s country or billing currency. Selecting a currency does not
          exchange money; unfunded currencies show zero. The Money flow chart summarizes recorded
          completed movements, not a bank statement or investment forecast.
        </p>
        <p>
          The ASH wallet is an account ledger showing eligible balances, earnings, commissions,
          adjustments, transactions and withdrawal status. It is not a bank account, deposit
          account, savings product or investment product. Wallet values do not earn interest.
        </p>
        <p>
          {LEGAL_ENTITY} retains transaction and accounting information needed to operate and
          reconcile the wallet, referral, booking and withdrawal systems. If the display conflicts
          with a verified provider callback or ledger record, the verified record controls and
          Support can review the discrepancy.
        </p>
      </LegalSection>

      <LegalSection id="withdrawals" title="5. Withdrawals">
        <p>
          XAF Mobile Money funds use MTN/Orange through TchokoPay where supported, with a 100 XAF minimum.
          Mobile card/bank withdrawals are unavailable and coming soon. On the desktop website, card-funded
          balances use the matching-currency Stripe bank route, with a minimum of 1 currency
          unit, subject to provider eligibility, funding and execution controls. Stripe collections
          cannot fund TchokoPay withdrawals; balances are not converted between rails.
        </p>
        <p>
          Desktop website Stripe bank setup is shown only to approved providers and depends on identity requirements
          and account capabilities. Hosted onboarding collects requirements currently due; more may
          be requested later. Ineligible customers do not gain a bank withdrawal destination by
          topping up by card. Direct withdrawal to a saved card and automatic provider transfers are
          not currently enabled. A credited balance does not guarantee an immediately available
          withdrawal. No instant payout or automatic e-Transfer is promised.
        </p>
        <p>
          Supported withdrawal methods, destinations, minimums and fees are shown before submission.
          Mobile Money withdrawals use TchokoPay where supported. Withdrawal requests are reviewed
          by authorized staff and may remain pending while ASH Glo checks account status,
          destination information, available balance, duplicates, fraud indicators or unresolved
          obligations.
        </p>
        <p>
          A withdrawal may be declined, delayed or returned when information is incorrect, the
          provider rejects it, funds are not available, a legal restriction applies, or account
          review is required. Never provide ASH Glo with a Mobile Money PIN or card security code.
        </p>
      </LegalSection>

      <LegalSection id="closure" title="6. Disputes and account closure">
        <p>
          Report an incorrect wallet or referral entry through{" "}
          <Link to="/support" className="text-primary hover:underline">
            Support
          </Link>{" "}
          or{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">
            {SUPPORT_EMAIL}
          </a>
          . A pending balance, withdrawal, dispute, refund, chargeback or accounting obligation may
          prevent immediate completion of an account-deletion request. Required transaction and
          accounting records may remain after closure as described in the Privacy Policy.
        </p>
      </LegalSection>

      <LegalLinks />
    </LegalPage>
  );
}
