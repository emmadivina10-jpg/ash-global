import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronRight,
  GraduationCap,
  ImagePlus,
  Loader2,
  Newspaper,
  PenLine,
  Save,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Area, AreaChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "@/components/refer/AvatarUpload";
import { PostCard } from "@/components/refer/PostCard";
import { InstructorApplication } from "@/components/markets/InstructorApplication";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  useCreateMarketPost,
  useFxInstructors,
  useMarketUpdates,
  useMyFxInstructorProfile,
} from "@/lib/market-ecosystem.queries";
import { useCreateSocialPost } from "@/lib/social.queries";
import {
  ANALYSIS_ITEMS,
  ECONOMIC_EVENTS,
  EUR_USD_SERIES,
  FX_MARKETS,
  LEARNING_ITEMS,
  MARKET_CATEGORIES,
  MARKET_NEWS,
  MARKET_RANGES,
  type MarketCategory,
  type MarketRange,
} from "@/lib/markets";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({
    meta: [
      { title: "ASH Markets — Learn, Discover, Connect, Grow" },
      { name: "description", content: "Educational market updates, FX learning, approved instructors, demo snapshots, news, analysis, and economic events." },
      { property: "og:title", content: "ASH Markets — Learn, Discover, Connect, Grow" },
      { property: "og:description", content: "A professional educational Markets community from ASH Glo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MarketsPage,
});

type Panel = "analysis" | "updates" | "news" | "calendar" | "instructors" | "learn" | "apply" | "publish" | null;
const chartConfig = { price: { label: "Demo price", color: "var(--color-market-accent)" } } satisfies ChartConfig;

const SHORTCUTS = [
  { id: "analysis" as const, label: "Market Analysis", icon: BarChart3 },
  { id: "updates" as const, label: "Market Updates", icon: TrendingUp },
  { id: "news" as const, label: "News", icon: Newspaper },
  { id: "calendar" as const, label: "Calendar", icon: CalendarDays },
  { id: "instructors" as const, label: "FX Instructors", icon: Users },
  { id: "learn" as const, label: "Learn", icon: BookOpen },
];

function MarketsPage() {
  const [category, setCategory] = useState<MarketCategory>("FX");
  const [range, setRange] = useState<MarketRange>("1D");
  const [panel, setPanel] = useState<Panel>(null);
  const [me, setMe] = useState<string | null>(null);
  const { data: updates, isLoading: updatesLoading } = useMarketUpdates();
  const { data: instructor } = useMyFxInstructorProfile();

  useEffect(() => { void supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null)); }, []);

  return (
    <div className="market-theme -mx-4 -mt-5 min-h-screen bg-market-background pb-12 text-market-foreground sm:-mx-6 sm:-mt-6 lg:-mx-8">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <header className="relative overflow-hidden border-b border-market-line pb-6">
          <div className="absolute inset-x-0 top-0 h-40 bg-market-glow opacity-60" aria-hidden />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-extrabold uppercase text-market-accent">ASH Glo</p>
              <h1 className="mt-1 font-display text-4xl font-extrabold text-market-foreground sm:text-5xl">ASH Markets</h1>
              <p className="mt-2 text-base font-bold text-market-lavender sm:text-lg">Learn. Discover. Connect. Grow.</p>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-market-muted">Educational market observations, verified instructor perspectives, news, and learning—built for a smarter market community.</p>
            </div>
            {instructor ? <Button size="sm" onClick={() => setPanel("publish")} className="shrink-0 bg-market-accent text-market-accent-foreground"><PenLine className="size-4" /> Publish</Button> : null}
          </div>
        </header>

        <nav aria-label="Market categories" className="scrollbar-none mt-5 flex gap-2 overflow-x-auto pb-1">
          {["Overview", ...MARKET_CATEGORIES].map((item) => {
            const active = item === "Overview" ? category === "FX" : category === item;
            return <Button key={item} type="button" size="sm" variant="ghost" onClick={() => setCategory(item === "Overview" ? "FX" : item as MarketCategory)} className={cn("shrink-0 rounded-full border px-4", active ? "border-market-accent bg-market-accent text-market-accent-foreground" : "border-market-line bg-market-surface text-market-muted hover:bg-market-elevated hover:text-market-foreground")}>{item}</Button>;
          })}
        </nav>

        {category !== "FX" ? <ComingSoon category={category} onBack={() => setCategory("FX")} /> : (
          <>
            <section className="mt-6">
              <TitleRow title="Market snapshot" note="Illustrative demo data" />
              <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
                {FX_MARKETS.map((market) => <Snapshot key={market.symbol} market={market} />)}
              </div>
              <p className="mt-2 text-[10px] text-market-muted">Demo values for education and interface preview. Not live prices, signals, or investment advice.</p>
            </section>

            <section className="mt-7 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {SHORTCUTS.map(({ id, label, icon: Icon }) => (
                <Button key={id} variant="ghost" onClick={() => setPanel(id)} className="h-[5.75rem] flex-col gap-2 rounded-xl border border-market-line bg-market-surface px-2 text-center text-[10px] font-bold text-market-muted hover:border-market-accent/60 hover:bg-market-elevated hover:text-market-foreground">
                  <span className="grid size-8 place-items-center rounded-lg bg-market-accent/15 text-market-accent"><Icon className="size-4" /></span>{label}
                </Button>
              ))}
            </section>

            <section className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">
              <div>
                <TitleRow title="Latest Market Updates" note="From approved FX instructors" />
                <div className="mt-3 space-y-4">
                  {updatesLoading ? <div className="grid min-h-40 place-items-center rounded-xl border border-market-line bg-market-surface"><Loader2 className="size-5 animate-spin text-market-accent" /></div> : null}
                  {!updatesLoading && !updates?.length ? <EmptyUpdates onInstructors={() => setPanel("instructors")} /> : null}
                  {updates?.slice(0, 5).map((update) => (
                    <div key={update.id} className="overflow-hidden rounded-xl border border-market-line bg-market-surface">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-market-line bg-market-elevated px-4 py-3">
                        <div><p className="text-[10px] font-extrabold uppercase text-market-accent">ASH Markets Update</p><h3 className="mt-0.5 text-sm font-bold text-market-foreground">{update.title}</h3></div>
                        <Link to="/markets/update/$marketPostId" params={{ marketPostId: update.id }} className="rounded-full border border-market-line px-2 py-1 text-[9px] font-bold uppercase text-market-lavender hover:border-market-accent">View discussion</Link>
                      </div>
                      <PostCard post={update.post} currentUserId={me} />
                    </div>
                  ))}
                </div>
              </div>

              <aside className="space-y-4">
                <InstructorInvitation onApply={() => setPanel("apply")} />
                <ChartPreview range={range} setRange={setRange} />
              </aside>
            </section>

            <section className="mt-8">
              <TitleRow title="Learn FX" note="Build strong foundations" />
              <div className="scrollbar-none mt-3 flex snap-x gap-3 overflow-x-auto pb-2">
                {LEARNING_ITEMS.map((item, index) => <article key={item.title} className="w-60 shrink-0 snap-start rounded-xl border border-market-line bg-market-surface p-4"><span className="text-[10px] font-extrabold uppercase text-market-accent">Lesson {index + 1}</span><h3 className="mt-3 font-bold text-market-foreground">{item.title}</h3><p className="mt-2 text-xs leading-relaxed text-market-muted">{item.description}</p></article>)}
              </div>
            </section>
          </>
        )}

        <p className="mx-auto mt-10 max-w-3xl text-center text-[11px] leading-relaxed text-market-muted">ASH Markets provides general information and education only. It does not execute trades, provide signals, guarantee outcomes, or offer personalized financial advice.</p>
      </div>

      <MarketPanel panel={panel} onClose={() => setPanel(null)} currentUserId={me} updates={updates ?? []} />
    </div>
  );
}

function TitleRow({ title, note }: { title: string; note: string }) {
  return <div className="flex items-end justify-between gap-3"><h2 className="font-display text-xl font-extrabold text-market-foreground">{title}</h2><span className="text-right text-[10px] font-semibold uppercase text-market-muted">{note}</span></div>;
}

function Snapshot({ market }: { market: (typeof FX_MARKETS)[number] }) {
  const up = market.change >= 0;
  return <article className="rounded-xl border border-market-line bg-market-surface p-3"><div className="flex items-start justify-between gap-2"><div><p className="font-bold text-market-foreground">{market.symbol}</p><p className="text-[9px] text-market-muted">{market.name}</p></div><span className={cn("mt-1 size-2 rounded-full", up ? "bg-market-positive" : "bg-market-negative")} /></div><p className="mt-3 font-display text-lg font-extrabold tabular-nums text-market-foreground">{market.price}</p><div className="mt-1 flex items-end justify-between"><span className={cn("text-[10px] font-bold", up ? "text-market-positive" : "text-market-negative")}>{up ? "+" : ""}{market.change.toFixed(2)}%</span><ChartContainer config={chartConfig} className="h-7 w-14"><LineChart data={market.trend}><Line type="monotone" dataKey="value" stroke={up ? "var(--color-market-positive)" : "var(--color-market-negative)"} strokeWidth={2} dot={false} /></LineChart></ChartContainer></div></article>;
}

function InstructorInvitation({ onApply }: { onApply: () => void }) {
  return <section className="relative overflow-hidden rounded-xl border border-market-accent/40 bg-market-feature p-5"><div className="absolute inset-0 bg-market-glow opacity-55" aria-hidden /><div className="relative"><span className="grid size-10 place-items-center rounded-lg bg-market-accent text-market-accent-foreground"><GraduationCap className="size-5" /></span><p className="mt-5 text-[10px] font-extrabold uppercase text-market-lavender">Teach on ASH Markets</p><h2 className="mt-2 font-display text-xl font-extrabold text-market-foreground">Become an ASH Verified FX Instructor</h2><p className="mt-2 text-sm font-semibold text-market-lavender">Share your knowledge. Teach. Build your reputation.</p><Button onClick={onApply} className="mt-5 bg-market-foreground text-market-background hover:bg-market-foreground/90">Apply Now <ChevronRight className="size-4" /></Button><p className="mt-3 text-[10px] text-market-muted">Typically reviewed within 24–48 hours.</p></div></section>;
}

function ChartPreview({ range, setRange }: { range: MarketRange; setRange: (value: MarketRange) => void }) {
  return <section className="rounded-xl border border-market-line bg-market-surface p-4"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase text-market-accent">Demo chart</p><h3 className="mt-1 font-bold text-market-foreground">EUR/USD</h3></div><span className="text-xs font-bold text-market-positive">+0.28%</span></div><ChartContainer config={chartConfig} className="mt-3 h-36 w-full"><AreaChart data={EUR_USD_SERIES[range]} margin={{ top: 8, right: 4, left: -32, bottom: 0 }}><defs><linearGradient id="marketMiniFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-market-accent)" stopOpacity={0.45}/><stop offset="100%" stopColor="var(--color-market-accent)" stopOpacity={0}/></linearGradient></defs><CartesianGrid vertical={false} strokeDasharray="3 5" /><XAxis dataKey="label" hide /><YAxis hide domain={["dataMin - 0.002", "dataMax + 0.002"]}/><Tooltip content={<ChartTooltipContent indicator="line" />} /><Area type="monotone" dataKey="value" stroke="var(--color-market-accent)" strokeWidth={2} fill="url(#marketMiniFill)" /></AreaChart></ChartContainer><div className="mt-2 flex gap-1">{MARKET_RANGES.slice(0,4).map((item) => <Button key={item} size="sm" variant="ghost" onClick={() => setRange(item)} className={cn("h-7 flex-1 px-1 text-[10px] text-market-muted", range === item && "bg-market-accent text-market-accent-foreground")}>{item}</Button>)}</div><p className="mt-3 text-[9px] text-market-muted">Illustrative demo only—not live market data.</p></section>;
}

function EmptyUpdates({ onInstructors }: { onInstructors: () => void }) {
  return <div className="rounded-xl border border-dashed border-market-line bg-market-surface p-7 text-center"><Sparkles className="mx-auto size-6 text-market-accent"/><h3 className="mt-3 font-bold text-market-foreground">Instructor updates will appear here</h3><p className="mx-auto mt-2 max-w-md text-sm text-market-muted">Only approved FX instructors can publish. Posts use ASH Glo’s existing reactions, comments, replies, and reposts.</p><Button variant="outline" onClick={onInstructors} className="mt-4 border-market-line bg-market-elevated text-market-foreground">Explore instructors</Button></div>;
}

function ComingSoon({ category, onBack }: { category: Exclude<MarketCategory, "FX">; onBack: () => void }) {
  return <section className="mt-8 grid min-h-72 place-items-center rounded-xl border border-market-line bg-market-surface p-8 text-center"><div><BarChart3 className="mx-auto size-8 text-market-accent"/><h2 className="mt-4 font-display text-2xl font-extrabold text-market-foreground">{category} — Coming Soon</h2><p className="mx-auto mt-2 max-w-sm text-sm text-market-muted">This category is being prepared for a later ASH Markets release. FX remains the active educational experience.</p><Button onClick={onBack} className="mt-5 bg-market-accent text-market-accent-foreground">Return to FX</Button></div></section>;
}

function MarketPanel({ panel, onClose, currentUserId, updates }: { panel: Panel; onClose: () => void; currentUserId: string | null; updates: ReturnType<typeof useMarketUpdates>["data"] }) {
  const titles: Record<Exclude<Panel, null>, string> = { analysis: "Market Analysis", updates: "Market Updates", news: "Market News", calendar: "Economic Calendar", instructors: "FX Instructors", learn: "Learn FX", apply: "FX Instructor Application", publish: "Publish to ASH Markets" };
  return <Sheet open={panel !== null} onOpenChange={(value) => { if (!value) onClose(); }}><SheetContent side="right" className="market-theme w-full overflow-y-auto border-market-line bg-market-background p-0 sm:max-w-xl"><SheetHeader className="sticky top-0 z-10 border-b border-market-line bg-market-background/90 p-5 pr-12 text-left backdrop-blur-xl"><SheetTitle className="font-display text-xl font-extrabold text-market-foreground">{panel ? titles[panel] : "ASH Markets"}</SheetTitle><SheetDescription className="text-market-muted">Educational and informational content only.</SheetDescription></SheetHeader><div className="p-5">{panel === "analysis" ? <AnalysisPanel /> : null}{panel === "news" ? <NewsPanel /> : null}{panel === "calendar" ? <CalendarPanel /> : null}{panel === "learn" ? <LearnPanel /> : null}{panel === "instructors" ? <InstructorsPanel /> : null}{panel === "apply" ? <InstructorApplication /> : null}{panel === "publish" ? <MarketComposer onDone={onClose} /> : null}{panel === "updates" ? <div className="space-y-4">{updates?.map((item) => <div key={item.id} className="overflow-hidden rounded-xl border border-market-line"><div className="bg-market-elevated px-4 py-3"><p className="text-[10px] font-bold uppercase text-market-accent">ASH Markets Update</p><p className="font-bold text-market-foreground">{item.title}</p></div><PostCard post={item.post} currentUserId={currentUserId} /></div>)}</div> : null}</div></SheetContent></Sheet>;
}

function AnalysisPanel() { return <div className="space-y-3">{ANALYSIS_ITEMS.map((item, index) => <article key={item.title} className="rounded-xl border border-market-line bg-market-surface p-5"><span className="text-[10px] font-extrabold uppercase text-market-accent">Market Observation {index + 1}</span><h3 className="mt-2 font-bold text-market-foreground">{item.title}</h3><p className="mt-2 text-sm leading-relaxed text-market-muted">{item.body}</p></article>)}</div>; }
function NewsPanel() { return <div className="space-y-3">{MARKET_NEWS.map((item) => <article key={item.headline} className="rounded-xl border border-market-line bg-market-surface p-4"><span className="text-[10px] font-bold uppercase text-market-accent">{item.source} · Demo</span><h3 className="mt-2 font-bold text-market-foreground">{item.headline}</h3><p className="mt-2 text-sm text-market-muted">{item.summary}</p><p className="mt-3 text-[10px] text-market-muted">{item.time}</p></article>)}</div>; }
function CalendarPanel() { return <div className="overflow-hidden rounded-xl border border-market-line">{ECONOMIC_EVENTS.map((item) => <article key={item.event} className="grid grid-cols-[auto_1fr] gap-3 border-b border-market-line bg-market-surface p-4 last:border-b-0"><span className="h-fit rounded bg-market-accent/15 px-2 py-1 text-[10px] font-bold text-market-accent">{item.country}</span><div><h3 className="font-bold text-market-foreground">{item.event}</h3><p className="mt-1 text-xs text-market-muted">{item.date} · {item.importance} impact</p><p className="mt-2 text-[10px] text-market-muted">Expected {item.expected} · Previous {item.previous} · Demo schedule</p></div></article>)}</div>; }
function LearnPanel() { return <div className="space-y-3">{LEARNING_ITEMS.map((item, index) => <article key={item.title} className="rounded-xl border border-market-line bg-market-surface p-5"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-lg bg-market-accent text-market-accent-foreground"><BookOpen className="size-4"/></span><div><p className="text-[10px] font-bold uppercase text-market-muted">Lesson {index + 1}</p><h3 className="font-bold text-market-foreground">{item.title}</h3></div></div><p className="mt-3 text-sm text-market-muted">{item.description}</p></article>)}</div>; }

function InstructorsPanel() {
  const { data: instructors, isLoading } = useFxInstructors();
  if (isLoading) return <Loader2 className="mx-auto mt-10 size-5 animate-spin text-market-accent" />;
  if (!instructors?.length) return <div className="py-12 text-center"><Users className="mx-auto size-7 text-market-accent"/><h3 className="mt-3 font-bold text-market-foreground">No approved instructors yet</h3><p className="mt-2 text-sm text-market-muted">Profiles appear here only after a real application review and approval.</p></div>;
  return <div className="space-y-3">{instructors.map((item) => <article key={item.id} className="rounded-xl border border-market-line bg-market-surface p-4"><div className="flex gap-3"><Avatar path={item.avatar_url} name={item.full_name} className="size-12"/><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-market-foreground">{item.full_name}</h3><span className="rounded-full bg-market-accent px-2 py-0.5 text-[9px] font-extrabold text-market-accent-foreground">ASH VERIFIED FX INSTRUCTOR</span></div><p className="text-xs text-market-lavender">@{item.username ?? "profile"} · {item.follower_count} followers</p></div></div><p className="mt-3 text-sm text-market-muted">{item.about || item.experience_summary || "Professional instructor profile."}</p><div className="mt-3 flex flex-wrap gap-1.5">{item.specialties.map((specialty) => <span key={specialty} className="rounded-full border border-market-line px-2 py-1 text-[10px] text-market-muted">{specialty}</span>)}</div><Button asChild variant="outline" size="sm" className="mt-4 border-market-line bg-market-elevated text-market-foreground"><Link to="/markets/instructors/$instructorId" params={{ instructorId: item.id }}>View professional profile</Link></Button></article>)}</div>;
}

function MarketComposer({ onDone }: { onDone: () => void }) {
  const { data: instructor } = useMyFxInstructorProfile();
  const createSocial = useCreateSocialPost();
  const createMarket = useCreateMarketPost();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [instrument, setInstrument] = useState("");
  const [contentType, setContentType] = useState("MARKET_UPDATE");
  const [files, setFiles] = useState<File[]>([]);
  if (!instructor) return <p className="rounded-xl border border-market-line bg-market-surface p-5 text-sm text-market-muted">Publishing is available only after your FX instructor application is approved.</p>;
  const approvedInstructor = instructor;
  async function publish() {
    if (title.trim().length < 3 || (!body.trim() && !files.length)) { toast.error("Add a title and educational content."); return; }
    try {
      const socialPostId = await createSocial.mutateAsync({ caption: body.trim(), files });
      await createMarket.mutateAsync({ socialPostId, instructorId: approvedInstructor.id, contentType, title, instrument });
      toast.success("Market update published.");
      onDone();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not publish the update."); }
  }
  const busy = createSocial.isPending || createMarket.isPending;
  return <div className="space-y-4"><select value={contentType} onChange={(e) => setContentType(e.target.value)} className="h-10 w-full rounded-md border border-market-line bg-market-elevated px-3 text-sm text-market-foreground"><option value="MARKET_UPDATE">Market Update</option><option value="FX_ANALYSIS">FX Analysis</option><option value="ARTICLE">Educational Article</option><option value="EDUCATIONAL_POST">Educational Post</option><option value="MARKET_COMMENTARY">Market Commentary</option><option value="CHART">Chart</option><option value="IMAGE">Image</option><option value="SPOTLIGHT">Spotlight reference</option></select><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={180} placeholder="Update title"/><Input value={instrument} onChange={(e) => setInstrument(e.target.value)} maxLength={40} placeholder="Instrument, e.g. EUR/USD (optional)"/><Textarea value={body} onChange={(e) => setBody(e.target.value.slice(0,1200))} rows={8} placeholder="Share a neutral market observation, technical analysis, or educational discussion…"/><input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0,4))}/><Button variant="outline" onClick={() => fileRef.current?.click()} className="w-full border-market-line bg-market-elevated text-market-foreground"><ImagePlus className="size-4"/> {files.length ? `${files.length} image${files.length > 1 ? "s" : ""} selected` : "Add images"}</Button><div className="rounded-xl border border-market-line bg-market-surface p-3 text-xs leading-relaxed text-market-muted">Keep content educational and neutral. No signals, guarantees, trade execution, or personalized financial advice.</div><Button onClick={() => void publish()} disabled={busy} className="w-full bg-market-accent text-market-accent-foreground">{busy ? <Loader2 className="size-4 animate-spin"/> : <PenLine className="size-4"/>}{busy ? "Publishing…" : "Publish Market Update"}</Button></div>;
}