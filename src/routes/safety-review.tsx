import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/refer/Logo";

export const Route = createFileRoute("/safety-review")({
  head: () => ({
    meta: [
      { title: "Account safety review — ASH" },
      { name: "description", content: "Information about an ASH account safety review and how to contact support." },
      { property: "og:title", content: "Account safety review — ASH" },
      { property: "og:description", content: "Information about an ASH account safety review and how to contact support." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SafetyReviewPage,
});

function SafetyReviewPage() {
  return (
    <main className="safe-top grid min-h-dvh place-items-center bg-background px-5 py-10">
      <section className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center"><Logo /></div>
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="size-7" aria-hidden />
        </span>
        <h1 className="mt-5 font-display text-2xl font-extrabold text-foreground">Account under safety review</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          ASH removed media detected as sexually explicit and temporarily restricted this account. Trust &amp; Safety will review the decision. Deleted media will not be restored.
        </p>
        <div className="mt-7 grid gap-2">
          <Button asChild><Link to="/support">Contact Support</Link></Button>
          <Button
            variant="outline"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.assign("/login");
            }}
          >
            Sign out
          </Button>
        </div>
      </section>
    </main>
  );
}