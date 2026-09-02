import { createFileRoute } from "@tanstack/react-router";
import { WorkBoard } from "@/components/console/WorkBoard";

export const Route = createFileRoute("/console/sales")({
  ssr: false,
  component: () => (
    <WorkBoard department="SALES" title="Sales" blurb="Contact businesses and sell ASH services and products." leadType="BUSINESS" />
  ),
});
