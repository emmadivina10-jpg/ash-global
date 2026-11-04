import { createFileRoute } from "@tanstack/react-router";
import { FindInstructorPage } from "@/components/refer/CampusDirectory";

export const Route = createFileRoute("/_browse/campus/")({
  head: () => ({ meta: [
    { title: "ASH Campus — Instructor channels" },
    { name: "description", content: "Explore ASH instructor channels and open your creator space." },
    { property: "og:title", content: "ASH Campus — Instructor channels" },
    { property: "og:description", content: "Find an ASH instructor and explore their videos, teaching and reviews." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: FindInstructorPage,
});
