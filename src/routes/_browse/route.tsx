import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/refer/AppShell";
import { GuestShell } from "@/components/refer/GuestShell";
import { BrowseAuthProvider } from "@/lib/guest-gate";
import { lacksCurrentTerms } from "@/lib/consent";

type GateProfile = {
  moderation_banned_at: string | null;
  moderation_suspended_until: string | null;
  terms_accepted_at: string | null;
  terms_version: string | null;
} | null;

/** Same member safety rules as the signed-in gate: banned/suspended members go
 * to safety review; members without the current Terms go to the Terms screen. */
function enforceGate(profile: GateProfile) {
  if (!profile) return;
  const suspended =
    profile.moderation_suspended_until && new Date(profile.moderation_suspended_until) > new Date();
  if (profile.moderation_banned_at || suspended) throw redirect({ to: "/safety-review" });
  if (lacksCurrentTerms(profile)) throw redirect({ to: "/consent" });
}

const GATE_COLUMNS =
  "moderation_banned_at, moderation_suspended_until, terms_accepted_at, terms_version";

async function memberGate(user: User) {
  const { data: profile } = await supabase
    .from("profiles")
    .select(GATE_COLUMNS)
    .eq("user_id", user.id)
    .maybeSingle();
  enforceGate(profile as GateProfile);
}

/**
 * Public browsing layout. Guests explore freely; signed-in members get the
 * full member shell with the same safety gates as the authenticated section.
 */
export const Route = createFileRoute("/_browse")({
  ssr: false,
  beforeLoad: async () => {
    // Trust the persisted session first, mirroring the authenticated gate.
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user) {
      await memberGate(sessionData.session.user);
      return { user: sessionData.session.user };
    }

    // The session may still be rehydrating on a cold start; give it a brief
    // window before treating the visitor as a guest.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 120));
      const { data: retry } = await supabase.auth.getSession();
      if (retry.session?.user) {
        await memberGate(retry.session.user);
        return { user: retry.session.user };
      }
    }

    try {
      const { data, error } = await supabase.auth.getUser();
      if (data.user) {
        await memberGate(data.user);
        return { user: data.user };
      }
      if (error) throw error;
    } catch {
      const { data: last } = await supabase.auth.getSession();
      if (last.session?.user) return { user: last.session.user };
    }
    // No session: welcome, guest.
    return { user: null };
  },
  component: BrowseLayout,
});

function BrowseLayout() {
  const { user } = Route.useRouteContext();
  return (
    <BrowseAuthProvider user={user}>
      {user ? (
        <AppShell>
          <Outlet />
        </AppShell>
      ) : (
        <GuestShell>
          <Outlet />
        </GuestShell>
      )}
    </BrowseAuthProvider>
  );
}
