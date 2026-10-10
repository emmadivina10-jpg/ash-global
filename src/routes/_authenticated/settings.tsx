import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Bell,
  BellOff,
  Briefcase,
  Calendar,
  Home,
  Info,
  LifeBuoy,
  MapPin,
  Loader2,
  ScrollText,
  ShieldCheck,
  Store,
  Tag,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard } from "@/components/refer/cards";
import { ConfirmationModal } from "@/components/refer/ConfirmationModal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ACTIVATION_FEE, formatXAF } from "@/lib/format";
import { Switch } from "@/components/ui/switch";
import { playNotificationSound, playTabSound, setSoundMuted, setUiSoundMuted, soundMuted, uiSoundMuted } from "@/lib/sound";
import { useLocation } from "@/lib/location";
import { useOrbVisible } from "@/lib/orb-visibility";
import {
  useClearActivityHistory,
  useRecommendationPrefs,
  useUpdateRecommendationPrefs,
} from "@/lib/recommendations.queries";
import { useI18n, type TKey } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — ASH" },
      {
        name: "description",
        content:
          "ASH — Where Opportunities Connect. About the ecosystem, privacy policy, fair-use terms and account controls.",
      },
      { property: "og:title", content: "Settings — ASH" },
      {
        property: "og:description",
        content: "ASH — Where Opportunities Connect. About the platform, privacy and account controls.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

/** Quick links into the ASH ecosystem pillars. */
const PILLARS = [
  { to: "/network", icon: Users, en: "Refer", fr: "Parrainage" },
  { to: "/services", icon: Store, en: "Services", fr: "Services" },
  { to: "/freelance", icon: Briefcase, en: "Freelance", fr: "Freelance" },
  { to: "/property", icon: Home, en: "Property", fr: "Immobilier" },
  { to: "/events", icon: Calendar, en: "Events", fr: "Événements" },
  { to: "/deals", icon: Tag, en: "Deals", fr: "Promos" },
] as const;

function Paragraphs({ keys, vars }: { keys: TKey[]; vars?: Record<string, string> }) {
  const { t } = useI18n();
  return (
    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
      {keys.map((k) => (
        <p key={k}>{t(k, vars)}</p>
      ))}
    </div>
  );
}

function SettingsPage() {
  const { tx, t, lang } = useI18n();
  const fr = lang === "fr";
  const { location, request: requestLocation, busy: locationBusy } = useLocation();
  const { visible: orbVisible, setVisible: setOrbVisible } = useOrbVisible();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [soundOff, setSoundOff] = useState(false);
  const [uiOff, setUiOff] = useState(false);
  const { data: recPrefs } = useRecommendationPrefs();
  const updateRecPrefs = useUpdateRecommendationPrefs();
  const clearHistory = useClearActivityHistory();
  const [clearingHistory, setClearingHistory] = useState(false);

  useEffect(() => {
    setSoundOff(soundMuted());
    setUiOff(uiSoundMuted());
  }, []);

  const { data: request } = useQuery({
    queryKey: ["deletion-request"],
    queryFn: async () => {
      const { data } = await supabase
        .from("account_deletion_requests")
        .select("id, status, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const pending = request?.status === "PENDING";

  async function submit() {
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) {
      setBusy(false);
      toast.error(t("settings.delete.err"));
      return;
    }
    const { error } = await supabase
      .from("account_deletion_requests")
      .insert({ user_id: userId, reason: reason.trim() || null });
    setBusy(false);
    setConfirming(false);
    if (error) {
      toast.error(t("settings.delete.err"));
      return;
    }
    setReason("");
    toast.success(t("settings.delete.sent"));
    await queryClient.invalidateQueries({ queryKey: ["deletion-request"] });
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{t("settings.title")}</h1>
        <p className="mt-1 text-sm font-semibold text-primary">
          ASH — {tx("Where Opportunities Connect.", "Là où les opportunités se connectent.")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{t("settings.subtitle")}</p>
      </header>

      <SectionCard
        title={t("settings.about")}
        action={<Info className="size-4 text-muted-foreground" aria-hidden />}
      >
        <Paragraphs
          keys={["settings.about.1", "settings.about.2", "settings.about.3", "settings.about.4", "settings.about.5"]}
          vars={{ fee: formatXAF(ACTIVATION_FEE) }}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {PILLARS.map(({ to, icon: Icon, en, fr: label }) => (
            <Link
              key={to}
              to={to}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <Icon className="size-3.5" aria-hidden />
              {fr ? label : en}
              <ArrowUpRight className="size-3 text-muted-foreground" aria-hidden />
            </Link>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title={tx("Notification sounds", "Sons de notification")}
        action={
          soundOff ? (
            <BellOff className="size-4 text-muted-foreground" aria-hidden />
          ) : (
            <Bell className="size-4 text-muted-foreground" aria-hidden />
          )
        }
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {tx("Play a sound when a new message or notification arrives while the app is open.", "Jouer un son quand un nouveau message ou une notification arrive pendant que l'application est ouverte.")}
          </p>
          <Switch
            checked={!soundOff}
            onCheckedChange={(on) => {
              setSoundMuted(!on);
              setSoundOff(!on);
              if (on) playNotificationSound();
            }}
            aria-label={tx("Notification sounds", "Sons de notification")}
          />
        </div>
      </SectionCard>

      <SectionCard title={tx("Tap & refresh sounds", "Sons de navigation")}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {tx("Play a short sound when switching tabs and refreshing.", "Jouer un petit son en changeant d’onglet et en actualisant.")}
          </p>
          <Switch
            checked={!uiOff}
            onCheckedChange={(on) => {
              setUiSoundMuted(!on);
              setUiOff(!on);
              if (on) playTabSound();
            }}
            aria-label={tx("Tap and refresh sounds", "Sons de navigation")}
          />
        </div>
      </SectionCard>

      <SectionCard title="ASH Compass">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {tx("Map and Wallet", "Carte et portefeuille")}
          </p>
          <Switch
            checked={orbVisible}
            onCheckedChange={(on) => setOrbVisible(on)}
            aria-label={tx("Show ASH Compass", "Afficher ASH Compass")}
          />
        </div>
      </SectionCard>

      <SectionCard title={tx("Personalized recommendations", "Recommandations personnalisées")}>
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">
                {tx("Personalized recommendations", "Recommandations personnalisées")}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {tx("Let ASH choose what you see based on what interests you. Turned off, you simply see recent and popular content like everyone else.", "Laisser ASH choisir ce qui vous est montré en fonction de ce qui vous intéresse. Désactivé, vous voyez le contenu récent et populaire comme tout le monde.")}
              </p>
            </div>
            <Switch
              checked={recPrefs?.personalization_enabled ?? true}
              onCheckedChange={(on) => updateRecPrefs.mutate({ personalization_enabled: on })}
              aria-label={tx("Personalized recommendations", "Recommandations personnalisées")}
            />
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{tx("Use my city", "Utiliser ma ville")}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {tx("Show people, services and offers closer to you. Only the city name is used — never your exact position.", "Mettre en avant les personnes, services et offres proches de vous. Seul le nom de la ville est utilisé, jamais votre position exacte.")}
              </p>
            </div>
            <Switch
              checked={recPrefs?.use_location ?? false}
              onCheckedChange={(on) => updateRecPrefs.mutate({ use_location: on })}
              aria-label={tx("Use my city", "Utiliser ma ville")}
            />
          </div>

          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">
                {tx("Use my activity", "Utiliser mon activité")}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {tx("Take into account what you open, like or save. Turned off, ASH stops recording this activity.", "Tenir compte de ce que vous ouvrez, aimez ou enregistrez. Désactivé, ASH arrête d'enregistrer cette activité.")}
              </p>
            </div>
            <Switch
              checked={recPrefs?.use_activity_history ?? true}
              onCheckedChange={(on) => updateRecPrefs.mutate({ use_activity_history: on })}
              aria-label={tx("Use my activity", "Utiliser mon activité")}
            />
          </div>

          <div className="rounded-xl border border-border/60 p-3">
            <p className="text-sm font-semibold">
              {tx("Clear my personalization history", "Effacer mon historique de personnalisation")}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {tx("Deletes only what ASH learned from your activity. Your posts, comments, messages, bookings, wallet, referrals and friends are not touched.", "Supprime uniquement ce qu'ASH a retenu de votre activité. Vos publications, commentaires, messages, réservations, portefeuille, parrainages et amis ne sont pas touchés.")}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              disabled={clearingHistory}
              onClick={() => {
                setClearingHistory(true);
                clearHistory.mutate(undefined, {
                  onSuccess: () =>
                    toast.success(tx("Personalization history cleared.", "Historique effacé.")),
                  onError: () =>
                    toast.error(tx("Could not clear the history.", "Impossible d'effacer.")),
                  onSettled: () => setClearingHistory(false),
                });
              }}
            >
              {tx("Clear history", "Effacer l'historique")}
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={tx("Location", "Localisation")}
        action={<MapPin className="size-4 text-muted-foreground" aria-hidden />}
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          {tx("Add your location for nearby results. Precise coordinates stay on this device; your city can support recommendations only when you enable that setting.", "Ajoutez votre position pour voir en priorité les prestataires, services et opportunités près de vous. Elle reste sur cet appareil.")}
        </p>
        {location ? (
          <p className="mt-3 text-sm font-semibold text-foreground">
            {location.label ?? `${location.lat.toFixed(2)}, ${location.lng.toFixed(2)}`}
          </p>
        ) : null}
        <div className="mt-3">
          <Button onClick={() => void requestLocation()} disabled={locationBusy}>
            <MapPin className="size-4" aria-hidden />
            {location ? (tx("Update location", "Mettre à jour")) : tx("Enable location", "Activer la localisation")}
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        title={t("settings.privacy")}
        action={<ShieldCheck className="size-4 text-muted-foreground" aria-hidden />}
      >
        <Paragraphs
          keys={[
            "settings.privacy.1",
            "settings.privacy.2",
            "settings.privacy.3",
            "settings.privacy.4",
            "settings.privacy.5",
          ]}
        />
      </SectionCard>

      <SectionCard
        title={t("settings.terms")}
        action={<ScrollText className="size-4 text-muted-foreground" aria-hidden />}
      >
        <Paragraphs keys={["settings.terms.1", "settings.terms.2", "settings.terms.3"]} />
      </SectionCard>

      <SectionCard
        title={t("settings.support")}
        action={<LifeBuoy className="size-4 text-muted-foreground" aria-hidden />}
      >
        <p className="text-sm leading-relaxed text-muted-foreground">{t("settings.support.copy")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/support">{t("settings.support.cta")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/privacy">Privacy Policy</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/terms">Terms of Service</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/community-guidelines">Community Guidelines</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/marketplace-policy">Marketplace Policy</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/referral-wallet-terms">Referral &amp; Wallet Terms</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/account-deletion">Account &amp; Data Deletion</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/contact">Contact</Link>
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Need help? Use the official ASH support form above.
        </p>

      </SectionCard>

      <SectionCard title={t("settings.danger")} className="border-destructive/40">
        <p className="text-sm leading-relaxed text-muted-foreground">{t("settings.delete.copy")}</p>

        {pending ? (
          <p className="mt-4 rounded-xl bg-muted p-3 text-sm font-medium text-foreground">
            {t("settings.delete.pending")}
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {request?.status === "REJECTED" ? (
              <p className="text-xs text-muted-foreground">{t("settings.delete.rejected")}</p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="delete-reason">{t("settings.delete.reason")}</Label>
              <Textarea
                id="delete-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
              />
            </div>
            <Button variant="destructive" onClick={() => setConfirming(true)} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
              {t("settings.delete.submit")}
            </Button>
          </div>
        )}
      </SectionCard>

      <p className="pb-2 text-center text-xs text-muted-foreground">{t("settings.version")}</p>

      <ConfirmationModal
        open={confirming}
        onOpenChange={setConfirming}
        title={t("settings.delete.confirm")}
        description={t("settings.delete.confirmDesc")}
        confirmLabel={t("settings.delete.submit")}
        loading={busy}
        onConfirm={() => void submit()}
      />
    </div>
  );
}
