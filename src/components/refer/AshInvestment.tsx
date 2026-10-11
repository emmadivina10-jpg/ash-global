import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Activity, LockKeyhole } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DISPLAY_CURRENCIES, currencyName } from "@/lib/currency-catalog";
import { useI18n } from "@/lib/i18n";

// Decorative curves, not prices, company performance or forecasts.
const illustration = Array.from({ length: 65 }, (_, i) => ({ step: i, slow: 42 + 9 * Math.sin(i / 11), medium: 44 + 10 * Math.sin((i + 4) / 9), fast: 46 + 12 * Math.sin((i + 8) / 8) }));
const periods = ["1D", "1W", "1M", "1Y"] as const;
const labels = { "1D": ["00:00", "06:00", "12:00", "18:00", "24:00"], "1W": ["Mon", "Tue", "Thu", "Sat", "Sun"], "1M": ["01", "08", "15", "22", "30"], "1Y": ["Jan", "Apr", "Jul", "Oct", "Dec"] };

export function AshInvestment() {
  const { tx, lang } = useI18n();
  const [currency, setCurrency] = useState("USD");
  const [period, setPeriod] = useState<typeof periods[number]>("1M");
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-5 sm:px-8 sm:pt-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label={tx("Back to messages", "Retour aux messages")}><Link to="/messages"><ArrowLeft /></Link></Button>
          <div><p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">ASH GLO</p><h1 className="text-2xl font-bold sm:text-3xl">ASH Investment</h1></div>
        </div>
        <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><LockKeyhole className="size-4" />{tx("Not live · Preview", "Non actif · Aperçu")}</span>
      </header>
      <section className="py-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><h2 className="flex items-center gap-2 text-lg font-semibold"><Activity className="size-5 text-success" />{tx("ASH market activity", "Activité du marché ASH")}</h2><p className="mt-1 text-sm text-muted-foreground">{tx("Illustrative chart — no live market data", "Graphique illustratif — aucune donnée de marché en direct")}</p></div>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger aria-label={tx("Chart currency", "Devise du graphique")} className="h-10 w-64 max-w-full bg-card"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-80">{DISPLAY_CURRENCIES.map(c => <SelectItem key={c} value={c}>{c} · {currencyName(c, lang === "fr")}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="mt-6 flex items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex gap-1" aria-label={tx("Chart period", "Période du graphique")}>{periods.map(p => <Button key={p} size="sm" variant={period === p ? "secondary" : "ghost"} aria-pressed={period === p} onClick={() => setPeriod(p)}>{p}</Button>)}</div>
          <span className="text-xs font-semibold text-muted-foreground">ASH / {currency}</span>
        </div>
        <div className="relative mt-4 h-72 w-full overflow-hidden sm:h-96" role="img" aria-label={tx("Three illustrative flowing lines. No actual prices or investment signals.", "Trois courbes illustratives. Aucun prix réel ni signal d’investissement.")}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={illustration} margin={{ top: 30, right: 12, left: 12, bottom: 8 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 7" />
              <XAxis dataKey="step" ticks={[0, 16, 32, 48, 64]} tickFormatter={v => labels[period][Math.round(Number(v) / 16)] ?? ""} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Line type="monotone" dataKey="slow" stroke="var(--gold)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="medium" stroke="var(--primary)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="fast" stroke="var(--success)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
          <div aria-hidden className="investment-scan pointer-events-none absolute inset-y-6 w-px bg-success/40" />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5 text-xs text-muted-foreground"><span>{tx("Illustration only · Not an investment signal", "Illustration uniquement · Aucun signal d’investissement")}</span><span>{tx("Investment is not open", "Investissement non ouvert")}</span></div>
        <dl className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[tx("Company value", "Valeur de l’entreprise"), tx("Buying & selling activity", "Activité d’achat et de vente"), tx("Investment timing", "Moment d’investissement")].map(label => <div key={label} className="py-6 sm:px-5 sm:first:pl-0"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-2 text-2xl font-semibold">—</dd><p className="mt-1 text-xs text-muted-foreground">{tx("Data not available", "Données non disponibles")}</p></div>)}
        </dl>
      </section>
    </main>
  );
}