import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Flag, ShieldOff, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  listMediaModerationCases,
  listReports,
  resolveReport,
  reviewMediaModerationCase,
  runReleaseCleanup,
} from "@/lib/moderation.functions";
import { LoadingState } from "@/components/refer/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrustSafetyPanel } from "@/components/console/TrustSafetyPanel";

export const Route = createFileRoute("/console/reports")({
  ssr: false,
  component: ReportsPage,
});

const FILTERS = ["OPEN", "REVIEWING", "ACTIONED", "DISMISSED", "ALL"] as const;

function ReportsPage() {
  const load = useServerFn(listReports);
  const resolve = useServerFn(resolveReport);
  const loadMediaCases = useServerFn(listMediaModerationCases);
  const reviewMediaCase = useServerFn(reviewMediaModerationCase);
  const releaseCleanup = useServerFn(runReleaseCleanup);
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<(typeof FILTERS)[number]>("OPEN");

  const { data, isLoading } = useQuery({
    queryKey: ["console", "reports", status],
    queryFn: () => load({ data: { status } }),
  });
  const mediaCases = useQuery({
    queryKey: ["console", "media-moderation"],
    queryFn: loadMediaCases,
  });

  const mutate = useMutation({
    mutationFn: (input: { id: string; status: string }) => resolve({ data: input }),
    onSuccess: async () => {
      toast.success("Report updated");
      await queryClient.invalidateQueries({ queryKey: ["console", "reports"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const reviewCase = useMutation({
    mutationFn: (input: { caseId: string; decision: "UPHELD" | "CLEARED" }) =>
      reviewMediaCase({
        data: {
          ...input,
          note:
            input.decision === "CLEARED"
              ? "Cleared after administrator review."
              : "Restriction upheld after review.",
        },
      }),
    onSuccess: async () => {
      toast.success("Safety review updated");
      await queryClient.invalidateQueries({ queryKey: ["console", "media-moderation"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  const cleanup = useMutation({
    mutationFn: () => releaseCleanup(),
    onSuccess: (counts) =>
      toast.success(`Cleanup complete: ${counts.expired_stories ?? 0} expired stories removed.`),
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading) return <LoadingState label="Loading safety reports…" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-extrabold text-foreground">Safety reports</h2>
          <p className="text-sm text-muted-foreground">
            User reports of objectionable content for Trust & Safety review.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Flag className="size-3.5" aria-hidden /> {data?.openCount ?? 0} open
          </span>
          <span className="flex items-center gap-1">
            <ShieldOff className="size-3.5" aria-hidden /> {data?.blocks ?? 0} blocks
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={cleanup.isPending}
            onClick={() => cleanup.mutate()}
          >
            <Trash2 className="size-3.5" aria-hidden />
            {cleanup.isPending ? "Cleaning…" : "Pre-release cleanup"}
          </Button>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" aria-hidden />
          <h3 className="font-bold text-foreground">Automated media reviews</h3>
          <Badge className="ml-auto rounded-full border-0 bg-destructive/10 text-destructive">
            {(mediaCases.data ?? []).filter((item) => item.status === "PENDING_REVIEW").length}{" "}
            pending
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Removed files are never displayed here. The CEO can clear a mistaken restriction.
        </p>
        <div className="mt-4 space-y-3">
          {(mediaCases.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No automated media cases.</p>
          ) : (
            (mediaCases.data ?? []).map((item) => (
              <article
                key={item.id}
                className="rounded-xl border border-border bg-background/50 p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-foreground">{item.member_name}</span>
                  <Badge variant="outline">{item.verdict}</Badge>
                  <Badge variant="outline">{item.status.replace(/_/g, " ")}</Badge>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleString("en-GB")}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{item.reason}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.content_type} · confidence {Math.round((item.confidence ?? 0) * 100)}%
                </p>
                {item.status === "PENDING_REVIEW" ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={reviewCase.isPending}
                      onClick={() => reviewCase.mutate({ caseId: item.id, decision: "UPHELD" })}
                    >
                      Uphold restriction
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={reviewCase.isPending}
                      onClick={() => reviewCase.mutate({ caseId: item.id, decision: "CLEARED" })}
                    >
                      Clear and restore
                    </Button>
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>
      </section>

      <TrustSafetyPanel />
    </div>
  );
}
