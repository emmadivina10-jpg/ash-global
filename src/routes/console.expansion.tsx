import { createFileRoute } from "@tanstack/react-router";
import { WorkBoard } from "@/components/console/WorkBoard";
import { ExpansionWorkspace } from "@/components/console/ExpansionWorkspace";

export const Route = createFileRoute("/console/expansion")({
  ssr: false,
  component: () => (
    <div className="space-y-10">
      <ExpansionWorkspace />
      <WorkBoard
        department="EXPANSION"
        title="Expansion"
        blurb="City by city acquisition of users and providers."
        leadType="BUSINESS"
      />
    </div>
  ),
});
