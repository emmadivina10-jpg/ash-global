import { createFileRoute, Link } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { useNetwork, useProfile } from "@/lib/queries";
import { SectionCard, StatCard } from "@/components/refer/cards";
import { EmptyState, SkeletonRows } from "@/components/refer/states";
import { ReferralCard } from "@/components/refer/ReferralCard";
import { Button } from "@/components/ui/button";
import { COMMISSIONS, formatXAF } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/network")({
  head: () => ({
    meta: [
      { title: "Referral network — Refer" },
      { name: "description", content: "See your level 1, 2 and 3 referral network and commissions earned." },
    ],
  }),
  component: NetworkPage,
});

function NetworkPage() {
  const { data, isLoading } = useNetwork();
  const { data: profile } = useProfile();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Referral Network</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your network across three levels. Member identities stay private.
        </p>
      </header>

      {isLoading ? (
        <SkeletonRows rows={3} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <StatCard label="Total Network" value={data?.total ?? 0} icon={<Users className="size-4" aria-hidden />} />
            <StatCard label="Direct Referrals" value={data?.direct ?? 0} accent icon={<Users className="size-4" aria-hidden />} />
          </div>

          {(data?.total ?? 0) === 0 ? (
            <EmptyState
              title="Your network is empty"
              description="Share your referral link to add your first member. Commissions are paid once they activate."
              action={
                <Button asChild>
                  <Link to="/dashboard">Get your referral link</Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              {(data?.levels ?? []).map((level) => (
                <SectionCard key={level.level}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-foreground">Level {level.level}</h2>
                    <span className="tabular rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                      {formatXAF(COMMISSIONS[level.level as 1 | 2 | 3])} each
                    </span>
                  </div>
                  <dl className="mt-4 space-y-3 text-sm">
                    <Row label="Members" value={String(level.members)} />
                    <Row label="Active members" value={String(level.active)} />
                    <Row label="Commissions generated" value={formatXAF(level.commissions)} highlight />
                  </dl>
                </SectionCard>
              ))}
            </div>
          )}

          {profile?.referral_code ? (
            <ReferralCard code={profile.referral_code} active={profile.account_status === "ACTIVE"} />
          ) : null}
        </>
      )}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={highlight ? "tabular font-bold text-success" : "tabular font-semibold text-foreground"}>
        {value}
      </dd>
    </div>
  );
}
