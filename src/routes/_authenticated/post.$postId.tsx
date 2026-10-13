import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PostCard } from "@/components/refer/PostCard";
import { usePost } from "@/lib/social.queries";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/post/$postId")({
  head: () => ({
    meta: [
      { title: "Post — ASH" },
      { name: "description", content: "Read this ASH post, its comments and replies." },
      { property: "og:title", content: "Post — ASH" },
      { property: "og:description", content: "Read this ASH post, its comments and replies." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PostPage,
});

function PostPage() {
  const { postId } = Route.useParams();
  const navigate = useNavigate();
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const { data, isLoading } = usePost(postId);
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data: auth }) => setMe(auth.user?.id ?? null));
  }, []);

  function back() {
    if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
    else void navigate({ to: "/feed" });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-3 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={back}
          aria-label={tx("Back", "Retour")}
          className="grid size-10 shrink-0 place-items-center rounded-full text-foreground transition-colors hover:bg-muted"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>
        <p className="min-w-0 truncate text-sm font-bold text-foreground">
          {tx("Post", "Publication")}
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-2xl">
          {isLoading ? (
            <div className="grid h-40 place-items-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
            </div>
          ) : data ? (
            <PostCard post={data} currentUserId={me} detail fullScreen />
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-foreground">
                {tx("This post is no longer available.", "Cette publication n'existe plus.")}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {tx(
                  "It may have been removed by its author.",
                  "Elle a peut-être été supprimée par son auteur.",
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
