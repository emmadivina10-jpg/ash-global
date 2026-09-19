import {
  type CSSProperties,
  type TouchEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowLeft, Camera, Search, Settings2, UserMinus } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";

import { useConversations } from "@/lib/marketplace.queries";
import { useUser } from "@/lib/queries";
import { ChatThread } from "@/components/refer/ChatThread";
import { AssistantPanel } from "@/components/refer/AssistantPanel";
import { Avatar } from "@/components/refer/AvatarUpload";
import { EmptyState, SkeletonRows } from "@/components/refer/states";
import { useI18n } from "@/lib/i18n";
import { formatDateTime, formatXAF } from "@/lib/format";
import { bookingStatusLabel } from "@/lib/booking";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Archive, Lock, Plus, Trash2, UserPlus, Users } from "lucide-react";
import { SelectChatRow } from "@/components/refer/SelectChatRow";
import {
  MAX_PINNED,
  hashPin,
  useChatLockPin,
  useChatPrefs,
  useDeleteConversation,
  useSetChatLockPin,
  useSetChatPref,
} from "@/lib/chat-prefs";
import { useAddGroupMembers, useCreateGroup, useMemberSearch, useMemberStates, useRemoveGroupMember, useSendFriendRequest, useFriendships, useGroups, useUpdateGroup } from "@/lib/social.queries";
import { unlockChat, type LockedChatMessage } from "@/lib/chat-lock.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  return avatarColors[avatarColorIndex(id)] ?? avatarColors[0];
}

const ASH_AI_ID = "ash-ai";

const ashAiConversation = {
  id: ASH_AI_ID,
  label: "ASH AI",
  preview: "Ask me anything — services, listings, ideas.",
};
const ASH_CHAT_BACKGROUND = "/images/ash-chat-background.png";

function MessagesPage() {
  const { t, lang } = useI18n();
  const fr = lang === "fr";
  const { user } = useUser();
  const { c } = Route.useSearch();
  const navigate = Route.useNavigate();
  const routerNavigate = useNavigate();
  const mobileView = c ? "thread" : "list";

  // iOS/WKWebView visual viewport. The chat becomes a true fullscreen surface
  // while a thread is open, so the shell navigation/orb cannot overlap it.
  const [visualViewportHeight, setVisualViewportHeight] = useState<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const useIsoLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect;

  // iOS Safari/WKWebView changes the visual viewport when the keyboard opens.
  // Track that viewport instead of relying on 100vh/100dvh, which can leave a
  // large dead area between the composer and the keyboard.
  useIsoLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const viewport = window.visualViewport;
    if (!viewport) return;

    const updateViewport = () => {
      const height = Math.max(0, Math.round(viewport.height));
      setVisualViewportHeight((current) =>
        current !== null && Math.abs(current - height) < 2 ? current : height,
      );
    };

    updateViewport();
    viewport.addEventListener("resize", updateViewport);
    window.addEventListener("focusin", updateViewport);
    window.addEventListener("focusout", updateViewport);
    window.addEventListener("resize", updateViewport);

    return () => {
      viewport.removeEventListener("resize", updateViewport);
      window.removeEventListener("focusin", updateViewport);
      window.removeEventListener("focusout", updateViewport);
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  // Mobile chat is a viewport-locked surface. The message list itself owns
  // scrolling; the outer shell stays still while the bottom navigation remains
  // visible and stable.
  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth >= 768) return;

    const shellScroll = document.querySelector<HTMLElement>(
      ".app-shell-scroll",
    );
    const orbs = Array.from(
      document.querySelectorAll<HTMLElement>(".orb-surface"),
    );

    if (!shellScroll) return;

    const previousOverflow = shellScroll.style.overflow;
    const previousOverscroll = shellScroll.style.overscrollBehavior;
    const previousScrollRestoration = window.history.scrollRestoration;

    // iOS can restore the document/shell scroll position after returning from
    // another route. Do this in a few animation frames so Safari has time to
    // finish its back-navigation and keyboard restoration before we reset it.
    const restoreShellPosition = () => {
      shellScroll.scrollTop = 0;
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    const restoreAfterNavigation = () => {
      restoreShellPosition();
      requestAnimationFrame(restoreShellPosition);
      window.setTimeout(restoreShellPosition, 60);
      window.setTimeout(restoreShellPosition, 180);
    };

    if (mobileView === "thread") {
      window.history.scrollRestoration = "manual";
      restoreAfterNavigation();

      // IMPORTANT: do not set touch-action:none here. touch-action on an
      // ancestor participates in gesture negotiation and can disable the
      // inner message scroller on iOS. overflow:hidden is enough to stop the
      // outer shell from scrolling.
      shellScroll.style.overflow = "hidden";
      shellScroll.style.overscrollBehavior = "none";

      window.addEventListener("pageshow", restoreAfterNavigation);
    }

    // Hide the floating ASH orb while the keyboard is visible so it can never
    // sit on top of the composer or the keyboard transition.
    for (const orb of orbs) {
      if (mobileView === "thread") {
        orb.dataset["ashChatHidden"] = "true";
        orb.style.visibility = "hidden";
        orb.style.pointerEvents = "none";
      } else if (orb.dataset["ashChatHidden"] === "true") {
        delete orb.dataset["ashChatHidden"];
        orb.style.visibility = "";
        orb.style.pointerEvents = "";
      }
    }

    return () => {
      shellScroll.style.overflow = previousOverflow;
      shellScroll.style.overscrollBehavior = previousOverscroll;
      window.history.scrollRestoration = previousScrollRestoration;

      window.removeEventListener("pageshow", restoreAfterNavigation);

      for (const orb of orbs) {
        if (orb.dataset["ashChatHidden"] === "true") {
          delete orb.dataset["ashChatHidden"];
          orb.style.visibility = "";
          orb.style.pointerEvents = "";
        }
      }
    };
  }, [mobileView]);

  function handleChatTouchStart(event: TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0];
    if (!touch || touch.clientX > 32) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleChatTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;

    const touch = event.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    if (deltaX >= 72 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25) {
      void navigate({ to: "/messages", search: {} });
    }
  }

  const { data: conversations, isLoading } = useConversations();
  const [term, setTerm] = useState("");

  const { data: prefs } = useChatPrefs();
  const setPref = useSetChatPref();
  const deleteChat = useDeleteConversation();
  const { data: lockPin } = useChatLockPin();
  const saveLockPin = useSetChatLockPin();
  const [showArchived, setShowArchived] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [lockedUnlocked, setLockedUnlocked] = useState(false);
  const [unlockDialog, setUnlockDialog] = useState(false);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [lockedMessages, setLockedMessages] = useState<Record<string, LockedChatMessage[]>>({});
  const [pinDialog, setPinDialog] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [groupDialog, setGroupDialog] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [groupSearch, setGroupSearch] = useState("");
  const [groupSettings, setGroupSettings] = useState(false);
  const [groupEditName, setGroupEditName] = useState("");
  const { data: people } = useMemberSearch(term);
  const { data: groupPeople } = useMemberSearch(groupSearch);
  const { data: graph } = useFriendships();
  const sendFriendRequest = useSendFriendRequest();
  const createGroup = useCreateGroup();
  const addGroupMembers = useAddGroupMembers();
  const removeGroupMember = useRemoveGroupMember();
  const updateGroup = useUpdateGroup();
  const unlockChatServer = useServerFn(unlockChat);

  const list = conversations ?? [];
  const peerIds = list.map((conversation) => {
    if (conversation.group_id) return null;
    const providerIsMe = Boolean(user?.id) && conversation.provider?.user_id === user?.id;
    return (providerIsMe ? conversation.client_id : conversation.provider?.user_id) ?? null;
  }).filter((id): id is string => Boolean(id));
  const { data: memberStates } = useMemberStates(peerIds);

  // Desktop falls back to the first conversation;
  // mobile requires an explicit conversation pick.
  const activeId =
    c ??
    (typeof window !== "undefined" && window.innerWidth >= 768
      ? list[0]?.id
      : undefined);

  const active = list.find((conv) => conv.id === activeId);
  const { data: myGroups } = useGroups();
  const groupOf = (conv: (typeof list)[number] | undefined) =>
    conv?.group_id ? (myGroups ?? []).find((g) => g.id === conv.group_id) : undefined;
  const activeGroup = groupOf(active);
  /** Providers see the client; clients see the business.
   * Property threads show the listing/owner.
   */
  function peerOf(conv: (typeof list)[number]): string {
    const group = groupOf(conv);
    if (group) return group.name;
    if (conv.listing_id) {
      const viewerIsOwner =
        Boolean(user?.id) && conv.owner_id === user?.id;

      return viewerIsOwner
        ? (conv.client?.full_name ?? (fr ? "Profil" : "Profile"))
        : (conv.listing?.title ?? "ASH Property");
    }

    const viewerIsProvider =
      Boolean(user?.id) && conv.provider?.user_id === user?.id;

    return viewerIsProvider
      ? (conv.client?.full_name ?? (fr ? "Profil" : "Profile"))
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

  function peerStateOf(conv: (typeof list)[number]) {
    const id = peerUserIdOf(conv);
    return id ? memberStates?.get(id) : undefined;
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

  const searchTerm = term.trim();
  const searched = searchTerm
    ? list.filter((conv) =>
        `${peerOf(conv)} ${previewOf(conv)}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
      )
    : list;

  // Locked conversations are also excluded by RLS. This filter keeps the UI
  // consistent while preference invalidation and conversation refetch settle.
  const visible = searched.filter((conv) => {
    const pref = prefs?.[conv.id];
    if (pref?.locked && !lockedUnlocked) return false;
    if (pref?.archived && !showArchived) return false;
    return true;
  });

  const filtered = [...visible].sort((a, b) => {
    const pinA = prefs?.[a.id]?.pinned ? 1 : 0;
    const pinB = prefs?.[b.id]?.pinned ? 1 : 0;
    return pinB - pinA;
  });

  const archivedCount = Object.values(prefs ?? {}).filter((pref) => pref.archived).length;
  const lockedCount = Object.values(prefs ?? {}).filter((pref) => pref.locked).length;
  const pinnedCount = list.filter((conv) => prefs?.[conv.id]?.pinned).length;

  // Members who are not already in a chat with you — offered as "Add friend".
  const linkedIds = new Set([
    ...(graph?.friends ?? []).map((f) => f.other.id),
    ...(graph?.incoming ?? []).map((f) => f.other.id),
    ...(graph?.outgoing ?? []).map((f) => f.other.id),
  ]);
  const chatPeerIds = new Set(list.map((conv) => peerUserIdOf(conv)).filter(Boolean) as string[]);
  const newPeople = (people ?? []).filter(
    (person) => person.id !== user?.id && !linkedIds.has(person.id) && !chatPeerIds.has(person.id),
  );

  async function togglePin(conversationId: string) {
    const pinned = Boolean(prefs?.[conversationId]?.pinned);
    if (!pinned && pinnedCount >= MAX_PINNED) {
      toast.info(
        fr ? `Vous pouvez épingler ${MAX_PINNED} discussions.` : `You can pin up to ${MAX_PINNED} chats.`,
      );
      return;
    }
    setPref.mutate({ conversationId, patch: { pinned: !pinned } });
  }

  function toggleArchive(conversationId: string) {
    const archived = Boolean(prefs?.[conversationId]?.archived);
    setPref.mutate({ conversationId, patch: { archived: !archived } });
  }

  function toggleLock(conversationId: string) {
    const locked = Boolean(prefs?.[conversationId]?.locked);
    if (!locked && !lockPin) {
      setPinDialog(true);
      return;
    }
    setPref.mutate(
      { conversationId, patch: { locked: !locked } },
      {
        onSuccess: () =>
          toast.success(
            locked
              ? fr
                ? "Discussion déverrouillée"
                : "Chat unlocked"
              : fr
                ? "Discussion verrouillée et masquée"
                : "Chat locked and hidden",
          ),
      },
    );
  }

  async function revealLockedChats() {
    if (!lockPin || pinValue.length < 4) return;
    const hash = await hashPin(pinValue);
    if (hash !== lockPin) {
      toast.error(fr ? "Code incorrect" : "Incorrect PIN");
      return;
    }
    setUnlockDialog(false);
    setPinValue("");
    toast.success(fr ? "Discussions verrouillées affichées" : "Locked chats shown");
  }

  async function openLockedChat(conversationId: string) {
    setUnlockingId(conversationId);
    setUnlockDialog(true);
  }

  async function submitLockedChatUnlock() {
    if (!unlockingId || pinValue.length < 4) return;
    try {
      const result = await unlockChatServer({ data: { conversationId: unlockingId, pin: pinValue } }) as { messages: LockedChatMessage[] };
      setLockedMessages((current) => ({ ...current, [unlockingId]: result.messages }));
      setUnlockDialog(false);
      setPinValue("");
      void navigate({ search: { c: unlockingId } });
    } catch {
      toast.error(fr ? "Code incorrect" : "Incorrect PIN");
    }
  }


  function toggleSelected(conversationId: string) {
    setSelection((list) =>
      list.includes(conversationId)
        ? list.filter((id) => id !== conversationId)
        : [...list, conversationId],
    );
  }

  async function deleteSelected() {
    const ids = [...selection];
    setConfirmBulkDelete(false);
    setSelection([]);
    let removed = 0;
    for (const id of ids) {
      try {
        await deleteChat.mutateAsync(id);
        removed += 1;
      } catch {
        setPref.mutate({ conversationId: id, patch: { archived: true, locked: Boolean(prefs?.[id]?.locked) } });
      }
    }
    if (removed > 0) {
      toast.success(
        fr
          ? removed > 1
            ? `${removed} discussions supprimées`
            : "Discussion supprimée"
          : removed > 1
            ? `${removed} chats deleted`
            : "Chat deleted",
      );
    }
    if (removed < ids.length) {
      toast.info(
        fr
          ? "Certaines discussions sont liées à une réservation — elles ont été archivées."
          : "Some chats belong to a booking — they were archived instead.",
      );
    }
  }

  return (
    <div className="mx-auto min-h-0 w-full max-w-5xl md:space-y-4">
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
      ) : (

        <div className="grid md:gap-4 md:grid-cols-[320px_minmax(0,1fr)]">
          {/* =========================================================
              CHAT LIST
              ========================================================= */}
          <div
            className={cn(
              "tile flex min-h-0 flex-col overflow-hidden bg-background p-0 max-md:rounded-none max-md:border-0",
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

              {selection.length > 0 ? (
                <div className="mb-2 flex items-center justify-between gap-2 rounded-full bg-primary/10 px-3 py-1.5">
                  <button
                    type="button"
                    onClick={() => setSelection([])}
                    className="text-[12px] font-bold text-primary"
                  >
                    {fr ? "Annuler" : "Cancel"}
                  </button>
                  <span className="text-[12px] font-bold text-foreground">
                    {selection.length} {fr ? "sélectionnée(s)" : "selected"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setConfirmBulkDelete(true)}
                    aria-label={fr ? "Supprimer" : "Delete"}
                    className="grid size-8 place-items-center rounded-full text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              ) : null}

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
                       ? "Rechercher une discussion ou un membre"
                       : "Search chats or people"
                  }
                  aria-label={
                    fr
                      ? "Rechercher une discussion"
                      : "Search chats"
                  }
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>

              <div className="mt-2 flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-full px-2.5 text-[11px]"
                  onClick={() => setGroupDialog(true)}
                >
                  <Users className="size-3" aria-hidden />
                  {fr ? "Nouveau groupe" : "New group"}
                </Button>
                {archivedCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowArchived((value) => !value)}
                    className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground"
                  >
                    <Archive className="size-3" aria-hidden />
                    {showArchived
                      ? fr
                        ? "Masquer les archives"
                        : "Hide archived"
                      : `${fr ? "Archivées" : "Archived"} (${archivedCount})`}
                  </button>
                ) : null}

                {lockPin && lockedCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setUnlockDialog(true)}
                    className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground"
                  >
                    <Lock className="size-3" aria-hidden />
                    {fr ? `Verrouillées (${lockedCount})` : `Locked (${lockedCount})`}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => setPinDialog(true)}
                  className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground"
                >
                  <Lock className="size-3" aria-hidden />
                  {lockPin
                    ? fr
                      ? "Code des discussions"
                      : "Chat lock PIN"
                    : fr
                      ? "Créer un code"
                      : "Set a PIN"}
                </button>

                {lockedUnlocked ? (
                  <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-bold text-primary">
                    {fr ? "Discussions verrouillées affichées" : "Locked chats shown"}
                  </span>
                ) : null}
              </div>
            </div>

            <Dialog open={groupDialog} onOpenChange={setGroupDialog}>
              <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-sm overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{fr ? "Créer un groupe" : "Create a group"}</DialogTitle>
                </DialogHeader>
                <Input
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value.slice(0, 60))}
                  placeholder={fr ? "Nom du groupe" : "Group name"}
                />
                <Input
                  value={groupSearch}
                  onChange={(event) => setGroupSearch(event.target.value)}
                  placeholder={fr ? "Rechercher un membre" : "Search people on ASH"}
                />
                <div className="max-h-64 space-y-1 overflow-y-auto">
                  {[...(graph?.friends ?? []).map(({ other }) => other), ...(groupPeople ?? []).filter((person) => !(graph?.friends ?? []).some(({ other }) => other.id === person.id))].length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      {fr ? "Ajoutez d’abord des amis au groupe." : "Add friends before creating a group."}
                    </p>
                  ) : (
                    [...(graph?.friends ?? []).map(({ other }) => other), ...(groupPeople ?? []).filter((person) => !(graph?.friends ?? []).some(({ other }) => other.id === person.id))].map((other) => {
                      const selected = groupMembers.includes(other.id);
                      return (
                        <Button
                          key={other.id}
                          type="button"
                          variant="ghost"
                          className={cn("h-auto w-full justify-start gap-3 px-2 py-2", selected && "bg-primary/10")}
                          onClick={() => setGroupMembers((ids) => selected ? ids.filter((id) => id !== other.id) : [...ids, other.id])}
                        >
                          <Avatar path={other.avatar_url} name={other.name} online={other.online} hasUpdate={other.has_update} className="size-9" />
                          <span className="min-w-0 flex-1 truncate text-left">{other.name}</span>
                          {selected ? <span className="text-xs font-bold text-primary">{fr ? "Ajouté" : "Added"}</span> : <Plus className="size-4" aria-hidden />}
                        </Button>
                      );
                    })
                  )}
                </div>
                <Button
                  disabled={groupName.trim().length < 2 || createGroup.isPending}
                  onClick={() => createGroup.mutate(
                    { name: groupName, memberIds: groupMembers },
                    {
                      onSuccess: () => {
                        setGroupDialog(false);
                        setGroupName("");
                        setGroupMembers([]);
                        toast.success(fr ? "Groupe créé" : "Group created");
                      },
                      onError: (error) => toast.error(error instanceof Error ? error.message : "Could not create the group."),
                    },
                  )}
                >
                  {fr ? "Créer le groupe" : "Create group"}
                </Button>
              </DialogContent>
            </Dialog>

            <Dialog open={unlockDialog} onOpenChange={(open) => { setUnlockDialog(open); if (!open) { setUnlockingId(null); setPinValue(""); } }}>
              <DialogContent className="max-w-sm">
                <DialogHeader><DialogTitle>{fr ? "Déverrouiller les discussions" : "Unlock chats"}</DialogTitle></DialogHeader>
                <p className="text-xs text-muted-foreground">{fr ? "Entrez votre code. Le contenu reste inaccessible jusqu’à sa validation." : "Enter your PIN. Chat content remains unavailable until it is verified."}</p>
                <Input type="password" inputMode="numeric" autoFocus value={pinValue} onChange={(event) => setPinValue(event.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="••••" />
                <Button disabled={pinValue.length < 4} onClick={() => void (unlockingId ? submitLockedChatUnlock() : revealLockedChats())}>{fr ? "Déverrouiller" : "Unlock"}</Button>
              </DialogContent>
            </Dialog>

            <Dialog open={confirmBulkDelete} onOpenChange={setConfirmBulkDelete}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>
                    {fr ? "Supprimer ces discussions ?" : "Delete these chats?"}
                  </DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  {fr
                    ? "Les messages seront définitivement perdus. Vous pourrez toujours retrouver la personne par la recherche."
                    : "The messages are permanently lost. You can still find the person again through search."}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setConfirmBulkDelete(false)}>
                    {fr ? "Annuler" : "Cancel"}
                  </Button>
                  <Button
                    className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => void deleteSelected()}
                  >
                    {fr ? "Supprimer" : "Delete"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={pinDialog} onOpenChange={setPinDialog}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>{fr ? "Code des discussions" : "Chat lock PIN"}</DialogTitle>
                </DialogHeader>
                <p className="text-xs text-muted-foreground">
                  {fr
                    ? "Choisissez un code d'au moins 4 chiffres. Les discussions verrouillées disparaissent de la liste et réapparaissent quand vous tapez ce code dans la recherche."
                    : "Pick a PIN of at least 4 digits. Locked chats disappear from the list and come back when you type this PIN into the search box."}
                </p>
                <Input
                  type="password"
                  inputMode="numeric"
                  value={pinValue}
                  onChange={(event) => setPinValue(event.target.value.replace(/\D/g, "").slice(0, 8))}
                  placeholder="••••"
                  aria-label={fr ? "Code" : "PIN"}
                />
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    disabled={pinValue.length < 4 || saveLockPin.isPending}
                    onClick={() =>
                      saveLockPin.mutate(pinValue, {
                        onSuccess: () => {
                          setPinValue("");
                          setPinDialog(false);
                          toast.success(fr ? "Code enregistré" : "PIN saved");
                        },
                        onError: () => toast.error(fr ? "Échec" : "Could not save the PIN"),
                      })
                    }
                  >
                    {fr ? "Enregistrer" : "Save PIN"}
                  </Button>
                  {lockPin ? (
                    <Button
                      variant="outline"
                      onClick={() =>
                        saveLockPin.mutate(null, {
                          onSuccess: () => {
                            setPinDialog(false);
                            toast.success(fr ? "Code retiré" : "PIN removed");
                          },
                        })
                      }
                    >
                      {fr ? "Retirer" : "Remove"}
                    </Button>
                  ) : null}
                </div>
              </DialogContent>
            </Dialog>

            <nav className="messages-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain touch-pan-y">
              {term.trim() &&
              !`${ashAiConversation.label} ${ashAiConversation.preview}`
                .toLowerCase()
                .includes(term.trim().toLowerCase()) &&
              filtered.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  {fr
                    ? "Aucune discussion trouvée."
                    : "No chats found."}
                </p>
              ) : null}

              {(!term.trim() ||
                `${ashAiConversation.label} ${ashAiConversation.preview}`
                  .toLowerCase()
                  .includes(term.trim().toLowerCase())) && (
                <button
                  type="button"
                  onClick={() =>
                    void navigate({
                      search: { c: ASH_AI_ID },
                    })
                  }
                  className={cn(
                    "flex w-full items-center gap-3 border-b border-border px-3 py-3 text-left transition-colors",
                    activeId === ASH_AI_ID
                      ? "bg-primary/10"
                      : "hover:bg-muted/70 active:bg-muted",
                  )}
                >
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#D4AF37] via-[#8B6914] to-[#4B0082] p-[2px] shadow-lg shadow-[#4B0082]/20 ring-2 ring-[#D4AF37]/50">
                    <span className="grid size-full place-items-center overflow-hidden rounded-full bg-[#0b0712]">
                      <span className="font-display text-sm font-black tracking-tight text-[#D4AF37]">ASH</span>
                    </span>
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[15px] font-bold text-foreground">
                        ASH AI
                      </span>
                      <span className="shrink-0 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#4B0082] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white shadow-sm">
                        {fr ? "En direct" : "Live"}
                      </span>
                    </span>

                    <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
                      {ashAiConversation.preview}
                    </span>
                  </span>
                </button>
              )}

              {filtered.map((conv) => {
                const label = peerOf(conv);
                const unread = conv.unread_count ?? 0;
                const avatarColor = getAvatarColor(conv.id);

                return (
                  <SelectChatRow
                    key={conv.id}
                    fr={fr}
                    pinned={Boolean(prefs?.[conv.id]?.pinned)}
                    archived={Boolean(prefs?.[conv.id]?.archived)}
                    locked={Boolean(prefs?.[conv.id]?.locked)}
                    selecting={selection.length > 0}
                    selected={selection.includes(conv.id)}
                    onLongPress={() => toggleSelected(conv.id)}
                    onToggleSelect={() => toggleSelected(conv.id)}
                    onOpen={() => prefs?.[conv.id]?.locked && !lockedMessages[conv.id] ? void openLockedChat(conv.id) : void navigate({ search: { c: conv.id } })}
                    onTogglePin={() => void togglePin(conv.id)}
                    onArchive={() => toggleArchive(conv.id)}
                    onToggleLock={() => toggleLock(conv.id)}
                  >
                  <div
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
                          online={peerStateOf(conv)?.online}
                          hasUpdate={peerStateOf(conv)?.has_update}
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
                  </div>
                  </SelectChatRow>
                );
              })}

              {/* People on ASH you have not met yet. */}
              {term.trim().length >= 2 && newPeople.length > 0 ? (
                <div className="space-y-2 border-t border-border bg-muted/30 p-3">
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">
                    {fr ? "Autres membres ASH" : "Other people on ASH"}
                  </p>
                  {newPeople.slice(0, 8).map((person) => (
                    <div key={person.id} className="flex items-center gap-2">
                      <Avatar path={person.avatar_url} name={person.name} online={person.online} hasUpdate={person.has_update} className="size-9" />
                      <button
                        type="button"
                        onClick={() =>
                          void routerNavigate({ to: "/u/$userId", params: { userId: person.id } })
                        }
                        className="min-w-0 flex-1 truncate text-left text-[13px] font-semibold text-foreground"
                      >
                        {person.name}
                      </button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          sendFriendRequest.mutate(person.id, {
                            onSuccess: () =>
                              toast.success(fr ? "Demande envoyée" : "Friend request sent"),
                            onError: () => toast.error(fr ? "Échec de l'envoi" : "Could not send"),
                          })
                        }
                      >
                        <UserPlus className="size-4" aria-hidden />
                        {fr ? "Ajouter" : "Add"}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
            </nav>
          </div>

          {/* =========================================================
              ACTIVE CHAT
              ========================================================= */}
          <div
            onTouchStart={
              mobileView === "thread" ? handleChatTouchStart : undefined
            }
            onTouchEnd={
              mobileView === "thread" ? handleChatTouchEnd : undefined
            }
            style={
              {
                "--ash-visual-height": visualViewportHeight
                  ? `${visualViewportHeight}px`
                  : "100dvh",
                "--ash-chat-height": visualViewportHeight
                  ? `${Math.max(0, visualViewportHeight)}px`
                  : "100dvh",
              } as CSSProperties
            }
            className={cn(
              "tile chat-surface flex min-h-0 flex-col overflow-hidden p-0 max-md:rounded-none max-md:border-0",
              mobileView === "list"
                ? "hidden md:flex"
                : cn(
                    "max-md:fixed max-md:inset-x-0 max-md:top-0 max-md:bottom-[calc(4.75rem+env(safe-area-inset-bottom))] max-md:z-30 max-md:w-screen max-md:touch-pan-y",
                    "max-md:h-auto",
                  ),
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
                {activeId === ASH_AI_ID ? (
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#D4AF37] via-[#8B6914] to-[#4B0082] p-[2px] shadow-lg ring-2 ring-[#D4AF37]/50">
                    <span className="grid size-full place-items-center rounded-full bg-[#0b0712] font-display text-[9px] font-black text-[#D4AF37]">ASH</span>
                  </span>
                ) : active ? (
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
                        online={peerStateOf(active)?.online}
                        hasUpdate={peerStateOf(active)?.has_update}
                        className="size-full rounded-full border-0 shadow-none"
                      />
                    </span>
                  </span>
                ) : null}

                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[15px] font-semibold text-foreground">
                    {activeId === ASH_AI_ID ? "ASH AI" : active ? peerOf(active) : t("chat.title")}
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
              {activeGroup ? (
                <button type="button" onClick={() => { setGroupEditName(activeGroup.name); setGroupSettings(true); }} aria-label={fr ? "Gérer le groupe" : "Manage group"} className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground">
                  <Settings2 className="size-4" aria-hidden />
                </button>
              ) : null}
            </div>

            <Dialog open={groupSettings} onOpenChange={setGroupSettings}>
              <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-sm overflow-y-auto">
                <DialogHeader><DialogTitle>{fr ? "Gérer le groupe" : "Manage group"}</DialogTitle></DialogHeader>
                {activeGroup ? <>
                  <div className="flex items-center gap-3">
                    <Avatar path={activeGroup.avatar_path} name={activeGroup.name} className="size-14" />
                    {activeGroup.owner_id === user?.id ? <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-primary"><Camera className="size-4" />{fr ? "Photo" : "Photo"}<input type="file" accept="image/*" className="sr-only" onChange={async (event) => { const file = event.target.files?.[0]; if (!file || !user?.id) return; const path = `${user.id}/groups/${activeGroup.id}-${Date.now()}`; const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true }); if (error) { toast.error(error.message); return; } updateGroup.mutate({ groupId: activeGroup.id, avatarPath: path }); }} /></label> : null}
                  </div>
                  {activeGroup.owner_id === user?.id ? <div className="flex gap-2"><Input value={groupEditName} onChange={(event) => setGroupEditName(event.target.value.slice(0, 60))} /><Button onClick={() => updateGroup.mutate({ groupId: activeGroup.id, name: groupEditName }, { onSuccess: () => toast.success(fr ? "Groupe mis à jour" : "Group updated") })}>{fr ? "Enregistrer" : "Save"}</Button></div> : null}
                  <div className="space-y-2">{activeGroup.members.map((member) => <div key={member.id} className="flex items-center gap-2 rounded-xl bg-muted/50 p-2"><Avatar path={member.avatar_url} name={member.name} online={member.online} hasUpdate={member.has_update} className="size-9" /><span className="min-w-0 flex-1 truncate text-sm font-semibold">{member.name}</span>{activeGroup.owner_id === user?.id && member.id !== user.id ? <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeGroupMember.mutate({ groupId: activeGroup.id, userId: member.id })}><UserMinus className="size-4" /></Button> : null}</div>)}</div>
                  {activeGroup.owner_id === user?.id ? <><Input value={groupSearch} onChange={(event) => setGroupSearch(event.target.value)} placeholder={fr ? "Ajouter un membre" : "Add a member"} />{(groupPeople ?? []).filter((person) => !activeGroup.members.some((member) => member.id === person.id)).slice(0, 6).map((person) => <button key={person.id} type="button" onClick={() => addGroupMembers.mutate({ groupId: activeGroup.id, memberIds: [person.id] })} className="flex w-full items-center gap-2 rounded-xl p-2 text-left hover:bg-muted"><Avatar path={person.avatar_url} name={person.name} online={person.online} hasUpdate={person.has_update} className="size-9" /><span className="flex-1 truncate text-sm font-semibold">{person.name}</span><Plus className="size-4 text-primary" /></button>)}</> : null}
                </> : null}
              </DialogContent>
            </Dialog>

            {/* =======================================================
                CHAT CONTENT
                ======================================================= */}
            {activeId === ASH_AI_ID ? (
              <div
                className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background"
                style={{
                  backgroundImage: `url(${ASH_CHAT_BACKGROUND})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-background/70 backdrop-blur-[1px] dark:bg-slate-950/75"
                />
                <div className="relative flex min-h-0 flex-1 flex-col px-4 py-4">
                  <AssistantPanel />
                </div>
              </div>
            ) : activeId && prefs?.[activeId]?.locked && !lockedMessages[activeId] ? (
              <div className="grid flex-1 place-items-center bg-background/80 p-6 text-center backdrop-blur-sm">
                <div className="max-w-xs space-y-3">
                  <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary/10 text-primary"><Lock className="size-6" /></span>
                  <p className="font-display text-lg font-bold">{fr ? "Discussion verrouillée" : "Locked chat"}</p>
                  <p className="text-sm text-muted-foreground">{fr ? "Le contenu n’a pas été chargé. Entrez votre code pour l’ouvrir." : "Content has not been loaded. Enter your PIN to open it."}</p>
                  <Button onClick={() => void openLockedChat(activeId)}>{fr ? "Déverrouiller" : "Unlock"}</Button>
                </div>
              </div>
            ) : activeId ? (
              <div
                className="relative min-h-0 flex-1 overflow-hidden bg-background"
                style={{
                  backgroundImage: `url(${ASH_CHAT_BACKGROUND})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-background/62 backdrop-blur-[1px] dark:bg-slate-950/70"
                />

                <div className="relative flex h-full min-h-0 flex-col">
                  <ChatThread
                conversationId={activeId}
                currentUserId={user?.id}
                peerName={
                  active ? peerOf(active) : (fr ? "Profil" : "Profile")
                }
                peerUserId={
                  active
                    ? peerUserIdOf(active)
                    : null
                }
                peerAvatar={active ? peerAvatarOf(active) : null}
                isGroup={Boolean(activeGroup)}
                enforceFirstContactLimit={Boolean(
                  active && !activeGroup && !active.provider_id && !active.booking_id && !active.listing_id,
                )}
                members={(activeGroup?.members ?? []).map((m) => ({
                  id: m.id,
                  name: m.name,
                  avatar_url: m.avatar_url,
                    online: m.online,
                }))}
                  initialMessages={activeId ? lockedMessages[activeId] : undefined}
                className="min-h-0 flex-1 px-2"
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
                </div>
              </div>
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
