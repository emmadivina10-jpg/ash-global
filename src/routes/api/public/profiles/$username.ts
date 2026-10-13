import { createFileRoute } from "@tanstack/react-router";

// Public, read-only badge lookup for partner apps (e.g. Nicam).
// Returns only display-safe fields for one exact username — no directory, no PII.
const CANONICAL = "https://ashglogroup.company";
const USERNAME_RE = /^[a-z0-9._-]{2,40}$/i;

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=300",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export const Route = createFileRoute("/api/public/profiles/$username")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers }),
      GET: async ({ params }) => {
        const username = String(params.username ?? "").trim().replace(/^@/, "");
        if (!USERNAME_RE.test(username)) {
          return new Response(JSON.stringify({ error: "invalid_username" }), { status: 400, headers });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("public_profiles")
          .select("user_id, username, full_name, avatar_url, verified_tier, verified_until, account_status")
          .ilike("username", username)
          .limit(1)
          .maybeSingle();
        if (error) return new Response(JSON.stringify({ error: "unavailable" }), { status: 503, headers });
        const status = String(data?.account_status ?? "").toUpperCase();
        const active = !["BANNED", "SUSPENDED", "DELETED", "RESTRICTED"].includes(status);
        if (!data || !active) {
          return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers });
        }
        const verified =
          !!data.verified_tier && (!data.verified_until || new Date(data.verified_until).getTime() > Date.now());
        return new Response(
          JSON.stringify({
            username: data.username,
            display_name: data.full_name,
            avatar_url: data.avatar_url,
            verified,
            verified_tier: verified ? data.verified_tier : null,
            profile_url: `${CANONICAL}/u/${data.user_id}`,
          }),
          { status: 200, headers },
        );
      },
    },
  },
});
