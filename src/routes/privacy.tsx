import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/refer/Logo";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — ASH Glo REFER" },
      {
        name: "description",
        content:
          "How ASH Glo REFER collects, uses, shares and protects your personal data across the marketplace, referral programme, payments and mobile apps.",
      },
      { property: "og:title", content: "Privacy Policy — ASH Glo REFER" },
      {
        property: "og:description",
        content:
          "Data we collect, why we use it, who we share it with, how long we keep it and the rights you have.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

const LAST_UPDATED = "26 August 2026";
const PRIVACY_EMAIL = "privacy@growrefer.app";

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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="inline-flex">
            <Logo />
          </Link>
          <Link to="/" className="text-sm font-medium text-primary hover:underline">
            Back to ASH Glo
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-10 px-4 py-10 sm:px-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">
            Last updated: {LAST_UPDATED} · Effective: {LAST_UPDATED}
          </p>
        </div>

        <Section id="who-we-are" title="1. Who we are">
          <p>
            ASH Glo REFER (“ASH Glo”, “we”, “us”) operates a digital marketplace and referral platform
            available at https://growrefer.app and as the mobile app “ASH Glo” (bundle ID
            app.growrefer.ashglo).
          </p>
          <Bullets
            items={[
              "Data controller: ASH Glo REFER, Douala, Cameroon.",
              `Privacy contact: ${PRIVACY_EMAIL}`,
              "Support: https://growrefer.app",
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
                "Full name, email address, phone number, password (hashed, never stored in plain text)",
                "Create and secure your account",
              ],
              [
                "Profile",
                "Display name, business name, avatar, bio, city/region, categories",
                "Show your profile and match you to nearby users",
              ],
              [
                "Provider content",
                "Service listings, prices, availability slots, portfolio photos, storefront details",
                "Publish your storefront",
              ],
              [
                "Referral data",
                "Referral code you enter at sign-up, referral link you share",
                "Attribute referrals and calculate commissions",
              ],
              ["Bookings", "Service requested, date/time, notes, status history", "Deliver and support bookings"],
              [
                "Messages",
                "Text and attachments you send in booking conversations",
                "Enable communication between client and provider",
              ],
              [
                "Reviews",
                "Rating, review text, whether it is tied to a completed booking",
                "Community trust",
              ],
              [
                "Payout details",
                "Mobile Money number (MTN MoMo / Orange Money), bank or Stripe Connect account identifiers",
                "Pay you",
              ],
              ["Support", "Anything you send us by email or in-app", "Answer you"],
            ]}
          />

          <h3 className="pt-2 text-sm font-semibold text-foreground">3.2 Collected automatically</h3>
          <Table
            head={["Category", "Examples"]}
            rows={[
              [
                "Device and app",
                "Device model, OS version, app version, language, time zone, crash diagnostics, push notification token",
              ],
              ["Usage", "Screens viewed, features used, search terms, timestamps"],
              [
                "Approximate location",
                "City/region derived from your device or IP — only if you grant location permission, used to rank nearby providers. You can decline and still use the app.",
              ],
              ["Network", "IP address, request logs, rate-limit counters (abuse prevention)"],
              ["Security", "Sign-in events, session tokens, audit records of privileged actions"],
            ]}
          />

          <h3 className="pt-2 text-sm font-semibold text-foreground">3.3 From third parties</h3>
          <Bullets
            items={[
              "Social sign-in (Google, Apple): your name, email and a provider user ID, if you sign in that way. Apple’s “Hide My Email” relay is supported.",
              "Payment processors: transaction status, reference, amount, currency, masked payment identifiers, payout status.",
              "No data brokers. We do not buy personal data, and we do not run third-party advertising SDKs.",
            ]}
          />

          <h3 className="pt-2 text-sm font-semibold text-foreground">3.4 What we never store</h3>
          <p>
            We never receive or store your Mobile Money PIN, your full card number, CVV or your bank
            login. Card details are entered directly with our payment processor. We only receive a
            reference and a status.
          </p>

          <h3 className="pt-2 text-sm font-semibold text-foreground">3.5 Children</h3>
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
                "Review and execute withdrawals to Mobile Money or bank",
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
          <p>We do not sell your personal data. We share it only with:</p>
          <Table
            head={["Recipient", "Role", "Data shared"]}
            rows={[
              [
                "Supabase",
                "Processor — database, authentication and storage",
                "Account, booking, message and ledger data",
              ],
              ["TchokoPay", "Processor — Mobile Money collection and payout", "Name, phone number, amount, reference"],
              [
                "Stripe (incl. Stripe Connect)",
                "Card payments and international payouts",
                "Name, email, payout account details, transaction data",
              ],
              ["Cloudflare", "Processor — hosting, CDN, DDoS protection", "IP address, request metadata"],
              [
                "Google / Apple",
                "Independent controllers — sign-in, app distribution, push delivery",
                "Sign-in identifiers, device push tokens",
              ],
              [
                "AI assistant provider",
                "Processor — powers the in-app Refer Assistant",
                "Your assistant messages and minimal account context. Do not paste sensitive data into the assistant.",
              ],
              ["Email delivery provider", "Processor — transactional email", "Email address, message content"],
              ["Advisers, auditors, law enforcement", "As required", "Only what is legally necessary"],
            ]}
          />
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

        <Section id="store-disclosures" title="12. Store privacy disclosures">
          <p>For Apple’s App Privacy and Google Play’s Data Safety forms, ASH Glo declares:</p>
          <Bullets
            items={[
              "Linked to you: contact info (name, email, phone), user content (photos, messages, reviews), identifiers (account ID), financial info (transaction history, payout destination), coarse location (optional), usage data, diagnostics.",
              "Used for tracking across apps or sites: none.",
              "Purposes: app functionality, analytics, and fraud prevention/security only.",
              "Data deletion: in-app account deletion is provided, plus a web request path at " + PRIVACY_EMAIL + ".",
              "Data encrypted in transit: yes.",
            ]}
          />
        </Section>

        <Section id="changes" title="13. Changes to this policy">
          <p>
            We will post any change here and update the “Last updated” date. For material changes we
            will notify you in the app or by email before they take effect.
          </p>
        </Section>

        <Section id="contact" title="14. Contact">
          <Bullets
            items={["ASH Glo REFER, Douala, Cameroon", `Email: ${PRIVACY_EMAIL}`, "Support: https://growrefer.app"]}
          />
        </Section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-3xl px-4 py-8 text-xs text-muted-foreground sm:px-6">
          © {new Date().getFullYear()} ASH Glo REFER. Refer. Earn. Discover. Grow.
        </div>
      </footer>
    </div>
  );
}
