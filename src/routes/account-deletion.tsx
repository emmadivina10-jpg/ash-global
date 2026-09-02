import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/refer/Logo";

export const Route = createFileRoute("/account-deletion")({
  head: () => ({
    meta: [
      { title: "Delete your ASH Glo account" },
      {
        name: "description",
        content:
          "How to delete your ASH Glo account and personal data from inside the app or by email, what is erased, what is retained for legal reasons and how long it takes.",
      },
      { property: "og:title", content: "Delete your ASH Glo account" },
      {
        property: "og:description",
        content: "Request deletion of your ASH Glo account and personal data in the app or by email.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountDeletionPage,
});

const PRIVACY_EMAIL = "privacy@ashglogroup.company";

function AccountDeletionPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <header className="mb-8 space-y-3">
        <Link to="/" className="inline-flex">
          <Logo />
        </Link>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Delete your ASH Glo account</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          App: <strong className="text-foreground">ASH Glo</strong> · Developer: ASH Global Technologies. You can delete
          your account and personal data at any time — you do not need to install the app to make the request.
        </p>
      </header>

      <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Option 1 — inside the app</h2>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Open ASH Glo and sign in.</li>
            <li>
              Go to <strong className="text-foreground">More → Settings</strong>.
            </li>
            <li>
              Scroll to <strong className="text-foreground">Delete account</strong>, add an optional reason and confirm.
            </li>
          </ol>
          <p>The request is logged immediately and processed within 30 days.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Option 2 — by email</h2>
          <p>
            Email{" "}
            <a className="text-primary hover:underline" href={`mailto:${PRIVACY_EMAIL}?subject=Delete%20my%20ASH%20Glo%20account`}>
              {PRIVACY_EMAIL}
            </a>{" "}
            from the address on your account with the subject &ldquo;Delete my ASH Glo account&rdquo;. We verify
            ownership, then delete.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">What is deleted</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Your login, profile, phone number, avatar and preferences</li>
            <li>Your storefront, services, portfolio photos and videos</li>
            <li>Your chat messages, reviews, referral links and referral network position</li>
            <li>Saved payout details and device push-notification tokens</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">What is retained, and for how long</h2>
          <p>
            Financial records of completed transactions (amount, date, reference, platform commission) are kept for{" "}
            <strong className="text-foreground">10 years</strong> to meet accounting, tax and anti-fraud obligations,
            and fraud/abuse records are kept for <strong className="text-foreground">5 years</strong>. These records are
            de-identified from your profile: they no longer carry your name, phone number or email.
          </p>
          <p>
            Deletion requests complete within <strong className="text-foreground">30 days</strong>. You receive an email
            confirmation once done.
          </p>
        </section>

        <p>
          More detail in our{" "}
          <Link to="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link to="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
