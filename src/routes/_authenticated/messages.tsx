import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { useConversations } from "@/lib/marketplace.queries";
import { useUser } from "@/lib/queries";
import { ChatThread } from "@/components/refer/ChatThread";
import { EmptyState, SkeletonRows } from "@/components/refer/states";
import { useI18n } from "@/lib/i18n";
import { formatDateTime, formatXAF } from "@/lib/format";
import { bookingStatusLabel } from "@/lib/booking";
import { cn } from "@/lib/utils";

const searchSchema = z.object({ c: z.string().optional() });

export const Route = createFileRoute("/_authenticated/messages")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Messages — ASH Glo" },
      { name: "description", content: "Chat live with your beauty pro or your clients about upcoming bookings." },
      { property: "og:title", content: "Messages — ASH Glo" },
      { property: "og:description", content: "Live chat between clients and beauty providers on ASH Glo." },
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
  // Desktop falls back to the first conversation; mobile requires an explicit pick.
  const activeId = c ?? (typeof window !== "undefined" && window.innerWidth >= 768 ? list[0]?.id : undefined);
  const active = list.find((conv) => conv.id === activeId);
  const mobileView = c ? "thread" : "list";

  /** Providers see the client; clients see the business. Property threads show the listing/owner. */
  function peerOf(conv: (typeof list)[number]): string {
    if (conv.listing_id) {
      const viewerIsOwner = Boolean(user?.id) && conv.owner_id === user?.id;
      return viewerIsOwner ? (conv.client?.full_name ?? "ASH client") : (conv.listing?.title ?? "ASH Property");
    }
    const viewerIsProvider = Boolean(user?.id) && conv.provider?.user_id === user?.id;
    return viewerIsProvider
      ? (conv.client?.full_name ?? "ASH client")
      : (conv.provider?.business_name ?? t("chat.title"));
  }

  /** The other person's auth id — used for reporting and blocking. */
  function peerUserIdOf(conv: (typeof list)[number]): string | null {
    if (conv.listing_id) {
      const viewerIsOwner = Boolean(user?.id) && conv.owner_id === user?.id;
      return (viewerIsOwner ? conv.client_id : conv.owner_id) ?? null;
    }
    const viewerIsProvider = Boolean(user?.id) && conv.provider?.user_id === user?.id;
    return (viewerIsProvider ? conv.client_id : conv.provider?.user_id) ?? null;
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      <header className={cn(mobileView === "thread" && "hidden", "md:block")}>
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
        <div className="grid gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
          <nav
            className={cn(
              "tile space-y-1 overflow-y-auto p-2 md:max-h-[70vh]",
              mobileView === "thread" ? "hidden md:block" : "max-h-[calc(100dvh-12rem)]",
            )}
          >
            {list.map((conv) => {
              const label = peerOf(conv);
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => void navigate({ search: { c: conv.id } })}
                  className={cn(
                    "w-full rounded-xl px-3 py-2.5 text-left transition-colors",
                    conv.id === activeId ? "bg-primary/10" : "hover:bg-muted",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                      {label.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-sm font-semibold",
                          conv.id === activeId ? "text-primary" : "text-foreground",
                        )}
                      >
                        {label}
                      </span>
                      {conv.booking ? (
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {conv.booking.service_title} · {formatXAF(Number(conv.booking.price))}
                        </span>
                      ) : conv.listing ? (
                        <span className="block truncate text-[11px] text-muted-foreground">
                          ASH Property · {conv.listing.city}
                        </span>
                      ) : (
                        <span className="block truncate text-[11px] text-muted-foreground">{t("chat.pick")}</span>
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>

          <div
            className={cn(
              "tile flex flex-col p-3",
              mobileView === "list" ? "hidden md:flex" : "h-[calc(100dvh-10rem)] md:h-[64vh]",
            )}
          >
            <div className="mb-2 flex items-start justify-between gap-3 border-b border-border pb-2">
              <button
                type="button"
                onClick={() => void navigate({ search: {} })}
                aria-label={t("chat.title")}
                className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted md:hidden"
              >
                <ArrowLeft className="size-5" aria-hidden />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display font-semibold text-foreground">
                  {active ? peerOf(active) : t("chat.title")}
                </p>
                {active?.booking ? (
                  <p className="truncate text-xs text-muted-foreground">
                    {active.booking.service_title} · {formatDateTime(active.booking.scheduled_at)}
                    {active.booking.invoice_number ? ` · ${active.booking.invoice_number}` : ""}
                  </p>
                ) : null}
              </div>
              {active?.booking ? (
                <div className="shrink-0 text-right">
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                    {bookingStatusLabel(active.booking.status, lang)}
                  </span>
                  <p className="tabular mt-1 text-xs font-bold text-foreground">
                    {formatXAF(Number(active.booking.price))}
                  </p>
                </div>
              ) : null}
            </div>
            {activeId ? (
              <ChatThread
                conversationId={activeId}
                currentUserId={user?.id}
                peerName={active ? peerOf(active) : "ASH"}
                peerUserId={active ? peerUserIdOf(active) : null}
                className="flex-1"
                quickReplies={
                  lang === "fr"
                    ? ["Bonjour 👋", "Quelle est votre disponibilité ?", "Je confirme le rendez-vous", "Je suis en route"]
                    : ["Hello 👋", "What is your availability?", "I confirm the appointment", "I'm on my way"]
                }
              />
            ) : null}
          </div>
        </div>
      )}

    </div>
  );
}
