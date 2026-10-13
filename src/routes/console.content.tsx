import { createFileRoute } from "@tanstack/react-router";
import { WorkBoard } from "@/components/console/WorkBoard";

export const Route = createFileRoute("/console/content")({
  ssr: false,
  component: () => (
    <WorkBoard
      department="CONTENT"
      title="Content & Creators"
      blurb="Recruit creators and produce content that grows ASH."
      leadType="CREATOR"
    />
  ),
});
