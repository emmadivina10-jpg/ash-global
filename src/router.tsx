import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

/** Cyber "force logout": the server rejects revoked sessions, the browser signs out. */
function signOutWhenRevoked(error: unknown) {
  const m = error instanceof Error ? error.message : String(error);
  if (typeof window === "undefined" || !/SESSION_REVOKED|SECURITY_LOCKED/.test(m)) return;
  void import("@/integrations/supabase/client")
    .then(({ supabase }) => supabase.auth.signOut())
    .finally(() => {
      window.location.assign("/login");
    });
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({ onError: signOutWhenRevoked }),
    mutationCache: new MutationCache({ onError: signOutWhenRevoked }),
    defaultOptions: {
      queries: {
        // Snappy navigation: serve cached data instantly, revalidate quietly.
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadDelay: 30,
    defaultPreloadStaleTime: 30_000,
  });

  return router;
};
