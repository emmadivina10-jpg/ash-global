import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { GlassCard } from "./ShareholderViews";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type Valuation = { valuation: number; currency: string; approvedAt: string; approvedBy: string | null };

const cad = (v: number) => `CAD $${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const pct = (v: number) => `${Number(v.toFixed(4))}%`;

/** Implied value of an ownership percentage at the approved valuation. */
const implied = (valuation: number, ownershipPct: number) => (valuation * ownershipPct) / 100;

const TABLE_PCTS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 2, 5, 10, 20, 50, 90, 99, 100];
const SCENARIO_VALUATIONS = [500_000, 1_000_000, 2_000_000, 5_000_000];
const SCENARIO_PCTS = [1, 0.5, 0.1];

/** Four large investor-style cards: company value, ownership, investment, implied value. */
export function EquityHeroCards({
  valuation,
  ownershipPct,
  investment,
  currency,
}: {
  valuation: Valuation | null;
  ownershipPct: number | null;
  investment: number | null;
  currency: string;
}) {
  const cards = [
    { label: "Company value", value: valuation ? cad(valuation.valuation) : "Not set" },
    { label: "Your ownership", value: ownershipPct === null ? "—" : pct(ownershipPct) },
    { label: "Your investment", value: investment === null ? "—" : `${currency} $${Number(investment).toLocaleString()}` },
    {
      label: "Current implied value",
      value: valuation && ownershipPct !== null ? cad(implied(valuation.valuation, ownershipPct)) : "—",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border border-gold/30 bg-card/70 p-4 shadow-lg backdrop-blur">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-gold">{c.label}</p>
          <p className="mt-2 font-display text-xl font-extrabold text-foreground sm:text-2xl">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

/** "How Equity Works" — value table, formula, fractional ownership, warning box, scenarios. */
export function EquityGuide({ valuation }: { valuation: Valuation }) {
  const v = valuation.valuation;
  return (
    <GlassCard title="How equity works">
      <p className="mb-4 text-sm text-muted-foreground">
        The current approved company valuation is <span className="font-semibold text-foreground">{cad(v)}</span>. This valuation is used
        for calculating the implied value of ownership. It is <span className="font-semibold text-foreground">not</span> the same as cash
        in the company, revenue, profit, or an investor's original investment.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1">Ownership</th>
              <th className="py-1 text-right">Implied share value</th>
            </tr>
          </thead>
          <tbody>
            {TABLE_PCTS.map((p) => (
              <tr key={p} className="border-t border-border/50">
                <td className="py-1.5 font-semibold">{pct(p)}</td>
                <td className="py-1.5 text-right">{cad(implied(v, p))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 rounded-lg border border-border/60 bg-muted/40 p-3 text-center font-mono text-xs text-foreground">
        Implied Share Value = Company Valuation × Ownership %
      </p>

      <div className="mt-4 space-y-3 text-sm">
        <div>
          <p className="font-semibold text-foreground">Fractional ownership</p>
          <p className="text-muted-foreground">
            Ownership is not limited to fixed blocks like 0.1%, 0.5% or 1%. An investor can receive an exact percentage based on the agreed
            investment and share price. At a {cad(v)} valuation: $500 → 0.10%, $1,000 → 0.20%, $1,700 → 0.34%, $2,500 → 0.50%,
            $5,000 → 1.00%. Investments are never automatically rounded to the nearest block.
          </p>
        </div>
        <div className="rounded-xl border border-gold/40 bg-gold/10 p-4">
          <p className="font-semibold text-foreground">Investment ≠ Ownership value — three different numbers</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li><span className="font-semibold text-foreground">Investment amount</span> — what the shareholder actually paid or committed under the agreement.</li>
            <li><span className="font-semibold text-foreground">Ownership percentage</span> — the share of the company legally allocated to the shareholder.</li>
            <li><span className="font-semibold text-foreground">Current implied share value</span> — the estimated value of that percentage at the latest approved valuation.</li>
          </ul>
          <p className="mt-2 text-muted-foreground">
            Example — Fabrice: ownership 1.00%, original investment CAD $5,000 (shown as received only once payment is confirmed and
            reconciled), implied value of 1% at a {cad(v)} valuation = {cad(implied(v, 1))}. Never assume the implied value equals the
            amount originally invested.
          </p>
        </div>
        <div>
          <p className="font-semibold text-foreground">No automatic fallback</p>
          <p className="text-muted-foreground">
            An investor does not fall back to 0.1% because their investment does not reach 0.5%. Ownership is never silently rounded,
            reduced, or increased. If a minimum investment applies to a specific offering, that rule is shown before any investment is
            accepted.
          </p>
        </div>
      </div>

      <p className="mt-4 font-semibold text-foreground">How valuation changes affect ownership value</p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1">Company valuation</th>
              {SCENARIO_PCTS.map((p) => (
                <th key={p} className="py-1 text-right">{pct(p)} value</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SCENARIO_VALUATIONS.map((sv) => (
              <tr key={sv} className={`border-t border-border/50 ${sv === v ? "bg-gold/10" : ""}`}>
                <td className="py-1.5 font-semibold">{cad(sv)}{sv === v ? " (current)" : ""}</td>
                {SCENARIO_PCTS.map((p) => (
                  <td key={p} className="py-1.5 text-right">{cad(implied(sv, p))}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        These are implied values based on valuation — not guaranteed sale prices. Valuation is not revenue, shareholder investment is not
        company revenue, and share value is not cash available to the company.
      </p>
    </GlassCard>
  );
}

/** "Increase My Ownership" calculator — no rounding, exact fractional percentages. */
export function IncreaseOwnershipCalculator({ valuation, currentPct }: { valuation: Valuation; currentPct: number }) {
  const [amount, setAmount] = useState("");
  const result = useMemo(() => {
    const a = Number(amount);
    if (!(a > 0)) return null;
    const additional = (a / valuation.valuation) * 100;
    return { additional, total: currentPct + additional };
  }, [amount, valuation.valuation, currentPct]);
  return (
    <GlassCard title="Increase my ownership">
      <p className="mb-3 text-sm text-muted-foreground">
        Additional Ownership = Additional Investment ÷ Applicable Equity Price. Based on the approved valuation of{" "}
        {cad(valuation.valuation)}. Exact percentages — never rounded.
      </p>
      <Label>Additional investment ({valuation.currency})</Label>
      <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 1700" />
      {result ? (
        <div className="mt-3 space-y-1 text-sm">
          <p className="flex justify-between"><span className="text-muted-foreground">Current ownership</span><span className="font-semibold">{pct(currentPct)}</span></p>
          <p className="flex justify-between"><span className="text-muted-foreground">Additional investment</span><span className="font-semibold">{cad(Number(amount))}</span></p>
          <p className="flex justify-between"><span className="text-muted-foreground">Additional ownership</span><span className="font-semibold">{pct(result.additional)}</span></p>
          <p className="flex justify-between border-t border-border/60 pt-1"><span className="text-muted-foreground">Projected total ownership</span><span className="font-bold text-gold">{pct(result.total)}</span></p>
          <p className="pt-1 text-xs text-muted-foreground">Projection only — subject to the company's approved share-issuance terms and CEO approval.</p>
        </div>
      ) : null}
    </GlassCard>
  );
}

/** Stock-market-style ASH market analysis: cumulative revenue line + monthly revenue area. */
export function MarketAnalysisChart({
  timeline,
  currency,
}: {
  timeline: { date: string; amount: number; cumulative: number }[];
  currency: string;
}) {
  if (timeline.length < 2) {
    return (
      <GlassCard title="ASH market analysis">
        <p className="text-sm text-muted-foreground">Insufficient data for a market chart.</p>
      </GlassCard>
    );
  }
  const first = timeline[0]!.cumulative;
  const last = timeline[timeline.length - 1]!.cumulative;
  const firstDate = timeline[0]!.date;
  const up = last >= first;
  return (
    <GlassCard title="ASH market analysis">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-muted-foreground">Cumulative revenue</p>
          <p className="font-display text-2xl font-extrabold text-foreground">{currency} {last.toLocaleString()}</p>
        </div>
        <p className={`text-sm font-bold ${up ? "text-emerald-500" : "text-red-500"}`}>
          {up ? "▲" : "▼"} {currency} {Math.abs(last - first).toLocaleString()} since {timeline[0].date}
        </p>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={timeline} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="ashCum" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-gold)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="var(--color-gold)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis fontSize={10} tickLine={false} axisLine={false} width={70} />
            <Tooltip
              formatter={(value: number, name: string) => [`${currency} ${Number(value).toLocaleString()}`, name === "cumulative" ? "Cumulative revenue" : "Daily revenue"]}
              contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }}
            />
            <Area type="monotone" dataKey="cumulative" stroke="var(--color-gold)" strokeWidth={2.5} fill="url(#ashCum)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Real recorded ASH revenue over time, from the same Finance ledger as the rest of this dashboard. Past performance is not a
        guarantee of future results.
      </p>
    </GlassCard>
  );
}
