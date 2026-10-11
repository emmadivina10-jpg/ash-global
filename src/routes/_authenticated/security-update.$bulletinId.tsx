import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/security-update/$bulletinId")({
  head: () => ({
    meta: [
      { title: "Security update — ASH" },
      { name: "description", content: "An official security update from the ASH Cybersecurity team." },
      { property: "og:title", content: "Security update — ASH" },
      { property: "og:description", content: "An official security update from the ASH Cybersecurity team." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SecurityUpdatePage,
});

function SecurityUpdatePage() {
  const { bulletinId } = Route.useParams();
  const { data, isPending } = useQuery({
    queryKey: ["security-bulletin", bulletinId],
    queryFn: async () => {
      const { data } = await supabase.from("security_bulletins").select("id, title, body, severity, created_at").eq("id", bulletinId).maybeSingle();
      return data;
    },
  });
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-2 text-primary"><ShieldCheck className="size-5" /><span className="text-sm font-bold uppercase tracking-wide">ASH Cybersecurity update</span></div>
      {isPending ? <p className="text-sm text-muted-foreground">Loading…</p> : !data ? (
        <p className="text-sm text-muted-foreground">This security update is no longer available. <Link to="/notifications" className="underline">Back to notifications</Link></p>
      ) : (
        <article className="rounded-3xl border border-border bg-card p-6">
          <p className="text-xs text-muted-foreground">{data.severity} · {formatDateTime(data.created_at)}</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold">{data.title}</h1>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{data.body}</p>
        </article>
      )}
    </div>
  );
}
