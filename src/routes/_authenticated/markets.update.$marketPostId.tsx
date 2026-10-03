import { useEffect, useState } from "react";
import { useTrackView } from "@/lib/activity";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Bookmark, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SafetyMenu } from "@/components/refer/SafetyMenu";
import { PostCard } from "@/components/refer/PostCard";
import { Button } from "@/components/ui/button";
import { useMarketSaveState, useMarketUpdate, useToggleMarketSave } from "@/lib/market-ecosystem.queries";

export const Route = createFileRoute("/_authenticated/markets/update/$marketPostId")({
  head: () => ({ meta: [{ title: "Market Update — ASH Markets" }, { name: "description", content: "Read an educational ASH Markets update and join its discussion." }, { property: "og:title", content: "Market Update — ASH Markets" }, { property: "og:description", content: "Educational market discussion from ASH Markets." }, { property: "og:type", content: "article" }, { name: "twitter:card", content: "summary" }] }),
  component: MarketUpdatePage,
});

function MarketUpdatePage() {
  const { marketPostId } = Route.useParams();
  const { data, isLoading } = useMarketUpdate(marketPostId);
  const { data: saved } = useMarketSaveState(marketPostId);
  const toggleSave = useToggleMarketSave();
  const [me, setMe] = useState<string | null>(null);
  useEffect(() => { void supabase.auth.getUser().then(({ data: auth }) => setMe(auth.user?.id ?? null)); }, []);
  useTrackView({ event_type: "view", surface: "markets", target_type: "market_post", target_id: marketPostId }, Boolean(data));
  return <div className="market-theme -mx-4 -mt-5 min-h-screen bg-market-background px-4 py-5 text-market-foreground sm:-mx-6 sm:-mt-6 sm:px-6 lg:-mx-8"><div className="mx-auto max-w-2xl"><header className="mb-5 flex items-center justify-between gap-3"><Button asChild variant="ghost" className="text-market-foreground"><Link to="/fx-analytics"><ArrowLeft className="size-4"/>ASH Markets</Link></Button><Button variant="outline" size="sm" disabled={toggleSave.isPending} onClick={() => toggleSave.mutate({ marketPostId, saved: Boolean(saved) }, { onError: () => toast.error("Could not update saved posts.") })} className="border-market-line bg-market-surface text-market-foreground"><Bookmark className="size-4" fill={saved ? "currentColor" : "none"}/>{saved ? "Saved" : "Save"}</Button></header>{isLoading ? <Loader2 className="mx-auto mt-20 size-6 animate-spin text-market-accent"/> : data ? <><section className="rounded-t-xl border border-market-line bg-market-elevated p-4"><p className="text-[10px] font-extrabold uppercase text-market-accent">ASH Markets · {data.educational_label}</p><div className="flex items-start justify-between gap-2"><h1 className="mt-2 font-display text-2xl font-extrabold text-market-foreground">{data.title}</h1>{me && data.author_id && data.author_id !== me ? <SafetyMenu targetType="MARKET" targetId={data.id} targetUserId={data.author_id} targetName={data.title} allowBlock={false} triggerClassName="text-market-muted" /> : null}</div>{data.instrument ? <p className="mt-1 text-sm text-market-lavender">{data.instrument}</p> : null}</section><PostCard post={data.post} currentUserId={me} detail /><p className="mt-5 text-center text-[10px] text-market-muted">Educational information only. No signal, guarantee, execution, or personalized advice.</p></> : <p className="py-20 text-center text-sm text-market-muted">This Market update is unavailable.</p>}</div></div>;
}
