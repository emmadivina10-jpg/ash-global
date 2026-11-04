import { createFileRoute } from "@tanstack/react-router";
import { SocialHub } from "@/components/refer/SocialHub";

export const Route = createFileRoute("/_browse/feed")({
  head: () => ({
    meta: [
      { title: "ASH Feed — the community wall" },
      {
        name: "description",
        content:
          "Share photos, follow friends and discover what the ASH community is building today.",
      },
      { property: "og:title", content: "ASH Feed — the community wall" },
      {
        property: "og:description",
        content: "Photos, likes, comments and reposts from real ASH members.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FeedPage,
});

function FeedPage() {
  return <SocialHub redirectToDiscover />;
}
