import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ShareKind = "post" | "spotlight" | "property";

export type SharePreview = {
  kind: ShareKind;
  id: string;
  title: string;
  description: string;
  image: string | null;
  author: string;
};

const input = z.object({
  kind: z.enum(["post", "spotlight", "property"]),
  id: z.string().uuid(),
});

function firstPath(media: unknown): string | null {
  if (typeof media === "string") return media;
  if (!Array.isArray(media)) return null;
  for (const entry of media) {
    if (typeof entry === "string" && entry) return entry;
    if (entry && typeof entry === "object") {
      const rec = entry as { path?: unknown; type?: unknown };
      if (typeof rec.path === "string" && rec.type !== "video") return rec.path;
    }
  }
  return null;
}

/**
 * Public, read-only preview for a shared ASH link. Only published, approved
 * content is returned, and only a short caption, author name and first photo.
 */
export const getSharePreview = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => input.parse(data))
  .handler(async ({ data }): Promise<SharePreview | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.kind === "property") {
      const { data: listing } = await supabaseAdmin
        .from("property_listings")
        .select("id, title, description, city, price, currency, status")
        .eq("id", data.id)
        .maybeSingle();
      if (!listing || listing.status !== "ACTIVE") return null;
      const { data: imgs } = await supabaseAdmin
        .from("property_images")
        .select("image_path")
        .eq("listing_id", data.id)
        .order("sort_order", { ascending: true })
        .limit(1);
      let image: string | null = null;
      const first = imgs?.[0]?.image_path;
      if (first) {
        const { data: signed } = await supabaseAdmin.storage
          .from("property")
          .createSignedUrl(first, 60 * 60 * 24 * 30);
        image = signed?.signedUrl ?? null;
      }
      const price = `${Number(listing.price).toLocaleString("fr-FR")} ${listing.currency}`;
      return {
        kind: "property",
        id: data.id,
        author: listing.city,
        title: `${listing.title} · ${listing.city} — ASH Homes`,
        description: (listing.description?.replace(/\s+/g, " ").trim() || `${price} on ASH Glo`).slice(0, 150),
        image,
      };
    }
    const table = data.kind === "post" ? "social_posts" : "spotlight_posts";
    const { data: row, error } = await supabaseAdmin
      .from(table)
      .select("id, author_id, caption, media, is_published, moderation_status")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) return null;
    const r = row as {
      author_id: string;
      caption: string | null;
      media: unknown;
      is_published: boolean;
      moderation_status: string | null;
    };
    if (!r.is_published) return null;
    if (r.moderation_status && !["APPROVED", "PUBLISHED", "OK"].includes(r.moderation_status))
      return null;

    const { data: author } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("user_id", r.author_id)
      .maybeSingle();
    const name = (author as { full_name?: string | null } | null)?.full_name?.trim() || "ASH member";

    let image: string | null = null;
    const path = firstPath(r.media);
    if (path && !/\.(mp4|mov|webm|m4v)$/i.test(path)) {
      const { data: signed } = await supabaseAdmin.storage
        .from("spotlight")
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      image = signed?.signedUrl ?? null;
    }

    const caption = (r.caption ?? "").replace(/\s+/g, " ").trim();
    const label = data.kind === "post" ? "post" : "Spotlight";
    return {
      kind: data.kind,
      id: data.id,
      author: name,
      title: `${name} on ASH Glo`,
      description: caption ? caption.slice(0, 150) : `See ${name}'s ${label} on ASH Glo.`,
      image,
    };
  });
