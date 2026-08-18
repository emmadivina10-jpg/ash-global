import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { MessageCircle } from "lucide-react";
import { useConversations } from "@/lib/marketplace.queries";
import { useUser } from "@/lib/queries";
import { ChatThread } from "@/components/refer/ChatThread";
import { EmptyState, SkeletonRows } from "@/components/refer/states";
import { useI18n } from "@/lib/i18n";
import { formatDateTime } from "@/lib/format";
import { bookingStatusLabel } from "@/lib/booking";
import { cn } from "@/lib/utils";

const searchSchema = z.object({ c: z.string().optional() });

export const Route = createFileRoute("/_authenticated/messages")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Messages — ASH Glo REFER" },
      { name: "description", content: "Chat live with your beauty pro or your clients about upcoming bookings." },
      { property: "og:title", content: "Messages — ASH Glo REFER" },
      { property: "og:description", content: "Live chat between clients and beauty providers on ASH Glo REFER." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  const { t, lang } = useI18n();
  const { user } = useUser();
  const { c } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: conversations, isLoading } = useConversations();

  const list = conversations ?? [];
  const activeId = c ?? list[0]?.id;
  const active = list.find((conv) => conv.id === activeId);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">{t("chat.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("chat.pick")}</p>
      </header>

      {isLoading ? (
        <SkeletonRows rows={3} />
      ) : list.length === 0 ? (
        <EmptyState
          title={t("chat.none")}
          description={t("chat.noneCopy")}
          icon={<MessageCircle className="size-5" aria-hidden />}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-[260px_minmax(0,1fr)]">
          <nav className="tile max-h-64 space-y-1 overflow-y-auto p-2 md:max-h-[70vh]">
            {list.map((conv) => {
              const label = conv.provider?.business_name ?? t("chat.title");
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => void navigate({ search: { c: conv.id } })}
                  className={cn(
                    "w-full truncate rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors",
                    conv.id === activeId ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <span className="block truncate">{label}</span>
                  {conv.booking ? (
                    <span className="block truncate text-[11px] font-normal opacity-80">
                      {conv.booking.service_title}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          <div className="tile flex h-[60vh] flex-col p-3">
            <div className="mb-2 min-w-0">
              <p className="truncate font-display font-semibold text-foreground">
                {active?.provider?.business_name ?? t("chat.title")}
              </p>
              {active?.booking ? (
                <p className="truncate text-xs text-muted-foreground">
                  {active.booking.service_title} · {formatDateTime(active.booking.scheduled_at)} ·{" "}
                  {bookingStatusLabel(active.booking.status, lang)}
                </p>
              ) : null}
            </div>
            {activeId ? <ChatThread conversationId={activeId} currentUserId={user?.id} className="flex-1" /> : null}
          </div>
        </div>
      )}
    </div>
  );
}
