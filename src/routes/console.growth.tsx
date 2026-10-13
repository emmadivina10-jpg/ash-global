import { createFileRoute } from "@tanstack/react-router";
import { WorkBoard } from "@/components/console/WorkBoard";

export const Route = createFileRoute("/console/growth")({
  ssr: false,
  component: () => (
    <WorkBoard
      department="GROWTH"
      title="Growth & Acquisition"
      blurb="Find businesses and providers and bring them onto ASH."
      leadType="BUSINESS"
    />
  ),
});
