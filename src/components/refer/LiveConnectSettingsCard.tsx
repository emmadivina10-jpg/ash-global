import { useLiveConnectPreferences } from "@/lib/live-connect.queries";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/refer/cards";
import { cn } from "@/lib/utils";

export function LiveConnectSettingsCard({ userId }: { userId: string }) {
  const { tx } = useI18n();
  const { data, isLoading, isError, update } = useLiveConnectPreferences(userId);
  const preference = data ?? { show_online: true, vendor_discovery_enabled: false };
  const options = [
    {
      id: "available",
      title: tx("Available now", "Disponible"),
      description: tx(
        "Show your online status and include your business in Live Now.",
        "Afficher votre statut et votre entreprise dans En direct.",
      ),
      values: { show_online: true, vendor_discovery_enabled: true },
    },
    {
      id: "pause",
      title: tx("Pause vendor discovery", "Mettre la découverte en pause"),
      description: tx(
        "Friends can still see you online, but your business will not appear as available in Live Now.",
        "Vos amis vous voient en ligne, mais votre entreprise n’apparaîtra pas comme disponible.",
      ),
      values: { show_online: true, vendor_discovery_enabled: false },
    },
    {
      id: "hidden",
      title: tx("Hide my online status", "Masquer mon statut en ligne"),
      description: tx(
        "Hide your online status and remove your business from Live Now.",
        "Masquer votre statut et retirer votre entreprise de la section En direct.",
      ),
      values: { show_online: false, vendor_discovery_enabled: false },
    },
  ];
  const selected = !preference.show_online
    ? "hidden"
    : preference.vendor_discovery_enabled
      ? "available"
      : "pause";

  return (
    <SectionCard title={tx("ASH Live Connect", "ASH Live Connect")}>
      <p className="mb-3 text-sm text-muted-foreground">
        {tx(
          "Control how your active status and business appear to other ASH members.",
          "Choisissez comment votre statut et votre entreprise apparaissent sur ASH.",
        )}
      </p>
      {isError ? (
        <p role="alert" className="mb-3 text-sm text-destructive">
          {tx(
            "Availability settings could not be loaded.",
            "Impossible de charger les préférences.",
          )}
        </p>
      ) : null}
      <div className="space-y-2" aria-busy={isLoading || update.isPending}>
        {options.map((option) => (
          <Button
            key={option.id}
            type="button"
            variant="outline"
            disabled={isLoading || update.isPending}
            aria-pressed={selected === option.id}
            onClick={() => update.mutate(option.values)}
            className={cn(
              "h-auto w-full justify-start whitespace-normal rounded-2xl p-3 text-left",
              selected === option.id && "border-primary/50 bg-primary/5",
            )}
          >
            <span className="min-w-0">
              <span className="block font-semibold text-foreground">{option.title}</span>
              <span className="mt-1 block text-xs font-normal leading-5 text-muted-foreground">
                {option.description}
              </span>
            </span>
          </Button>
        ))}
      </div>
      {update.isError ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {tx(
            "Your availability could not be saved.",
            "Impossible d’enregistrer votre disponibilité.",
          )}
        </p>
      ) : null}
    </SectionCard>
  );
}
