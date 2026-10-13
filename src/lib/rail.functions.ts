import { createServerFn } from "@tanstack/react-start";

export type NewsItem = { title: string; link: string; source: string; published: string | null };

function decode(value: string): string {
  return value
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

/**
 * Headlines for the member's country, read from the public Google News RSS feed.
 * No API key is involved; failures return an empty list so the rail stays quiet.
 */
export const getLocalNews = createServerFn({ method: "GET" })
  .inputValidator((input: { country?: string | undefined; lang?: string | undefined }) => ({
    country:
      String(input?.country ?? "CM")
        .toUpperCase()
        .replace(/[^A-Z]/g, "")
        .slice(0, 2) || "CM",
    lang:
      String(input?.lang ?? "en")
        .toLowerCase()
        .replace(/[^a-z]/g, "")
        .slice(0, 2) || "en",
  }))
  .handler(async ({ data }): Promise<{ items: NewsItem[] }> => {
    const url = `https://news.google.com/rss?hl=${data.lang}&gl=${data.country}&ceid=${data.country}:${data.lang}`;
    try {
      const response = await fetch(url, {
        headers: { "user-agent": "ASHGlo/1.0 (+https://ash-global.lovable.app)" },
      });
      if (!response.ok) return { items: [] };
      const xml = await response.text();

      const items: NewsItem[] = [];
      for (const block of xml.split("<item>").slice(1, 13)) {
        const title = decode(block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
        const link = decode(block.match(/<link>([\s\S]*?)<\/link>/)?.[1] ?? "");
        const source = decode(block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ?? "");
        const published = decode(block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "");
        if (!title || !link) continue;
        items.push({
          title: title.replace(/ - [^-]+$/, ""),
          link,
          source: source || "News",
          published: published || null,
        });
      }
      return { items: items.slice(0, 10) };
    } catch {
      return { items: [] };
    }
  });
