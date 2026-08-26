import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Building2, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { getPayoutAccount, getPayoutDashboardLink, startPayoutOnboarding } from "@/lib/payouts.functions";
import { SectionCard } from "@/components/refer/cards";
import { Button } from "@/components/ui/button";

/**
 * Bank payouts via Stripe Connect. Onboarding and the payout dashboard both
 * live on Stripe, so no bank credentials ever touch ASH.
 */
export function PayoutAccountCard({ country }: { country: string }) {
  const fetchAccount = useServerFn(getPayoutAccount);
  const startOnboarding = useServerFn(startPayoutOnboarding);
  const dashboardLink = useServerFn(getPayoutDashboardLink);
  const [busy, setBusy] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["payout-account"],
    queryFn: () => fetchAccount({ data: undefined as never }),
  });

  if (isLoading) return null;
  if (!data?.configured) return null;

  async function connect() {
    setBusy(true);
    const result = await startOnboarding({
      data: { returnUrl: `${window.location.origin}/withdraw`, country },
    }).catch(() => null);
    setBusy(false);
    if (!result?.url) {
      toast.error("We could not open Stripe onboarding. Please try again.");
      void refetch();
      return;
    }
    window.location.href = result.url;
  }

  async function openDashboard() {
    setBusy(true);
    const result = await dashboardLink({ data: undefined as never }).catch(() => null);
    setBusy(false);
    if (!result?.url) {
      toast.error("Payout dashboard is not available yet.");
      return;
    }
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  const ready = data.payoutsEnabled;

  return (
    <SectionCard title="Bank account (international payouts)">
      <div className="flex flex-wrap items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Building2 className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          {ready ? (
            <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <ShieldCheck className="size-4 text-primary" aria-hidden />
              Bank payouts are active
            </p>
          ) : (
            <p className="text-sm font-semibold text-foreground">
              {data.accountId ? "Finish verifying your bank account" : "Add a bank account for payouts"}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {ready
              ? "Choose “Bank account” below to withdraw earnings straight to your bank."
              : "Your details are entered securely on Stripe — ASH never sees your bank credentials."}
          </p>
          {!ready && data.requirementsDue.length > 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Still needed: {data.requirementsDue.slice(0, 3).join(", ")}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            {ready ? (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => void openDashboard()}>
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ExternalLink className="size-4" aria-hidden />}
                Payout dashboard
              </Button>
            ) : (
              <Button size="sm" disabled={busy} onClick={() => void connect()}>
                {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                {data.accountId ? "Continue verification" : "Connect bank account"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
