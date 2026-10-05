import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { WorkBoard } from "@/components/console/WorkBoard";
import { DepartmentCommandCenter } from "@/components/console/DepartmentCommandCenter";
import { StaffDirectMessages } from "@/components/console/StaffDirectMessages";
import { StaffNotificationCenter } from "@/components/console/StaffNotificationCenter";
import { AshIntelligencePanel } from "@/components/console/AshIntelligencePanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { getMarketingOverview } from "@/lib/marketing.functions";
import { consoleStatus } from "@/lib/console.functions";

export const Route = createFileRoute("/console/advertising")({
  ssr: false,
  component: MarketingCommandCenter,
});

const NA = "Insufficient marketing data.";

function Stat({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold text-foreground">{value ?? "—"}</p>
    </div>
  );
}

function Overview() {
  const fn = useServerFn(getMarketingOverview);
  const { data } = useQuery({ queryKey: ["console", "marketing", "overview"], queryFn: fn });
  if (!data) return null;
  if (!data.hasData) return <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">{NA}</p>;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active campaigns" value={data.activeCampaigns} />
        <Stat label="Leads generated" value={data.leads.total} />
        <Stat label="Businesses acquired" value={data.acquiredBusinesses} />
        <Stat label="Creators / users acquired" value={data.acquiredOther} />
        <Stat label="Conversion rate" value={data.conversionRate === null ? null : `${data.conversionRate}%`} />
        <Stat label="Campaign impressions" value={data.impressions} />
        <Stat label="Campaign clicks" value={data.clicks} />
        <Stat label="Click-through rate" value={data.ctr === null ? null : `${data.ctr}%`} />
        <Stat label="Follow-ups due" value={data.followUpsDue} />
        <Stat label="Open tasks" value={data.openTasks} />
      </div>
      <p className="text-xs text-muted-foreground">
        Leads by area — Advertising {data.leads.advertising} · Content & Creator {data.leads.content} · Growth {data.leads.growth}.
        Content published and pending approvals are not recorded yet, so they are not shown.
      </p>
    </div>
  );
}

function MarketingCommandCenter() {
  const status = useServerFn(consoleStatus);
  const { data: s } = useQuery({ queryKey: ["console", "status"], queryFn: status });
  const superAdmin = Boolean(s?.actor?.superAdmin);
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-foreground">ASH Advertising & Marketing Command Center</h1>
        <p className="text-sm text-muted-foreground">Advertising, Content & Creator and Growth & Acquisition in one place.</p>
      </div>
      <Tabs defaultValue="overview">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="advertising">Advertising & Campaigns</TabsTrigger>
          <TabsTrigger value="content">Content & Creator</TabsTrigger>
          <TabsTrigger value="growth">Growth & Leads</TabsTrigger>
          <TabsTrigger value="analytics">Analytics & Facebook</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="intel">Marketing Intelligence</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4"><Overview /></TabsContent>
        <TabsContent value="advertising" className="mt-4">
          <WorkBoard department="ADVERTISING" title="Advertising" blurb="Sell promoted listings and campaigns to businesses." leadType="BUSINESS" />
        </TabsContent>
        <TabsContent value="content" className="mt-4">
          <WorkBoard department="CONTENT" title="Content & Creators" blurb="Recruit creators and produce content that grows ASH." leadType="CREATOR" />
        </TabsContent>
        <TabsContent value="growth" className="mt-4">
          <WorkBoard department="GROWTH" title="Growth & Acquisition" blurb="Find businesses and providers and bring them onto ASH." leadType="BUSINESS" />
        </TabsContent>
        <TabsContent value="analytics" className="mt-4"><DepartmentCommandCenter /></TabsContent>
        <TabsContent value="tasks" className="mt-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Your tasks, comments and daily reports live in My Workspace.</p>
            <Button asChild className="mt-3"><Link to="/console/workspace">Open My Tasks</Link></Button>
          </div>
        </TabsContent>
        <TabsContent value="messages" className="mt-4"><StaffDirectMessages /></TabsContent>
        <TabsContent value="notifications" className="mt-4"><StaffNotificationCenter /></TabsContent>
        <TabsContent value="intel" className="mt-4"><AshIntelligencePanel superAdmin={superAdmin} /></TabsContent>
      </Tabs>
    </div>
  );
}
