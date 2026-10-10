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
      { name: "description", content: "Open your ASH Glo profile, community, marketplace, earnings and account tools." },
      { property: "og:title", content: "Menu — ASH Glo" },
      { property: "og:description", content: "Your ASH Glo destinations and account tools in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MenuPage,
});

type MenuItem = { en: string; fr: string; to: string; icon: typeof Shield; referral?: boolean; soon?: boolean };

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
      { en: "Referral dashboard", fr: "Tableau de parrainage", to: "/dashboard", icon: TrendingUp, referral: true },
      { en: "My network", fr: "Mon réseau", to: "/network", icon: Users, referral: true },
      { en: "Transactions", fr: "Transactions", to: "/transactions", icon: Receipt },
      { en: "Withdraw", fr: "Retirer", to: "/withdraw", icon: ArrowDownToLine, referral: true },
      { en: "Analytics", fr: "Analyses", to: "/analytics", icon: BarChart3 },
      { en: "Professional studio", fr: "Studio professionnel", to: "/studio", icon: Sparkles },
    ],
  },
];

function MenuPage() {
  const { lang } = useI18n();
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

  return (
    <div className="member-menu mx-auto w-full max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-foreground">Menu</h1>
        <Link to="/settings" aria-label={fr ? "Paramètres" : "Settings"} className="grid size-10 place-items-center rounded-full bg-muted text-foreground">
          <Settings className="size-5" aria-hidden />
        </Link>
      </div>

      <Link to="/profile" className="flex items-center gap-3 border-b border-border bg-card py-3 sm:rounded-lg sm:border sm:px-4">
        <Avatar path={profile?.avatar_url} name={profile?.full_name} online className="size-14" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 text-base font-bold text-foreground">
            <span className="truncate">{profile?.full_name || (fr ? "Votre profil" : "Your profile")}</span>
            <VerifiedBadge tier={profile?.verified_tier} until={profile?.verified_until} size={16} />
          </span>
          <span className="mt-0.5 block text-sm text-muted-foreground">{fr ? "Voir votre profil" : "See your profile"}</span>
        </span>
        <ChevronRight className="size-5 text-muted-foreground" aria-hidden />
      </Link>

      {sections.map((section) => (
        <section key={section.en} className="border-b border-border pb-4">
          <h2 className="mb-2 text-base font-bold text-foreground">{fr ? section.fr : section.en}</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {section.items
              .filter((item) => !item.referral || region.referralEnabled)
              .map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex min-h-16 items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-muted/50"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <item.icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1 break-words">{fr ? item.fr : item.en}</span>
                  {item.soon ? (
                    <span className="grid size-5 shrink-0 place-items-center text-gold-foreground" title={fr ? "Bientôt disponible" : "Coming soon"} aria-label={fr ? "Bientôt disponible" : "Coming soon"}>
                      <Hourglass className="size-3.5" aria-hidden />
                    </span>
                  ) : null}
                </Link>
              ))}
          </div>
        </section>
      ))}

      {isAdmin ? (
        <a href="/console" className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-bold text-foreground">
          <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary"><Shield className="size-5" aria-hidden /></span>
          {fr ? "Console d’administration" : "Admin console"}
        </a>
      ) : null}

      <section className="border-b border-border pb-4">
        <h2 className="mb-2 text-base font-bold text-foreground">{fr ? "Informations légales" : "Legal & privacy"}</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Link to="/privacy" className="rounded-lg border border-border bg-card px-3 py-3 text-sm font-semibold text-foreground">{fr ? "Confidentialité" : "Privacy Policy"}</Link>
          <Link to="/terms" className="rounded-lg border border-border bg-card px-3 py-3 text-sm font-semibold text-foreground">{fr ? "Conditions" : "Terms of Service"}</Link>
          <Link to="/community-guidelines" className="rounded-lg border border-border bg-card px-3 py-3 text-sm font-semibold text-foreground">{fr ? "Règles de la communauté" : "Community Guidelines"}</Link>
          <Link to="/marketplace-policy" className="rounded-lg border border-border bg-card px-3 py-3 text-sm font-semibold text-foreground">{fr ? "Réservations et remboursements" : "Bookings & refunds"}</Link>
          <Link to="/referral-wallet-terms" className="rounded-lg border border-border bg-card px-3 py-3 text-sm font-semibold text-foreground">{fr ? "Parrainage et portefeuille" : "Referral & wallet"}</Link>
          <Link to="/account-deletion" className="rounded-lg border border-border bg-card px-3 py-3 text-sm font-semibold text-foreground">{fr ? "Suppression du compte" : "Account deletion"}</Link>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2 pb-2">
        <Link to="/settings" className="flex items-center justify-center gap-2 rounded-lg bg-muted px-4 py-3 text-sm font-bold text-foreground">
          <Settings className="size-4" aria-hidden /> {fr ? "Paramètres" : "Settings"}
        </Link>
        <Button variant="secondary" className="h-auto rounded-lg py-3" onClick={() => void signOut()}>
          <LogOut className="size-4" aria-hidden /> {fr ? "Déconnexion" : "Log out"}
        </Button>
      </div>
    </div>
  );
}
