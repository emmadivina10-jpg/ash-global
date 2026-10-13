import { createFileRoute } from "@tanstack/react-router";
import { AshInvestment } from "@/components/refer/AshInvestment";
export const Route = createFileRoute("/_authenticated/investment")({
  head: () => ({
    meta: [
      { title: "ASH Investment — Market Preview | ASH Glo" },
      {
        name: "description",
        content:
          "An illustrative preview of ASH marketplace analysis. Investments are not open and no live valuations or returns are shown.",
      },
      { property: "og:title", content: "ASH Investment — Market Preview" },
      {
        property: "og:description",
        content:
          "Explore the ASH market chart preview. No live investment activity or financial signals.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AshInvestment,
});
