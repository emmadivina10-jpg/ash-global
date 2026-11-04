import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  CheckCheck,
  Loader2,
  ImageIcon,
  ReceiptText,
  Send,
  Trash2,
  Reply,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { detectOffPlatform, flagOffPlatform } from "@/lib/campus-offplatform";
import { useMessages } from "@/lib/marketplace.queries";
import { useProfile } from "@/lib/queries";
import { isReplySwipe, replyMessageId } from "./chat-reply";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ReportDialog } from "@/components/refer/ReportDialog";
import { Avatar } from "@/components/refer/AvatarUpload";
import { VoiceNotePlayer, VoiceRecorder } from "@/components/refer/VoiceNote";
import { MessageDeleteDialog } from "@/components/refer/MessageDeleteDialog";
import {
  canDeleteForEveryone,
  messageDeletionKey,
  readHiddenMessages,
} from "@/components/refer/message-deletion";
import { groupColorFor } from "@/components/refer/GroupBadge";
import { VerifiedBadge } from "@/components/refer/VerifiedBadge";
import { CHAT_WALLPAPERS, useChatSettings, useSetWallpaper } from "@/lib/social.queries";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { formatXAF } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Json } from "@/integrations/supabase/types";

type ChatMessage = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at?: string | null;
  kind?: string | null;
  metadata?: Json | null;
};

function dayKey(iso: string) {
  return new Date(iso).toDateString();
}

function dayLabel(iso: string, fr: boolean) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);

  if (date.toDateString() === today.toDateString()) return fr ? "Aujourd'hui" : "Today";

  if (date.toDateString() === yesterday.toDateString()) return fr ? "Hier" : "Yesterday";

  return date.toLocaleDateString(fr ? "fr-FR" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function timeLabel(iso: string, fr: boolean) {
  return new Date(iso).toLocaleTimeString(fr ? "fr-FR" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChatThread({
  conversationId,
  currentUserId,
  className,
  quickReplies = [],
  peerName,
  peerUserId,
  peerAvatar,
  isGroup = false,
  enforceFirstContactLimit = false,
  offPlatformGuard = false,
  members = [],
  initialMessages,
  refreshMessages,
}: {
  conversationId: string;
  currentUserId: string | undefined;
  className?: string;
  quickReplies?: string[];
  peerName?: string;
  peerUserId?: string | null;
  /** Stored avatar path of the other person, so their photo shows on each bubble. */
  peerAvatar?: string | null;
  /** Group chats colour every speaker differently and label each bubble. */
  isGroup?: boolean;
  /** Limit only unsolicited person-to-person introductions, never groups or commerce threads. */
  enforceFirstContactLimit?: boolean;
  /** Campus-only: warn about moving lessons off-platform. Never enable for ordinary chats. */
  offPlatformGuard?: boolean;
  members?: {
    id: string;
    name: string;
    avatar_url: string | null;
    online?: boolean | undefined;
    verified_tier?: string | null;
    verified_until?: string | null;
  }[];
  initialMessages?: ChatMessage[] | undefined;
  refreshMessages?: (() => Promise<ChatMessage[]>) | undefined;
}) {
  const { tx, t, lang } = useI18n();
  const fr = lang === "fr";
  const queryClient = useQueryClient();
  const { data, isLoading } = useMessages(conversationId, initialMessages === undefined);
  const [securedMessages, setSecuredMessages] = useState<ChatMessage[] | undefined>(
    initialMessages,
  );

  const [body, setBody] = useState("");
  const { data: ownProfile } = useProfile();
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const swipeRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const [swiping, setSwiping] = useState<string | null>(null);
  useEffect(() => {
    setReplyTo(null);
  }, [conversationId]);
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState<string[]>([]);
  const [failed, setFailed] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [hiddenMessages, setHiddenMessages] = useState<{ key: string; ids: string[] }>({
    key: "",
    ids: [],
  });
  const deletionKey = currentUserId ? messageDeletionKey(currentUserId, conversationId) : "";
  useEffect(() => {
    setConfirmDelete(null);
    try {
      setHiddenMessages({
        key: deletionKey,
        ids: deletionKey ? readHiddenMessages(localStorage.getItem(deletionKey)) : [],
      });
    } catch {
      setHiddenMessages({ key: deletionKey, ids: [] });
    }
  }, [deletionKey]);

  const { data: chatSettings } = useChatSettings();
  const setWallpaper = useSetWallpaper();
  const wallpaperRef = useRef<HTMLInputElement>(null);
  const [wallpaperOpen, setWallpaperOpen] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingSentAt = useRef(0);

  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const pressRef = useRef<number | null>(null);

  const allMessages = (securedMessages ?? data ?? []) as unknown as ChatMessage[];
  const messages = allMessages.filter(
    (message) => hiddenMessages.key !== deletionKey || !hiddenMessages.ids.includes(message.id),
  );
  const selectedMessage = allMessages.find((message) => message.id === confirmDelete);
  const replyTarget = messages.find((message) => message.id === replyTo);
  const voiceMessages = messages.filter((message) => message.kind === "VOICE");
  function senderName(message: ChatMessage) {
    return message.sender_id === currentUserId
      ? tx("You", "Vous")
      : ((isGroup ? memberById.get(message.sender_id)?.name : peerName) ?? tx("Member", "Membre"));
  }
  function startReply(id: string) {
    setReplyTo(id);
    requestAnimationFrame(() => composerRef.current?.focus());
  }
  function jumpToMessage(id: string) {
    const scroller = messagesScrollRef.current;
    const target = scroller?.querySelector<HTMLElement>(`[data-message-id="${CSS.escape(id)}"]`);
    if (scroller && target)
      scroller.scrollTop +=
        target.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 12;
  }

  useEffect(() => {
    setSecuredMessages(initialMessages);
  }, [conversationId, initialMessages]);

  useEffect(() => {
    if (!refreshMessages) return;
    let active = true;
    let refreshing = false;
    const refresh = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        const next = await refreshMessages();
        if (active) setSecuredMessages(next);
      } catch {
        // Keep the last authorized snapshot if a background refresh fails.
      } finally {
        refreshing = false;
      }
    };
    const timer = window.setInterval(() => void refresh(), 5_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [refreshMessages]);

  const memberById = new Map(members.map((m) => [m.id, m]));

  // Facebook-style first contact: you may open a conversation with anyone, but
  // only one message goes through until the other person answers.
  const peerReplied = allMessages.some(
    (m) => m.sender_id !== currentUserId && (m.kind ?? "TEXT") === "TEXT",
  );
  const mySent = allMessages.filter(
    (m) => m.sender_id === currentUserId && (m.kind ?? "TEXT") === "TEXT",
  ).length;
  const awaitingReply = enforceFirstContactLimit && !isGroup && !peerReplied && mySent >= 1;

  // Scroll only the message list itself. Using scrollIntoView() here can
  // scroll the authenticated app-shell on iOS/web, which makes the entire
  // chat page jump away from its header when the keyboard opens.
  useEffect(() => {
    const node = messagesScrollRef.current;
    if (!node) return;

    node.scrollTop = node.scrollHeight;
  }, [messages.length, pending.length]);

  // Mark the other side's messages as read once the thread is open.
  useEffect(() => {
    if (!currentUserId || messages.length === 0) return;

    const unread = messages
      .filter((m) => m.sender_id !== currentUserId && !m.read_at)
      .map((m) => m.id);

    if (unread.length === 0) return;

    void supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unread)
      .then(({ error }) => {
        if (error) return;
        void queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
        void queryClient.invalidateQueries({ queryKey: ["conversations"] });
        void queryClient.invalidateQueries({ queryKey: ["unread-messages"] });
      });
  }, [messages, currentUserId, conversationId, queryClient]);

  // Live "typing…" signal between the people in this thread.
  useEffect(() => {
    if (!currentUserId) return;
    let clear: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel(`typing-${conversationId}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "typing" }, (payload) => {
        const from = (payload["payload"] as { userId?: string } | undefined)?.userId;
        if (!from || from === currentUserId) return;
        setPeerTyping(true);
        if (clear) clearTimeout(clear);
        clear = setTimeout(() => setPeerTyping(false), 3000);
      })
      .subscribe();
    typingChannelRef.current = channel;
    return () => {
      if (clear) clearTimeout(clear);
      typingChannelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);

  function signalTyping() {
    const now = Date.now();
    if (!currentUserId || now - typingSentAt.current < 1500) return;
    typingSentAt.current = now;
    void typingChannelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: currentUserId },
    });
  }

  const wallpaperStyle = (() => {
    if (chatSettings?.wallpaperUrl) {
      return {
        backgroundImage: `url(${chatSettings.wallpaperUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }
    const preset = CHAT_WALLPAPERS.find((w) => w.id === chatSettings?.wallpaper);
    return preset?.css ? { backgroundImage: preset.css } : undefined;
  })();

  const grouped = useMemo(() => {
    const out: { day: string; items: ChatMessage[] }[] = [];

    for (const m of messages) {
      const key = dayKey(m.created_at);
      const last = out[out.length - 1];

      if (last && last.day === key) last.items.push(m);
      else out.push({ day: key, items: [m] });
    }

    return out;
  }, [messages]);

  async function sendVoice(meta: { path: string; duration: number; waveform: number[] }) {
    if (!currentUserId || awaitingReply) return false;
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      body: tx("🎤 Voice message", "🎤 Message vocal"),
      kind: "VOICE",
      metadata: { ...meta, ...(replyTarget ? { reply_to: replyTarget.id } : {}) },
    });
    if (error) {
      toast.error(error.message || tx("Voice note not sent.", "Note vocale non envoyée."));
      return false;
    }
    setReplyTo(null);
    if (refreshMessages) {
      try {
        setSecuredMessages(await refreshMessages());
      } catch {
        /* Keep the periodic authorized refresh. */
      }
    }
    void queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    return true;
  }

  async function submit(text: string) {
    const value = text.trim();

    if (!value || !currentUserId || sending) return;

    if (awaitingReply) {
      toast.info(
        tx(
          "Wait for a reply before sending another message.",
          "Attendez la réponse avant d'envoyer un autre message.",
        ),
      );
      return;
    }

    setSending(true);
    setFailed(null);
    setPending((p) => [...p, value]);

    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      body: value,
      metadata: replyTarget ? { reply_to: replyTarget.id } : {},
    });

    setSending(false);
    setPending((p) => p.filter((v) => v !== value));

    if (error) {
      console.error("chat send failed", error);
      toast.error(error.message || "Message not sent — tap to retry");
      setFailed(value);
      return;
    }

    setBody("");
    setReplyTo(null);

    if (refreshMessages) {
      try {
        setSecuredMessages(await refreshMessages());
      } catch {
        // The periodic secured refresh will retry without exposing the thread.
      }
    }

    // Off-platform protection (Campus lessons only): warn once, record repeats for the review team.
    const offPlatform = offPlatformGuard ? detectOffPlatform(value) : null;
    if (offPlatform) {
      const count = await flagOffPlatform(conversationId, offPlatform.rule, value);
      const warning = fr ? offPlatform.fr : offPlatform.en;
      if (count > 2) {
        toast.warning(
          warning +
            tx(
              " Repeated messages like this are sent to the ASH review team.",
              " Ces messages répétés sont transmis à l'équipe ASH.",
            ),
        );
      } else {
        toast.info(warning);
      }
    }

    void queryClient.invalidateQueries({
      queryKey: ["messages", conversationId],
    });

    void queryClient.invalidateQueries({
      queryKey: ["conversations"],
    });
  }

  /** Remove one of my own messages for everybody in the thread. */
  async function remove(id: string) {
    const selected = allMessages.find((message) => message.id === id);
    if (deleting || !selected || !canDeleteForEveryone(selected.sender_id, currentUserId)) return;
    setDeleting(true);
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", id)
      .eq("sender_id", selected.sender_id)
      .eq("conversation_id", conversationId);
    setDeleting(false);

    if (error) {
      console.error("chat delete failed", error);
      toast.error(error.message || tx("Message not deleted", "Message non supprimé"));
      return;
    }

    toast.success(tx("Message deleted", "Message supprimé"));
    setConfirmDelete(null);

    if (refreshMessages) {
      try {
        setSecuredMessages(await refreshMessages());
      } catch {
        // The periodic secured refresh will retry without exposing the thread.
      }
    }

    void queryClient.invalidateQueries({
      queryKey: ["messages", conversationId],
    });

    void queryClient.invalidateQueries({
      queryKey: ["conversations"],
    });
  }

  function deleteForMe() {
    if (!confirmDelete || !deletionKey || deleting) return;
    try {
      const ids = [
        ...new Set([...readHiddenMessages(localStorage.getItem(deletionKey)), confirmDelete]),
      ];
      localStorage.setItem(deletionKey, JSON.stringify(ids));
      setHiddenMessages({ key: deletionKey, ids });
      setConfirmDelete(null);
    } catch {
      toast.error(
        tx(
          "Message could not be removed on this device.",
          "Le message n’a pas pu être retiré sur cet appareil.",
        ),
      );
    }
  }

  return (
    <div className={cn("flex h-full min-h-0 min-w-0 flex-col overflow-hidden", className)}>
      <MessageDeleteDialog
        open={Boolean(selectedMessage)}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null);
        }}
        canDeleteEveryone={Boolean(
          selectedMessage && canDeleteForEveryone(selectedMessage.sender_id, currentUserId),
        )}
        busy={deleting}
        onDeleteForMe={deleteForMe}
        onDeleteForEveryone={() => {
          if (selectedMessage) void remove(selectedMessage.id);
        }}
        tx={tx}
      />
      <div className="flex shrink-0 items-center justify-end gap-1 px-1">
        <Dialog open={wallpaperOpen} onOpenChange={setWallpaperOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={tx("Chat wallpaper", "Fond d'écran")}>
              <ImageIcon className="size-4" aria-hidden />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{tx("Chat wallpaper", "Fond de discussion")}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-3">
              {CHAT_WALLPAPERS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setWallpaper.mutate({ wallpaper: option.id, file: null });
                    setWallpaperOpen(false);
                  }}
                  className={cn(
                    "rounded-2xl border border-border p-1 text-[11px] font-semibold text-foreground",
                    chatSettings?.wallpaper === option.id && "border-primary",
                  )}
                >
                  <span
                    className="mb-1 block h-14 w-full rounded-xl bg-muted"
                    style={option.css ? { backgroundImage: option.css } : undefined}
                    aria-hidden
                  />
                  {fr ? option.fr : option.en}
                </button>
              ))}
            </div>
            <input
              ref={wallpaperRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                setWallpaper.mutate({ wallpaper: "custom", file });
                setWallpaperOpen(false);
              }}
            />
            <Button variant="outline" onClick={() => wallpaperRef.current?.click()}>
              {tx("Choose from my gallery", "Choisir dans ma galerie")}
            </Button>
          </DialogContent>
        </Dialog>
        <ReportDialog
          targetType="MESSAGE"
          targetId={conversationId}
          targetUserId={peerUserId ?? null}
          targetLabel={peerName}
          compact
        />
      </div>

      <div
        ref={messagesScrollRef}
        className="messages-scroll min-h-0 min-w-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto overscroll-contain rounded-lg px-3 py-4 touch-pan-y"
        style={wallpaperStyle}
      >
        {isLoading ? (
          <div className="space-y-3 py-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  "h-9 max-w-[60%] animate-pulse rounded-2xl bg-muted",
                  i % 2 === 1 ? "ml-auto" : "",
                )}
              />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm font-semibold text-foreground">{t("chat.none")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("chat.noneCopy")}</p>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.day} className="space-y-1.5">
              <p className="sticky top-0 z-10 mx-auto w-fit rounded-full bg-muted/90 px-3 py-0.5 text-[11px] font-semibold text-muted-foreground backdrop-blur">
                {dayLabel(group.items[0]?.created_at ?? "", fr)}
              </p>

              {group.items.map((m, index) => {
                const kind = m.kind ?? "TEXT";

                if (kind === "INVOICE" || kind === "SYSTEM") {
                  return (
                    <InvoiceMessage
                      key={m.id}
                      kind={kind}
                      body={m.body}
                      metadata={
                        m.metadata && typeof m.metadata === "object" && !Array.isArray(m.metadata)
                          ? m.metadata
                          : {}
                      }
                    />
                  );
                }

                const mine = m.sender_id === currentUserId;
                const prev = group.items[index - 1];
                const next = group.items[index + 1];

                const startsRun =
                  !prev || prev.sender_id !== m.sender_id || (prev.kind ?? "TEXT") !== "TEXT";

                const endsRun =
                  !next || next.sender_id !== m.sender_id || (next.kind ?? "TEXT") !== "TEXT";

                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex items-end gap-2",
                      mine ? "justify-end" : "justify-start",
                      startsRun && "mt-2.5",
                    )}
                  >
                    <div
                      data-message-id={m.id}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setConfirmDelete(m.id);
                      }}
                      onPointerDown={(e) => {
                        if (e.button !== 0) return;
                        swipeRef.current = { id: m.id, x: e.clientX, y: e.clientY };
                        if (pressRef.current) window.clearTimeout(pressRef.current);
                        pressRef.current = window.setTimeout(() => {
                          swipeRef.current = null;
                          setConfirmDelete(m.id);
                        }, 500);
                      }}
                      onPointerMove={(e) => {
                        const start = swipeRef.current;
                        if (!start || start.id !== m.id) return;
                        const dx = e.clientX - start.x,
                          dy = e.clientY - start.y;
                        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
                          if (pressRef.current) window.clearTimeout(pressRef.current);
                        }
                        if (Math.abs(dy) > 30) {
                          swipeRef.current = null;
                          setSwiping(null);
                          return;
                        }
                        if (dx > 15 && dx > Math.abs(dy) * 2) {
                          e.currentTarget.setPointerCapture(e.pointerId);
                          setSwiping(m.id);
                        }
                      }}
                      onPointerUp={(e) => {
                        if (pressRef.current) window.clearTimeout(pressRef.current);
                        const start = swipeRef.current;
                        if (
                          start?.id === m.id &&
                          isReplySwipe(e.clientX - start.x, e.clientY - start.y)
                        )
                          startReply(m.id);
                        swipeRef.current = null;
                        setSwiping(null);
                      }}
                      onPointerLeave={() => {
                        if (pressRef.current) window.clearTimeout(pressRef.current);
                      }}
                      onPointerCancel={() => {
                        if (pressRef.current) window.clearTimeout(pressRef.current);
                        swipeRef.current = null;
                        setSwiping(null);
                      }}
                      className={cn(
                        "group relative max-w-[90%] touch-pan-y px-3 py-2 shadow-sm transition-transform motion-reduce:transition-none",
                        swiping === m.id && "translate-x-5",
                        mine
                          ? "rounded-lg bg-chat-outgoing text-foreground shadow-sm"
                          : "rounded-lg bg-card text-foreground",
                        mine && !endsRun && "rounded-br-md",
                        mine && endsRun && "rounded-br-sm",
                        !mine && !endsRun && "rounded-bl-md",
                        !mine && endsRun && "rounded-bl-sm",
                      )}
                    >
                      {swiping === m.id ? (
                        <Reply
                          className="absolute -left-7 top-1/2 size-5 -translate-y-1/2 text-primary"
                          aria-hidden
                        />
                      ) : null}
                      {(() => {
                        const id = replyMessageId(m.metadata);
                        if (!id) return null;
                        const original = messages.find((message) => message.id === id);
                        return (
                          <Button
                            variant="ghost"
                            onClick={() => {
                              if (original) jumpToMessage(original.id);
                            }}
                            disabled={!original}
                            className="mb-2 flex h-auto w-full flex-col items-start gap-0.5 whitespace-normal rounded-md border-l-2 border-primary bg-primary/10 px-2 py-1.5 text-left"
                          >
                            <span className="text-xs font-semibold text-primary">
                              {original
                                ? senderName(original)
                                : tx("Message unavailable", "Message indisponible")}
                            </span>
                            <span className="line-clamp-2 text-xs text-muted-foreground">
                              {original
                                ? original.kind === "VOICE"
                                  ? tx("Voice message", "Message vocal")
                                  : original.body
                                : tx("Message unavailable", "Message indisponible")}
                            </span>
                          </Button>
                        );
                      })()}
                      {isGroup && !mine && startsRun ? (
                        <span
                          className="mb-0.5 flex items-center gap-1 text-[11px] font-bold"
                          style={{ color: groupColorFor(m.sender_id) }}
                        >
                          <span className="truncate">
                            {memberById.get(m.sender_id)?.name ?? tx("Member", "Membre")}
                          </span>
                          <VerifiedBadge
                            tier={memberById.get(m.sender_id)?.verified_tier}
                            until={memberById.get(m.sender_id)?.verified_until}
                            size={12}
                          />
                        </span>
                      ) : null}
                      {currentUserId ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => startReply(m.id)}
                          aria-label={tx("Reply", "Répondre")}
                          className="absolute -left-8 top-0 hidden size-7 rounded-full bg-card text-muted-foreground group-hover:flex group-focus-within:flex"
                        >
                          <Reply className="size-3.5" aria-hidden />
                        </Button>
                      ) : null}
                      {currentUserId ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => setConfirmDelete(m.id)}
                          aria-label={tx("Delete message", "Supprimer le message")}
                          className="absolute -left-8 top-1/2 hidden size-7 -translate-y-1/2 place-items-center rounded-full bg-card text-muted-foreground shadow-sm group-hover:grid hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </Button>
                      ) : null}

                      {(() => {
                        const meta = (m.metadata ?? {}) as {
                          path?: string;
                          duration?: number;
                          waveform?: number[];
                        };
                        if (m.kind === "VOICE" && typeof meta.path === "string") {
                          return (
                            <VoiceNotePlayer
                              path={meta.path}
                              duration={Number(meta.duration) || 0}
                              waveform={Array.isArray(meta.waveform) ? meta.waveform : undefined}
                              mine={mine}
                              playerId={`${conversationId}:${m.id}`}
                              nextPlayerId={
                                voiceMessages[
                                  voiceMessages.findIndex((message) => message.id === m.id) + 1
                                ]
                                  ? `${conversationId}:${voiceMessages[voiceMessages.findIndex((message) => message.id === m.id) + 1]?.id}`
                                  : undefined
                              }
                              avatarPath={
                                mine
                                  ? ownProfile?.avatar_url
                                  : isGroup
                                    ? memberById.get(m.sender_id)?.avatar_url
                                    : peerAvatar
                              }
                              avatarName={
                                mine ? (ownProfile?.full_name ?? tx("You", "Vous")) : senderName(m)
                              }
                            />
                          );
                        }
                        return (
                          <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                            {m.body}
                          </p>
                        );
                      })()}

                      {endsRun ? (
                        <span
                          className={cn(
                            "mt-1 flex items-center justify-end gap-1 text-[10px]",
                            mine ? "text-foreground/70" : "text-muted-foreground",
                          )}
                        >
                          {timeLabel(m.created_at, fr)}

                          {mine ? (
                            m.read_at ? (
                              <CheckCheck className="size-3" aria-hidden />
                            ) : (
                              <Check className="size-3" aria-hidden />
                            )
                          ) : null}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}

        {pending.map((text, i) => (
          <div key={`pending-${i}`} className="flex justify-end">
            <div className="max-w-[78%] rounded-2xl rounded-br-sm bg-primary/70 px-3.5 py-2 text-primary-foreground">
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{text}</p>

              <span className="mt-1 flex items-center justify-end gap-1 text-[10px] text-primary-foreground/80">
                <Loader2 className="size-3 animate-spin" aria-hidden />
                {tx("Sending…", "Envoi…")}
              </span>
            </div>
          </div>
        ))}

        {failed ? (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void submit(failed)}
              className="flex items-center gap-1.5 rounded-full border border-destructive/40 px-3 py-1 text-[11px] font-semibold text-destructive"
            >
              <AlertCircle className="size-3" aria-hidden />
              {tx("Failed — tap to retry", "Échec — réessayer")}
            </button>
          </div>
        ) : null}

        {peerTyping ? (
          <div className="flex items-end gap-2">
            <Avatar
              path={peerAvatar ?? null}
              name={peerName ?? "Profile"}
              className="size-7 text-[10px]"
            />
            <span className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-3 py-2">
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className="size-1.5 animate-bounce rounded-full bg-muted-foreground"
                  style={{ animationDelay: `${dot * 120}ms` }}
                  aria-hidden
                />
              ))}
              <span className="sr-only">{tx("Typing", "En train d'écrire")}</span>
            </span>
          </div>
        ) : null}
      </div>

      {quickReplies.length > 0 ? (
        <div className="flex min-w-0 shrink-0 gap-2 overflow-x-auto overscroll-x-contain px-1 pb-2 touch-pan-x">
          {quickReplies.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => void submit(q)}
              className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted hover:text-foreground"
            >
              {q}
            </button>
          ))}
        </div>
      ) : null}

      {awaitingReply ? (
        <p className="shrink-0 rounded-2xl bg-muted px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground">
          {fr
            ? `Votre message a été envoyé. Vous pourrez écrire à nouveau dès que ${peerName ?? "cette personne"} répond.`
            : `Your message was sent. You can write again once ${peerName ?? "they"} reply.`}
        </p>
      ) : null}

      {replyTarget ? (
        <div className="flex shrink-0 items-center gap-2 border-t border-border bg-card px-3 py-2">
          <div className="min-w-0 flex-1 border-l-2 border-primary pl-3">
            <p className="text-xs font-semibold text-primary">
              {tx("Replying to", "Réponse à")} {senderName(replyTarget)}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {replyTarget.kind === "VOICE"
                ? tx("Voice message", "Message vocal")
                : replyTarget.body}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={tx("Cancel reply", "Annuler la réponse")}
            onClick={() => setReplyTo(null)}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>
      ) : null}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(body);
        }}
        className="member-chat-composer relative flex w-full min-w-0 shrink-0 items-end gap-2 px-3 py-2 backdrop-blur"
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <Textarea
            ref={composerRef}
            rows={1}
            value={body}
            onChange={(e) => {
              setBody(e.target.value.slice(0, 1000));
              signalTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit(body);
              }
            }}
            placeholder={t("chat.placeholder")}
            aria-label={t("chat.placeholder")}
            className="min-h-10 max-h-32 resize-none overflow-y-auto rounded-2xl border-primary/25 bg-background/90 shadow-inner overscroll-contain focus-visible:ring-primary/40"
          />

          <span className="mt-1 px-1 text-[10px] text-muted-foreground">
            {body.length > 800
              ? `${body.length}/1000`
              : tx(
                  "Enter to send · Shift+Enter = new line",
                  "Entrée pour envoyer · Maj+Entrée = nouvelle ligne",
                )}
          </span>
        </div>

        {body.trim().length === 0 && !sending ? (
          <VoiceRecorder
            conversationId={conversationId}
            userId={currentUserId}
            disabled={awaitingReply}
            onSent={sendVoice}
          />
        ) : (
          <Button
            type="submit"
            size="icon"
            className="mb-5 size-10 shrink-0 rounded-full"
            disabled={sending || awaitingReply || body.trim().length === 0}
            aria-label={t("chat.send")}
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Send className="size-4" aria-hidden />
            )}
          </Button>
        )}
      </form>
    </div>
  );
}

/** ASH invoice / system event rendered inline in the booking thread. */
function InvoiceMessage({
  kind,
  body,
  metadata,
}: {
  kind: string;
  body: string;
  metadata: Record<string, unknown>;
}) {
  const { tx, lang } = useI18n();
  const fr = lang === "fr";

  if (kind === "SYSTEM") {
    const jobTitle = String(metadata["job_title"] ?? "");
    const company = String(metadata["company"] ?? "");
    if (metadata["source"] === "job_contact" && jobTitle) {
      return (
        <article className="mx-auto w-full max-w-[92%] rounded-lg border border-primary/30 bg-primary/5 p-3">
          <span className="text-xs font-bold text-primary">
            {tx("Job reference", "Référence de l'offre")}
          </span>
          <p className="mt-1 text-sm font-semibold text-foreground">{jobTitle}</p>
          {company ? <p className="text-xs text-muted-foreground">{company}</p> : null}
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{body}</p>
        </article>
      );
    }
    return (
      <p className="mx-auto max-w-[90%] rounded-full bg-muted px-3 py-1 text-center text-[11px] text-muted-foreground">
        {body}
      </p>
    );
  }

  const invoice = String(metadata["invoice_number"] ?? "");

  const total = Number(metadata["total"] ?? metadata["price"] ?? 0);

  const fee = Number(metadata["platform_fee"] ?? 0);

  const net = Number(metadata["provider_amount"] ?? 0);

  const service = String(metadata["service_title"] ?? "");

  return (
    <article className="mx-auto w-full max-w-[92%] rounded-2xl border border-primary/30 bg-primary/5 p-3">
      <header className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-primary">
          <ReceiptText className="size-4" aria-hidden />
          {tx("ASH invoice", "Facture ASH")}
        </span>

        {invoice ? (
          <span className="tabular text-[11px] font-semibold text-muted-foreground">{invoice}</span>
        ) : null}
      </header>

      {service ? (
        <p className="mt-1 truncate text-sm font-semibold text-foreground">{service}</p>
      ) : null}

      <dl className="mt-2 space-y-1 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">{tx("Total paid", "Total payé")}</dt>
          <dd className="tabular font-bold text-foreground">{formatXAF(total)}</dd>
        </div>

        {fee > 0 ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{tx("ASH fee", "Frais ASH")}</dt>
            <dd className="tabular text-foreground">{formatXAF(fee)}</dd>
          </div>
        ) : null}

        {net > 0 ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{tx("Provider receives", "Reçu par le pro")}</dt>
            <dd className="tabular text-foreground">{formatXAF(net)}</dd>
          </div>
        ) : null}
      </dl>

      {body ? <p className="mt-2 text-[11px] text-muted-foreground">{body}</p> : null}
    </article>
  );
}
