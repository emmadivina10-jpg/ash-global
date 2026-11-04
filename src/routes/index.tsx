import { createFileRoute } from "@tanstack/react-router";
import { BrowseEntry } from "@/components/refer/BrowseEntry";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ASH Glo — Discover" },
      { name: "description", content: "Explore videos, creators, courses and services on ASH Glo. Sign in when you are ready to take action." },
      { property: "og:title", content: "ASH Glo — Discover" },
      { property: "og:description", content: "Explore videos, creators, courses and services on ASH Glo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://ashglogroup.company/" }],
  }),
  component: BrowseEntry,
});
