import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ShareholderRow } from "@/lib/shareholders.functions";

const NA = "Data not available";
const money = (v: number | null | undefined, cur: string) =>
  v === null || v === undefined ? NA : `${cur} ${Number(v).toLocaleString()}`;
const label = (s: string) =>
  s
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());

export function GlassCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gold/30 bg-card/70 p-5 shadow-lg backdrop-blur">
      <p className="mb-3 font-display text-xs font-extrabold uppercase tracking-[0.25em] text-gold">
        {title}
      </p>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/50 py-1.5 text-sm last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-right font-semibold text-foreground">{v}</span>
    </div>
  );
}

export function InvestmentCard({ s }: { s: ShareholderRow }) {
  const committed = s.investment_committed;
  const outstanding =
    committed === null ? null : Math.max(Number(committed) - Number(s.investment_received), 0);
  return (
    <GlassCard title={`Investment · ${s.display_name}`}>
      <Row k="Ownership" v={`${Number(s.ownership_pct)}%`} />
      <Row k="Investment committed" v={money(committed, s.currency)} />
      <Row k="Amount received" v={money(s.investment_received, s.currency)} />
      <Row k="Amount outstanding" v={money(outstanding, s.currency)} />
      <Row k="Payment status" v={label(s.payment_status)} />
      <Row k="Share allocation" v={label(s.allocation_status)} />
      <Row k="Agreement / documents" v={label(s.agreement_status)} />
      <Row k="Allocation date" v={s.allocation_date ?? "Not yet"} />
      <Row k="Transaction reference" v={s.transaction_reference ?? "None"} />
    </GlassCard>
  );
}

export function OwnershipPlan({
  cap,
}: {
  cap: { issued: number; founderTarget: number; existingOthers: number; futureAvailable: number };
}) {
  return (
    <GlassCard title="Ownership plan">
      <Row k="Total issued ownership" v={`${cap.issued}%`} />
      <Row k="Founder long-term target" v={`${cap.founderTarget}%`} />
      <Row k="Existing shareholders" v={`${cap.existingOthers}%`} />
      <Row
        k="Available future share allocation"
        v={`${cap.futureAvailable}% (not owned by anyone)`}
      />
      <p className="mt-2 text-xs text-muted-foreground">
        Future shares are only issued by authorised CEO action. The founder's current stake is not
        changed automatically.
      </p>
    </GlassCard>
  );
}

export function PerformanceCard({
  p,
}: {
  p: {
    currency: string;
    revenue: number;
    cashOnHand: number;
    memberObligations: number;
    ownerWithdrawals: number;
    revenueByMonth: { month: string; amount: number }[];
  };
}) {
  return (
    <GlassCard title="Company financial performance">
      <Row k="Legitimate revenue (all time)" v={money(p.revenue, p.currency)} />
      <Row k="Cash on hand" v={money(p.cashOnHand, p.currency)} />
      <Row k="Member wallet obligations" v={money(p.memberObligations, p.currency)} />
      <Row k="Completed owner withdrawals" v={money(p.ownerWithdrawals, p.currency)} />
      {p.revenueByMonth.length >= 2 ? (
        <div className="mt-4 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={p.revenueByMonth}>
              <XAxis dataKey="month" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="amount" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">Insufficient data for a revenue chart.</p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        Figures come directly from the ASH Finance ledger. Profit, valuation and share value are not
        shown because they have not been formally determined.
      </p>
    </GlassCard>
  );
}

export function NotYetCard({ title }: { title: string }) {
  return (
    <GlassCard title={title}>
      <p className="text-sm text-muted-foreground">None recorded yet.</p>
    </GlassCard>
  );
}

export function HistoryCard({
  items,
}: {
  items: { kind: string; detail: string | null; created_at: string; actor?: string }[];
}) {
  return (
    <GlassCard title="Ownership history">
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No history.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {items.map((e, i) => (
            <li key={i} className="border-b border-border/50 pb-2 last:border-0">
              <p className="font-semibold text-foreground">{label(e.kind)}</p>
              <p className="text-muted-foreground">{e.detail}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(e.created_at).toLocaleString()}
                {e.actor ? ` · ${e.actor}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </GlassCard>
  );
}
