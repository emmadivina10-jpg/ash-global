import { createServerFn } from "@tanstack/react-start";

/**
 * Detects the visitor's country from edge headers. Cloudflare sets
 * cf-ipcountry; other proxies use x-vercel-ip-country / x-country.
 */
export const detectCountry = createServerFn({ method: "GET" }).handler(async () => {
  const { getRequestHeaders } = await import("@tanstack/react-start/server");
  const headers = getRequestHeaders();
  const get = (name: string) => {
    const value = headers instanceof Headers ? headers.get(name) : (headers as Record<string, string | undefined>)[name];
    return value ?? null;
  };

  const raw =
    get("cf-ipcountry") ??
    get("x-vercel-ip-country") ??
    get("x-country") ??
    get("x-appengine-country") ??
    null;

  const code = raw && raw.length === 2 && raw !== "XX" ? raw.toUpperCase() : null;
  return { country: code ?? "CM", detected: Boolean(code) };
});
