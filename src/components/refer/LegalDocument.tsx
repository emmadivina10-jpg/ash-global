import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { PublicInfoShell } from "@/components/refer/PublicInfoShell";

export const LEGAL_UPDATED = "5 October 2026";
export const LEGAL_ENTITY = "ASH Global Technologies";
export const PRODUCT_NAME = "ASH Glo";
export const SUPPORT_EMAIL = "support@ashglogroup.company";
export const PRIVACY_EMAIL = "privacy@ashglogroup.company";

export function LegalPage({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <PublicInfoShell eyebrow={eyebrow} title={title} description={description}>
      <article className="space-y-9">{children}</article>
    </PublicInfoShell>
  );
}

export function LegalIntro({ children }: { children: ReactNode }) {
  return (
    <div className="border-b border-border pb-6 text-sm leading-7 text-muted-foreground">
      {children}
    </div>
  );
}

export function LegalSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <h2 className="text-lg font-semibold text-foreground sm:text-xl">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-muted-foreground">{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

export function LegalLinks() {
  return (
    <p className="border-t border-border pt-6 text-sm leading-7 text-muted-foreground">
      Related documents: <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>,{" "}
      <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>,{" "}
      <Link to="/community-guidelines" className="text-primary hover:underline">Community Guidelines</Link>,{" "}
      <Link to="/marketplace-policy" className="text-primary hover:underline">Marketplace &amp; Booking Policy</Link>,{" "}
      <Link to="/referral-wallet-terms" className="text-primary hover:underline">Referral &amp; Wallet Terms</Link>, and{" "}
      <Link to="/account-deletion" className="text-primary hover:underline">Account &amp; Data Deletion</Link>.
    </p>
  );
}