/**
 * ASH Property — shared constants and helpers.
 *
 * Nothing here is Cameroon-specific at the architecture level: countries,
 * currencies, cities and universities are plain data that can grow (and the
 * category list itself lives in the `property_categories` table so admins can
 * change it without a deploy).
 */

export const PROPERTY_BUCKET = "property";

export type ListingKind = "RENT" | "SALE";

export const PROPERTY_CATEGORIES = [
  { code: "STUDENT_HOUSING", kind: "RENT", en: "Student housing", fr: "Logement étudiant" },
  { code: "ROOM", kind: "RENT", en: "Room", fr: "Chambre" },
  { code: "APARTMENT", kind: "RENT", en: "Apartment", fr: "Appartement" },
  { code: "HOUSE", kind: "RENT", en: "House", fr: "Maison" },
  { code: "SHARED", kind: "RENT", en: "Shared accommodation", fr: "Colocation" },
  { code: "SHORT_TERM", kind: "RENT", en: "Short-term rental", fr: "Location courte durée" },
  { code: "COMMERCIAL", kind: "RENT", en: "Commercial property", fr: "Local commercial" },
  { code: "FOR_SALE", kind: "SALE", en: "Property for sale", fr: "Bien à vendre" },
  { code: "LAND", kind: "SALE", en: "Land", fr: "Terrain" },
] as const;

export type PropertyCategoryCode = (typeof PROPERTY_CATEGORIES)[number]["code"];

export const PROPERTY_STATUSES = [
  "DRAFT",
  "PENDING_REVIEW",
  "ACTIVE",
  "PAUSED",
  "RENTED",
  "SOLD",
  "EXPIRED",
  "REJECTED",
  "ARCHIVED",
] as const;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

export const VERIFICATION_STATES = [
  { code: "BASIC", en: "Basic listing", fr: "Annonce simple" },
  { code: "IDENTITY_VERIFIED", en: "Identity verified", fr: "Identité vérifiée" },
  { code: "AGENT_VERIFIED", en: "Agent verified", fr: "Agent vérifié" },
  { code: "INFO_VERIFIED", en: "Property info verified", fr: "Informations vérifiées" },
  { code: "DOCUMENTS_REVIEWED", en: "Documents reviewed", fr: "Documents examinés" },
] as const;

export const PRICE_PERIODS = [
  { code: "YEAR", en: "per year", fr: "par an" },
  { code: "MONTH", en: "per month", fr: "par mois" },
  { code: "WEEK", en: "per week", fr: "par semaine" },
  { code: "NIGHT", en: "per night", fr: "par nuit" },
  { code: "TOTAL", en: "total", fr: "total" },
] as const;

export const AMENITIES = [
  { code: "WATER", en: "Water", fr: "Eau" },
  { code: "ELECTRICITY", en: "Electricity", fr: "Électricité" },
  { code: "INTERNET", en: "Internet", fr: "Internet" },
  { code: "PARKING", en: "Parking", fr: "Parking" },
  { code: "SECURITY", en: "Security", fr: "Sécurité" },
  { code: "FENCED", en: "Fenced", fr: "Clôturé" },
  { code: "ROAD_ACCESS", en: "Road access", fr: "Accès routier" },
  { code: "KITCHEN", en: "Private kitchen", fr: "Cuisine privée" },
  { code: "BATHROOM", en: "Private bathroom", fr: "Salle de bain privée" },
  { code: "TILED", en: "Tiled", fr: "Carrelé" },
  { code: "BALCONY", en: "Balcony", fr: "Balcon" },
  { code: "GENERATOR", en: "Generator", fr: "Groupe électrogène" },
] as const;

export const LAND_USES = [
  { code: "RESIDENTIAL", en: "Residential land", fr: "Terrain résidentiel" },
  { code: "COMMERCIAL", en: "Commercial land", fr: "Terrain commercial" },
  { code: "AGRICULTURAL", en: "Agricultural land", fr: "Terrain agricole" },
  { code: "INDUSTRIAL", en: "Industrial land", fr: "Terrain industriel" },
  { code: "DEVELOPMENT", en: "Development land", fr: "Terrain à bâtir" },
  { code: "FARM", en: "Farm", fr: "Ferme" },
] as const;

export const SIZE_UNITS = ["m²", "ha", "acre", "ft²"] as const;

export const PROPERTY_CURRENCIES = ["XAF", "NGN", "GHS", "USD", "CAD", "EUR"] as const;

/** Seed location data — extendable, never used as application logic. */
export const PROPERTY_LOCATIONS: Record<string, { label: string; cities: string[] }> = {
  CM: {
    label: "Cameroon",
    cities: [
      "Buea",
      "Douala",
      "Yaoundé",
      "Bamenda",
      "Bafoussam",
      "Limbe",
      "Dschang",
      "Kribi",
      "Garoua",
    ],
  },
  NG: { label: "Nigeria", cities: ["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Enugu"] },
  GH: { label: "Ghana", cities: ["Accra", "Kumasi", "Takoradi"] },
  CA: { label: "Canada", cities: ["Toronto", "Hamilton", "Montreal", "Vancouver"] },
  US: { label: "United States", cities: ["New York", "Houston", "Atlanta"] },
};

/** Popular student areas surfaced as shortcuts. Data only — add freely. */
export const STUDENT_AREAS: Array<{ city: string; label: string; university?: string }> = [
  { city: "Buea", label: "University of Buea", university: "University of Buea" },
  { city: "Buea", label: "Molyko" },
  { city: "Buea", label: "Bonduma" },
  { city: "Buea", label: "Mile 17" },
  { city: "Buea", label: "Great Soppo" },
  { city: "Buea", label: "Check Point" },
  { city: "Douala", label: "Bonamoussadi" },
  { city: "Yaoundé", label: "Ngoa-Ekelle", university: "University of Yaoundé I" },
  { city: "Dschang", label: "University of Dschang", university: "University of Dschang" },
  { city: "Bamenda", label: "Bambili", university: "University of Bamenda" },
];

export function labelOf<T extends { code: string; en: string; fr: string }>(
  list: readonly T[],
  code: string | null | undefined,
  fr: boolean,
): string {
  const found = list.find((item) => item.code === code);
  if (!found) return code ?? "";
  return fr ? found.fr : found.en;
}

export function categoryLabel(code: string | null | undefined, fr: boolean): string {
  return labelOf(PROPERTY_CATEGORIES, code, fr);
}

export function formatPropertyPrice(
  price: number,
  currency: string,
  period: string | null,
  fr: boolean,
): string {
  const amount = new Intl.NumberFormat(fr ? "fr-FR" : "en-US", { maximumFractionDigits: 0 }).format(
    price,
  );
  const suffix = period && period !== "TOTAL" ? ` ${labelOf(PRICE_PERIODS, period, fr)}` : "";
  return `${amount} ${currency}${suffix}`;
}
