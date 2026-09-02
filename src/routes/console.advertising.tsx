import { createFileRoute } from "@tanstack/react-router";
import { WorkBoard } from "@/components/console/WorkBoard";

export const Route = createFileRoute("/console/advertising")({
  ssr: false,
  component: () => (
    <WorkBoard department="ADVERTISING" title="Advertising" blurb="Sell promoted listings and campaigns to businesses." leadType="BUSINESS" />
  ),
});
