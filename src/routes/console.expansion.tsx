import { createFileRoute } from "@tanstack/react-router";
import { WorkBoard } from "@/components/console/WorkBoard";

export const Route = createFileRoute("/console/expansion")({
  ssr: false,
  component: () => (
    <WorkBoard department="EXPANSION" title="Expansion" blurb="City by city acquisition of users and providers." leadType="BUSINESS" />
  ),
});
