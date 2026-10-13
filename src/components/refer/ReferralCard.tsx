import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { referralLink } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export function CopyReferralButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const { t } = useI18n();

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(t("referral.copied"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy. Please copy the link manually.");
    }
  }

  return (
    <Button onClick={copy} className="w-full sm:w-auto">
      {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {copied ? t("referral.copied") : (label ?? t("referral.copy"))}
    </Button>
  );
}

export function ReferralCard({ code, active }: { code: string; active: boolean }) {
  const link = referralLink(code);
  const { t } = useI18n();

  async function share() {
    const shareData = {
      title: "Join Refer",
      text: "Join Refer and start earning through referrals.",
      url: link,
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        /* user dismissed */
      }
      return;
    }
    await navigator.clipboard.writeText(link);
    toast.success(t("referral.copied"));
  }

  return (
    <section className="surface-card p-5 sm:p-6">
      <h2 className="text-lg font-bold text-foreground">{t("referral.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {active
          ? "Share this link. You earn on three levels of your network."
          : "Activate your account to start earning commissions from this link."}
      </p>

      <div className="mt-4 rounded-xl bg-muted p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("profile.referralCode")}
        </p>
        <p className="tabular mt-1 text-lg font-bold text-primary">{code}</p>
      </div>

      <p className="mt-3 break-all rounded-xl border border-border bg-background p-3 text-sm text-muted-foreground">
        {link}
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <CopyReferralButton value={link} />
        <Button variant="outline" onClick={share} className="w-full sm:w-auto">
          <Share2 className="size-4" aria-hidden />
          {t("referral.share")}
        </Button>
      </div>
    </section>
  );
}
