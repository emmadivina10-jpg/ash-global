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
import { playMessageSound, setSoundMuted, soundMuted } from "@/lib/sound";
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
  const { t, lang } = useI18n();
  const fr = lang === "fr";
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [soundOff, setSoundOff] = useState(false);

  useEffect(() => {
    setSoundOff(soundMuted());
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
          ASH — {fr ? "Là où les opportunités se connectent." : "Where Opportunities Connect."}
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
        title={fr ? "Sons de notification" : "Notification sounds"}
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
            {fr
              ? "Jouer un son quand un nouveau message arrive pendant que l'application est ouverte."
              : "Play a sound when a new message arrives while the app is open."}
          </p>
          <Switch
            checked={!soundOff}
            onCheckedChange={(on) => {
              setSoundMuted(!on);
              setSoundOff(!on);
              if (on) playMessageSound();
            }}
            aria-label={fr ? "Sons de notification" : "Notification sounds"}
          />
        </div>
      </SectionCard>

      <SectionCard
        title={fr ? "Localisation" : "Location"}
        action={<MapPin className="size-4 text-muted-foreground" aria-hidden />}
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          {fr
            ? "Ajoutez votre position pour voir en priorité les prestataires, services et opportunités près de vous. Elle reste sur cet appareil."
            : "Add your location so nearby providers, services and opportunities show first. It stays on this device."}
        </p>
        {location ? (
          <p className="mt-3 text-sm font-semibold text-foreground">
            {location.label ?? `${location.lat.toFixed(2)}, ${location.lng.toFixed(2)}`}
          </p>
        ) : null}
        <div className="mt-3">
          <Button onClick={() => void requestLocation()} disabled={locationBusy}>
            <MapPin className="size-4" aria-hidden />
            {location ? (fr ? "Mettre à jour" : "Update location") : fr ? "Activer la localisation" : "Enable location"}
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
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Need help?{" "}
          <a
            href="https://ash-glo-support.base44.app"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            Visit Help & Support
          </a>
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
