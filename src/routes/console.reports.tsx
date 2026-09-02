import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Flag, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { listReports, resolveReport } from "@/lib/moderation.functions";
import { LoadingState } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/console/reports")({
  ssr: false,
  component: ReportsPage,
});

const FILTERS = ["OPEN", "REVIEWING", "ACTIONED", "DISMISSED", "ALL"] as const;

function ReportsPage() {
  const load = useServerFn(listReports);
  const resolve = useServerFn(resolveReport);
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<(typeof FILTERS)[number]>("OPEN");

  const { data, isLoading } = useQuery({
    queryKey: ["console", "reports", status],
    queryFn: () => load({ data: { status } }),
  });

  const mutate = useMutation({
    mutationFn: (input: { id: string; status: string }) => resolve({ data: input }),
    onSuccess: async () => {
      toast.success("Report updated");
      await queryClient.invalidateQueries({ queryKey: ["console", "reports"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading) return <LoadingState label="Loading safety reports…" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold text-foreground">Safety reports</h2>
          <p className="text-sm text-muted-foreground">
            User reports of objectionable content. Store policy requires action within 24 hours.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Flag className="size-3.5" aria-hidden /> {data?.openCount ?? 0} open
          </span>
          <span className="flex items-center gap-1">
            <ShieldOff className="size-3.5" aria-hidden /> {data?.blocks ?? 0} blocks
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f}
            size="sm"
            variant={status === f ? "default" : "outline"}
            onClick={() => setStatus(f)}
            className="rounded-full"
          >
            {f}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {(data?.reports ?? []).length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
            Nothing in this queue.
          </p>
        ) : (
          (data?.reports ?? []).map((report) => (
            <article key={report.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full border-0 bg-primary/10 text-[10px] text-primary">
                  {report.target_type}
                </Badge>
                <span className="text-sm font-bold text-foreground">{report.reason}</span>
                <Badge className="rounded-full border-0 bg-muted text-[10px] text-muted-foreground">
                  {report.status}
                </Badge>
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(report.created_at).toLocaleString("en-GB")}
                </span>
              </div>
              {report.details ? <p className="mt-2 text-sm text-muted-foreground">{report.details}</p> : null}
              <p className="mt-1 break-all text-[11px] text-muted-foreground">
                target: {report.target_id ?? "—"} · user: {report.target_user_id ?? "—"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={mutate.isPending}
                  onClick={() => mutate.mutate({ id: report.id, status: "REVIEWING" })}
                >
                  Reviewing
                </Button>
                <Button
                  size="sm"
                  disabled={mutate.isPending}
                  onClick={() => mutate.mutate({ id: report.id, status: "ACTIONED" })}
                >
                  Actioned
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={mutate.isPending}
                  onClick={() => mutate.mutate({ id: report.id, status: "DISMISSED" })}
                >
                  Dismiss
                </Button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
