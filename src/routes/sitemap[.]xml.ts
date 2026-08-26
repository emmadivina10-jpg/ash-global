import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://ashglogroup.company";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/login", changefreq: "monthly", priority: "0.5" },
          { path: "/register", changefreq: "monthly", priority: "0.7" },
          { path: "/forgot-password", changefreq: "yearly", priority: "0.2" },
          { path: "/privacy", changefreq: "yearly", priority: "0.4" },

        ];

        // Live storefronts are public, shareable landing pages worth indexing.
        try {
          const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
          const url = process.env["SUPABASE_URL"];
          if (key && url) {
            const { createClient } = await import("@supabase/supabase-js");
            const supabase = createClient(url, key, {
              auth: { persistSession: false },
              global: {
                fetch: (input, init) => {
                  const h = new Headers(init?.headers);
                  if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
                  h.set("apikey", key);
                  return fetch(input, { ...init, headers: h });
                },
              },
            });
            const { data } = await supabase
              .from("provider_profiles")
              .select("slug")
              .eq("is_live", true)
              .not("slug", "is", null)
              .limit(500);
            for (const row of data ?? []) {
              entries.push({ path: `/s/${row.slug as string}`, changefreq: "weekly", priority: "0.8" });
            }
          }
        } catch {
          // A sitemap must still render if the database is unreachable.
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
