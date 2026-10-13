import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  Flame,
  Menu,
  PlusCircle,
  Search,
  Sparkles,
  Store,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/lib/i18n";

type MenuEntry = {
  to: string;
  en: string;
  fr: string;
  enHint: string;
  frHint: string;
  icon: typeof Store;
};
type MenuGroup = { en: string; fr: string; items: MenuEntry[] };

/**
 * Facebook-style menu panel for the web layout: a searchable, grouped list of
 * every destination on the left and quick "Create" shortcuts on the right.
 * The mobile shell keeps its own bottom navigation and More sheet.
 */
export function DesktopMenu({ groups, create }: { groups: MenuGroup[]; create: MenuEntry[] }) {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");

  const filtered = useMemo(() => {
    const needle = term.trim().toLowerCase();
    if (!needle) return groups;
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          `${item.en} ${item.fr} ${item.enHint} ${item.frHint}`.toLowerCase().includes(needle),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, term]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setTerm("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label={tx("Menu", "Menu")}
        >
          <Menu className="size-5" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(46rem,calc(100vw-3rem))] rounded-3xl p-0 shadow-[var(--shadow-card)]"
      >
        <div className="grid h-[min(34rem,calc(100dvh-6rem))] min-h-0 grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] overflow-hidden">
          <div className="min-h-0 overflow-y-auto overscroll-contain border-r border-border p-4">
            <h2 className="font-display text-xl font-extrabold text-foreground">Menu</h2>
            <div className="relative mt-3">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder={tx("Search menu", "Rechercher dans le menu")}
                className="rounded-full pl-9"
                aria-label={tx("Search menu", "Rechercher dans le menu")}
              />
            </div>

            <div className="mt-4 space-y-5">
              {filtered.map((group) => (
                <div key={group.en}>
                  <p className="px-1 text-sm font-extrabold text-foreground">
                    {fr ? group.fr : group.en}
                  </p>
                  <div className="mt-2 space-y-0.5">
                    {group.items.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setOpen(false)}
                        className="flex items-start gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-secondary"
                      >
                        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                          <item.icon className="size-4" aria-hidden />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-bold text-foreground">
                            {tx(item.en, item.fr)}
                          </span>
                          <span className="block text-xs leading-snug text-muted-foreground">
                            {tx(item.enHint, item.frHint)}
                          </span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
              {filtered.length === 0 ? (
                <p className="px-1 py-6 text-sm text-muted-foreground">
                  {tx("Nothing matches that.", "Aucun résultat.")}
                </p>
              ) : null}
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto overscroll-contain p-4">
            <h3 className="font-display text-lg font-extrabold text-foreground">
              {tx("Create", "Créer")}
            </h3>
            <div className="mt-3 space-y-0.5">
              {create.map((item) => (
                <Link
                  key={`create-${item.to}-${item.en}`}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-secondary"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-foreground">
                    <item.icon className="size-4" aria-hidden />
                  </span>
                  <span className="truncate text-sm font-semibold text-foreground">
                    {tx(item.en, item.fr)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Destinations shown in the web menu panel. */
export const WEB_MENU_GROUPS: MenuGroup[] = [
  {
    en: "Community",
    fr: "Communauté",
    items: [
      {
        to: "/feed",
        en: "Feed",
        fr: "Fil",
        enHint: "Posts, stories and Spotlight from members.",
        frHint: "Publications, stories et Spotlight des membres.",
        icon: Flame,
      },
      {
        to: "/friends",
        en: "Friends",
        fr: "Amis",
        enHint: "Find people and answer friend requests.",
        frHint: "Trouvez des personnes et répondez aux demandes.",
        icon: Users,
      },
      {
        to: "/groups",
        en: "Groups",
        fr: "Groupes",
        enHint: "Group chats for your teams and circles.",
        frHint: "Discussions de groupe pour vos équipes.",
        icon: Users,
      },
      {
        to: "/articles",
        en: "Articles",
        fr: "Articles",
        enHint: "Read and publish stories anyone can share.",
        frHint: "Lisez et publiez des articles.",
        icon: BookOpen,
      },
      {
        to: "/mentors",
        en: "Mentors",
        fr: "Mentors",
        enHint: "Ask for guidance from experienced members.",
        frHint: "Demandez conseil à des membres expérimentés.",
        icon: Sparkles,
      },
      {
        to: "/incubator",
        en: "Incubator",
        fr: "Incubateur",
        enHint: "Builder forum spaces and help desk.",
        frHint: "Espaces forum et assistance.",
        icon: Sparkles,
      },
    ],
  },
  {
    en: "Marketplace",
    fr: "Marché",
    items: [
      {
        to: "/services",
        en: "Services",
        fr: "Services",
        enHint: "Book trusted pros near you.",
        frHint: "Réservez des pros de confiance.",
        icon: Store,
      },
      {
        to: "/property",
        en: "Property",
        fr: "Immobilier",
        enHint: "Homes, shops and land to rent or buy.",
        frHint: "Maisons, boutiques et terrains.",
        icon: Building2,
      },
      {
        to: "/deals",
        en: "Deals",
        fr: "Offres",
        enHint: "Limited offers from vendors.",
        frHint: "Offres limitées des vendeurs.",
        icon: Flame,
      },
      {
        to: "/events",
        en: "Events",
        fr: "Événements",
        enHint: "Find events and buy tickets.",
        frHint: "Trouvez des événements et des billets.",
        icon: CalendarDays,
      },
      {
        to: "/freelance",
        en: "Freelance",
        fr: "Freelance",
        enHint: "Post projects and hire talent.",
        frHint: "Publiez des projets et recrutez.",
        icon: Briefcase,
      },
      {
        to: "/jobs",
        en: "Jobs",
        fr: "Emplois",
        enHint: "Job postings with in-app applications.",
        frHint: "Offres d’emploi et candidatures.",
        icon: Briefcase,
      },
    ],
  },
];

/** Quick creation shortcuts in the right column of the web menu. */
export const WEB_MENU_CREATE: MenuEntry[] = [
  { to: "/feed", en: "Post", fr: "Publication", enHint: "", frHint: "", icon: PlusCircle },
  { to: "/feed", en: "Story", fr: "Story", enHint: "", frHint: "", icon: BookOpen },
  { to: "/create", en: "Listing", fr: "Annonce", enHint: "", frHint: "", icon: Store },
  { to: "/events", en: "Event", fr: "Événement", enHint: "", frHint: "", icon: CalendarDays },
  { to: "/jobs", en: "Job", fr: "Emploi", enHint: "", frHint: "", icon: Briefcase },
  { to: "/articles", en: "Article", fr: "Article", enHint: "", frHint: "", icon: BookOpen },
  { to: "/groups", en: "Group", fr: "Groupe", enHint: "", frHint: "", icon: Users },
  {
    to: "/property",
    en: "Property listing",
    fr: "Bien immobilier",
    enHint: "",
    frHint: "",
    icon: Building2,
  },
];
