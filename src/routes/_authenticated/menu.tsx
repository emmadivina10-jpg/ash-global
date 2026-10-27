import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDownToLine,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  BriefcaseBusiness,
  CalendarDays,
  ChevronRight,
  ChevronDown,
  CircleHelp,
  Hourglass,
  Flame,
  GraduationCap,
  LogOut,
  MessageCircle,
  PlusCircle,
  Receipt,
  Search,
  Settings,
  Shield,
  Sparkles,
  Store,
  TrendingUp,
  User,
  Users,
  Wallet,
  Building2,
  ChartNoAxesCombined,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Avatar } from "@/components/refer/AvatarUpload";
import { VerifiedBadge } from "@/components/refer/VerifiedBadge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useIsAdmin, useProfile } from "@/lib/queries";
import { useRegion } from "@/lib/region-context";

export const Route = createFileRoute("/_authenticated/menu")({
  head: () => ({
    meta: [
      { title: "Menu — ASH Glo" },
      {
        name: "description",
        content: "Open your ASH Glo profile, community, marketplace, earnings and account tools.",
      },
      { property: "og:title", content: "Menu — ASH Glo" },
      {
        property: "og:description",
        content: "Your ASH Glo destinations and account tools in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MenuPage,
});

type MenuItem = {
  en: string;
  fr: string;
  to: string;
  icon: typeof Shield;
  referral?: boolean;
  soon?: boolean;
};

const sections: { en: string; fr: string; items: MenuItem[] }[] = [
  {
    en: "Social",
    fr: "Social",
    items: [
      { en: "Search ASH", fr: "Rechercher sur ASH", to: "/search", icon: Search },
      { en: "Friends", fr: "Amis", to: "/friends", icon: Users },
      { en: "Groups", fr: "Groupes", to: "/groups", icon: MessageCircle },
      { en: "Notifications", fr: "Notifications", to: "/notifications", icon: Bell },
      { en: "Articles", fr: "Articles", to: "/articles", icon: BookOpen },
      { en: "Mentors", fr: "Mentors", to: "/mentors", icon: GraduationCap },
      { en: "ASH Campus", fr: "ASH Campus", to: "/campus", icon: GraduationCap },
      { en: "Incubator", fr: "Incubateur", to: "/incubator", icon: Sparkles },
    ],
  },
  {
    en: "Your activity",
    fr: "Votre activité",
    items: [
      { en: "Services", fr: "Services", to: "/services", icon: Store },
      { en: "Property", fr: "Immobilier", to: "/property", icon: Building2 },
      { en: "Deals", fr: "Offres", to: "/deals", icon: Flame, soon: true },
      { en: "Events", fr: "Événements", to: "/events", icon: CalendarDays, soon: true },
      { en: "Freelance", fr: "Freelance", to: "/freelance", icon: Briefcase, soon: true },
      { en: "Jobs", fr: "Emplois", to: "/jobs", icon: BriefcaseBusiness, soon: true },
      { en: "Create", fr: "Créer", to: "/create", icon: PlusCircle },
      { en: "Bookings", fr: "Réservations", to: "/bookings", icon: CalendarDays },
      { en: "Inventory", fr: "Inventaire", to: "/inventory", icon: BarChart3, soon: true },
    ],
  },
  {
    en: "Earn and manage",
    fr: "Gagner et gérer",
    items: [
      { en: "Wallet", fr: "Portefeuille", to: "/wallet", icon: Wallet },
      {
        en: "Referral dashboard",
        fr: "Tableau de parrainage",
        to: "/dashboard",
        icon: TrendingUp,
        referral: true,
      },
      { en: "My network", fr: "Mon réseau", to: "/network", icon: Users, referral: true },
      { en: "Transactions", fr: "Transactions", to: "/transactions", icon: Receipt },
      { en: "Withdraw", fr: "Retirer", to: "/withdraw", icon: ArrowDownToLine, referral: true },
      { en: "Analytics", fr: "Analyses", to: "/analytics", icon: BarChart3 },
      { en: "ASH Investment", fr: "ASH Investment", to: "/investment", icon: ChartNoAxesCombined },
      { en: "Professional studio", fr: "Studio professionnel", to: "/studio", icon: Sparkles },
    ],
  },
];

function MenuPage() {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";
  const region = useRegion();
  const { data: profile } = useProfile();
  const { data: isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/login", replace: true });
  }

  const [showAll, setShowAll] = useState(false);
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const tiles = sections
    .flatMap((section) => section.items)
    .filter((item) => !item.referral || region.referralEnabled);
  const shown = showAll ? tiles : tiles.slice(0, 8);
  const legal = [
    { to: "/privacy", en: "Privacy Policy", fr: "Confidentialité" },
    { to: "/terms", en: "Terms of Service", fr: "Conditions" },
    { to: "/community-guidelines", en: "Community Guidelines", fr: "Règles de la communauté" },
    { to: "/marketplace-policy", en: "Bookings & refunds", fr: "Réservations et remboursements" },
    { to: "/referral-wallet-terms", en: "Referral & wallet", fr: "Parrainage et portefeuille" },
    { to: "/account-deletion", en: "Account deletion", fr: "Suppression du compte" },
  ];
  const panels = [
    {
      id: "help",
      icon: CircleHelp,
      en: "Help and support",
      fr: "Aide et assistance",
      links: [{ to: "/support", en: "Contact ASH support", fr: "Contacter le support ASH" }],
    },
    {
      id: "settings",
      icon: Settings,
      en: "Settings and privacy",
      fr: "Paramètres et confidentialité",
      links: [{ to: "/settings", en: "Settings", fr: "Paramètres" }, ...legal],
    },
  ];

  return (
    <div className="member-menu mx-auto w-full max-w-3xl space-y-5 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-foreground">Menu</h1>
        <div className="flex gap-1">
          <Link
            to="/search"
            aria-label={tx("Search", "Rechercher")}
            className="grid size-10 place-items-center rounded-full text-foreground hover:bg-muted"
          >
            <Search className="size-6" aria-hidden />
          </Link>
          <Link
            to="/settings"
            aria-label={tx("Settings", "Paramètres")}
            className="grid size-10 place-items-center rounded-full text-foreground hover:bg-muted"
          >
            <Settings className="size-6" aria-hidden />
          </Link>
        </div>
      </div>

      <Link
        to="/profile"
        className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3.5 shadow-sm ring-1 ring-border"
      >
        <Avatar path={profile?.avatar_url} name={profile?.full_name} online className="size-12" />
        <span className="flex min-w-0 flex-1 items-center gap-1 text-lg font-bold text-foreground">
          <span className="truncate">{profile?.full_name || tx("Your profile", "Votre profil")}</span>
          <VerifiedBadge tier={profile?.verified_tier} until={profile?.verified_until} size={16} />
        </span>
        <span className="grid size-9 place-items-center rounded-full bg-muted">
          <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
        </span>
      </Link>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {shown.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="relative flex min-h-[5.5rem] flex-col justify-between gap-2 rounded-2xl bg-card p-3.5 shadow-sm ring-1 ring-border transition-colors hover:bg-muted/60"
          >
            <item.icon className="size-7 text-primary" strokeWidth={1.75} aria-hidden />
            <span className="text-[15px] font-semibold leading-tight text-foreground">
              {tx(item.en, item.fr)}
            </span>
            {item.soon ? (
              <span
                className="absolute right-3 top-3 text-gold-foreground"
                title={tx("Coming soon", "Bientôt disponible")}
                aria-label={tx("Coming soon", "Bientôt disponible")}
              >
                <Hourglass className="size-3.5" aria-hidden />
              </span>
            ) : null}
          </Link>
        ))}
      </div>
      {tiles.length > 8 ? (
        <Button
          variant="secondary"
          className="h-11 w-full rounded-xl text-[15px] font-bold"
          onClick={() => setShowAll((v) => !v)}
        >
          {showAll ? tx("See less", "Voir moins") : tx("See more", "Voir plus")}
        </Button>
      ) : null}

      <div className="divide-y divide-border border-y border-border">
        {panels.map((panel) => {
          const isOpen = openPanel === panel.id;
          return (
            <div key={panel.id}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenPanel(isOpen ? null : panel.id)}
                className="flex w-full items-center gap-3 py-4 text-left text-[17px] font-semibold text-foreground"
              >
                <panel.icon className="size-7" strokeWidth={1.75} aria-hidden />
                <span className="flex-1">{tx(panel.en, panel.fr)}</span>
                <ChevronDown
                  className={"size-5 transition-transform duration-300 " + (isOpen ? "rotate-180" : "")}
                  aria-hidden
                />
              </button>
              {isOpen ? (
                <div className="grid grid-cols-2 gap-2 pb-4">
                  {panel.links.map((l) => (
                    <Link
                      key={l.to}
                      to={l.to}
                      className="rounded-xl bg-card px-3 py-3 text-sm font-semibold text-foreground ring-1 ring-border"
                    >
                      {tx(l.en, l.fr)}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {isAdmin ? (
        <a
          href="/console"
          className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3 text-sm font-bold text-foreground ring-1 ring-border"
        >
          <Shield className="size-6 text-primary" aria-hidden />
          {tx("Admin console", "Console d’administration")}
        </a>
      ) : null}

      <Button
        variant="secondary"
        className="h-11 w-full rounded-xl text-[15px] font-bold"
        onClick={() => void signOut()}
      >
        <LogOut className="size-4" aria-hidden /> {tx("Log out", "Déconnexion")}
      </Button>
    </div>
  );
}
