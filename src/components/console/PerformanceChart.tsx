import { useMemo, useState } from "react";
import type { DailyPoint } from "@/lib/staff-performance.functions";
import { cn } from "@/lib/utils";

type Range = "D" | "W" | "M" | "Y";
type Candle = { label: string; open: number; close: number; high: number; low: number; volume: number };

function bucketKey(date: string, range: Range) {
  if (range === "D") return date;
  if (range === "M") return date.slice(0, 7);
  if (range === "Y") return date.slice(0, 4);
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** Builds candles from real daily values. Daily view: open = previous day, close = that day. */
export function buildCandles(series: DailyPoint[], range: Range): Candle[] {
  if (range === "D") {
    return series.slice(-60).map((p, i, arr) => {
      const prev = i > 0 ? (arr[i - 1]?.value ?? p.value) : p.value;
      return { label: p.date, open: prev, close: p.value, high: Math.max(prev, p.value), low: Math.min(prev, p.value), volume: p.value };
    });
  }
  const groups = new Map<string, number[]>();
  series.forEach((p) => { const k = bucketKey(p.date, range); groups.set(k, [...(groups.get(k) ?? []), p.value]); });
  return [...groups.entries()].map(([label, v]) => ({
    label, open: v[0] ?? 0, close: v[v.length - 1] ?? 0, high: Math.max(...v), low: Math.min(...v), volume: v.reduce((a, b) => a + b, 0),
  })).slice(range === "W" ? -26 : range === "M" ? -24 : -10);
}

function sma(values: number[], period: number, shift = 0) {
  return values.map((_, i) => {
    const j = i - shift;
    if (j < period - 1) return null;
    const win = values.slice(j - period + 1, j + 1);
    return win.reduce((a, b) => a + b, 0) / period;
  });
}

export function PerformanceChart({ title, subtitle, series }: { title: string; subtitle: string; series: DailyPoint[] }) {
  const [range, setRange] = useState<Range>("W");
  const candles = useMemo(() => buildCandles(series, range), [series, range]);
  const W = 720, H = 260, VOL = 50, PAD = 8;
  const enough = candles.length >= 2;
  const closes = candles.map((c) => (range === "D" ? c.close : c.volume));
  const bodyVals = candles.flatMap((c) => (range === "D" ? [c.high, c.low] : [c.volume]));
  const max = Math.max(1, ...bodyVals);
  const y = (v: number) => PAD + (H - VOL - PAD * 2) * (1 - v / max);
  const step = W / Math.max(candles.length, 1);
  const x = (i: number) => i * step + step / 2;
  const line = (vals: (number | null)[]) =>
    vals.map((v, i) => (v == null ? null : `${x(i)},${y(v)}`)).filter(Boolean).join(" ");
  const jaw = sma(closes, 13, 8), teeth = sma(closes, 8, 5), lips = sma(closes, 5, 3), ma = sma(closes, 3);
  const maxVol = Math.max(1, ...candles.map((c) => c.volume));

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex rounded-lg border border-border p-0.5">
          {(["D", "W", "M", "Y"] as Range[]).map((r) => (
            <button key={r} type="button" onClick={() => setRange(r)}
              className={cn("rounded-md px-2.5 py-1 text-xs font-bold", range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
              {{ D: "Daily", W: "Weekly", M: "Monthly", Y: "Yearly" }[r]}
            </button>
          ))}
        </div>
      </div>
      {!enough ? (
        <div className="mt-4 grid h-48 place-items-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
          Insufficient performance data
        </div>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 h-64 w-full" role="img" aria-label={`${title} chart`}>
            {[0.25, 0.5, 0.75].map((g) => <line key={g} x1={0} x2={W} y1={y(max * g)} y2={y(max * g)} className="stroke-border" strokeDasharray="3 4" />)}
            {candles.map((c, i) => {
              const up = range === "D" ? c.close >= c.open : i === 0 || c.volume >= (candles[i - 1]?.volume ?? 0);
              const o = range === "D" ? c.open : i === 0 ? c.volume : (candles[i - 1]?.volume ?? c.volume);
              const cl = range === "D" ? c.close : c.volume;
              const hi = range === "D" ? c.high : Math.max(o, cl);
              const lo = range === "D" ? c.low : Math.min(o, cl);
              const cls = up ? "fill-primary stroke-primary" : "fill-destructive stroke-destructive";
              const bw = Math.max(2, step * 0.55);
              return (
                <g key={c.label}>
                  <rect x={x(i) - bw / 2} y={H - (c.volume / maxVol) * (VOL - 6)} width={bw} height={(c.volume / maxVol) * (VOL - 6)} className="fill-muted" />
                  <line x1={x(i)} x2={x(i)} y1={y(hi)} y2={y(lo)} className={cls} />
                  <rect x={x(i) - bw / 2} y={y(Math.max(o, cl))} width={bw} height={Math.max(1.5, Math.abs(y(o) - y(cl)))} className={cls} rx={1}>
                    <title>{`${c.label}: ${cl.toLocaleString()}`}</title>
                  </rect>
                </g>
              );
            })}
            <polyline points={line(jaw)} fill="none" className="stroke-chart-1" strokeWidth={1.6} />
            <polyline points={line(teeth)} fill="none" className="stroke-destructive" strokeWidth={1.4} />
            <polyline points={line(lips)} fill="none" className="stroke-primary" strokeWidth={1.2} />
            <polyline points={line(ma)} fill="none" className="stroke-gold" strokeWidth={1} strokeDasharray="4 3" />
          </svg>
          <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-muted-foreground">
            <span><span className="text-chart-1">■</span> Jaw (13)</span>
            <span><span className="text-destructive">■</span> Teeth (8)</span>
            <span><span className="text-primary">■</span> Lips (5)</span>
            <span><span className="text-gold">■</span> 3-period average</span>
            <span>Alligator lines show the performance trend from recorded activity only.</span>
          </div>
        </>
      )}
    </section>
  );
}
