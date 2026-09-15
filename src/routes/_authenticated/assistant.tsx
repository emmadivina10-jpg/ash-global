import { createFileRoute } from "@tanstack/react-router";
import { AssistantPanel } from "@/components/refer/AssistantPanel";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({
    meta: [
      { title: "ASH Assistant — AI coach for your earnings" },
      {
        name: "description",
        content: "Ask the ASH Assistant about commissions, bookings and how to grow your studio and network.",
      },
      { property: "og:title", content: "ASH Assistant — AI coach for your earnings" },
      { property: "og:description", content: "Personalized analytics and growth advice powered by AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssistantPage,
});

function AssistantPage() {
  const { t } = useI18n();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{t("ai.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("ai.subtitle")}</p>
      </header>

      <div className="tile flex h-[62vh] flex-col p-4">
        <AssistantPanel />
      </div>
    </div>
  );
}
