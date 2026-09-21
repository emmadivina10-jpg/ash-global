import { createFileRoute } from "@tanstack/react-router";

const SPOTLIGHT_BUCKET = "spotlight";
const BATCH_SIZE = 50;

type ExpiredPost = {
  id: string;
  media: unknown;
};

function videoPaths(media: unknown): string[] {
  if (!Array.isArray(media)) return [];
  return media.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    const path = typeof record["path"] === "string" ? record["path"] : "";
    if (!path || record["type"] !== "video") return [];
    return [path];
  });
}

async function cleanupExpiredSpotlightVideos(request: Request) {
  const suppliedSecret = request.headers.get("x-story-cleanup-secret") ?? "";
  if (!suppliedSecret) return new Response("Unauthorized", { status: 401 });

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: authorized, error: authorizationError } = await supabaseAdmin.rpc(
    "verify_story_cleanup_secret",
    { _secret: suppliedSecret },
  );
  if (authorizationError) {
    return Response.json({ ok: false, error: "AUTH_CHECK_FAILED" }, { status: 500 });
  }
  if (authorized !== true) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data, error: batchError } = await supabaseAdmin.rpc("expired_spotlight_video_batch", {
    _limit: BATCH_SIZE,
  });
  if (batchError) {
    return Response.json({ ok: false, error: "SPOTLIGHT_BATCH_FAILED" }, { status: 500 });
  }

  const expired = (data ?? []) as ExpiredPost[];
  let removedFiles = 0;
  let retryable = 0;

  for (const post of expired) {
    const paths = videoPaths(post.media);
    if (paths.length === 0) continue;

    const removed: string[] = [];
    for (const path of paths) {
      const { error: storageError } = await supabaseAdmin.storage.from(SPOTLIGHT_BUCKET).remove([path]);
      if (storageError) {
        retryable += 1;
        continue;
      }
      removed.push(path);
    }

    if (removed.length === 0) continue;
    removedFiles += removed.length;

    const { error: finalizeError } = await supabaseAdmin.rpc("finalize_spotlight_video_cleanup", {
      _post_id: post.id,
      _removed_paths: removed,
    });
    if (finalizeError) retryable += 1;
  }

  return Response.json({ ok: true, checked: expired.length, removedFiles, retryable });
}

export const Route = createFileRoute("/api/public/cleanup-spotlight-videos")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        cleanupExpiredSpotlightVideos(request).then((response) => {
          response.headers.set("cache-control", "no-store");
          return response;
        }),
    },
  },
});
