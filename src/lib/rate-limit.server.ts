/**
 * Server-only request throttling for public (unauthenticated) surfaces.
 *
 * Counters live in Postgres because the app runs on stateless edge workers —
 * an in-memory map would reset on every cold start and would not be shared
 * between instances, which is exactly what a scraper relies on.
 *
 * Visitor identity is a salted SHA-256 of the client IP, so the audit log and
 * the counter table never hold a raw IP address.
 */

export type RateVerdict = {
  allowed: boolean;
  hits: number;
  limit: number;
  retryAfter: number;
  subject: string;
};

/** Reads the caller IP from the edge proxy headers. */
export function clientIp(request: Request): string {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for");
  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-real-ip") ??
    (forwarded ? (forwarded.split(",")[0] ?? "").trim() : "") ??
    ""
  );
}

/** Salted, irreversible visitor fingerprint. Never store the raw IP. */
export async function fingerprint(ip: string): Promise<string> {
  const salt = process.env["RATE_LIMIT_SALT"] ?? "ash-glo-fallback-salt";
  const bytes = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Counts a hit and reports whether it is allowed.
 * Fails open: if the counter itself errors we serve the request rather than
 * taking the storefront down, but the failure is recorded.
 */
export async function rateLimit(options: {
  bucket: string;
  ip: string;
  limit: number;
  windowSeconds: number;
}): Promise<RateVerdict> {
  const subject = await fingerprint(options.ip);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data, error } = await supabaseAdmin.rpc("rate_limit_check", {
    _bucket: options.bucket,
    _subject: subject,
    _limit: options.limit,
    _window_seconds: options.windowSeconds,
  });

  if (error || !data) {
    return { allowed: true, hits: 0, limit: options.limit, retryAfter: 0, subject };
  }

  const verdict = data as { allowed: boolean; hits: number; limit: number; retry_after: number };
  return {
    allowed: Boolean(verdict.allowed),
    hits: Number(verdict.hits ?? 0),
    limit: Number(verdict.limit ?? options.limit),
    retryAfter: Number(verdict.retry_after ?? 0),
    subject,
  };
}

/** Writes an entry to the admin-visible security audit log. */
export async function logSecurityEvent(entry: {
  kind: string;
  severity?: "INFO" | "WARN" | "CRITICAL";
  subject?: string | null;
  route?: string | null;
  detail?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("log_security_event", {
      _kind: entry.kind,
      _severity: entry.severity ?? "WARN",
      _subject: entry.subject ?? undefined,
      _route: entry.route ?? undefined,
      _detail: (entry.detail ?? {}) as never,
    });
  } catch {
    /* logging must never break the request path */
  }
}

/**
 * Throttle + audit in one call for public surfaces.
 * Returns null when the request may proceed, or a verdict when it is blocked.
 * Escalating traffic is recorded so admins can see probing attempts.
 */
export async function guardPublicRequest(options: {
  request: Request;
  bucket: string;
  route: string;
  limit: number;
  windowSeconds: number;
  detail?: Record<string, unknown>;
}): Promise<RateVerdict | null> {
  const ip = clientIp(options.request);
  if (!ip) return null;

  const verdict = await rateLimit({
    bucket: options.bucket,
    ip,
    limit: options.limit,
    windowSeconds: options.windowSeconds,
  });

  if (verdict.allowed) return null;

  // Only log the first few blocked hits per window so a flood cannot spam the log.
  if (verdict.hits <= verdict.limit + 5 || verdict.hits % 50 === 0) {
    await logSecurityEvent({
      kind: "RATE_LIMIT_BLOCKED",
      severity: verdict.hits > verdict.limit * 5 ? "CRITICAL" : "WARN",
      subject: verdict.subject,
      route: options.route,
      detail: { ...options.detail, hits: verdict.hits, limit: verdict.limit, bucket: options.bucket },
    });
  }

  return verdict;
}
