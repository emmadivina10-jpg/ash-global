import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, Users } from "lucide-react";
import { useNetwork, useNetworkTree, useProfile, type NetworkLevel } from "@/lib/queries";
import { StatCard } from "@/components/refer/cards";
import { SkeletonRows } from "@/components/refer/states";
import { NetworkTree } from "@/components/refer/NetworkTree";
import { ReferralCard } from "@/components/refer/ReferralCard";
import { COMMISSIONS, formatXAF } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";



export const Route = createFileRoute("/_authenticated/network")({
  head: () => ({
    meta: [
      { title: "Referral network — ASH Glo" },
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

function LevelRow({ level }: { level: NetworkLevel }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const pct = level.members > 0 ? Math.round((level.active / level.members) * 100) : 0;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-3 sm:gap-3 text-left transition hover:bg-muted/50 sm:px-5"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
          {level.level}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="whitespace-nowrap text-sm font-semibold text-foreground">{t("net.level", { n: level.level })}</span>
            <span className="tabular whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {t("net.each", { amount: formatXAF(COMMISSIONS[level.level as 1 | 2 | 3]) })}
            </span>
          </span>
          <span className="mt-1 flex min-w-0 items-center gap-2">
            <span className="h-1.5 min-w-10 flex-1 overflow-hidden rounded-full bg-muted sm:max-w-40" aria-hidden>
              <span
                className="brand-gradient block h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </span>
            <span className="tabular shrink-0 whitespace-nowrap text-[11px] text-muted-foreground">
              {level.active}/{level.members}
            </span>
          </span>
        </span>

        <span className="shrink-0 text-right">
          <span className="tabular block whitespace-nowrap text-[13px] font-bold text-success sm:text-sm">
            {formatXAF(level.commissions)}
          </span>
          {level.pendingCommissions > 0 ? (
            <span className="tabular block whitespace-nowrap text-[11px] font-semibold text-destructive">
              +{formatXAF(level.pendingCommissions)}
            </span>
          ) : null}
        </span>

        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open ? (
        <dl className="space-y-3 px-4 pb-4 text-sm sm:px-5">
          <Row label={t("net.members")} value={String(level.members)} />
          <Row label={t("net.activeMembers")} value={String(level.active)} />
          <Row label={t("net.pendingActivation")} value={String(level.pending)} warn />
          <Row label={t("net.pendingCommission")} value={formatXAF(level.pendingCommissions)} warn />
          <Row label={t("net.commissions")} value={formatXAF(level.commissions)} highlight />
        </dl>
      ) : null}
    </div>
  );
}
