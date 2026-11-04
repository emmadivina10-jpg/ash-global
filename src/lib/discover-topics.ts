/** Shared upload/filter taxonomy. Explicit category hashtags take precedence over prose. */
export const DISCOVER_TOPICS = [
  { id: "all", en: "All", fr: "Tout", words: [] },
  { id: "forex", en: "Forex", fr: "Forex", words: ["forex", "trading", "fx"] },
  { id: "web", en: "Web", fr: "Web", words: ["web", "html", "css", "javascript", "react", "website", "site web"] },
  { id: "mobile", en: "Mobile apps", fr: "Applis mobiles", words: ["mobile", "android", "ios", "flutter", "mobile apps", "applis mobiles"] },
  { id: "programming", en: "Programming", fr: "Programmation", words: ["code", "coding", "programming", "programmation", "python", "developer", "développement"] },
  { id: "maths", en: "Mathematics", fr: "Mathématiques", words: ["math", "maths", "mathematics", "mathématiques", "algebra", "algèbre", "calculus"] },
  { id: "science", en: "Science", fr: "Sciences", words: ["science", "physics", "chemistry", "biology", "sciences"] },
  { id: "arts", en: "Arts", fr: "Arts", words: ["art", "arts", "design", "music", "painting", "creative"] },
  { id: "business", en: "Business", fr: "Affaires", words: ["business", "entrepreneur", "marketing", "finance"] },
  { id: "languages", en: "Languages", fr: "Langues", words: ["language", "languages", "english", "french", "grammar"] },
  { id: "personal-growth", en: "Personal growth", fr: "Développement personnel", words: ["personal growth", "mindset", "leadership", "motivation"] },
] as const;

export const DISCOVER_UPLOAD_DESTINATION = "/discover" as const;

export function topicMatches(text: string, topic: string): boolean {
  if (topic === "all") return true;
  const selected = DISCOVER_TOPICS.find((item) => item.id === topic);
  if (!selected) return false;
  const lower = text.toLocaleLowerCase().normalize("NFC");
  const assigned = [...lower.matchAll(/#([\p{L}\p{N}_-]+)/gu)]
    .map((match) => match[1])
    .filter((tag) => DISCOVER_TOPICS.some((item) => item.id !== "all" && item.id === tag));
  if (assigned.length) return assigned.includes(topic);
  return selected.words.some((word) =>
    new RegExp(`(^|[^\\p{L}\\p{N}])${word}($|[^\\p{L}\\p{N}])`, "u").test(lower),
  );
}
