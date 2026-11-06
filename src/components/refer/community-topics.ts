export const COMMUNITY_TOPICS = [
  { id: "all", en: "All Videos", fr: "Toutes les vidéos", tags: [] },
  { id: "food", en: "Food", fr: "Cuisine", tags: ["food", "cuisine"] },
  { id: "tech", en: "Tech", fr: "Tech", tags: ["tech", "web", "mobile", "programming"] },
  { id: "beauty", en: "Beauty", fr: "Beauté", tags: ["beauty", "beauté"] },
  { id: "home", en: "Home", fr: "Maison", tags: ["home", "maison"] },
  { id: "events", en: "Events", fr: "Événements", tags: ["events", "event", "événements"] },
  { id: "health", en: "Health", fr: "Santé", tags: ["health", "santé"] },
  { id: "pro", en: "Pro", fr: "Pro", tags: ["pro", "business"] },
  {
    id: "properties",
    en: "Properties",
    fr: "Immobilier",
    tags: ["properties", "property", "immobilier"],
  },
  { id: "deals", en: "Deals", fr: "Offres", tags: ["deals", "offres"] },
  { id: "services", en: "Services", fr: "Services", tags: ["services", "service"] },
  { id: "extra", en: "Other", fr: "Autres", tags: ["extra", "other", "autres"] },
] as const;

export function matchesCommunityTopic(caption: string, topic: string, hasVideo: boolean): boolean {
  if (topic === "all") return hasVideo;
  const selected = COMMUNITY_TOPICS.find((item) => item.id === topic);
  if (!selected) return false;
  const tags = new Set(
    [
      ...caption
        .normalize("NFC")
        .toLocaleLowerCase()
        .matchAll(/#([\p{L}\p{N}_-]+)/gu),
    ].map((match) => match[1]),
  );
  return selected.tags.some((tag) => tags.has(tag));
}

export function matchesCommunityPost(
  caption: string,
  author: string,
  hasVideo: boolean,
  topic: string,
  search: string,
): boolean {
  const query = search.trim().toLocaleLowerCase();
  return (
    matchesCommunityTopic(caption, topic, hasVideo) &&
    `${caption} ${author}`.toLocaleLowerCase().includes(query)
  );
}
