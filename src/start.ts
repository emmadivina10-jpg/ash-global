import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next, request }) => {
  // /lovable/* server routes (email webhooks, previews) authenticate
  // themselves and must bypass app middleware.
  if (new URL(request.url).pathname.startsWith("/lovable/")) {
    return next();
  }
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});
const identityMiddleware = createMiddleware({ type: "function" }).server(async ({ next, serverFnMeta }) => {
  const { getRequest } = await import("@tanstack/react-start/server");
  const { enforceIdentityAccess } = await import("./lib/identity-access.server");
  await enforceIdentityAccess(getRequest(), serverFnMeta.name);
  return next();
});

const ipBlockMiddleware = createMiddleware().server(async ({ next, request }) => {
  const { blockedResponse } = await import("./lib/cyber-guard.server");
  const blocked = await blockedResponse(request);
  if (blocked) return blocked as never;
  return next();
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth, identityMiddleware],
  requestMiddleware: [errorMiddleware, ipBlockMiddleware, csrfMiddleware],
}));
