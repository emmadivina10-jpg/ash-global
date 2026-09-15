import type { Lang } from "@/lib/i18n";
import type { ServiceCategory } from "@/lib/marketplace";

import heroBeauty from "@/assets/hero-beauty.jpg";
import heroTech from "@/assets/hero-tech.jpg";
import heroHome from "@/assets/hero-home.jpg";
import heroEvents from "@/assets/hero-events.jpg";

export type GroupId = "BEAUTY" | "TECH" | "HOME" | "EVENTS" | "HEALTH" | "PROFESSIONAL";

export type CategoryGroup = {
  id: GroupId;
  label: { en: string; fr: string };
  headline: { en: string; fr: string };
  copy: { en: string; fr: string };
  image: string;
  categories: ServiceCategory[];
};

/**
 * Presentation-only grouping over the `service_category` values providers can
 * actually register under. Nothing here invents providers or services.
 */
export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    id: "BEAUTY",
    label: { en: "Beauty", fr: "Beauté" },
    headline: { en: "Find your next beauty experience.", fr: "Trouvez votre prochaine expérience beauté." },
    copy: {
      en: "Braiders, hair stylists, barbers, nail and lash artists, makeup and wellness pros near you.",
      fr: "Tresseuses, coiffeurs, barbiers, prothésistes ongulaires, maquilleurs et bien-être près de chez vous.",
    },
    image: heroBeauty,
    categories: ["BRAIDER", "HAIR_STYLIST", "BARBER", "NAIL_TECH", "LASH_TECH", "MAKEUP", "MASSAGE"],
  },
  {
    id: "TECH",
    label: { en: "Technology", fr: "Technologie" },
    headline: { en: "Build your next digital product.", fr: "Créez votre prochain produit digital." },
    copy: {
      en: "Web and mobile developers, UI/UX designers, cloud, DevOps, AI and cybersecurity specialists.",
      fr: "Développeurs web et mobile, designers UI/UX, cloud, DevOps, IA et cybersécurité.",
    },
    image: heroTech,
    categories: ["WEB_DEV", "MOBILE_DEV", "UIUX", "CLOUD", "DEVOPS", "AI", "CYBERSECURITY", "IT_CONSULTING"],
  },
  {
    id: "HOME",
    label: { en: "Home", fr: "Maison" },
    headline: { en: "Find trusted professionals near you.", fr: "Trouvez des professionnels de confiance." },
    copy: {
      en: "Electricians, plumbers, cleaners, handymen and private chefs, rated by real clients.",
      fr: "Électriciens, plombiers, agents d'entretien, bricoleurs et chefs privés, notés par de vrais clients.",
    },
    image: heroHome,
    categories: ["ELECTRICIAN", "PLUMBER", "CLEANER", "HANDYMAN", "PRIVATE_CHEF"],
  },
  {
    id: "EVENTS",
    label: { en: "Events", fr: "Événements" },
    headline: { en: "Make the day unforgettable.", fr: "Rendez le jour inoubliable." },
    copy: {
      en: "Photographers, videographers, catering, decoration, DJs and full event planning.",
      fr: "Photographes, vidéastes, traiteurs, décoration, DJ et organisation complète d'événements.",
    },
    image: heroEvents,
    categories: ["PHOTOGRAPHY", "VIDEOGRAPHY", "CATERING", "DECORATION", "DJ", "EVENT_PLANNING"],
  },
  {
    id: "HEALTH",
    label: { en: "Health", fr: "Santé" },
    headline: { en: "Take care of yourself.", fr: "Prenez soin de vous." },
    copy: {
      en: "Wellness, massage and health professionals available for home or studio sessions.",
      fr: "Bien-être, massage et professionnels de santé, à domicile ou en cabinet.",
    },
    image: heroBeauty,
    categories: ["HEALTH_WELLNESS", "MASSAGE"],
  },
  {
    id: "PROFESSIONAL",
    label: { en: "Professional", fr: "Professionnel" },
    headline: { en: "Grow your business with experts.", fr: "Développez votre activité avec des experts." },
    copy: {
      en: "Consultants and professional services listed by verified ASH Glo members.",
      fr: "Consultants et services professionnels proposés par des membres ASH Glo vérifiés.",
    },
    image: heroTech,
    categories: ["PROFESSIONAL", "IT_CONSULTING", "OTHER"],
  },
];

const LABELS: Record<string, { en: string; fr: string }> = {
  BRAIDER: { en: "Braider", fr: "Tresseuse" },
  HAIR_STYLIST: { en: "Hair stylist", fr: "Coiffeur" },
  BARBER: { en: "Barber", fr: "Barbier" },
  NAIL_TECH: { en: "Nail tech", fr: "Prothésiste ongulaire" },
  LASH_TECH: { en: "Lash artist", fr: "Styliste de cils" },
  MAKEUP: { en: "Makeup artist", fr: "Maquilleur" },
  MASSAGE: { en: "Massage & wellness", fr: "Massage & bien-être" },
  WEB_DEV: { en: "Web development", fr: "Développement web" },
  MOBILE_DEV: { en: "Mobile apps", fr: "Applications mobiles" },
  UIUX: { en: "UI/UX design", fr: "Design UI/UX" },
  CLOUD: { en: "Cloud", fr: "Cloud" },
  DEVOPS: { en: "DevOps", fr: "DevOps" },
  AI: { en: "AI", fr: "IA" },
  CYBERSECURITY: { en: "Cybersecurity", fr: "Cybersécurité" },
  IT_CONSULTING: { en: "IT consulting", fr: "Conseil IT" },
  ELECTRICIAN: { en: "Electrician", fr: "Électricien" },
  PLUMBER: { en: "Plumber", fr: "Plombier" },
  CLEANER: { en: "Cleaning", fr: "Nettoyage" },
  HANDYMAN: { en: "Handyman", fr: "Bricoleur" },
  PRIVATE_CHEF: { en: "Private chef", fr: "Chef privé" },
  PHOTOGRAPHY: { en: "Photography", fr: "Photographie" },
  VIDEOGRAPHY: { en: "Videography", fr: "Vidéographie" },
  CATERING: { en: "Catering", fr: "Traiteur" },
  DECORATION: { en: "Decoration", fr: "Décoration" },
  DJ: { en: "DJ", fr: "DJ" },
  EVENT_PLANNING: { en: "Event planning", fr: "Organisation d'événements" },
  HEALTH_WELLNESS: { en: "Health & wellness", fr: "Santé & bien-être" },
  PROFESSIONAL: { en: "Professional services", fr: "Services professionnels" },
  OTHER: { en: "Other", fr: "Autre" },
};

export function categoryLabel(category: string, lang: Lang): string {
  const entry = LABELS[category];
  if (entry) return entry[baseLang(lang)];
  return category.replace(/_/g, " ").toLowerCase();
}

export function groupOf(category: string): GroupId | null {
  return CATEGORY_GROUPS.find((g) => (g.categories as string[]).includes(category))?.id ?? null;
}
