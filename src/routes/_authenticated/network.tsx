import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { useNetwork, useNetworkTree, useProfile } from "@/lib/queries";
import { SectionCard, StatCard } from "@/components/refer/cards";
import { SkeletonRows } from "@/components/refer/states";
import { NetworkTree } from "@/components/refer/NetworkTree";
import { ReferralCard } from "@/components/refer/ReferralCard";
import { COMMISSIONS, formatXAF } from "@/lib/format";
import { useI18n } from "@/lib/i18n";



export const Route = createFileRoute("/_authenticated/network")({
  head: () => ({
    meta: [
      { title: "Referral network — ASH Glo REFER" },
      { name: "description", content: "See your level 1, 2 and 3 referral network and commissions earned." },
    ],
  }),
  component: NetworkPage,
});

function NetworkPage() {
  const { data, isLoading } = useNetwork();
  const { data: treeNodes, isLoading: treeLoading } = useNetworkTree();
  const { data: profile } = useProfile();
  const { t } = useI18n();

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{t("net.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("net.subtitle")}</p>
      </header>

      {isLoading ? (
        <SkeletonRows rows={3} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <StatCard
              label={t("dash.stat.network")}
              value={data?.total ?? 0}
              icon={<Users className="size-4" aria-hidden />}
            />
            <StatCard
              label={t("dash.stat.direct")}
              value={data?.direct ?? 0}
              accent
              icon={<Users className="size-4" aria-hidden />}
            />
          </div>

          <section className="surface-card ash-fade-slide divide-y divide-border overflow-hidden">
            {(data?.levels ?? []).map((level) => (
              <LevelRow key={level.level} level={level} />
            ))}
          </section>


          {treeLoading ? (
            <SkeletonRows rows={4} />
          ) : (
            <NetworkTree
              nodes={treeNodes ?? []}
              currentUserStatus={profile?.account_status ?? "PENDING"}
              currentUserId={profile?.user_id ?? ""}
            />
          )}

          {profile?.referral_code ? (
            <ReferralCard code={profile.referral_code} active={profile.account_status === "ACTIVE"} />
          ) : null}
        </>
      )}
    </div>
  );
}



function Row({
  label,
  value,
  highlight,
  warn,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={
          highlight
            ? "tabular font-bold text-success"
            : warn
              ? "tabular font-semibold text-destructive"
              : "tabular font-semibold text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}
