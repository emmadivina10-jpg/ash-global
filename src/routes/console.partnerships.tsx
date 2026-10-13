import { createFileRoute } from "@tanstack/react-router";
import { WorkBoard } from "@/components/console/WorkBoard";

export const Route = createFileRoute("/console/partnerships")({
  ssr: false,
  component: () => (
    <WorkBoard
      department="PARTNERSHIPS"
      title="Partnerships"
      blurb="Recruit companies, churches, schools and organisations."
      leadType="ORGANISATION"
    />
  ),
});
