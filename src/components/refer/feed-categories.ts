/**
 * Discovery categories for the Feed. Posts are classified from their own
 * caption (hashtags and keywords, EN/FR) — never from invented data.
 */
export type FeedCategory =
  | "for_you"
  | "following"
  | "business"
  | "products"
  | "services"
  | "suppliers"
  | "learn"
  | "jobs"
  | "property"
  | "vehicles"
  | "creators"
  | "events"
  | "music"
  | "opportunities";

export const FEED_CATEGORIES: { id: FeedCategory; en: string; fr: string }[] = [
  { id: "for_you", en: "For You", fr: "Pour vous" },
  { id: "following", en: "Following", fr: "Abonnements" },
  { id: "business", en: "Business", fr: "Entreprises" },
  { id: "music", en: "Music", fr: "Musique" },
  { id: "opportunities", en: "Opportunities", fr: "Opportunités" },
];

type Topic = Exclude<FeedCategory, "for_you" | "following" | "creators"> | "delivery";

const KEYWORDS: [Topic, RegExp][] = [
  ["delivery", /\b(delivery|deliveries|livraison|livrer|courier|coursier|rider)\b/i],
  ["jobs", /\b(job|jobs|hiring|vacancy|recrut\w*|emploi|poste|career|stage|internship)\b/i],
  [
    "learn",
    /\b(course|courses|cours|class|training|formation|learn\w*|apprendre|tutor\w*|academy|enrol\w*|bootcamp)\b/i,
  ],
  [
    "property",
    /\b(property|apartment|appartement|house|maison|rent|louer|location|land|terrain|studio meublé)\b/i,
  ],
  ["vehicles", /\b(car|cars|voiture|vehicle|véhicule|motorbike|moto|toyota|for sale car)\b/i],
  ["music", /\b(music|musique|musician|musicien|band|album|song|chanson|dj)\b/i],
  [
    "events",
    /\b(event|events|événement|evenement|concert|party|soirée|conference|conférence|register|inscription)\b/i,
  ],
  ["suppliers", /\b(supplier|suppliers|fournisseur|wholesale|gros|grossiste|bulk)\b/i],
  [
    "services",
    /\b(service|services|book now|réserv\w*|booking|repair|réparation|cleaning|salon|barber|plumber)\b/i,
  ],
  [
    "products",
    /\b(shop|buy|acheter|sale|vente|price|prix|xaf|fcfa|collection|product|produit|order|commande|new arrival)\b/i,
  ],
  [
    "business",
    /\b(business|store|boutique|shop|company|entreprise|brand|marque|vendor|vendeur)\b/i,
  ],
];

export function classifyPost(caption: string): Topic | null {
  const text = caption ?? "";
  for (const [topic, re] of KEYWORDS) if (re.test(text)) return topic;
  return null;
}

export function matchesCategory(caption: string, cat: FeedCategory, _images: number): boolean {
  if (cat === "for_you" || cat === "following") return true;
  const topic = classifyPost(caption);
  if (cat === "music" && topic === "music") return true;
  if (
    cat === "opportunities" &&
    (topic === "jobs" || topic === "events" || topic === "property")
  )
    return true;
  const tags = new Set(
    [
      ...caption
        .normalize("NFC")
        .toLocaleLowerCase()
        .matchAll(/#([\p{L}\p{N}_-]+)/gu),
    ].map((match) => match[1]),
  );
  const aliases: Partial<Record<FeedCategory, string[]>> = {
    music: ["music", "musique", "musician", "musicien"],
    opportunities: ["opportunity", "opportunities", "opportunite", "opportunites"],
    business: ["business", "pro", "entreprise"],
    products: ["product", "products", "produit", "produits"],
    services: ["service", "services"],
    suppliers: ["supplier", "suppliers", "fournisseur", "fournisseurs"],
    learn: ["learn", "course", "courses", "formation"],
    jobs: ["job", "jobs", "emploi", "emplois"],
    property: ["property", "properties", "immobilier"],
    vehicles: ["vehicle", "vehicles", "véhicule", "véhicules"],
    creators: ["creator", "creators", "créateur", "créateurs"],
    events: ["event", "events", "événement", "événements"],
  };
  return (aliases[cat] ?? []).some((tag) => tags.has(tag));
}

export type FeedAction = {
  en: string;
  fr: string;
  to: "/services" | "/campus" | "/jobs" | "/property" | "/events" | "/deliveries" | "/u/$userId";
};

/** Contextual action, always pointing at an existing ASH Glo screen. */
export function actionFor(caption: string): FeedAction | null {
  switch (classifyPost(caption)) {
    case "products":
      return { en: "Shop Now", fr: "Acheter", to: "/u/$userId" };
    case "business":
      return { en: "Visit Store", fr: "Voir la boutique", to: "/u/$userId" };
    case "suppliers":
      return { en: "View Supplier", fr: "Voir le fournisseur", to: "/u/$userId" };
    case "vehicles":
      return { en: "Contact Seller", fr: "Contacter le vendeur", to: "/u/$userId" };
    case "services":
      return { en: "Book Now", fr: "Réserver", to: "/services" };
    case "learn":
      return { en: "Explore Courses", fr: "Voir les cours", to: "/campus" };
    case "jobs":
      return { en: "View Opportunities", fr: "Voir les offres", to: "/jobs" };
    case "property":
      return { en: "View Property", fr: "Voir l'immobilier", to: "/property" };
    case "events":
      return { en: "View Event", fr: "Voir l'événement", to: "/events" };
    case "delivery":
      return { en: "Request Delivery", fr: "Demander une livraison", to: "/deliveries" };
    default:
      return null;
  }
}
