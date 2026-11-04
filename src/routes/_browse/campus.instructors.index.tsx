import { createFileRoute } from "@tanstack/react-router";
import { FindInstructorPage } from "@/components/refer/CampusDirectory";

export const Route = createFileRoute("/_browse/campus/instructors/")({
  head: () => ({
    meta: [
      { title: "Find Someone Who Can Teach You — ASH Campus" },
      {
        name: "description",
        content:
          "Find instructors for school, university, languages, professional skills and international exam preparation including TCF Canada, TEF Canada, IELTS and CELPIP.",
      },
      { property: "og:title", content: "Find Someone Who Can Teach You — ASH Campus" },
      {
        property: "og:description",
        content:
          "Search ASH instructors worldwide by subject, exam, language, level, country and teaching mode.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FindInstructorPage,
});

