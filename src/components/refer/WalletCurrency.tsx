import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { buildMoneyFlow, formatMoney, type FlowRange } from "@/lib/wallet-currency";
import { currencyName } from "@/lib/currency-catalog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CurrencySwitcher({ options, value, onChange, fr }: { options: string[]; value: string; onChange: (c: string) => void; fr: boolean }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={fr ? "Devise du portefeuille" : "Wallet currency"} className="h-10 w-64 max-w-full bg-card text-start font-semibold"><SelectValue /></SelectTrigger>
      <SelectContent className="max-h-80">
        {[...new Set([...options, value])].map(c => <SelectItem key={c} value={c}>{c} · {currencyName(c, fr)}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

const config = {
  in: { label: "Money in", color: "var(--primary)" },
  out: { label: "Money out", color: "var(--destructive)" },
} satisfies ChartConfig;

type Row = { amount: number | string | null; currency?: string | null; status?: string | null; created_at: string };

export function MoneyFlowChart({ rows, currency, fr }: { rows: Row[]; currency: string; fr: boolean }) {
  const [range, setRange] = useState<FlowRange>("30d");
  const flow = useMemo(() => buildMoneyFlow(rows, currency, range), [rows, currency, range]);
  const ranges: Array<[FlowRange, string]> = [["7d", fr ? "7 j" : "7D"], ["30d", fr ? "30 j" : "30D"], ["12m", fr ? "12 m" : "12M"]];
  return (
    <section className="rounded-3xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-base font-bold">{fr ? "Flux d'argent" : "Money flow"} · {currency}</h2>
        <div className="inline-flex gap-1 rounded-full bg-muted p-1">
          {ranges.map(([r, label]) => (
            <button key={r} type="button" onClick={() => setRange(r)} aria-pressed={range === r}
              className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", range === r ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-primary/10 p-3">
          <dt className="text-[11px] font-semibold uppercase text-muted-foreground">{fr ? "Entrées" : "Money in"}</dt>
          <dd className="tabular mt-0.5 text-base font-extrabold text-primary">{formatMoney(flow.totalIn, currency)}</dd>
        </div>
        <div className="rounded-2xl bg-destructive/10 p-3">
          <dt className="text-[11px] font-semibold uppercase text-muted-foreground">{fr ? "Dépenses et retraits" : "Spent & withdrawn"}</dt>
          <dd className="tabular mt-0.5 text-base font-extrabold text-destructive">{formatMoney(flow.totalOut, currency)}</dd>
        </div>
      </dl>
      <ChartContainer config={config} className="mt-4 h-48 w-full">
        <AreaChart data={flow.points} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="flowIn" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-in)" stopOpacity={0.4} />
              <stop offset="95%" stopColor="var(--color-in)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="flowOut" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-out)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--color-out)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} fontSize={10} />
          <YAxis tickLine={false} axisLine={false} width={44} fontSize={10} />
          <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
          <Area type="monotone" dataKey="in" stroke="var(--color-in)" fill="url(#flowIn)" strokeWidth={2} />
          <Area type="monotone" dataKey="out" stroke="var(--color-out)" fill="url(#flowOut)" strokeWidth={2} />
        </AreaChart>
      </ChartContainer>
    </section>
  );
}
