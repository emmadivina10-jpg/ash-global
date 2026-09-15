import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
  const { lang } = useI18n();
  const fr = lang === "fr";
  const { data, isLoading } = usePost(postId);
  const [me, setMe] = useState<string | undefined>(undefined);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data: auth }) => setMe(auth.user?.id));
  }, []);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      <Link to="/feed" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        {fr ? "Retour au fil" : "Back to feed"}
      </Link>

      {isLoading ? (
        <div className="grid h-40 place-items-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
        </div>
      ) : data ? (
        <PostCard post={data} currentUserId={me} />
      ) : (
        <div className="tile p-8 text-center">
          <p className="text-sm font-semibold text-foreground">
            {fr ? "Cette publication n'existe plus." : "This post is no longer available."}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {fr ? "Elle a peut-être été supprimée par son auteur." : "It may have been removed by its author."}
          </p>
        </div>
      )}
    </div>
  );
}
