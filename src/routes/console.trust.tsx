import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck } from "lucide-react";
import { getMarketplaceHealth } from "@/lib/workforce.functions";
import { LoadingState } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SafetyActivity } from "@/components/console/SafetyActivity";

export const Route = createFileRoute("/console/trust")({
  ssr: false,
  component: TrustPage,
});

function TrustPage() {
  const load = useServerFn(getMarketplaceHealth);
  const { data, isLoading } = useQuery({ queryKey: ["console", "marketplace-health"], queryFn: load });

  if (isLoading) return <LoadingState label="Loading verification queue…" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold text-foreground">Trust & Verification</h2>
          <p className="text-sm text-muted-foreground">
            Review storefronts and award the ASH verified badge so clients transact safely.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/console/providers">
            <ShieldCheck className="size-4" aria-hidden />
            Approve in Providers
          </Link>
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-bold text-foreground">Awaiting verification</p>
        <ul className="mt-3 space-y-2">
          {(data?.unverified ?? []).length === 0 ? (
            <li className="text-xs text-muted-foreground">Every storefront has been reviewed.</li>
          ) : (
            (data?.unverified ?? []).map((provider) => (
              <li key={provider.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-foreground">{provider.business_name}</span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{provider.city ?? "—"}</span>
                  <Badge className="rounded-full border-0 bg-muted text-[10px] text-muted-foreground">
                    {provider.verification_status}
                  </Badge>
                </span>
              </li>
            ))
          )}
        </ul>
      </div>

      <SafetyActivity />
    </div>
  );
}
