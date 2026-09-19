import { createFileRoute } from "@tanstack/react-router";

const STORY_BUCKET = "spotlight";
const BATCH_SIZE = 100;

type ExpiredStory = {
  id: string;
  media_path: string;
};

async function cleanupExpiredStories(request: Request) {
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
    return Response.json(
      {
        ok: false,
        error: "INVALID_CREDENTIAL",
        credentialLength: suppliedSecret.length,
        credentialShapeValid: /^[0-9a-f]{64}$/.test(suppliedSecret),
      },
      { status: 401 },
    );
  }

  const { data, error: batchError } = await supabaseAdmin.rpc("expired_story_cleanup_batch", {
    _limit: BATCH_SIZE,
  });
  if (batchError) {
    return Response.json({ ok: false, error: "STORY_BATCH_FAILED" }, { status: 500 });
  }

  const expired = (data ?? []) as ExpiredStory[];
  if (expired.length === 0) {
    return Response.json({ ok: true, checked: 0, deleted: 0, retryable: 0 });
  }

  const removableIds: string[] = [];
  for (const story of expired) {
    const { error: storageError } = await supabaseAdmin.storage.from(STORY_BUCKET).remove([story.media_path]);
    if (!storageError) removableIds.push(story.id);
  }

  if (removableIds.length > 0) {
    const { error: deleteError } = await supabaseAdmin.from("stories").delete().in("id", removableIds);
    if (deleteError) {
      return Response.json({ ok: false, error: "STORY_RECORD_DELETE_FAILED" }, { status: 500 });
    }
  }

  return Response.json({
    ok: true,
    checked: expired.length,
    deleted: removableIds.length,
    retryable: expired.length - removableIds.length,
  });
}

export const Route = createFileRoute("/api/public/cleanup-stories")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        cleanupExpiredStories(request).then((response) => {
          response.headers.set("cache-control", "no-store");
          return response;
        }),
    },
  },
});