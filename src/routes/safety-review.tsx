import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/refer/Logo";

export const Route = createFileRoute("/safety-review")({
  validateSearch: (search: Record<string, unknown>): { identity?: boolean; banned?: boolean } => ({
    identity: search["identity"] === true || search["identity"] === "true",
    banned: search["banned"] === true || search["banned"] === "true",
  }),
  head: () => ({
    meta: [
      { title: "Account safety review — ASH" },
      {
        name: "description",
        content: "Information about an ASH account safety review and how to contact support.",
      },
      { property: "og:title", content: "Account safety review — ASH" },
      {
        property: "og:description",
        content: "Information about an ASH account safety review and how to contact support.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SafetyReviewPage,
});

function SafetyReviewPage() {
  const { identity, banned } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  return (
    <main className="safe-top grid min-h-dvh place-items-center bg-background px-5 py-10">
      <section className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="size-7" aria-hidden />
        </span>
        <h1
          className={`mt-5 font-display text-2xl font-extrabold ${identity ? "text-destructive" : "text-foreground"}`}
        >
          {identity ? "Denied" : "Account under safety review"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {identity
            ? banned
              ? "This account was banned after more than three attempts to reuse a verified member’s name or profile picture. Only an administrator or Trust & Verification can restore access."
              : "Access is restricted because of an attempt to reuse a verified member’s name or profile picture. Only an administrator or Trust & Verification can restore access. A fourth attempt results in a ban."
            : "Your account is restricted pending a safety review. Contact Support to request a review. Deleted media will not be restored."}
        </p>
        <div className="mt-7 grid gap-2">
          <Button asChild>
            <Link to="/support">Contact Support</Link>
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              await qc.cancelQueries();
              qc.clear();
              await supabase.auth.signOut();
              void navigate({ to: "/login", replace: true });
            }}
          >
            Sign out
          </Button>
        </div>
      </section>
    </main>
  );
}
