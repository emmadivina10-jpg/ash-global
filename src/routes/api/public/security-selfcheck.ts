import { createFileRoute } from "@tanstack/react-router";

/**
 * Periodic security re-scan endpoint.
 *
 * Called on a schedule (pg_cron, GitHub Actions, or any external scheduler)
 * with the shared secret. It runs the database self-check, writes the result
 * into the admin security audit log and returns a machine-readable summary so
 * the caller can fail a pipeline when a regression appears.
 *
 *   curl -X POST https://project--<id>.lovable.app/api/public/security-selfcheck \
 *        -H "x-security-scan-secret: $SECURITY_SCAN_SECRET"
 *
 * Responds 200 when clean, 409 when critical findings exist.
 */
export const Route = createFileRoute("/api/public/security-selfcheck")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env["SECURITY_SCAN_SECRET"];
        if (!expected) {
          return Response.json({ ok: false, error: "NOT_CONFIGURED" }, { status: 503 });
        }

        const provided = request.headers.get("x-security-scan-secret") ?? "";
        // Constant-time comparison so the secret cannot be discovered by timing.
        const a = new TextEncoder().encode(provided);
        const b = new TextEncoder().encode(expected);
        let mismatch = a.length ^ b.length;
        for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
          mismatch |= (a[i] ?? 0) ^ (b[i] ?? 0);
        }
        if (mismatch !== 0) {
          const { clientIp, fingerprint, logSecurityEvent } =
            await import("@/lib/rate-limit.server");
          await logSecurityEvent({
            kind: "SELFCHECK_AUTH_FAILED",
            severity: "CRITICAL",
            subject: await fingerprint(clientIp(request)),
            route: "/api/public/security-selfcheck",
            detail: { reason: "bad_or_missing_secret" },
          });
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("security_selfcheck");
        if (error) {
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }

        const report = data as { ok: boolean; critical: number; warn: number; findings: unknown[] };
        return Response.json(report, { status: report.critical > 0 ? 409 : 200 });
      },
    },
  },
});
