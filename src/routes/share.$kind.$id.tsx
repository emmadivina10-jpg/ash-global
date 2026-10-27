import { useEffect } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { getSharePreview, type SharePreview } from "@/lib/share.functions";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/refer/Logo";

const SITE = "https://ashglogroup.company";

function appPath(p: SharePreview) {
  if (p.kind === "property") return `/property/${p.id}`;
  return p.kind === "post" ? `/post/${p.id}` : `/spotlight?open=${p.id}`;
}

export const Route = createFileRoute("/share/$kind/$id")({
  loader: async ({ params }) => {
    if (params.kind !== "post" && params.kind !== "spotlight" && params.kind !== "property")
      throw notFound();
    const preview = await getSharePreview({ data: { kind: params.kind, id: params.id } }).catch(
      () => null,
    );
    if (!preview) throw notFound();
    return { preview };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.preview;
    if (!p) return { meta: [{ title: "Shared content unavailable — ASH Glo" }] };
    const meta = [
      { title: p.title },
      { name: "description", content: p.description },
      { property: "og:title", content: p.title },
      { property: "og:description", content: p.description },
      { property: "og:type", content: "article" },
      { property: "og:url", content: `${SITE}/share/${p.kind}/${p.id}` },
      { name: "twitter:card", content: p.image ? "summary_large_image" : "summary" },
      { name: "twitter:title", content: p.title },
      { name: "twitter:description", content: p.description },
    ];
    if (p.image)
      meta.push(
        { property: "og:image", content: p.image },
        { name: "twitter:image", content: p.image },
      );
    return { meta };
  },
  notFoundComponent: () => (
    <div className="grid min-h-dvh place-items-center p-6 text-center text-sm text-muted-foreground">
      This shared content is no longer available.
    </div>
  ),
  component: SharePage,
});

function SharePage() {
  const { preview } = Route.useLoaderData();
  const target = appPath(preview);
  useEffect(() => {
    const timer = window.setTimeout(() => window.location.replace(target), 400);
    return () => window.clearTimeout(timer);
  }, [target]);

  return (
    <main className="grid min-h-dvh place-items-center bg-background p-6">
      <div className="w-full max-w-sm space-y-4 text-center">
        <Logo />
        {preview.image ? (
          <img src={preview.image} alt="" className="aspect-square w-full object-cover" />
        ) : null}
        <p className="text-sm font-semibold text-foreground">{preview.author}</p>
        <p className="text-sm text-muted-foreground">{preview.description}</p>
        <Button asChild className="w-full rounded-full">
          <a href={target}>Open in ASH Glo</a>
        </Button>
      </div>
    </main>
  );
}
