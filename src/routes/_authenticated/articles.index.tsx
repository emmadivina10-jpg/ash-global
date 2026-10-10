import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Heart, ImagePlus, PenLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState, LoadingState } from "@/components/refer/states";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  ARTICLE_CATEGORIES,
  useArticles,
  usePublishArticle,
  useToggleArticleLike,
} from "@/lib/hub.queries";

export const Route = createFileRoute("/_authenticated/articles/")({
  head: () => ({
    meta: [
      { title: "ASH Stories — articles written by the ASH community" },
      {
        name: "description",
        content:
          "Read and publish articles on business, tech, beauty, careers and money from members of the ASH Hub community.",
      },
      { property: "og:title", content: "ASH Stories — articles by the ASH community" },
      { property: "og:description", content: "Write, publish and read community articles on ASH." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ArticlesPage,
});

function ArticlesPage() {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const [category, setCategory] = useState<string>("ALL");
  const articles = useArticles(category);
  const like = useToggleArticleLike();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            {tx("ASH Stories", "ASH Stories")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tx("Write, publish and read articles from the ASH community.", "Écrivez, publiez et lisez les articles de la communauté ASH.")}
          </p>
        </div>
        <WriteArticleDialog fr={fr} />
      </header>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {[{ key: "ALL", en: "All", fr: "Tout" }, ...ARTICLE_CATEGORIES].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setCategory(item.key)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              category === item.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40",
            )}
          >
            {tx(item.en, item.fr)}
          </button>
        ))}
      </div>

      {articles.isLoading ? (
        <LoadingState label={tx("Loading articles…", "Chargement des articles…")} />
      ) : (articles.data ?? []).length === 0 ? (
        <EmptyState
          icon={<BookOpen className="size-5" aria-hidden />}
          title={tx("No articles yet", "Aucun article pour le moment")}
          description={tx("Be the first to publish one.", "Soyez le premier à publier.")}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {(articles.data ?? []).map((article) => (
            <li key={article.id} className="tile flex flex-col overflow-hidden">
              <Link
                to="/articles/$articleId"
                params={{ articleId: article.id }}
                className="flex flex-1 flex-col"
              >
                {article.cover_url ? (
                  <img
                    src={article.cover_url}
                    alt={article.title}
                    loading="lazy"
                    className="h-40 w-full object-cover"
                  />
                ) : null}
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <span className="w-fit rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {article.category}
                  </span>
                  <h2 className="font-display text-lg font-bold leading-tight text-foreground">
                    {article.title}
                  </h2>
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {article.excerpt || article.body.slice(0, 160)}
                  </p>
                </div>
              </Link>
              <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
                <span className="flex min-w-0 items-center gap-2">
                  <Avatar className="size-7">
                    <AvatarImage src={article.author.avatar_url ?? undefined} alt="" />
                    <AvatarFallback>{article.author.name.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <span className="truncate text-xs text-muted-foreground">{article.author.name}</span>
                </span>
                <button
                  type="button"
                  onClick={() => like.mutate({ articleId: article.id, liked: article.liked })}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
                >
                  <Heart className={cn("size-4", article.liked && "fill-primary text-primary")} aria-hidden />
                  {article.like_count}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WriteArticleDialog({ fr }: { fr: boolean }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [category, setCategory] = useState<string>("GENERAL");
  const [cover, setCover] = useState<File | null>(null);
  const publish = usePublishArticle();

  function reset() {
    setTitle("");
    setExcerpt("");
    setBody("");
    setTags("");
    setCategory("GENERAL");
    setCover(null);
  }

  async function submit() {
    if (title.trim().length < 4 || body.trim().length < 40) {
      toast.error(fr ? "Ajoutez un titre et un contenu plus long." : "Add a title and a longer body.");
      return;
    }
    try {
      await publish.mutateAsync({
        title,
        excerpt,
        body,
        category,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
          .slice(0, 6),
        cover,
      });
      toast.success(fr ? "Article publié." : "Article published.");
      reset();
      setOpen(false);
    } catch (error) {
      toast.error(
        (error as Error).message === "FILE_TOO_LARGE"
          ? fr
            ? "Image trop lourde (50 Mo max)."
            : "Image too large (50MB max)."
          : fr
            ? "Publication impossible."
            : "Could not publish.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="touch-manipulation">
          <PenLine className="size-4" aria-hidden />
          {fr ? "Écrire un article" : "Write an article"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem-env(safe-area-inset-bottom))] overflow-y-auto overscroll-contain">
        <DialogHeader>
          <DialogTitle>{fr ? "Nouvel article" : "New article"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={fr ? "Titre" : "Title"}
            maxLength={140}
          />
          <Input
            value={excerpt}
            onChange={(event) => setExcerpt(event.target.value)}
            placeholder={fr ? "Résumé court (optionnel)" : "Short summary (optional)"}
            maxLength={220}
          />
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={fr ? "Votre article…" : "Your article…"}
            rows={10}
            maxLength={20000}
          />
          <Input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder={fr ? "Mots-clés, séparés par des virgules" : "Tags, comma separated"}
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
            >
              {ARTICLE_CATEGORIES.map((item) => (
                <option key={item.key} value={item.key}>
                  {tx(item.en, item.fr)}
                </option>
              ))}
            </select>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground">
              <ImagePlus className="size-4" aria-hidden />
              {cover ? cover.name.slice(0, 18) : fr ? "Image de couverture" : "Cover image"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => setCover(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <Button
            onClick={submit}
            disabled={publish.isPending}
            className="w-full touch-manipulation"
          >
            {publish.isPending ? (fr ? "Publication…" : "Publishing…") : fr ? "Publier" : "Publish"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
