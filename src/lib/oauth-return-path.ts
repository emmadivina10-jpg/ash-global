/**
 * Validates a post-sign-in return path. Only same-origin relative paths are
 * accepted (query and hash preserved); anything else falls back to "/".
 */
export function oauthReturnPath(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u001f\u007f]/.test(value)
  )
    return "/";
  const origin = "https://app.invalid";
  try {
    const target = new URL(value, origin);
    if (target.origin !== origin || target.pathname.startsWith("//")) return "/";
    return target.pathname + target.search + target.hash;
  } catch {
    return "/";
  }
}

/** Returns the validated return path, or null when there is nothing to return to. */
export function pendingReturn(value: unknown): string | null {
  const path = oauthReturnPath(value);
  return path === "/" ? null : path;
}

/** Builds the social/email callback URL that carries the return path. */
export function callbackUrl(origin: string, next: string | null): string {
  const url = new URL("/auth/callback", origin);
  if (next) url.searchParams.set("next", next);
  return url.href;
}
