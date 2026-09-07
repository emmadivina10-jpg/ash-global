import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowLeft, MessageCircle, Search } from "lucide-react";

import { useConversations } from "@/lib/marketplace.queries";
import { useUser } from "@/lib/queries";
import { ChatThread } from "@/components/refer/ChatThread";
import { Avatar } from "@/components/refer/AvatarUpload";
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
      {
        name: "description",
        content:
          "Chat live with your beauty pro or your clients about upcoming bookings.",
      },
      {
        property: "og:title",
        content: "Messages — ASH Glo",
      },
      {
        property: "og:description",
        content:
          "Live chat between clients and beauty providers on ASH Glo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MessagesPage,
});

/** Short WhatsApp-style stamp: time today, "Yesterday", else a short date. */
function stamp(iso: string | null | undefined, fr: boolean) {
  if (!iso) return "";

  const date = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000);

  if (date.toDateString() === now.toDateString())
    return date.toLocaleTimeString(fr ? "fr-FR" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });

  if (date.toDateString() === yesterday.toDateString())
    return fr ? "Hier" : "Yesterday";

  return date.toLocaleDateString(fr ? "fr-FR" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

/**
 * ASH profile colors.
 *
 * Each conversation receives a stable color based on its conversation ID.
 * This means the same conversation keeps the same profile color.
 */
const avatarColors = [
  {
    wrapper:
      "bg-gradient-to-br from-fuchsia-500 via-pink-500 to-rose-500",
    ring: "ring-fuchsia-300/60 dark:ring-fuchsia-400/40",
  },
  {
    wrapper:
      "bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-500",
    ring: "ring-violet-300/60 dark:ring-violet-400/40",
  },
  {
    wrapper:
      "bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500",
    ring: "ring-emerald-300/60 dark:ring-emerald-400/40",
  },
  {
    wrapper:
      "bg-gradient-to-br from-red-500 via-rose-500 to-pink-500",
    ring: "ring-red-300/60 dark:ring-red-400/40",
  },
  {
    wrapper:
      "bg-gradient-to-br from-blue-500 via-sky-500 to-cyan-500",
    ring: "ring-blue-300/60 dark:ring-blue-400/40",
  },
  {
    wrapper:
      "bg-gradient-to-br from-slate-500 via-gray-500 to-zinc-500",
    ring: "ring-slate-300/60 dark:ring-slate-400/40",
  },
  {
    wrapper:
      "bg-gradient-to-br from-orange-400 via-amber-500 to-yellow-500",
    ring: "ring-orange-300/60 dark:ring-orange-400/40",
  },
  {
    wrapper:
      "bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-500",
    ring: "ring-cyan-300/60 dark:ring-cyan-400/40",
  },
] as const;

/**
 * Generate a stable color index from a conversation ID.
 */
function avatarColorIndex(id: string) {
  let hash = 0;

  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) | 0;
  }

  return Math.abs(hash) % avatarColors.length;
}

function getAvatarColor(id: string) {
  return avatarColors[avatarColorIndex(id)];
}

function MessagesPage() {
  const { t, lang } = useI18n();
  const fr = lang === "fr";
  const { user } = useUser();
  const { c } = Route.useSearch();
  const navigate = Route.useNavigate();
  const routerNavigate = useNavigate();

  const { data: conversations, isLoading } = useConversations();
  const [term, setTerm] = useState("");

  const list = conversations ?? [];

  // Desktop falls back to the first conversation;
  // mobile requires an explicit conversation pick.
  const activeId =
    c ??
    (typeof window !== "undefined" && window.innerWidth >= 768
      ? list[0]?.id
      : undefined);

  const active = list.find((conv) => conv.id === activeId);
  const mobileView = c ? "thread" : "list";

  /** Providers see the client; clients see the business.
   * Property threads show the listing/owner.
   */
  function peerOf(conv: (typeof list)[number]): string {
    if (conv.listing_id) {
      const viewerIsOwner =
        Boolean(user?.id) && conv.owner_id === user?.id;

      return viewerIsOwner
        ? (conv.client?.full_name ?? "ASH client")
        : (conv.listing?.title ?? "ASH Property");
    }

    const viewerIsProvider =
      Boolean(user?.id) && conv.provider?.user_id === user?.id;

    return viewerIsProvider
      ? (conv.client?.full_name ?? "ASH client")
      : (conv.provider?.business_name ?? t("chat.title"));
  }

  /** Picture of the other side, when we have one. */
  function peerAvatarOf(conv: (typeof list)[number]): string | null {
    if (conv.listing_id) {
      const viewerIsOwner =
        Boolean(user?.id) && conv.owner_id === user?.id;

      return viewerIsOwner
        ? (conv.client?.avatar_url ?? null)
        : null;
    }

    const viewerIsProvider =
      Boolean(user?.id) && conv.provider?.user_id === user?.id;

    return viewerIsProvider
      ? (conv.client?.avatar_url ?? null)
      : (conv.provider?.avatar_url ?? null);
  }

  /** The other person's auth id — used for reporting and blocking. */
  function peerUserIdOf(conv: (typeof list)[number]): string | null {
    if (conv.listing_id) {
      const viewerIsOwner =
        Boolean(user?.id) && conv.owner_id === user?.id;

      return (viewerIsOwner ? conv.client_id : conv.owner_id) ?? null;
    }

    const viewerIsProvider =
      Boolean(user?.id) && conv.provider?.user_id === user?.id;

    return (
      (viewerIsProvider ? conv.client_id : conv.provider?.user_id) ?? null
    );
  }

  /** Where the other side's public page lives, when they have one. */
  function peerProfileOf(conv: (typeof list)[number] | undefined) {
    if (!conv) return null;

    if (conv.listing_id) {
      const viewerIsOwner =
        Boolean(user?.id) && conv.owner_id === user?.id;

      return viewerIsOwner || !conv.listing
        ? null
        : {
            to: "/property/$listingId",
            params: { listingId: conv.listing.id },
          };
    }

    const viewerIsProvider =
      Boolean(user?.id) && conv.provider?.user_id === user?.id;

    if (viewerIsProvider || !conv.provider) return null;

    return {
      to: "/services/$providerId",
      params: { providerId: conv.provider.id },
    };
  }

  /** Open the other side's public page from the chat header. */
  function openPeerProfile(conv: (typeof list)[number]) {
    const target = peerProfileOf(conv);

    if (!target) return;

    void routerNavigate({
      to: target.to,
      params: target.params,
    } as never);
  }

  /** One-line preview of the newest message. */
  function previewOf(conv: (typeof list)[number]): string {
    const last = conv.last_message;

    if (!last) {
      if (conv.booking) return conv.booking.service_title;

      if (conv.listing)
        return `ASH Property · ${conv.listing.city}`;

      return t("chat.pick");
    }

    const mine = last.sender_id === user?.id;

    const text =
      last.kind === "INVOICE"
        ? fr
          ? "Facture"
          : "Invoice"
        : last.body;

    return `${mine ? (fr ? "Vous : " : "You: ") : ""}${text}`
      .replace(/\s+/g, " ")
      .trim();
  }

  const filtered = term.trim()
    ? list.filter((conv) =>
        `${peerOf(conv)} ${previewOf(conv)}`
          .toLowerCase()
          .includes(term.trim().toLowerCase()),
      )
    : list;

  return (
    <div className="mx-auto w-full max-w-5xl md:space-y-4">
      {/* DESKTOP PAGE HEADER */}
      <header className="hidden md:block">
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          {t("chat.title")}
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          {t("chat.pick")}
        </p>
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
        <div className="grid md:gap-4 md:grid-cols-[320px_minmax(0,1fr)]">
          {/* =========================================================
              CHAT LIST
              ========================================================= */}
          <div
            className={cn(
              "tile flex flex-col overflow-hidden bg-background p-0 max-md:rounded-none max-md:border-0",
              mobileView === "thread"
                ? "hidden md:flex"
                : "max-md:-mx-4 max-md:-mt-5 max-md:h-[calc(var(--ash-vh,100dvh)-3.5rem-4.75rem)]",
              "md:max-h-[72vh]",
            )}
          >
            <div className="border-b border-border bg-card/95 px-3 pb-2.5 pt-2.5 backdrop-blur">
              <h2 className="mb-2 font-display text-xl font-bold text-foreground md:hidden">
                {t("chat.title")}
              </h2>

              <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-2">
                <Search
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />

                <input
                  value={term}
                  onChange={(event) => setTerm(event.target.value)}
                  placeholder={
                    fr
                      ? "Rechercher une discussion"
                      : "Search chats"
                  }
                  aria-label={
                    fr
                      ? "Rechercher une discussion"
                      : "Search chats"
                  }
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <nav className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  {fr
                    ? "Aucune discussion trouvée."
                    : "No chats found."}
                </p>
              ) : null}

              {filtered.map((conv) => {
                const label = peerOf(conv);
                const unread = conv.unread_count ?? 0;
                const avatarColor = getAvatarColor(conv.id);

                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() =>
                      void navigate({
                        search: { c: conv.id },
                      })
                    }
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors",
                      conv.id === activeId
                        ? "bg-primary/10"
                        : "hover:bg-muted/70 active:bg-muted",
                    )}
                  >
                    {/* COLORED ASH PROFILE CIRCLE */}
                    <span
                      className={cn(
                        "grid size-12 shrink-0 place-items-center rounded-full p-[2px] shadow-sm ring-2",
                        avatarColor.wrapper,
                        avatarColor.ring,
                      )}
                    >
                      <span className="grid size-full place-items-center overflow-hidden rounded-full bg-background">
                        <Avatar
                          path={peerAvatarOf(conv)}
                          name={label}
                          className="size-full rounded-full border-0 shadow-none"
                        />
                      </span>
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[15px] font-semibold text-foreground">
                          {label}
                        </span>

                        <span
                          className={cn(
                            "shrink-0 text-[11px]",
                            unread > 0
                              ? "font-semibold text-primary"
                              : "text-muted-foreground",
                          )}
                        >
                          {stamp(
                            conv.last_message?.created_at ??
                              conv.last_message_at,
                            fr,
                          )}
                        </span>
                      </span>

                      <span className="mt-0.5 flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "truncate text-[13px]",
                            unread > 0
                              ? "font-medium text-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {previewOf(conv)}
                        </span>

                        {unread > 0 ? (
                          <span className="grid min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-bold text-primary-foreground">
                            {unread > 99 ? "99+" : unread}
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* =========================================================
              ACTIVE CHAT
              ========================================================= */}
          <div
            className={cn(
              "tile chat-surface flex flex-col overflow-hidden p-0 max-md:rounded-none max-md:border-0",
              mobileView === "list"
                ? "hidden md:flex"
                : "max-md:fixed max-md:inset-x-0 max-md:top-0 max-md:z-[70] max-md:h-[calc(var(--ash-vh,100dvh)-env(safe-area-inset-top)-env(safe-area-inset-bottom))] max-md:w-screen",
              "md:h-[72vh]",
            )}
          >
            {/* CHAT HEADER */}
            <div className="flex items-center gap-2.5 border-b border-border bg-card/95 px-2.5 py-2 backdrop-blur max-md:pt-[calc(0.5rem+env(safe-area-inset-top))]">
              {/* BACK TO MESSAGES */}
              <button
                type="button"
                onClick={() =>
                  void navigate({
                    to: "/messages",
                    search: {},
                  })
                }
                aria-label={
                  fr
                    ? "Retour aux messages"
                    : "Back to messages"
                }
                className="grid size-10 shrink-0 place-items-center rounded-full bg-muted/70 text-foreground shadow-sm transition-all hover:bg-muted active:scale-95 md:hidden"
              >
                <ArrowLeft
                  className="size-5"
                  aria-hidden
                />
              </button>

              {/* ACTIVE PROFILE */}
              <button
                type="button"
                onClick={() =>
                  active && openPeerProfile(active)
                }
                disabled={
                  !active || !peerProfileOf(active)
                }
                aria-label={
                  fr
                    ? "Voir le profil"
                    : "View profile"
                }
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1 py-0.5 text-left transition-colors enabled:hover:bg-muted/60"
              >
                {active ? (
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-full p-[2px] shadow-sm ring-2",
                      getAvatarColor(active.id).wrapper,
                      getAvatarColor(active.id).ring,
                    )}
                  >
                    <span className="grid size-full place-items-center overflow-hidden rounded-full bg-background">
                      <Avatar
                        path={peerAvatarOf(active)}
                        name={peerOf(active)}
                        className="size-full rounded-full border-0 shadow-none"
                      />
                    </span>
                  </span>
                ) : null}

                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[15px] font-semibold text-foreground">
                    {active
                      ? peerOf(active)
                      : t("chat.title")}
                  </p>

                  {active?.booking ? (
                    <p className="truncate text-[11px] text-muted-foreground">
                      {active.booking.service_title} ·{" "}
                      {formatDateTime(
                        active.booking.scheduled_at,
                      )}
                      {active.booking.invoice_number
                        ? ` · ${active.booking.invoice_number}`
                        : ""}
                    </p>
                  ) : active?.listing ? (
                    <p className="truncate text-[11px] text-muted-foreground">
                      ASH Property ·{" "}
                      {active.listing.city}
                    </p>
                  ) : null}
                </div>
              </button>

              {/* BOOKING STATUS */}
              {active?.booking ? (
                <div className="shrink-0 text-right">
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                    {bookingStatusLabel(
                      active.booking.status,
                      lang,
                    )}
                  </span>

                  <p className="tabular mt-1 text-xs font-bold text-foreground">
                    {formatXAF(
                      Number(active.booking.price),
                    )}
                  </p>
                </div>
              ) : null}
            </div>

            {/* =======================================================
                CHAT CONTENT
                ======================================================= */}
            {activeId ? (
              <ChatThread
                conversationId={activeId}
                currentUserId={user?.id}
                peerName={
                  active ? peerOf(active) : "ASH"
                }
                peerUserId={
                  active
                    ? peerUserIdOf(active)
                    : null
                }
                className="min-h-0 flex-1 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
                quickReplies={
                  lang === "fr"
                    ? [
                        "Bonjour 👋",
                        "Quelle est votre disponibilité ?",
                        "Je confirme le rendez-vous",
                        "Je suis en route",
                      ]
                    : [
                        "Hello 👋",
                        "What is your availability?",
                        "I confirm the appointment",
                        "I'm on my way",
                      ]
                }
              />
            ) : (
              <div className="grid flex-1 place-items-center p-6 text-center text-sm text-muted-foreground">
                {t("chat.pick")}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
