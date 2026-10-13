import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/console/operations")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Operations — ASH Console" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: () => (
    <section className="rounded-2xl border border-border bg-card p-5">
      <p className="font-display text-sm font-extrabold uppercase tracking-[0.2em] text-foreground">
        Operational tasks
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Your daily operations tasks appear in the task list above. Mark each one done when it is
        finished — completed tasks feed your performance chart.
      </p>
    </section>
  ),
});
