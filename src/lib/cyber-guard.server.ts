import { AUTOMATION_UA, ipInCidr } from "./cyber-rules";

type Block = { kind: string; value: string; expires_at: string | null };
let cache: { at: number; blocks: Block[] } | null = null;
const recent = new Map<string, number>();

export function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export async function browserFingerprint(request: Request): Promise<string> {
  const raw = `${request.headers.get("user-agent") ?? ""}|${request.headers.get("accept-language") ?? ""}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return [...new Uint8Array(digest)]
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function invalidateBlockCache() {
  cache = null;
}

async function activeBlocks(): Promise<Block[]> {
  if (cache && Date.now() - cache.at < 60_000) return cache.blocks;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("ip_blocks")
    .select("kind, value, expires_at")
    .is("lifted_at", null);
  const blocks = (data ?? []).filter(
    (b) => !b.expires_at || new Date(b.expires_at).getTime() > Date.now(),
  );
  cache = { at: Date.now(), blocks };
  return blocks;
}

/** Returns a 403 Response when the visitor's IP or browser is blocked. Never throws. */
export async function blockedResponse(request: Request): Promise<Response | null> {
  try {
    const path = new URL(request.url).pathname;
    if (path.startsWith("/api/public/webhooks") || path.startsWith("/lovable/")) return null;
    const blocks = await activeBlocks();
    if (blocks.length === 0) return null;
    const ip = clientIp(request);
    const fp = await browserFingerprint(request);
    const hit = blocks.some(
      (b) =>
        (b.kind === "IP" && b.value === ip) ||
        (b.kind === "CIDR" && ipInCidr(ip, b.value)) ||
        (b.kind === "FINGERPRINT" && b.value === fp),
    );
    if (!hit) return null;
    return new Response("Access blocked by ASH security.", {
      status: 403,
      headers: { "content-type": "text/plain" },
    });
  } catch {
    return null;
  }
}

/** Approximate visitor location from Cloudflare (city level at best). */
export function requestGeo(request: Request): {
  country: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
} {
  const cf = (
    request as unknown as {
      cf?: { country?: string; city?: string; latitude?: string; longitude?: string };
    }
  ).cf;
  const h = (n: string) => request.headers.get(n);
  const num = (v: string | null | undefined) =>
    v != null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : null;
  return {
    country: cf?.country ?? h("cf-ipcountry"),
    city: cf?.city ?? h("cf-ipcity"),
    lat: num(cf?.latitude ?? h("cf-iplatitude")),
    lng: num(cf?.longitude ?? h("cf-iplongitude")),
  };
}

/** Records the signed-in member's IP and browser, at most once per 10 minutes per isolate. */
export async function recordFingerprint(request: Request, userId: string) {
  try {
    const ip = clientIp(request);
    const fp = await browserFingerprint(request);
    const key = `${userId}|${ip}|${fp}`;
    const last = recent.get(key) ?? 0;
    if (Date.now() - last < 600_000) return;
    recent.set(key, Date.now());
    if (recent.size > 5000) recent.clear();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ua = request.headers.get("user-agent")?.slice(0, 300) ?? null;
    const { country, city, lat, lng } = requestGeo(request);
    const { data: existing } = await supabaseAdmin
      .from("access_fingerprints")
      .select("id, hits")
      .eq("user_id", userId)
      .eq("ip", ip)
      .eq("fingerprint", fp)
      .maybeSingle();
    if (existing) {
      await supabaseAdmin
        .from("access_fingerprints")
        .update({
          hits: existing.hits + 1,
          last_seen: new Date().toISOString(),
          ...(country ? { country } : {}),
          ...(city ? { city } : {}),
          ...(lat != null && lng != null ? { lat, lng } : {}),
        })
        .eq("id", existing.id);
    } else {
      await supabaseAdmin
        .from("access_fingerprints")
        .insert({ user_id: userId, ip, fingerprint: fp, user_agent: ua, country, city, lat, lng });
      if (ua && AUTOMATION_UA.test(ua)) {
        await supabaseAdmin
          .from("security_events")
          .insert({
            kind: "AUTOMATION_BROWSER",
            severity: "WARN",
            subject: fp,
            actor_user_id: userId,
            detail: { ua },
          });
      }
    }
  } catch {
    // Telemetry must never break a member request.
  }
}
