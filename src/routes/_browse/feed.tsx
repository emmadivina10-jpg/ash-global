import { createFileRoute, redirect } from "@tanstack/react-router";

// The old Home/Feed tab now lives inside Spotlight; keep old URLs working.
export const Route = createFileRoute("/_browse/feed")({
  beforeLoad: () => {
    throw redirect({ to: "/spotlight", replace: true });
  },
});
