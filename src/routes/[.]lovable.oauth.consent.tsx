import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/components/refer/AuthLayout";

type AuthDetails = {
  client?: { name?: string; client_name?: string; uri?: string } | null;
  redirect_uri?: string;
  redirect_url?: string;
  redirect_to?: string;
  scope?: string;
  user?: { email?: string } | null;
};

const SCOPE_LABELS: Record<string, string> = {
  openid: "Confirm your ASH Glo identity",
  profile: "Share your name and profile photo",
  email: "Share your email address",
  phone: "Share your phone number",
  offline_access: "Stay connected without signing in again",
};

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s["authorization_id"] === "string" ? s["authorization_id"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Connect an app — ASH Glo" },
      { name: "description", content: "Approve or deny an app's request to sign in with ASH Glo." },
      { property: "og:title", content: "Connect an app — ASH Glo" },
      { property: "og:description", content: "Approve or deny a Sign in with ASH Glo request." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("This sign-in request is missing its ID.");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { next: location.pathname + location.searchStr } });
    }
  },
  loader: async ({ location }) => {
    const id = new URLSearchParams(location.search).get("authorization_id") ?? "";
    const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(id);
    if (error) throw new Error(error.message);
    const details = data as unknown as AuthDetails;
    const immediate = details?.redirect_url ?? details?.redirect_to;
    if (immediate && !details?.client) throw redirect({ href: immediate });
    return details;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <AuthLayout title="Request unavailable" subtitle="This sign-in request could not be loaded.">
      <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
        {error instanceof Error ? error.message : String(error)}
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        It may have expired. Go back to the app and start signing in again.
      </p>
    </AuthLayout>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const name = details?.client?.name ?? details?.client?.client_name ?? "This app";
  const scopes = (details?.scope ?? "openid").split(/\s+/).filter(Boolean);
  let host: string | null = null;
  try {
    host = details?.redirect_uri ? new URL(details.redirect_uri).host : null;
  } catch {
    host = null;
  }

  async function decide(approve: boolean) {
    setBusy(approve ? "approve" : "deny");
    setError(null);
    const { data, error: err } = approve
      ? await supabase.auth.oauth.approveAuthorization(authorization_id)
      : await supabase.auth.oauth.denyAuthorization(authorization_id);
    if (err) {
      setBusy(null);
      setError(err.message);
      return;
    }
    const result = data as unknown as AuthDetails;
    const target = result?.redirect_url ?? result?.redirect_to;
    if (!target) {
      setBusy(null);
      setError("The sign-in service did not return a destination. Please try again.");
      return;
    }
    window.location.href = target;
  }

  return (
    <AuthLayout
      title={`Connect ${name} to ASH Glo`}
      subtitle={`${name} wants to sign you in with your ASH Glo account.`}
    >
      <div className="space-y-4">
        {details?.user?.email ? (
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-semibold text-foreground">{details.user.email}</span>
          </p>
        ) : null}
        {host ? (
          <p className="text-sm text-muted-foreground">
            You'll be returned to <span className="font-semibold text-foreground">{host}</span>
          </p>
        ) : null}
        <ul className="space-y-2 rounded-xl border border-border p-4">
          {scopes.map((scope) => (
            <li key={scope} className="flex items-start gap-2 text-sm">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              {SCOPE_LABELS[scope] ?? `Additional permission requested: ${scope}`}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          Your password, wallet, bookings and messages are never shared. You can disconnect this
          app at any time.
        </p>
        {error ? (
          <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            variant="outline"
            className="h-12"
            disabled={busy !== null}
            onClick={() => void decide(false)}
          >
            {busy === "deny" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Cancel connection
          </Button>
          <Button className="h-12" disabled={busy !== null} onClick={() => void decide(true)}>
            {busy === "approve" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Approve
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}
