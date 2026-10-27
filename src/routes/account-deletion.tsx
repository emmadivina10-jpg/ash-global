import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicInfoShell } from "@/components/refer/PublicInfoShell";

export const Route = createFileRoute("/account-deletion")({
  head: () => ({
    meta: [
      { title: "Account & Data Deletion — ASH Glo" },
      {
        name: "description",
        content: "How to request ASH Glo account closure and how data is handled after review.",
      },
      { property: "og:title", content: "Account & Data Deletion — ASH Glo" },
      {
        property: "og:description",
        content: "Submit and understand an ASH Glo account-deletion request.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://ashglogroup.company/account-deletion" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://ashglogroup.company/account-deletion" }],
  }),
  component: AccountDeletionPage,
});

const steps = [
  [
    "Submit a request",
    "Sign in, open Menu → Settings → Account, and submit an account-deletion request. You can also contact official Support if you cannot access the account.",
  ],
  [
    "Administrative review",
    "Authorized Support staff verify the account and review pending balances, withdrawals, bookings, disputes, safety matters and other unresolved obligations.",
  ],
  [
    "Decision",
    "The request is approved or rejected with a review record. It may remain pending while an obligation or investigation is resolved.",
  ],
  [
    "Closure and data handling",
    "Permanent deletion is not available yet. New approvals are blocked while safe erasure and legally required retention are prepared; submitting a request does not erase the login account, files or personal data. Request follow-up from the privacy contact listed in the Privacy Policy.",
  ],
] as const;

export function AccountDeletionContent() {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        {steps.map(([title, copy], index) => (
          <div key={title} className="flex gap-4 border-b border-border pb-4 last:border-0">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {index + 1}
            </span>
            <div>
              <h2 className="font-semibold text-foreground">{title}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="border-y border-border py-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div>
            <h2 className="font-bold text-foreground">What deletion does not remove immediately</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Account closure does not erase another member’s independent copy of a message or
              records required for wallet and payment reconciliation, refunds, disputes, fraud
              prevention, safety, security or legal obligations. Fraud, abuse and safety-related
              records are retained for 24 months, unless longer retention is required for an active
              case or by law. There is no automatic 30-day deletion promise.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-sm leading-6 text-muted-foreground">
          Archiving or removing personal booking history does not delete bookings, payments or the
          other party’s history. Without signing in, use the public Support form, choose Account and
          give your account email and deletion request. Never send a password or private service
          code.
        </p>
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div>
            <h2 className="font-bold text-foreground">Personalization history</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              You can clear only your personalization activity and interest signals at any time in
              Settings without closing your account. This does not delete posts, comments, messages,
              bookings, wallet records, referrals or friendships.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div>
            <h2 className="font-bold text-foreground">Before submitting</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Save information you need, cancel eligible future bookings, and resolve pending
              withdrawals, balances or disputes. Do not submit a second request while one is
              pending.
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/delete-account">Request deletion without signing in</Link>
        </Button>
        <Button asChild>
          <Link to="/settings">Open Settings</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/support">
            <Mail className="size-4" aria-hidden />
            Contact Support
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link to="/privacy">Read Privacy Policy</Link>
        </Button>
      </div>
    </div>
  );
}

function AccountDeletionPage() {
  return (
    <PublicInfoShell
      eyebrow="Account and data choices"
      title="Account & Data Deletion"
      description="Account deletion is a request reviewed by ASH Global Technologies. It is not immediate or automatic."
    >
      <AccountDeletionContent />
    </PublicInfoShell>
  );
}
