import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Clock3,
  MessageCircle,
  Newspaper,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import {
  ANALYSIS_ITEMS,
  ECONOMIC_EVENTS,
  EUR_USD_SERIES,
  FX_MARKETS,
  LEARNING_ITEMS,
  MARKET_CATEGORIES,
  MARKET_NEWS,
  MARKET_RANGES,
  MARKET_STATS,
  type MarketCategory,
  type MarketRange,
} from "@/lib/markets";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({
    meta: [
      { title: "ASH Markets — Global Market Insights" },
      { name: "description", content: "Explore educational FX market analysis, demo charts, news, and economic events with ASH Markets." },
      { property: "og:title", content: "ASH Markets — Global Market Insights" },
      { property: "og:description", content: "Professional market information and education from ASH Glo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MarketsPage,
});

type ContentTab = "Analysis" | "News" | "Economic Calendar" | "Chat";
const CONTENT_TABS: { label: ContentTab; icon: typeof BarChart3 }[] = [
  { label: "Analysis", icon: BarChart3 },
  { label: "News", icon: Newspaper },
  { label: "Economic Calendar", icon: CalendarDays },
  { label: "Chat", icon: MessageCircle },
];

const chartConfig = { price: { label: "Demo price", color: "var(--color-primary)" } } satisfies ChartConfig;

function MarketsPage() {
  const [category, setCategory] = useState<MarketCategory>("FX");
  const [range, setRange] = useState<MarketRange>("1D");
  const [contentTab, setContentTab] = useState<ContentTab>("Analysis");

  return (
    <div className="mx-auto w-full max-w-6xl space-y-7 pb-4">
      <header className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 p-5 shadow-card backdrop-blur-xl sm:p-7">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" aria-hidden />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-primary">
              <span className="grid size-7 place-items-center rounded-full bg-primary/10"><TrendingUp className="size-4" aria-hidden /></span>
              Market intelligence
            </div>
            <h1 className="font-display text-3xl font-extrabold text-foreground sm:text-4xl">ASH Markets</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">Global Market Insights for a Smarter You</p>
          </div>
          <Button variant="outline" className="w-fit border-primary/30 bg-primary/5 text-primary hover:bg-primary/10" onClick={() => document.getElementById("learn-markets")?.scrollIntoView({ behavior: "smooth" })}>
            <Sparkles className="size-4" aria-hidden /> Learn • Discuss • Grow
          </Button>
        </div>
      </header>

      <section aria-label="Market categories">
        <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
          {MARKET_CATEGORIES.map((item) => (
            <Button key={item} type="button" variant={category === item ? "default" : "outline"} size="sm" className="shrink-0" onClick={() => setCategory(item)} aria-pressed={category === item}>
              {item}
            </Button>
          ))}
        </div>
      </section>

      {category !== "FX" ? <ComingSoon category={category} /> : (
        <>
          <section aria-labelledby="market-overview-heading" className="space-y-3">
            <SectionHeading title="Market Overview" label="Demo Market Data" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {FX_MARKETS.map((market) => <MarketCard key={market.symbol} market={market} />)}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-card backdrop-blur-xl">
            <div className="flex flex-col gap-4 border-b border-border/60 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-xl font-extrabold text-foreground sm:text-2xl">EUR/USD</h2>
                  <DemoBadge />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Euro / US Dollar</p>
                <div className="mt-4 flex items-end gap-3">
                  <span className="font-display text-3xl font-extrabold tabular-nums text-foreground">1.0842</span>
                  <Movement value={0.28} />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5" aria-label="Chart time range">
                {MARKET_RANGES.map((item) => (
                  <Button key={item} type="button" size="sm" variant={range === item ? "default" : "ghost"} className="h-8 px-3 text-xs" onClick={() => setRange(item)} aria-pressed={range === item}>{item}</Button>
                ))}
              </div>
            </div>

            <div className="p-3 sm:p-6">
              <ChartContainer config={chartConfig} className="h-[250px] w-full sm:h-[340px]">
                <AreaChart data={EUR_USD_SERIES[range]} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="marketPriceFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.38} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 6" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickFormatter={(value) => `${range} ${value}`} minTickGap={24} />
                  <YAxis domain={["dataMin - 0.002", "dataMax + 0.002"]} tickLine={false} axisLine={false} tickFormatter={(value) => Number(value).toFixed(3)} />
                  <Tooltip content={<ChartTooltipContent indicator="line" />} />
                  <Area type="monotone" dataKey="value" name="price" stroke="var(--color-primary)" strokeWidth={2.5} fill="url(#marketPriceFill)" activeDot={{ r: 5 }} />
                </AreaChart>
              </ChartContainer>
              <div className="mt-4 grid grid-cols-2 divide-x divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 sm:grid-cols-4 sm:divide-y-0">
                {MARKET_STATS.map((stat) => (
                  <div key={stat.label} className="p-3 sm:p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                    <p className="mt-1 font-semibold tabular-nums text-foreground">{stat.value}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-center text-[11px] text-muted-foreground">Illustrative demo data for education and interface preview. Not live market data or investment advice.</p>
            </div>
          </section>

          <section className="space-y-5">
            <div className="scrollbar-none flex gap-1 overflow-x-auto border-b border-border/60" role="tablist" aria-label="Market content">
              {CONTENT_TABS.map(({ label, icon: Icon }) => (
                <button key={label} type="button" role="tab" aria-selected={contentTab === label} onClick={() => setContentTab(label)} className={cn("relative flex shrink-0 items-center gap-2 px-3 py-3 text-sm font-semibold transition-colors", contentTab === label ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                  <Icon className="size-4" aria-hidden /> {label}
                  {contentTab === label ? <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" aria-hidden /> : null}
                </button>
              ))}
            </div>
            <MarketContent tab={contentTab} />
          </section>
        </>
      )}

      <section id="learn-markets" className="scroll-mt-6 space-y-3">
        <SectionHeading title="Learn the Markets" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {LEARNING_ITEMS.map((item, index) => (
            <article key={item.title} className="group rounded-xl border border-border/60 bg-card/70 p-4 shadow-card transition-colors hover:border-primary/30">
              <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><BookOpen className="size-4" aria-hidden /></span>
              <p className="mt-4 font-bold text-foreground">{item.title}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary">Lesson {index + 1} <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden /></span>
            </article>
          ))}
        </div>
      </section>

      <p className="text-center text-[11px] leading-relaxed text-muted-foreground">ASH Markets V1 provides general information and education only. It does not execute trades or provide personalized investment advice.</p>
    </div>
  );
}

function SectionHeading({ title, label }: { title: string; label?: string }) {
  return <div className="flex items-center justify-between gap-3"><h2 id="market-overview-heading" className="font-display text-lg font-extrabold text-foreground sm:text-xl">{title}</h2>{label ? <DemoBadge /> : null}</div>;
}

function DemoBadge() {
  return <span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">Demo Market Data</span>;
}

function Movement({ value }: { value: number }) {
  const positive = value >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return <span className={cn("inline-flex items-center gap-1 text-xs font-bold tabular-nums", positive ? "text-success" : "text-destructive")}><Icon className="size-3.5" aria-hidden />{positive ? "+" : ""}{value.toFixed(2)}%</span>;
}

function MarketCard({ market }: { market: (typeof FX_MARKETS)[number] }) {
  const positive = market.change >= 0;
  return (
    <article className="min-w-0 rounded-xl border border-border/60 bg-card/75 p-3.5 shadow-card backdrop-blur-xl sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0"><h3 className="font-bold text-foreground">{market.symbol}</h3><p className="truncate text-[10px] text-muted-foreground">{market.name}</p></div>
        <span className={cn("mt-1 size-2 shrink-0 rounded-full", positive ? "bg-success" : "bg-destructive")} aria-hidden />
      </div>
      <p className="mt-3 font-display text-xl font-extrabold tabular-nums text-foreground">{market.price}</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <Movement value={market.change} />
        <ChartContainer config={chartConfig} className="h-9 w-16 shrink-0">
          <LineChart data={market.trend}><Line type="monotone" dataKey="value" stroke={positive ? "var(--color-success)" : "var(--color-destructive)"} strokeWidth={2} dot={false} /></LineChart>
        </ChartContainer>
      </div>
    </article>
  );
}

function ComingSoon({ category }: { category: Exclude<MarketCategory, "FX"> }) {
  return (
    <section className="grid min-h-72 place-items-center rounded-2xl border border-border/60 bg-card/70 p-8 text-center shadow-card backdrop-blur-xl">
      <div><span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary/10 text-primary"><BarChart3 className="size-6" aria-hidden /></span><h2 className="mt-4 font-display text-xl font-extrabold text-foreground">{category} — Coming Soon</h2><p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">This market category is being prepared for a future ASH Markets release. Explore the FX demo experience in V1.</p><Button className="mt-5" onClick={() => location.hash = ""}>View FX</Button></div>
    </section>
  );
}

function MarketContent({ tab }: { tab: ContentTab }) {
  if (tab === "News") return (
    <div className="space-y-3">
      <SectionHeading title="Market News" label="Demo Content" />
      {MARKET_NEWS.map((item) => (
        <article key={item.headline} className="rounded-xl border border-border/60 bg-card/70 p-4 shadow-card">
          <div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-primary"><span>{item.category}</span><span className="text-muted-foreground">{item.source}</span></div><h3 className="mt-2 font-bold text-foreground">{item.headline}</h3><p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.summary}</p><p className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="size-3.5" aria-hidden />{item.time}</p></div><ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden /></div>
        </article>
      ))}
    </div>
  );

  if (tab === "Economic Calendar") return (
    <div className="space-y-3">
      <SectionHeading title="Economic Calendar" label="Demo Data" />
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card/70 shadow-card">
        {ECONOMIC_EVENTS.map((item) => <div key={item.event} className="grid gap-3 border-b border-border/50 p-4 last:border-b-0 sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:items-center"><span className="w-fit rounded-md bg-muted px-2 py-1 text-xs font-extrabold text-foreground">{item.country}</span><div><p className="font-semibold text-foreground">{item.event}</p><p className="mt-1 text-xs text-muted-foreground">{item.date}</p></div><div className="flex items-center justify-between gap-4 sm:block sm:text-right"><span className={cn("text-xs font-bold", item.importance === "High" ? "text-destructive" : "text-warning")}>{item.importance}</span><p className="mt-1 text-[11px] text-muted-foreground">Expected {item.expected} · Previous {item.previous}</p></div></div>)}
      </div>
    </div>
  );

  if (tab === "Chat") return (
    <div className="rounded-xl border border-border/60 bg-card/70 p-6 text-center shadow-card">
      <span className="mx-auto grid size-11 place-items-center rounded-full bg-primary/10 text-primary"><MessageCircle className="size-5" aria-hidden /></span><h2 className="mt-3 font-display text-lg font-extrabold text-foreground">Market Chat — Coming Soon</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">A dedicated market discussion room is planned. You can continue conversations safely through ASH Messages today.</p><Button asChild variant="outline" className="mt-5"><Link to="/messages">Open Messages <ArrowRight className="size-4" aria-hidden /></Link></Button>
    </div>
  );

  return (
    <div className="space-y-3"><SectionHeading title="Market Analysis" />
      <div className="grid gap-3 lg:grid-cols-3">{ANALYSIS_ITEMS.map((item, index) => <article key={item.title} className="rounded-xl border border-border/60 bg-card/70 p-5 shadow-card"><span className="text-xs font-bold uppercase tracking-wide text-primary">Observation {String(index + 1).padStart(2, "0")}</span><h3 className="mt-3 font-display text-lg font-extrabold text-foreground">{item.title}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p></article>)}</div>
    </div>
  );
}