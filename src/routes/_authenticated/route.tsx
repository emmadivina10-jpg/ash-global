import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/refer/AppShell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Trust the persisted session first. `getUser()` is a network round-trip:
    // on cold start, on resume from background, or on a flaky connection it
    // can fail while a perfectly valid session is still in storage, which is
    // what bounced signed-in members back to the landing page.
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("moderation_banned_at")
        .eq("user_id", sessionData.session.user.id)
        .maybeSingle();
      if (profile?.moderation_banned_at) throw redirect({ to: "/safety-review" });
      return { user: sessionData.session.user };
    }

    // No session in storage yet: it may still be rehydrating on a cold start
    // (installed app resuming, slow storage broker). Give it a brief window
    // before falling back to the network check.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 120));
      const { data: retry } = await supabase.auth.getSession();
      if (retry.session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("moderation_banned_at")
          .eq("user_id", retry.session.user.id)
          .maybeSingle();
        if (profile?.moderation_banned_at) throw redirect({ to: "/safety-review" });
        return { user: retry.session.user };
      }
    }

    try {
      const { data, error } = await supabase.auth.getUser();
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("moderation_banned_at")
          .eq("user_id", data.user.id)
          .maybeSingle();
        if (profile?.moderation_banned_at) throw redirect({ to: "/safety-review" });
        return { user: data.user };
      }
      if (error) throw error;
    } catch {
      // Network hiccup — never sign a member out because a request failed.
      const { data: last } = await supabase.auth.getSession();
      if (last.session?.user) return { user: last.session.user };
    }
    throw redirect({ to: "/login" });
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
