import { createFileRoute } from "@tanstack/react-router";
import { WorkBoard } from "@/components/console/WorkBoard";

export const Route = createFileRoute("/console/merchant")({
  ssr: false,
  component: () => (
    <WorkBoard department="MERCHANT" title="Merchants" blurb="Recruit shops, restaurants and businesses onto ASH." leadType="BUSINESS" />
  ),
});
