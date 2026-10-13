import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Heart } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState } from "@/components/refer/states";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useArticle, useToggleArticleLike } from "@/lib/hub.queries";

export const Route = createFileRoute("/_authenticated/articles/$articleId")({
  head: () => ({
    meta: [
      { title: "Article — ASH Stories" },
      { name: "description", content: "Read this article published by an ASH community member." },
      { property: "og:title", content: "Article — ASH Stories" },
      {
        property: "og:description",
        content: "Read this article published by an ASH community member.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ArticleDetail,
});

function ArticleDetail() {
  const { articleId } = Route.useParams();
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const article = useArticle(articleId);
  const like = useToggleArticleLike();

  if (article.isLoading) return <LoadingState label={tx("Loading…", "Chargement…")} />;
  if (!article.data)
    return (
      <EmptyState
        title={tx("Article not found", "Article introuvable")}
        description={tx("It may have been removed.", "Il a peut-être été retiré.")}
        action={
          <Button asChild>
            <Link to="/articles">{tx("Browse articles", "Voir les articles")}</Link>
          </Button>
        }
      />
    );

  const post = article.data;

  return (
    <article className="mx-auto w-full max-w-3xl space-y-5">
      <Link
        to="/articles"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {tx("Articles", "Articles")}
      </Link>

      {post.cover_url ? (
        <img src={post.cover_url} alt={post.title} className="w-full rounded-2xl object-cover" />
      ) : null}

      <header className="space-y-3">
        <span className="w-fit rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {post.category}
        </span>
        <h1 className="font-display text-2xl font-bold leading-tight text-foreground sm:text-3xl">
          {post.title}
        </h1>
        <div className="flex items-center gap-2">
          <Avatar className="size-8">
            <AvatarImage src={post.author.avatar_url ?? undefined} alt="" />
            <AvatarFallback>{post.author.name.slice(0, 1)}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">
            {post.author.name} ·{" "}
            {new Date(post.created_at).toLocaleDateString(fr ? "fr-FR" : "en-GB")}
          </span>
        </div>
      </header>

      <div className="whitespace-pre-wrap text-[15px] leading-7 text-foreground">{post.body}</div>

      {post.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground"
            >
              #{tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flex items-center gap-3 border-t border-border pt-4">
        <Button
          variant="outline"
          className="touch-manipulation"
          onClick={() => like.mutate({ articleId: post.id, liked: post.liked })}
        >
          <Heart className={cn("size-4", post.liked && "fill-primary text-primary")} aria-hidden />
          {post.like_count}
        </Button>
      </div>
    </article>
  );
}
