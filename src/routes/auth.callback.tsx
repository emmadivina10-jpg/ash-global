import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { nextOnboardingRoute } from "@/lib/consent";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { next?: string } =>
    typeof search["next"] === "string" ? { next: search["next"] } : {},
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const returnTo = pendingReturn(Route.useSearch().next);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      // Give Supabase a moment to exchange the OAuth code / hash for a session.
      for (let attempt = 0; attempt < 20; attempt++) {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session) {
          if (returnTo) {
            navigate({ href: returnTo, replace: true });
            return;
          }
          const next = await nextOnboardingRoute(data.session.user.id);
          if (cancelled) return;
          navigate({ to: next, replace: true });
          return;
        }
        await new Promise((r) => setTimeout(r, 250));
      }
      if (!cancelled) navigate({ to: "/login", replace: true });
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-sm">Signing you in…</span>
      </div>
    </div>
  );
}
