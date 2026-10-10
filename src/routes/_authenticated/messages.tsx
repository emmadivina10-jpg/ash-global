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
import { ArrowLeft, Camera, LifeBuoy, Search, Settings2, UserMinus } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";

import { useConversations } from "@/lib/marketplace.queries";
import { useUser } from "@/lib/queries";
import { ChatActionDialog } from "@/components/refer/ChatActionDialog";
import { StoriesRail, loadSpotlights } from "@/components/refer/StoriesRail";
import { useStories } from "@/lib/social.queries";
import { Play, CircleUserRound } from "lucide-react";
import ashLogo from "@/assets/ash-logo.png.asset.json";
import { ChatThread } from "@/components/refer/ChatThread";
import { AssistantPanel } from "@/components/refer/AssistantPanel";
import { SupportChatPanel } from "@/components/refer/SupportChatPanel";
import { Avatar } from "@/components/refer/AvatarUpload";
import { EmptyState, SkeletonRows } from "@/components/refer/states";
import { useI18n } from "@/lib/i18n";
import { formatDateTime, formatXAF } from "@/lib/format";
import { bookingStatusLabel } from "@/lib/booking";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Archive, Lock, Plus, Trash2, UserPlus, Users } from "lucide-react";
import { SelectChatRow } from "@/components/refer/SelectChatRow";
import { VerifiedBadge } from "@/components/refer/VerifiedBadge";
import {
  MAX_PINNED,
  hashPin,
  useChatLockPin,
  useChatPrefs,
  useDeleteConversation,
  useSetChatLockPin,
  useSetChatPref,
} from "@/lib/chat-prefs";
import {
  useAddGroupMembers,
  useCreateGroup,
  useMemberSearch,
  useMemberStates,
  useRemoveGroupMember,
  useSendFriendRequest,
  useFriendships,
  useGroups,
  useUpdateGroup,
  useUpdateGroupAvatar,
} from "@/lib/social.queries";
import { unlockChat, type LockedChatMessage } from "@/lib/chat-lock.functions";
import { supabase } from "@/integrations/supabase/client";
import { getMySupportTickets } from "@/lib/support.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const searchSchema = z.object({ c: z.string().optional() });

export const Route = createFileRoute("/_authenticated/messages")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Messages — ASH Glo" },
      {
        name: "description",
        content: "Your conversations, groups, stories and support together in ASH Glo.",
      },
      {
        property: "og:title",
        content: "Messages — ASH Glo",
      },
      {
        property: "og:description",
        content: "Stay connected with people, businesses and the ASH team.",
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

  if (date.toDateString() === yesterday.toDateString()) return tx("Yesterday", "Hier");

  return date.toLocaleDateString(fr ? "fr-FR" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

const ASH_AI_ID = "ash-ai";
const ASH_SUPPORT_ID = "ash-support";

const ashAiConversation = {
  id: ASH_AI_ID,
  label: "ASH AI",
  preview: "Ask me anything — services, listings, ideas.",
};
const ashSupportConversation = {
  id: ASH_SUPPORT_ID,
  label: "ASH Support",
  preview: "Get help from the ASH team.",
};
const ASH_CHAT_BACKGROUND = "/images/ash-chat-background.png";

function MessagesPage() {
  const { tx, t, lang } = useI18n();
  const fr = lang === "fr";
  const { user } = useUser();
  const { c } = Route.useSearch();
  const navigate = Route.useNavigate();
  const routerNavigate = useNavigate();
  const mobileView = c ? "thread" : "list";

  // iOS/WKWebView visual viewport. The chat becomes a true fullscreen surface
  // while a thread is open, so the shell navigation/orb cannot overlap it.
  const [visualViewportHeight, setVisualViewportHeight] = useState<number | null>(null);
  // Real chrome reserve for the mobile chat list: distance from the list top to
  // the top edge of the bottom navigation, measured from the live layout so it
  // stays exact on any header height, root font size, or device safe area.
  const [chromeReservePx, setChromeReservePx] = useState<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

  // iOS Safari/WKWebView changes the visual viewport when the keyboard opens.
  // Track that viewport instead of relying on 100vh/100dvh, which can leave a
  // large dead area between the composer and the keyboard.
  useIsoLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const viewport = window.visualViewport;
    if (!viewport) return;

    const measureChromeReserve = () => {
      const main = document.querySelector<HTMLElement>("main.app-shell-scroll");
      const nav = document.querySelector<HTMLElement>(".premium-mobile-nav");
      if (!main || !nav) return;
      const navHeight = nav.getBoundingClientRect().height;
      if (navHeight <= 0) return;
      const top = Math.max(0, main.getBoundingClientRect().top + main.scrollTop);
      setChromeReservePx(Math.round(top + navHeight));
    };

    const updateViewport = () => {
      const height = Math.max(0, Math.round(viewport.height));
      setVisualViewportHeight((current) =>
        current !== null && Math.abs(current - height) < 2 ? current : height,
      );
      measureChromeReserve();
    };
    const keepPhoneViewport = () => {
      if (window.innerWidth >= 768 || mobileView !== "thread") return;
      if (window.scrollY !== 0) window.scrollTo(0, 0);
      updateViewport();
    };

    updateViewport();
    viewport.addEventListener("resize", updateViewport);
    viewport.addEventListener("scroll", keepPhoneViewport);
    window.addEventListener("focusin", keepPhoneViewport);
    window.addEventListener("focusout", updateViewport);
    window.addEventListener("resize", updateViewport);

    return () => {
      viewport.removeEventListener("resize", updateViewport);
      viewport.removeEventListener("scroll", keepPhoneViewport);
      window.removeEventListener("focusin", keepPhoneViewport);
      window.removeEventListener("focusout", updateViewport);
      window.removeEventListener("resize", updateViewport);
    };
  }, [mobileView]);

  // Mobile chat is a viewport-locked surface. The message list itself owns
  // scrolling; the outer shell stays still while the bottom navigation remains
  // visible and stable.
  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth >= 768) return;

    const shellScroll = document.querySelector<HTMLElement>(".app-shell-scroll");
    const orbs = Array.from(document.querySelectorAll<HTMLElement>(".orb-surface"));

    if (!shellScroll) return;

    const previousOverflow = shellScroll.style.overflow;
    const previousOverscroll = shellScroll.style.overscrollBehavior;
    const previousPaddingBottom = shellScroll.style.paddingBottom;
    const previousScrollRestoration = window.history.scrollRestoration;

    // The Messages surface already reserves the exact live height of the
    // bottom navigation. Remove the shell's general page padding here so it
    // cannot create a second empty band above the navigation.
    shellScroll.style.paddingBottom = "0px";

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
      shellScroll.style.paddingBottom = previousPaddingBottom;
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
  const getSupportTickets = useServerFn(getMySupportTickets);
  const { data: supportTickets } = useQuery({
    queryKey: ["support", "mine"],
    queryFn: getSupportTickets,
    refetchInterval: 10_000,
  });
  const supportTicket = supportTickets?.[0] ?? null;
  const latestSupportMessage = supportTicket?.messages.at(-1);
  const supportUnread =
    supportTicket?.messages.filter(
      (message) =>
        message.sender === "ADMIN" &&
        (!supportTicket.member_read_at || message.created_at > supportTicket.member_read_at),
    ).length ?? 0;
  const [term, setTerm] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);

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
  const [lockedPins, setLockedPins] = useState<Record<string, string>>({});
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
  const updateGroupAvatar = useUpdateGroupAvatar();
  const unlockChatServer = useServerFn(unlockChat);

  const list = conversations ?? [];
  const peerIds = list
    .map((conversation) => {
      if (conversation.group_id) return null;
      const providerIsMe = Boolean(user?.id) && conversation.provider?.user_id === user?.id;
      return (providerIsMe ? conversation.client_id : conversation.provider?.user_id) ?? null;
    })
    .filter((id): id is string => Boolean(id));
  const { data: memberStates } = useMemberStates(peerIds);
  const [avatarChoice, setAvatarChoice] = useState<(typeof list)[number] | null>(null);
  const [viewerRequest, setViewerRequest] = useState<
    { authorId: string; kind: "story" | "spotlight" } | undefined
  >();
  const { data: availableStories, isLoading: loadingStories } = useStories();
  const { data: availableSpotlights, isLoading: loadingSpotlights } = useQuery({
    queryKey: ["ash-spotlights"],
    queryFn: loadSpotlights,
    staleTime: 15_000,
  });
  const avatarPeerId = avatarChoice ? peerUserIdOf(avatarChoice) : null;
  const hasStory = Boolean(
    availableStories?.groups.some((group) => group.author.id === avatarPeerId),
  );
  const hasSpotlight = Boolean(
    availableSpotlights?.some((post) => post.provider.user_id === avatarPeerId),
  );

  // Desktop falls back to the first conversation;
  // mobile requires an explicit conversation pick.
  const activeId =
    c ?? (typeof window !== "undefined" && window.innerWidth >= 768 ? list[0]?.id : undefined);
  const activeLockedPin = activeId ? lockedPins[activeId] : undefined;

  const active = list.find((conv) => conv.id === activeId);
  const { data: myGroups } = useGroups();
  const groupOf = (conv: (typeof list)[number] | undefined) =>
    conv?.group_id ? (myGroups ?? []).find((g) => g.id === conv.group_id) : undefined;
  const activeGroup = groupOf(active);
  // Off-platform warnings apply only to Campus instructor threads.
  const activePeerId = active ? peerUserIdOf(active) : null;
  const { data: isCampusPeer } = useQuery({
    queryKey: ["campus-peer", activePeerId],
    enabled: Boolean(activePeerId),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("campus_instructor_profiles")
        .select("id")
        .eq("user_id", activePeerId as string)
        .eq("is_active", true)
        .maybeSingle();
      return Boolean(data);
    },
  });
  /** Providers see the client; clients see the business.
   * Property threads show the listing/owner.
   */
  function directPeerOf(conv: (typeof list)[number]) {
    // Member-to-member thread: no group, no storefront, no listing.
    if (conv.group_id || conv.listing_id || conv.provider_id) return null;
    const ownerId = conv.owner_id ?? null;
    if (!ownerId) return null;
    const viewerIsOwner = Boolean(user?.id) && ownerId === user?.id;
    const side = viewerIsOwner
      ? (conv as { client?: { full_name?: string | null; avatar_url?: string | null } }).client
      : (conv as { owner?: { full_name?: string | null; avatar_url?: string | null } | null })
          .owner;
    return {
      id: (viewerIsOwner ? conv.client_id : ownerId) ?? null,
      name: side?.full_name ?? null,
      avatar_url: side?.avatar_url ?? null,
    };
  }

  function peerOf(conv: (typeof list)[number]): string {
    const group = groupOf(conv);
    if (group) return group.name;
    const direct = directPeerOf(conv);
    if (direct) return direct.name ?? (tx("Profile", "Profil"));
    if (conv.listing_id) {
      const viewerIsOwner = Boolean(user?.id) && conv.owner_id === user?.id;

      return viewerIsOwner
        ? (conv.client?.full_name ?? (tx("Profile", "Profil")))
        : (conv.listing?.title ?? "ASH Property");
    }

    const viewerIsProvider = Boolean(user?.id) && conv.provider?.user_id === user?.id;

    return viewerIsProvider
      ? (conv.client?.full_name ?? (tx("Profile", "Profil")))
      : (conv.provider?.business_name ?? t("chat.title"));
  }

  /** Picture of the other side, when we have one. */
  function peerAvatarOf(conv: (typeof list)[number]): string | null {
    const group = groupOf(conv);
    if (group) return group.avatar_path;
    const direct = directPeerOf(conv);
    if (direct) return direct.avatar_url ?? null;
    if (conv.listing_id) {
      const viewerIsOwner = Boolean(user?.id) && conv.owner_id === user?.id;

      return viewerIsOwner ? (conv.client?.avatar_url ?? null) : null;
    }

    const viewerIsProvider = Boolean(user?.id) && conv.provider?.user_id === user?.id;

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
    const direct = directPeerOf(conv);
    if (direct) return direct.id;
    if (conv.listing_id) {
      const viewerIsOwner = Boolean(user?.id) && conv.owner_id === user?.id;

      return (viewerIsOwner ? conv.client_id : conv.owner_id) ?? null;
    }

    const viewerIsProvider = Boolean(user?.id) && conv.provider?.user_id === user?.id;

    return (viewerIsProvider ? conv.client_id : conv.provider?.user_id) ?? null;
  }

  /** Where the other side's public page lives, when they have one. */
  function peerProfileOf(conv: (typeof list)[number] | undefined) {
    if (!conv) return null;

    const memberId = peerUserIdOf(conv);
    if (memberId && !conv.group_id) {
      return { to: "/u/$userId", params: { userId: memberId } };
    }

    if (conv.listing_id) {
      const viewerIsOwner = Boolean(user?.id) && conv.owner_id === user?.id;

      return viewerIsOwner || !conv.listing
        ? null
        : {
            to: "/property/$listingId",
            params: { listingId: conv.listing.id },
          };
    }

    const viewerIsProvider = Boolean(user?.id) && conv.provider?.user_id === user?.id;

    if (viewerIsProvider || !conv.provider) return null;

    return {
      to: "/services/$providerId",
      params: { providerId: conv.provider.id },
    };
  }

  /** Open the other side's public page from the chat header. */
  function openPeerProfile(conv: (typeof list)[number]) {
    const group = groupOf(conv);
    if (group) {
      setGroupEditName(group.name);
      setGroupSettings(true);
      return;
    }
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

      if (conv.listing) return `ASH Property · ${conv.listing.city}`;

      return t("chat.pick");
    }

    const mine = last.sender_id === user?.id;

    const text = last.kind === "INVOICE" ? (tx("Invoice", "Facture")) : last.body;

    return `${mine ? (tx("You: ", "Vous : ")) : ""}${text}`.replace(/\s+/g, " ").trim();
  }

  const searchTerm = term.trim();
  const searched = searchTerm
    ? list.filter((conv) =>
        `${peerOf(conv)} ${previewOf(conv)}`.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : list;

  // Locked conversations are also excluded by RLS. This filter keeps the UI
  // consistent while preference invalidation and conversation refetch settle.
  const visible = searched.filter((conv) => {
    const pref = prefs?.[conv.id];
    if (pref?.locked && !lockedUnlocked) return false;
    if (Boolean(pref?.archived) !== showArchived) return false;
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
        fr
          ? `Vous pouvez épingler ${MAX_PINNED} discussions.`
          : `You can pin up to ${MAX_PINNED} chats.`,
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
              ? tx("Chat unlocked", "Discussion déverrouillée")
              : tx("Chat locked and hidden", "Discussion verrouillée et masquée"),
          ),
      },
    );
  }

  async function revealLockedChats() {
    if (!lockPin || pinValue.length < 4) return;
    const hash = await hashPin(pinValue);
    if (hash !== lockPin) {
      toast.error(tx("Incorrect PIN", "Code incorrect"));
      return;
    }
    setLockedUnlocked(true);
    setUnlockDialog(false);
    setPinValue("");
    toast.success(tx("Locked chats shown", "Discussions verrouillées affichées"));
  }

  async function openLockedChat(conversationId: string) {
    setUnlockingId(conversationId);
    setUnlockDialog(true);
  }

  async function submitLockedChatUnlock() {
    if (!unlockingId || pinValue.length < 4) return;
    try {
      const submittedPin = pinValue;
      const result = (await unlockChatServer({
        data: { conversationId: unlockingId, pin: submittedPin },
      })) as { messages: LockedChatMessage[] };
      setLockedMessages((current) => ({ ...current, [unlockingId]: result.messages }));
      setLockedPins((current) => ({ ...current, [unlockingId]: submittedPin }));
      setUnlockDialog(false);
      setPinValue("");
      void navigate({ search: { c: unlockingId } });
    } catch {
      toast.error(tx("Incorrect PIN", "Code incorrect"));
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
        setPref.mutate({
          conversationId: id,
          patch: { archived: true, locked: Boolean(prefs?.[id]?.locked) },
        });
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
        tx("Some chats belong to a booking — they were archived instead.", "Certaines discussions sont liées à une réservation — elles ont été archivées."),
      );
    }
  }

  return (
    <div className="member-messages mx-auto min-h-0 w-full max-w-[1440px]">
      {isLoading ? (
        <SkeletonRows rows={3} />
      ) : (
        <div className="grid md:grid-cols-[minmax(320px,38%)_minmax(0,1fr)] md:overflow-hidden md:rounded-lg md:border md:border-border">
          {/* =========================================================
              CHAT LIST
              ========================================================= */}
          <div
            className={cn(
              "messages-inbox flex min-h-0 flex-col overflow-hidden border-r border-border p-0 max-md:rounded-none max-md:border-0",
              mobileView === "thread"
                ? "hidden md:flex"
                : chromeReservePx !== null
                  ? "max-md:-mx-4 max-md:-mt-5"
                  : "max-md:-mx-4 max-md:-mt-5 max-md:h-[calc(var(--ash-vh,100dvh)-3.5rem-3.75rem)]",
              "md:max-h-[72vh]",
            )}
            style={
              mobileView !== "thread" && chromeReservePx !== null
                ? { height: `calc(var(--ash-vh, 100dvh) - ${chromeReservePx}px)` }
                : undefined
            }
          >
            <div className="border-b border-border bg-card/75 px-4 pb-4 pt-5 backdrop-blur">
              <h2 className="mb-4 flex items-center justify-between font-display text-3xl font-bold text-foreground">
                {t("chat.title")}
                <Button
                  size="icon"
                  variant="default"
                  className="size-11 rounded-full"
                  aria-label={tx("New chat", "Nouvelle discussion")}
                  onClick={() => setNewChatOpen(true)}
                >
                  <Plus className="size-6" />
                </Button>
              </h2>
              <ChatActionDialog
                open={newChatOpen}
                onOpenChange={setNewChatOpen}
                title={tx("New chat", "Nouvelle discussion")}
              >
                <Button
                  variant="ghost"
                  className="h-14 w-full justify-start gap-3"
                  onClick={() => {
                    setNewChatOpen(false);
                    void routerNavigate({ to: "/friends" });
                  }}
                >
                  <UserPlus />
                  {tx("Choose a contact", "Choisir un contact")}
                </Button>
                <Button
                  variant="ghost"
                  className="h-14 w-full justify-start gap-3"
                  onClick={() => {
                    setNewChatOpen(false);
                    setGroupDialog(true);
                  }}
                >
                  <Users />
                  {tx("New group", "Nouveau groupe")}
                </Button>
                <Button
                  variant="ghost"
                  className="h-14 w-full justify-start gap-3"
                  onClick={() => {
                    setNewChatOpen(false);
                    void navigate({ search: { c: ASH_SUPPORT_ID } });
                  }}
                >
                  <LifeBuoy />
                  {tx("Contact ASH support", "Contacter ASH")}
                </Button>
              </ChatActionDialog>

              {selection.length > 0 ? (
                <div className="mb-2 flex items-center justify-between gap-2 rounded-full bg-primary/10 px-3 py-1.5">
                  <button
                    type="button"
                    onClick={() => setSelection([])}
                    className="text-[12px] font-bold text-primary"
                  >
                    {tx("Cancel", "Annuler")}
                  </button>
                  <span className="text-[12px] font-bold text-foreground">
                    {selection.length} {tx("selected", "sélectionnée(s)")}
                  </span>
                  <button
                    type="button"
                    onClick={() => setConfirmBulkDelete(true)}
                    aria-label={tx("Delete", "Supprimer")}
                    className="grid size-8 place-items-center rounded-full text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              ) : null}

              <div className="flex min-h-12 items-center gap-3 rounded-full bg-muted px-4 py-3">
                <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden />

                <input
                  value={term}
                  onChange={(event) => setTerm(event.target.value)}
                  placeholder={
                    tx("Search chats or people", "Rechercher une discussion ou un membre")
                  }
                  aria-label={tx("Search chats", "Rechercher une discussion")}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-10 rounded-full px-3 text-sm"
                  onClick={() => setGroupDialog(true)}
                >
                  <Users className="size-4" aria-hidden />
                  {tx("New group", "Nouveau groupe")}
                </Button>
                {archivedCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowArchived((value) => !value)}
                    className="flex min-h-10 items-center gap-2 rounded-full bg-muted px-3 py-2 text-sm font-bold text-muted-foreground"
                  >
                    <Archive className="size-4" aria-hidden />
                    {showArchived
                      ? tx("Hide archived", "Masquer les archives")
                      : `${tx("Archived", "Archivées")} (${archivedCount})`}
                  </button>
                ) : null}

                {lockPin && lockedCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setUnlockDialog(true)}
                    className="flex min-h-10 items-center gap-2 rounded-full bg-muted px-3 py-2 text-sm font-bold text-muted-foreground"
                  >
                    <Lock className="size-4" aria-hidden />
                    {fr ? `Verrouillées (${lockedCount})` : `Locked (${lockedCount})`}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => setPinDialog(true)}
                  className="flex min-h-10 items-center gap-2 rounded-full bg-muted px-3 py-2 text-sm font-bold text-muted-foreground"
                >
                  <Lock className="size-4" aria-hidden />
                  {lockPin
                    ? tx("Chat lock PIN", "Code des discussions")
                    : tx("Set a PIN", "Créer un code")}
                </button>

                {lockedUnlocked ? (
                  <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-bold text-primary">
                    {tx("Locked chats shown", "Discussions verrouillées affichées")}
                  </span>
                ) : null}
              </div>
            </div>

            <Dialog open={groupDialog} onOpenChange={setGroupDialog}>
              <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-sm overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{tx("Create a group", "Créer un groupe")}</DialogTitle>
                </DialogHeader>
                <Input
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value.slice(0, 60))}
                  placeholder={tx("Group name", "Nom du groupe")}
                />
                <Input
                  value={groupSearch}
                  onChange={(event) => setGroupSearch(event.target.value)}
                  placeholder={tx("Search people on ASH", "Rechercher un membre")}
                />
                <div className="max-h-64 space-y-1 overflow-y-auto">
                  {[
                    ...(graph?.friends ?? []).map(({ other }) => other),
                    ...(groupPeople ?? []).filter(
                      (person) =>
                        !(graph?.friends ?? []).some(({ other }) => other.id === person.id),
                    ),
                  ].length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      {tx("Add friends before creating a group.", "Ajoutez d’abord des amis au groupe.")}
                    </p>
                  ) : (
                    [
                      ...(graph?.friends ?? []).map(({ other }) => other),
                      ...(groupPeople ?? []).filter(
                        (person) =>
                          !(graph?.friends ?? []).some(({ other }) => other.id === person.id),
                      ),
                    ].map((other) => {
                      const selected = groupMembers.includes(other.id);
                      return (
                        <Button
                          key={other.id}
                          type="button"
                          variant="ghost"
                          className={cn(
                            "h-auto w-full justify-start gap-3 px-2 py-2",
                            selected && "bg-primary/10",
                          )}
                          onClick={() =>
                            setGroupMembers((ids) =>
                              selected ? ids.filter((id) => id !== other.id) : [...ids, other.id],
                            )
                          }
                        >
                          <Avatar
                            path={other.avatar_url}
                            name={other.name}
                            online={other.online}
                            hasUpdate={other.has_update}
                            className="size-9"
                          />
                          <span className="min-w-0 flex-1 truncate text-left">{other.name}</span>
                          {selected ? (
                            <span className="text-xs font-bold text-primary">
                              {tx("Added", "Ajouté")}
                            </span>
                          ) : (
                            <Plus className="size-4" aria-hidden />
                          )}
                        </Button>
                      );
                    })
                  )}
                </div>
                <Button
                  disabled={groupName.trim().length < 2 || createGroup.isPending}
                  onClick={() =>
                    createGroup.mutate(
                      { name: groupName, memberIds: groupMembers },
                      {
                        onSuccess: () => {
                          setGroupDialog(false);
                          setGroupName("");
                          setGroupMembers([]);
                          toast.success(tx("Group created", "Groupe créé"));
                        },
                        onError: (error) =>
                          toast.error(
                            error instanceof Error ? error.message : "Could not create the group.",
                          ),
                      },
                    )
                  }
                >
                  {tx("Create group", "Créer le groupe")}
                </Button>
              </DialogContent>
            </Dialog>

            <Dialog
              open={unlockDialog}
              onOpenChange={(open) => {
                setUnlockDialog(open);
                if (!open) {
                  setUnlockingId(null);
                  setPinValue("");
                }
              }}
            >
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>{tx("Unlock chats", "Déverrouiller les discussions")}</DialogTitle>
                </DialogHeader>
                <p className="text-xs text-muted-foreground">
                  {tx("Enter your PIN. Chat content remains unavailable until it is verified.", "Entrez votre code. Le contenu reste inaccessible jusqu’à sa validation.")}
                </p>
                <Input
                  type="password"
                  inputMode="numeric"
                  autoFocus
                  value={pinValue}
                  onChange={(event) =>
                    setPinValue(event.target.value.replace(/\D/g, "").slice(0, 8))
                  }
                  placeholder="••••"
                />
                <Button
                  disabled={pinValue.length < 4}
                  onClick={() =>
                    void (unlockingId ? submitLockedChatUnlock() : revealLockedChats())
                  }
                >
                  {tx("Unlock", "Déverrouiller")}
                </Button>
              </DialogContent>
            </Dialog>

            <Dialog open={confirmBulkDelete} onOpenChange={setConfirmBulkDelete}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>
                    {tx("Delete these chats?", "Supprimer ces discussions ?")}
                  </DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  {tx("The messages are permanently lost. You can still find the person again through search.", "Les messages seront définitivement perdus. Vous pourrez toujours retrouver la personne par la recherche.")}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setConfirmBulkDelete(false)}
                  >
                    {tx("Cancel", "Annuler")}
                  </Button>
                  <Button
                    className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => void deleteSelected()}
                  >
                    {tx("Delete", "Supprimer")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={pinDialog} onOpenChange={setPinDialog}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>{tx("Chat lock PIN", "Code des discussions")}</DialogTitle>
                </DialogHeader>
                <p className="text-xs text-muted-foreground">
                  {tx("Pick a PIN of at least 4 digits. Locked chats disappear from the list and come back when you type this PIN into the search box.", "Choisissez un code d'au moins 4 chiffres. Les discussions verrouillées disparaissent de la liste et réapparaissent quand vous tapez ce code dans la recherche.")}
                </p>
                <Input
                  type="password"
                  inputMode="numeric"
                  value={pinValue}
                  onChange={(event) =>
                    setPinValue(event.target.value.replace(/\D/g, "").slice(0, 8))
                  }
                  placeholder="••••"
                  aria-label={tx("PIN", "Code")}
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
                          toast.success(tx("PIN saved", "Code enregistré"));
                        },
                        onError: () => toast.error(tx("Could not save the PIN", "Échec")),
                      })
                    }
                  >
                    {tx("Save PIN", "Enregistrer")}
                  </Button>
                  {lockPin ? (
                    <Button
                      variant="outline"
                      onClick={() =>
                        saveLockPin.mutate(null, {
                          onSuccess: () => {
                            setPinDialog(false);
                            toast.success(tx("PIN removed", "Code retiré"));
                          },
                        })
                      }
                    >
                      {tx("Remove", "Retirer")}
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
                  {tx("No chats found.", "Aucune discussion trouvée.")}
                </p>
              ) : null}

              {!showArchived &&
                (!term.trim() ||
                  `${ashSupportConversation.label} ${ashSupportConversation.preview}`
                    .toLowerCase()
                    .includes(term.trim().toLowerCase())) && (
                  <button
                    type="button"
                    onClick={() => void navigate({ search: { c: ASH_SUPPORT_ID } })}
                    className={cn(
                      "flex w-full items-center gap-4 border-b border-border/60 px-4 py-5 text-left transition-colors",
                      activeId === ASH_SUPPORT_ID
                        ? "bg-primary/10"
                        : "hover:bg-muted/70 active:bg-muted",
                    )}
                  >
                    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary ring-2 ring-primary/25">
                      <LifeBuoy className="size-6" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="member-contact-name truncate text-base font-bold">
                          ASH Support
                        </span>
                        {supportUnread > 0 ? (
                          <span className="grid min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-bold text-primary-foreground">
                            {supportUnread > 99 ? "99+" : supportUnread}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
                        {latestSupportMessage?.body ??
                          (fr
                            ? "Obtenez de l’aide de l’équipe ASH."
                            : ashSupportConversation.preview)}
                      </span>
                    </span>
                  </button>
                )}

              {!showArchived &&
                (!term.trim() ||
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
                      "flex w-full items-center gap-4 border-b border-border/60 px-4 py-5 text-left transition-colors",
                      activeId === ASH_AI_ID
                        ? "bg-primary/10"
                        : "hover:bg-muted/70 active:bg-muted",
                    )}
                  >
                    <img
                      src={ashLogo.url}
                      alt="ASH AI"
                      className="size-14 shrink-0 rounded-full ring-2 ring-success/20"
                    />

                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-base font-bold text-foreground">ASH AI</span>
                        <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
                          {tx("Live", "En direct")}
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

                return (
                  <SelectChatRow
                    key={conv.id}
                    fr={fr}
                    label={label}
                    pinned={Boolean(prefs?.[conv.id]?.pinned)}
                    archived={Boolean(prefs?.[conv.id]?.archived)}
                    locked={Boolean(prefs?.[conv.id]?.locked)}
                    selecting={selection.length > 0}
                    selected={selection.includes(conv.id)}
                    onLongPress={() => toggleSelected(conv.id)}
                    onToggleSelect={() => toggleSelected(conv.id)}
                    onOpen={() =>
                      prefs?.[conv.id]?.locked && !lockedMessages[conv.id]
                        ? void openLockedChat(conv.id)
                        : void navigate({ search: { c: conv.id } })
                    }
                    onTogglePin={() => void togglePin(conv.id)}
                    onArchive={() => toggleArchive(conv.id)}
                    onToggleLock={() => toggleLock(conv.id)}
                  >
                    <div
                      className={cn(
                        "flex w-full items-center gap-4 px-4 py-5 pr-14 text-left transition-colors",
                        conv.id === activeId
                          ? "bg-primary/10"
                          : "hover:bg-muted/70 active:bg-muted",
                      )}
                    >
                      {/* COLORED ASH PROFILE CIRCLE */}
                      <Button
                        data-chat-avatar
                        variant="ghost"
                        aria-label={`${tx("View updates from", "Voir les actualités de")} ${label}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (conv.group_id) {
                            openPeerProfile(conv);
                            return;
                          }
                          setAvatarChoice(conv);
                        }}
                        className={cn(
                          "member-avatar-ring grid aspect-square size-14 min-w-14 shrink-0 place-items-center rounded-full p-[2px] shadow-sm",
                          (availableStories?.groups.some(
                            (group) => group.author.id === peerUserIdOf(conv),
                          ) ||
                            availableSpotlights?.some(
                              (post) => post.provider.user_id === peerUserIdOf(conv),
                            )) &&
                            "member-avatar-update",
                        )}
                      >
                        <span className="grid size-full place-items-center overflow-hidden rounded-full bg-background">
                          <Avatar
                            path={peerAvatarOf(conv)}
                            name={label}
                            online={peerStateOf(conv)?.online}
                            hasUpdate={false}
                            className="size-[52px] aspect-square rounded-full border-0 shadow-none"
                          />
                        </span>
                      </Button>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="inline-flex min-w-0 items-center gap-1 text-base font-semibold text-foreground">
                            <span className="member-contact-name truncate">{label}</span>
                            <VerifiedBadge
                              tier={peerStateOf(conv)?.verified_tier}
                              until={peerStateOf(conv)?.verified_until}
                              size={14}
                            />
                          </span>

                          <span
                            className={cn(
                              "shrink-0 text-[11px]",
                              unread > 0 ? "font-semibold text-primary" : "text-muted-foreground",
                            )}
                          >
                            {stamp(conv.last_message?.created_at ?? conv.last_message_at, fr)}
                          </span>
                        </span>

                        <span className="mt-0.5 flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              "truncate text-sm",
                              unread > 0 ? "font-medium text-foreground" : "text-muted-foreground",
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
              {!showArchived && term.trim().length >= 2 && newPeople.length > 0 ? (
                <div className="space-y-2 border-t border-border bg-muted/30 p-3">
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-foreground">
                    {tx("Other people on ASH", "Autres membres ASH")}
                  </p>
                  {newPeople.slice(0, 8).map((person) => (
                    <div key={person.id} className="flex items-center gap-2">
                      <Avatar
                        path={person.avatar_url}
                        name={person.name}
                        online={person.online}
                        hasUpdate={person.has_update}
                        className="size-9"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          void routerNavigate({ to: "/u/$userId", params: { userId: person.id } })
                        }
                        className="min-w-0 flex-1 truncate text-left text-[13px] font-semibold text-foreground"
                      >
                        <span className="inline-flex items-center gap-1">
                          {person.name}
                          <VerifiedBadge
                            tier={person.verified_tier}
                            until={person.verified_until}
                            size={13}
                          />
                        </span>
                      </button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          sendFriendRequest.mutate(person.id, {
                            onSuccess: () =>
                              toast.success(tx("Friend request sent", "Demande envoyée")),
                            onError: () => toast.error(tx("Could not send", "Échec de l'envoi")),
                          })
                        }
                      >
                        <UserPlus className="size-4" aria-hidden />
                        {tx("Add", "Ajouter")}
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
            onTouchStart={mobileView === "thread" ? handleChatTouchStart : undefined}
            onTouchEnd={mobileView === "thread" ? handleChatTouchEnd : undefined}
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
              "member-chat-surface chat-surface flex min-h-0 flex-col overflow-hidden p-0 max-md:rounded-none max-md:border-0",
              mobileView === "list"
                ? "hidden md:flex"
                : cn(
                    "max-md:fixed max-md:inset-x-0 max-md:top-0 max-md:bottom-0 max-md:z-50 max-md:w-screen max-md:touch-pan-y",
                    "max-md:h-[var(--ash-visual-height)]",
                  ),
              "md:h-[72vh]",
            )}
          >
            {/* CHAT HEADER */}
            <div className="flex items-center gap-2.5 border-b border-border bg-card/85 px-4 py-3 backdrop-blur max-md:pt-[calc(0.5rem+env(safe-area-inset-top))]">
              {/* BACK TO MESSAGES */}
              <button
                type="button"
                onClick={() =>
                  void navigate({
                    to: "/messages",
                    search: {},
                  })
                }
                aria-label={tx("Back to messages", "Retour aux messages")}
                className="grid size-10 shrink-0 place-items-center rounded-full bg-muted/70 text-foreground shadow-sm transition-all hover:bg-muted active:scale-95 md:hidden"
              >
                <ArrowLeft className="size-5" aria-hidden />
              </button>

              {/* ACTIVE PROFILE */}
              <button
                type="button"
                onClick={() => {
                  if (activeGroup) {
                    setGroupEditName(activeGroup.name);
                    setGroupSettings(true);
                    return;
                  }
                  if (active) setAvatarChoice(active);
                }}
                disabled={!active || (!activeGroup && !peerProfileOf(active))}
                aria-label={
                  activeGroup
                    ? tx("View group profile", "Voir le profil du groupe")
                    : tx("View profile", "Voir le profil")
                }
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1 py-0.5 text-left transition-colors enabled:hover:bg-muted/60"
              >
                {activeId === ASH_AI_ID ? (
                  <img
                    src={ashLogo.url}
                    alt="ASH AI"
                    className="size-12 shrink-0 rounded-full ring-2 ring-success/20"
                  />
                ) : activeId === ASH_SUPPORT_ID ? (
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary ring-2 ring-primary/25">
                    <LifeBuoy className="size-5" aria-hidden />
                  </span>
                ) : active ? (
                  <span
                    className={cn(
                      "member-avatar-ring grid size-10 shrink-0 place-items-center rounded-full p-[2px] shadow-sm",
                      (availableStories?.groups.some((group) => group.author.id === activePeerId) ||
                        availableSpotlights?.some(
                          (post) => post.provider.user_id === activePeerId,
                        )) &&
                        "member-avatar-update",
                    )}
                  >
                    <span className="grid size-full place-items-center overflow-hidden rounded-full bg-background">
                      <Avatar
                        path={peerAvatarOf(active)}
                        name={peerOf(active)}
                        online={peerStateOf(active)?.online}
                        hasUpdate={false}
                        className="size-9 aspect-square rounded-full border-0 shadow-none"
                      />
                    </span>
                  </span>
                ) : null}

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate font-display text-[15px] font-semibold text-foreground">
                    <span className="member-contact-name truncate">
                      {activeId === ASH_AI_ID
                        ? "ASH AI"
                        : activeId === ASH_SUPPORT_ID
                          ? "ASH Support"
                          : active
                            ? peerOf(active)
                            : t("chat.title")}
                    </span>
                    {activeId !== ASH_AI_ID && activeId !== ASH_SUPPORT_ID && active ? (
                      <VerifiedBadge
                        tier={peerStateOf(active)?.verified_tier}
                        until={peerStateOf(active)?.verified_until}
                        size={14}
                      />
                    ) : null}
                  </p>

                  {active?.booking ? (
                    <p className="truncate text-[11px] text-muted-foreground">
                      {active.booking.service_title} · {formatDateTime(active.booking.scheduled_at)}
                      {active.booking.invoice_number ? ` · ${active.booking.invoice_number}` : ""}
                    </p>
                  ) : active?.listing ? (
                    <p className="truncate text-[11px] text-muted-foreground">
                      ASH Property · {active.listing.city}
                    </p>
                  ) : null}
                </div>
              </button>

              {/* BOOKING STATUS */}
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
              {activeGroup ? (
                <button
                  type="button"
                  onClick={() => {
                    setGroupEditName(activeGroup.name);
                    setGroupSettings(true);
                  }}
                  aria-label={tx("Manage group", "Gérer le groupe")}
                  className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground"
                >
                  <Settings2 className="size-4" aria-hidden />
                </button>
              ) : null}
            </div>

            <Dialog open={groupSettings} onOpenChange={setGroupSettings}>
              <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-sm overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{tx("Manage group", "Gérer le groupe")}</DialogTitle>
                </DialogHeader>
                {activeGroup ? (
                  <>
                    <div className="flex items-center gap-3">
                      <Avatar
                        path={activeGroup.avatar_path}
                        name={activeGroup.name}
                        className="size-14"
                      />
                      {activeGroup.owner_id === user?.id ? (
                        <label
                          className={cn(
                            "inline-flex items-center gap-2 text-sm font-semibold text-primary",
                            updateGroupAvatar.isPending
                              ? "cursor-wait opacity-60"
                              : "cursor-pointer",
                          )}
                        >
                          <Camera className="size-4" />
                          {updateGroupAvatar.isPending
                            ? tx("Saving…", "Enregistrement…")
                            : tx("Photo", "Photo")}
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            disabled={updateGroupAvatar.isPending}
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              event.target.value = "";
                              if (!file) return;
                              updateGroupAvatar.mutate(
                                {
                                  groupId: activeGroup.id,
                                  file,
                                  currentPath: activeGroup.avatar_path,
                                },
                                {
                                  onSuccess: () =>
                                    toast.success(
                                      tx("Group photo saved", "Photo du groupe enregistrée"),
                                    ),
                                  onError: (error) =>
                                    toast.error(
                                      error instanceof Error
                                        ? error.message
                                        : tx("Could not save the group photo", "Impossible d’enregistrer la photo"),
                                    ),
                                },
                              );
                            }}
                          />
                        </label>
                      ) : null}
                    </div>
                    {activeGroup.owner_id === user?.id ? (
                      <div className="flex gap-2">
                        <Input
                          value={groupEditName}
                          onChange={(event) => setGroupEditName(event.target.value.slice(0, 60))}
                        />
                        <Button
                          onClick={() =>
                            updateGroup.mutate(
                              { groupId: activeGroup.id, name: groupEditName },
                              {
                                onSuccess: () =>
                                  toast.success(tx("Group updated", "Groupe mis à jour")),
                              },
                            )
                          }
                        >
                          {tx("Save", "Enregistrer")}
                        </Button>
                      </div>
                    ) : null}
                    <div className="space-y-2">
                      {activeGroup.members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-2 rounded-xl bg-muted/50 p-2"
                        >
                          <Avatar
                            path={member.avatar_url}
                            name={member.name}
                            online={member.online}
                            hasUpdate={member.has_update}
                            className="size-9"
                          />
                          <span className="flex min-w-0 flex-1 items-center gap-1 text-sm font-semibold">
                            <span className="truncate">{member.name}</span>
                            <VerifiedBadge
                              tier={member.verified_tier}
                              until={member.verified_until}
                              size={13}
                            />
                          </span>
                          {activeGroup.owner_id === user?.id && member.id !== user.id ? (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() =>
                                removeGroupMember.mutate({
                                  groupId: activeGroup.id,
                                  userId: member.id,
                                })
                              }
                            >
                              <UserMinus className="size-4" />
                            </Button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    {activeGroup.owner_id === user?.id ? (
                      <>
                        <Input
                          value={groupSearch}
                          onChange={(event) => setGroupSearch(event.target.value)}
                          placeholder={tx("Add a member", "Ajouter un membre")}
                        />
                        {(groupPeople ?? [])
                          .filter(
                            (person) =>
                              !activeGroup.members.some((member) => member.id === person.id),
                          )
                          .slice(0, 6)
                          .map((person) => (
                            <button
                              key={person.id}
                              type="button"
                              onClick={() =>
                                addGroupMembers.mutate({
                                  groupId: activeGroup.id,
                                  memberIds: [person.id],
                                })
                              }
                              className="flex w-full items-center gap-2 rounded-xl p-2 text-left hover:bg-muted"
                            >
                              <Avatar
                                path={person.avatar_url}
                                name={person.name}
                                online={person.online}
                                hasUpdate={person.has_update}
                                className="size-9"
                              />
                              <span className="flex-1 truncate text-sm font-semibold">
                                {person.name}
                              </span>
                              <Plus className="size-4 text-primary" />
                            </button>
                          ))}
                      </>
                    ) : null}
                  </>
                ) : null}
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
                  className="pointer-events-none absolute inset-0 bg-background/70 backdrop-blur-[1px]"
                />
                <div className="relative flex min-h-0 flex-1 flex-col px-4 py-4">
                  <AssistantPanel />
                </div>
              </div>
            ) : activeId === ASH_SUPPORT_ID ? (
              <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
                <SupportChatPanel />
              </div>
            ) : activeId && prefs?.[activeId]?.locked && !lockedMessages[activeId] ? (
              <div className="grid flex-1 place-items-center bg-background/80 p-6 text-center backdrop-blur-sm">
                <div className="max-w-xs space-y-3">
                  <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
                    <Lock className="size-6" />
                  </span>
                  <p className="font-display text-lg font-bold">
                    {tx("Locked chat", "Discussion verrouillée")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {tx("Content has not been loaded. Enter your PIN to open it.", "Le contenu n’a pas été chargé. Entrez votre code pour l’ouvrir.")}
                  </p>
                  <Button onClick={() => void openLockedChat(activeId)}>
                    {tx("Unlock", "Déverrouiller")}
                  </Button>
                </div>
              </div>
            ) : activeId ? (
              <div className="member-chat-surface relative min-h-0 flex-1 overflow-hidden">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-background/10"
                />

                <div className="relative flex h-full min-h-0 flex-col">
                  <ChatThread
                    conversationId={activeId}
                    currentUserId={user?.id}
                    peerName={active ? peerOf(active) : tx("Profile", "Profil")}
                    peerUserId={active ? peerUserIdOf(active) : null}
                    peerAvatar={active ? peerAvatarOf(active) : null}
                    isGroup={Boolean(activeGroup)}
                    offPlatformGuard={Boolean(isCampusPeer)}
                    enforceFirstContactLimit={Boolean(
                      active &&
                      !activeGroup &&
                      !active.provider_id &&
                      !active.booking_id &&
                      !active.listing_id,
                    )}
                    members={(activeGroup?.members ?? []).map((m) => ({
                      id: m.id,
                      name: m.name,
                      avatar_url: m.avatar_url,
                      online: m.online,
                      verified_tier: m.verified_tier ?? null,
                      verified_until: m.verified_until ?? null,
                    }))}
                    initialMessages={activeId ? lockedMessages[activeId] : undefined}
                    refreshMessages={
                      activeId && activeLockedPin
                        ? async () => {
                            const result = (await unlockChatServer({
                              data: { conversationId: activeId, pin: activeLockedPin },
                            })) as { messages: LockedChatMessage[] };
                            return result.messages;
                          }
                        : undefined
                    }
                    className="min-h-0 flex-1"
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
      <ChatActionDialog
        open={Boolean(avatarChoice)}
        onOpenChange={(open) => {
          if (!open) setAvatarChoice(null);
        }}
        title={avatarChoice ? peerOf(avatarChoice) : ""}
      >
        {avatarChoice && (
          <div className="mb-4 flex justify-center">
            <Avatar
              path={peerAvatarOf(avatarChoice)}
              name={peerOf(avatarChoice)}
              className="size-24"
              hasUpdate={hasStory || hasSpotlight}
            />
          </div>
        )}
        {(loadingStories || loadingSpotlights) && (
          <p role="status" className="text-center text-sm text-muted-foreground">
            {tx("Loading updates…", "Chargement des actualités…")}
          </p>
        )}
        {hasStory && (
          <Button
            variant="secondary"
            className="h-14 w-full justify-start gap-4 text-base"
            onClick={() => {
              if (!avatarPeerId) return;
              setViewerRequest({ authorId: avatarPeerId, kind: "story" });
              setAvatarChoice(null);
            }}
          >
            <CircleUserRound className="text-success" />
            {tx("View story", "Voir la story")}
          </Button>
        )}
        {hasSpotlight && (
          <Button
            variant="secondary"
            className="h-14 w-full justify-start gap-4 text-base"
            onClick={() => {
              if (!avatarPeerId) return;
              setViewerRequest({ authorId: avatarPeerId, kind: "spotlight" });
              setAvatarChoice(null);
            }}
          >
            <Play className="text-success" />
            {tx("View Spotlight", "Voir le Spotlight")}
          </Button>
        )}
        <Button
          variant="secondary"
          className="h-14 w-full justify-start gap-4 text-base"
          onClick={() => {
            if (avatarChoice) openPeerProfile(avatarChoice);
            setAvatarChoice(null);
          }}
        >
          <CircleUserRound />
          {tx("View profile", "Voir le profil")}
        </Button>
      </ChatActionDialog>
      {viewerRequest && (
        <StoriesRail
          viewerRequest={viewerRequest}
          onViewerClose={() => setViewerRequest(undefined)}
        />
      )}
    </div>
  );
}
