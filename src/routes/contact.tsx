import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, LifeBuoy, LockKeyhole, Mail, MessageSquareWarning, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicInfoShell } from "@/components/refer/PublicInfoShell";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact ASH Glo — Help, Privacy & Safety" },
      {
        name: "description",
        content: "Contact ASH Global Technologies for ASH Glo account help, payments, privacy, safety, partnerships and legal questions.",
      },
      { property: "og:title", content: "Contact ASH Glo — Help, Privacy & Safety" },
      { property: "og:description", content: "Official contact channels for ASH members and App Store reviewers." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://ashglogroup.company/contact" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://ashglogroup.company/contact" }],
  }),
  component: ContactPage,
});

const CONTACTS = [
  {
    icon: LifeBuoy,
    title: "Account & payment support",
    copy: "Bookings, card/Stripe payments, MTN/Orange Money, supported withdrawals, verification, access or technical help.",
    email: "support@ashglogroup.company",
  },
  {
    icon: LockKeyhole,
    title: "Privacy & data requests",
    copy: "Access, correction, export, consent, account deletion or privacy questions.",
    email: "privacy@ashglogroup.company",
  },
  {
    icon: MessageSquareWarning,
    title: "Trust & safety",
    copy: "Report impersonation, abuse, harmful content or an urgent account-security concern.",
    email: "support@ashglogroup.company",
  },
  {
    icon: Building2,
    title: "Business enquiries",
    copy: "Partnerships, provider opportunities, events and commercial enquiries.",
    email: "support@ashglogroup.company",
  },
] as const;

function ContactPage() {
  return (
    <PublicInfoShell
      eyebrow="Official contact"
      title="Contact ASH Glo"
      description="These are the official channels for contacting ASH Global Technologies about the ASH Glo platform."
      wide
    >
      <div className="grid gap-4 md:grid-cols-2">
        {CONTACTS.map(({ icon: Icon, title, copy, email }) => (
          <article key={title} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-6">
            <span className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Icon className="size-5" aria-hidden />
            </span>
            <h2 className="mt-4 text-lg font-bold text-foreground">{title}</h2>
            <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{copy}</p>
            <Button asChild variant="outline" className="mt-5 w-full justify-start">
              <a href={`mailto:${email}`}>
                <Mail className="size-4" aria-hidden />
                {email}
              </a>
            </Button>
          </article>
        ))}
      </div>

      <section className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div>
            <h2 className="font-bold text-foreground">For the fastest help</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Include your ASH Glo account email and any booking or transaction reference. Never send your password, Mobile Money PIN, full card credentials or verification code.
            </p>
          </div>
        </div>
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/support">Open support form</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/account-deletion">Account deletion</Link>
        </Button>
      </div>
    </PublicInfoShell>
  );
}