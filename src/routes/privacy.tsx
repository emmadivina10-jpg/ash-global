import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicInfoShell } from "@/components/refer/PublicInfoShell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — ASH Glo" },
      {
        name: "description",
        content:
          "How ASH Glo collects, uses, shares and protects your personal data across the marketplace, referral programme, payments and mobile apps.",
      },
      { property: "og:title", content: "Privacy Policy — ASH Glo" },
      {
        property: "og:description",
        content:
          "Data we collect, why we use it, who we share it with, how long we keep it and the rights you have.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://ashglogroup.company/privacy" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://ashglogroup.company/privacy" }],
  }),
  component: PrivacyPage,
});

const LAST_UPDATED = "16 September 2026";
const EFFECTIVE = "16 September 2026";
const APP_VERSION = "1.0";
const PRIVACY_EMAIL = "privacy@ashglogroup.company";
const SUPPORT_EMAIL = "support@ashglogroup.company";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <h2 className="text-lg font-semibold text-foreground sm:text-xl">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
        <thead>
          <tr className="bg-muted/60">
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-semibold text-foreground">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("|")} className="border-t border-border/60 align-top">
              {row.map((cell, i) => (
                <td key={i} className="px-3 py-2 text-muted-foreground">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function PrivacyPage() {
  return (
    <PublicInfoShell
      eyebrow="Your data, clearly explained"
      title="Privacy Policy"
      description="How ASH collects, uses, shares and protects information across our website and mobile apps."
    >
      <article className="space-y-10">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
          <p className="text-sm text-muted-foreground">
            Effective: {EFFECTIVE} · Last updated: {LAST_UPDATED} · Applies to ASH Glo app version {APP_VERSION} (iOS
            and Android) and the ASH Glo website
          </p>
        </div>

        <Section id="who-we-are" title="1. Who we are">
          <p>
            ASH Glo (“ASH Glo”, “we”, “us”) operates a digital marketplace and referral platform
available at https://ashglogroup.company and as the mobile app “ASH Glo”.
          </p>
          <Bullets
            items={[
              "Data controller: ASH Glo, Douala, Cameroon.",
              `Privacy contact: ${PRIVACY_EMAIL}`,
              "Support: https://ashglogroup.company",
            ]}
          />
          <p>
            This policy explains what personal data we collect, why, who we share it with, how long we
            keep it and what rights you have.
          </p>
        </Section>

        <Section id="scope" title="2. Scope">
          <p>This policy covers:</p>
          <Bullets
            items={[
              "the ASH Glo web app and the iOS and Android apps;",
              "account creation, marketplace browsing, bookings, messaging and reviews;",
              "the referral programme and commission ledger;",
              "wallet balances, payment collection and payouts.",
            ]}
          />
          <p>
            It does not cover third-party sites or services you reach from ASH Glo (for example a
            provider’s own social media), or how a service provider you book handles information you
            give them offline.
          </p>
        </Section>

        <Section id="data-we-collect" title="3. Data we collect">
          <h3 className="text-sm font-semibold text-foreground">3.1 Data you give us</h3>
          <Table
            head={["Category", "Examples", "Why"]}
            rows={[
              [
                "Account identity",
                "Full name, email address, phone number, password (hashed by our authentication provider, never stored in plain text)",
                "Create your account, sign you in, secure it and contact you about your bookings, payments and payouts",
              ],
              [
                "Account / user identifiers",
                "Your ASH Glo account ID, profile ID, provider ID, referral code, booking and transaction references",
                "Link your data to your account, attribute referrals, reconcile payments and provide support",
              ],
              [
                "Profile",
                "Display name, business name, avatar photo, bio, city/region, service areas, categories",
                "Show your profile to the people you deal with and match you with providers in your area",
              ],
              [
                "Provider content",
                "Service listings, prices, availability slots, portfolio photos and videos, storefront details, property and event listings",
                "Publish your storefront and listings in the marketplace",
              ],
              [
                "Referral data",
                "Referral code you enter at sign-up, the referral link you share, your position in the referral network",
                "Attribute referrals and calculate commissions",
              ],
              [
                "Booking and service information",
                "Service requested, date and time, address or meeting details you supply, notes, status history, cancellations, reviews",
                "Create, deliver, support and settle bookings between clients and providers",
              ],
              [
                "Messages and chat content",
                "Text and attachments you send in ASH Glo conversations, and the questions you send the in-app ASH Assistant",
                "Enable communication between clients, providers and support, and answer assistant requests",
              ],
              [
                "Social posts, Spotlight stories and comments",
                "Photos you post to the ASH feed, the Spotlight stories you publish (which expire after 24 hours), captions, comments and replies, likes, reposts, who viewed your story, and your friend and group memberships",
                "Run the ASH social feed, Spotlight stories, comment threads, friend requests and group chats, and recommend posts to people likely to find them relevant",
              ],
              [
                "Camera and photo library access",
                "Photos or snapshots you choose to capture or upload — including pictures you send to the ASH Assistant so it can answer a question about them",
                "Only used for the upload or assistant request you started; never accessed in the background",
              ],
              [
                "Reviews and other user-generated content",
                "Rating, review text, review photos, whether the review is tied to a completed booking, reports you file",
                "Community trust, moderation and safety",
              ],
              [
                "Financial information",
                "Wallet balance, earnings, referral commissions, transaction history, invoices, platform fees, withdrawal requests and their status",
                "Run your wallet and earnings ledger, pay you, charge platform fees, prevent fraud and meet accounting obligations",
              ],
              [
                "Payout details",
                "Mobile Money number (MTN MoMo / Orange Money)",
                "Send your withdrawals to the destination you choose",
              ],
              [
                "Support",
                "Your name, email, category, subject and the message you send us in-app or by email",
                "Answer you and keep a record of the issue",
              ],
            ]}
          />

          <h3 className="pt-2 text-sm font-semibold text-foreground">3.2 Collected automatically</h3>
          <Table
            head={["Category", "Examples"]}
            rows={[
              [
                "Device and diagnostics",
                "Device platform (iOS, Android, web), app version, language, time zone and crash/error diagnostics. If you enable notifications, the push token issued by Apple or Google is stored so we can deliver booking, message and payment alerts.",
              ],
              [
                "App usage",
                "Actions you take that the product needs to record: listing and storefront view counts, booking and payment status changes, notification reads, and support/rate-limit timestamps. Search terms you type are used to run the search and are not stored against your profile.",
              ],
              [
                "Location",
                "Only if you tap “use my location” and grant the permission, your device supplies your coordinates. They are used on your device to work out your nearest city and rank nearby providers, and are kept in your device's local storage. We do not transmit or store your GPS coordinates on our servers, and we never track your location in the background. You can decline and simply type your city instead.",
              ],
              ["Network", "IP address, request logs and rate-limit counters, used for abuse prevention (IP addresses are stored only as a salted hash in the throttling counters)"],
              ["Security", "Sign-in events, session tokens, and audit records of privileged and financial actions"],
            ]}
          />

          <h3 className="pt-2 text-sm font-semibold text-foreground">3.3 From third parties</h3>
          <Bullets
            items={[
              "Social sign-in (Google, Apple): your name, email and a provider user ID, if you sign in that way. Apple’s “Hide My Email” relay is supported.",
              "Our licensed Mobile Money processor: transaction status, reference, amount, currency, masked payment identifiers and payout status.",
              "No data brokers. We do not buy personal data, we do not run third-party advertising or analytics SDKs, and we do not use the advertising identifier (IDFA/AAID).",
            ]}
          />

          <h3 className="pt-2 text-sm font-semibold text-foreground">3.4 No tracking, no targeted advertising</h3>
          <p>
            ASH Glo does <strong className="text-foreground">not</strong> use your personal information to track you
            across other companies’ apps or websites, does not sell or share it for cross-context behavioural
            advertising, and does not serve targeted ads. There is no advertising SDK, no analytics SDK and no data
            broker in the app. Promotions you see inside ASH Glo are placed by ASH providers and are matched only to
            the city or category you are already browsing.
          </p>


          <h3 className="pt-2 text-sm font-semibold text-foreground">3.5 What we never store</h3>
          <p>
            We never receive or store your Mobile Money PIN. Bank transfers and card payments are not currently
            available. From our licensed payment processor, we receive only a payment reference and status.
          </p>

          <h3 className="pt-2 text-sm font-semibold text-foreground">3.6 Children</h3>
          <p>
            ASH Glo is not intended for anyone under 18. We do not knowingly collect data from
            children. If we learn we have, we delete it — contact {PRIVACY_EMAIL}.
          </p>
        </Section>

        <Section id="why" title="4. Why we use your data, and our legal basis">
          <Table
            head={["Purpose", "Legal basis"]}
            rows={[
              ["Create your account, authenticate you, keep sessions secure", "Performance of a contract"],
              ["Show listings, rank nearby providers, run search and discovery", "Contract / legitimate interests"],
              ["Process bookings and the messages attached to them", "Contract"],
              ["Collect the one-time activation payment and booking payments", "Contract"],
              ["Verify payments and reconcile them against your account", "Contract / legal obligation"],
              ["Calculate, record and pay referral commissions across three levels", "Contract"],
              [
                "Review and execute withdrawals to Mobile Money",
                "Contract / legal obligation (AML, fraud prevention)",
              ],
              [
                "Detect fraud, self-referral, abuse and duplicate accounts; rate limiting",
                "Legitimate interests / legal obligation",
              ],
              ["Keep financial and security audit logs", "Legal obligation"],
              [
                "Send transactional notifications (booking accepted, payment confirmed, payout sent)",
                "Contract",
              ],
              ["Send marketing messages", "Consent — withdrawable at any time"],
              ["Improve the product and fix crashes", "Legitimate interests"],
              ["Comply with tax, accounting and lawful requests", "Legal obligation"],
            ]}
          />
          <p>
            We do not use your data for automated decisions that produce legal effects on you.
            Commission calculation is a deterministic rule (level 1 / 2 / 3 amounts), not profiling.
          </p>
        </Section>

        <Section id="payments" title="5. Payment verification and the referral ledger">
          <p>Because ASH Glo moves money, some processing is unavoidable and is described here explicitly:</p>
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              <strong className="text-foreground">Activation.</strong> A one-time activation fee unlocks
              earning. We create a payment reference and pass your phone number and amount to our Mobile
              Money processor.
            </li>
            <li>
              <strong className="text-foreground">Verification.</strong> The processor confirms the
              payment through a signed server-to-server callback. We verify that signature before
              crediting anything. Unverified callbacks are rejected and logged.
            </li>
            <li>
              <strong className="text-foreground">Ledger entry.</strong> Each verified payment writes an
              immutable ledger record: amount, currency, reference, status, timestamp and the account it
              belongs to.
            </li>
            <li>
              <strong className="text-foreground">Commission attribution.</strong> When your account
              activates, the system walks up to three levels of the referral chain and writes a
              commission entry for each eligible upline member. Referrers must themselves be active to
              earn.
            </li>
            <li>
              <strong className="text-foreground">Payout review.</strong> Withdrawal requests are
              reviewed by an authorised administrator before payment. Reviewers see the amount,
              destination and account history — enough to detect fraud, and no more.
            </li>
            <li>
              <strong className="text-foreground">Retention.</strong> Financial records are retained for
              the statutory accounting period even after you close your account (see section 9).
            </li>
          </ol>
          <p>
            Your network is not public. Members see aggregate counts and earnings for their own
            branches; member identities below level 1 are not exposed.
          </p>
        </Section>

        <Section id="sharing" title="6. Who we share data with">
          <p>
            We do not sell your personal data and we do not share it with advertisers. These are the only
            third parties that receive data, and each receives only what its role requires:
          </p>
          <Table
            head={["Recipient", "Role", "Data it receives"]}
            rows={[
              [
                "Supabase (via Lovable Cloud)",
                "Processor — database, authentication and file storage",
                "Account and profile data, listings, bookings, messages, reviews, wallet and ledger records, uploaded photos and videos",
              ],
              [
                "TchokoPay",
                "Processor — Mobile Money collection (MTN MoMo, Orange Money) and payouts",
                "Name, phone number, amount, currency and payment reference",
              ],
              [
                "Lovable (hosting and platform)",
                "Processor — application hosting, edge delivery and transactional email sending",
                "IP address and request metadata; for email, your email address and the message content",
              ],
              [
                "Lovable AI Gateway (Google Gemini model)",
                "Processor — powers the in-app ASH Assistant",
                "Only the questions you type into the assistant and minimal account context. Please do not paste payment credentials or other sensitive data into the assistant.",
              ],
              [
                "Apple / Google",
                "Independent controllers — sign-in, app distribution and push notification delivery",
                "Sign-in identifiers (if you use Apple or Google sign-in) and your device push token",
              ],
              ["Advisers, auditors, law enforcement", "As required by law", "Only what is legally necessary"],
            ]}
          />
          <p>
            We do not use any advertising network, attribution SDK or third-party analytics provider. The usage
            figures in the app (views, bookings, earnings) are calculated from our own database.
          </p>
          <p>
            Between users: when you book a provider (or a client books you), the other party sees your
            display name, avatar, the booking details and your messages. Reviews you publish are visible
            to everyone, attributed to your display name.
          </p>
        </Section>

        <Section id="transfers" title="7. International transfers">
          <p>
            Our processors operate outside Cameroon. Where data leaves Cameroon or the EEA we rely on
            the processor’s contractual safeguards (including Standard Contractual Clauses where
            applicable) and on their published security certifications. Contact us for details on a
            specific transfer.
          </p>
        </Section>

        <Section id="security" title="8. How we protect your data">
          <Bullets
            items={[
              "Encryption in transit (TLS) and at rest.",
              "Row-level security on every database table: policies restrict each record to its owner, the counterparty in a booking, or an authorised administrator. Privileged database functions are restricted to service roles.",
              "Passwords are hashed by our authentication provider; we never see them.",
              "Private storage buckets for avatars and portfolio media, served through short-lived signed URLs with per-object visibility checks.",
              "Signature verification on every payment webhook; replayed or unsigned callbacks are rejected.",
              "Rate limiting on public endpoints and storefronts.",
              "A security audit log for privileged and financial actions, plus automated regression tests confirming anonymous users cannot read protected tables.",
              "Role-based admin access; administrative roles are stored separately from user profiles to prevent privilege escalation.",
            ]}
          />
          <p>
            No system is perfectly secure. If a breach affects your rights we will notify you and the
            competent authority without undue delay.
          </p>
        </Section>

        <Section id="retention" title="9. How long we keep data">
          <Table
            head={["Data", "Retention"]}
            rows={[
              ["Account and profile", "While your account is open"],
              ["Bookings, reviews, messages", "While your account is open, then 12 months"],
              [
                "Financial records (payments, commissions, withdrawals, ledger)",
                "10 years from the transaction, as required by accounting and tax law — retained even after account deletion",
              ],
              ["Security and audit logs", "24 months"],
              ["Marketing consent records", "Until withdrawn, plus 3 years"],
              ["Backups", "Rolling, deleted within 90 days"],
            ]}
          />
        </Section>

        <Section id="rights" title="10. Your rights">
          <p>You can:</p>
          <Bullets
            items={[
              "Access the data we hold about you;",
              "Correct inaccurate data (most fields are editable in Settings);",
              "Delete your account — Settings → Delete account. This removes your profile, listings, media and messages. Financial ledger entries are retained in pseudonymised form for the statutory period, and pending withdrawals must be settled first;",
              "Export your data in a portable format;",
              "Object to or restrict processing based on legitimate interests;",
              "Withdraw consent at any time (location and notification permissions in your device settings; marketing via the unsubscribe link);",
              "Complain to the competent Cameroonian authority (the data protection authority designated under Law No. 2024/017) or, for EEA/UK users, your local supervisory authority.",
            ]}
          />
          <p>
            Requests: {PRIVACY_EMAIL}. We respond within 30 days and may ask you to verify your
            identity.
          </p>
        </Section>

        <Section id="cookies" title="11. Cookies and similar technologies">
          <Bullets
            items={[
              "Strictly necessary storage: session tokens, your language (EN/FR) and theme (light/dark) preference. No consent required.",
              "No advertising cookies. No cross-site tracking. No third-party ad SDKs.",
            ]}
          />
          <p>
            The mobile app uses local storage for the same purposes and does not use the advertising
            identifier (IDFA/AAID).
          </p>
        </Section>

        <Section id="store-disclosures" title="12. App Store and Google Play privacy disclosures">
          <p>
            This is what ASH Glo declares on Apple’s App Privacy form and Google Play’s Data Safety form for app
            version {APP_VERSION}. All of it is <strong className="text-foreground">linked to your identity</strong>,
            because the app is account-based:
          </p>
          <Table
            head={["Data type", "Collected", "Purpose"]}
            rows={[
              ["Contact info — name, email address, phone number", "Yes", "App functionality, account management, customer support"],
              ["Identifiers — account/user ID", "Yes", "App functionality, account management, fraud prevention"],
              [
                "User content — photos, videos, listings, reviews, messages and other content you create",
                "Yes",
                "App functionality (storefronts, bookings, chat), customer support, safety and moderation",
              ],
              [
                "Financial info — wallet balance, earnings, commissions, transaction and payout information",
                "Yes",
                "App functionality (payments, wallet, withdrawals), fraud prevention, legal and accounting obligations",
              ],
              [
                "Purchases / bookings — services requested, schedule, status",
                "Yes",
                "App functionality, customer support",
              ],
              [
                "Location — precise location",
                "Not collected by us",
                "Used only on your device, with your permission, to find your nearest city and rank nearby providers. Coordinates are not sent to or stored on our servers.",
              ],
              [
                "Usage data — product interaction such as views, bookings and notification activity",
                "Yes",
                "App functionality and analytics of your own account activity; never for advertising",
              ],
              ["Diagnostics — crash and performance data", "Yes", "App functionality and stability"],
              [
                "Search history, browsing history, contacts, health, sensitive info, advertising data",
                "No",
                "Not collected",
              ],
            ]}
          />
          <Bullets
            items={[
              "Used for tracking across other companies’ apps or websites: none.",
              "Used for third-party advertising or targeted advertising: none.",
              "Data sold or shared for advertising: none.",
              "Account deletion: available in-app under Settings → Delete account, and on the public web page ashglogroup.company/account-deletion.",
              "Data encrypted in transit: yes. Messages are encrypted in transit and at rest on our infrastructure; ASH Glo does not currently offer end-to-end encrypted chat, so we do not claim it.",
              "Bank withdrawals: not available. Payouts run to Mobile Money only; bank transfers are marked as a coming-soon feature in the app.",
            ]}
          />
        </Section>

        <Section id="safety" title="13. User content, safety and children">
          <p>
            ASH Glo hosts user-generated content: storefront photos and videos, service descriptions,
            reviews, social posts, Spotlight stories, comments and private chat. We apply a zero-tolerance policy to objectionable content and
            abusive behaviour, set out in section 3 of our{" "}
            <Link to="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>
            .
          </p>
          <Bullets
            items={[
              "Every profile, portfolio item, review, social post, comment and chat thread can be reported in-app with the flag control.",
              "Authors can switch on a comment filter for any post they publish; comments that our moderation check flags as abusive are then blocked before they appear.",
              "Any user can block another user instantly; blocked users can no longer send them messages.",
              "Reports reach the ASH Trust & Safety team and are reviewed within 24 hours; breaching content is removed and accounts suspended or terminated.",
              "Newly submitted images and video previews are automatically screened for explicit nudity before publication. High-confidence violations are deleted immediately and the account is restricted pending human review; uncertain media remains unpublished for review.",
              "Members may appeal an automated restriction through Support. Only authorized Trust & Safety administrators can uphold or remove a restriction, and deleted explicit media is not restored.",
              "ASH Glo is an 18+ service. We do not knowingly collect data from children; child sexual abuse and exploitation material is prohibited, removed and reported to the competent authorities. Contact privacy@ashglogroup.company for child-safety concerns.",
            ]}
          />
          <p>
            You can delete your account at any time from Settings in the app, or through{" "}
            <Link to="/account-deletion" className="text-primary hover:underline">
              our account deletion page
            </Link>
            .
          </p>
        </Section>

        <Section id="changes" title="14. Changes to this policy">
          <p>
            We will post any change here and update the “Last updated” date. For material changes we
            will notify you in the app or by email before they take effect.
          </p>
        </Section>

        <Section id="contact" title="15. Contact">
          <Bullets
            items={["ASH Glo, Douala, Cameroon", `Email: ${PRIVACY_EMAIL}`, "Support: https://ashglogroup.company"]}
          />
        </Section>
      </article>
    </PublicInfoShell>
  );
}
