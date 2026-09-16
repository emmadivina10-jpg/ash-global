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
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMessages } from "@/lib/marketplace.queries";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ReportDialog } from "@/components/refer/ReportDialog";
import { Avatar } from "@/components/refer/AvatarUpload";
import { CHAT_WALLPAPERS, useChatSettings, useSetWallpaper } from "@/lib/social.queries";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { formatXAF } from "@/lib/format";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at?: string | null;
  kind?: string;
  metadata?: Record<string, unknown>;
};

function dayKey(iso: string) {
  return new Date(iso).toDateString();
}

function dayLabel(iso: string, fr: boolean) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86400000);

  if (date.toDateString() === today.toDateString())
    return fr ? "Aujourd'hui" : "Today";

  if (date.toDateString() === yesterday.toDateString())
    return fr ? "Hier" : "Yesterday";

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
}: {
  conversationId: string;
  currentUserId: string | undefined;
  className?: string;
  quickReplies?: string[];
  peerName?: string;
  peerUserId?: string | null;
  /** Stored avatar path of the other person, so their photo shows on each bubble. */
  peerAvatar?: string | null;
}) {
  const { t, lang } = useI18n();
  const fr = lang === "fr";
  const queryClient = useQueryClient();
  const { data, isLoading } = useMessages(conversationId);

  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState<string[]>([]);
  const [failed, setFailed] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const { data: chatSettings } = useChatSettings();
  const setWallpaper = useSetWallpaper();
  const wallpaperRef = useRef<HTMLInputElement>(null);
  const [wallpaperOpen, setWallpaperOpen] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingSentAt = useRef(0);

  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const pressRef = useRef<number | null>(null);

  const messages = (data ?? []) as unknown as ChatMessage[];

  // Facebook-style first contact: you may open a conversation with anyone, but
  // only one message goes through until the other person answers.
  const peerReplied = messages.some(
    (m) => m.sender_id !== currentUserId && (m.kind ?? "TEXT") === "TEXT",
  );
  const mySent = messages.filter(
    (m) => m.sender_id === currentUserId && (m.kind ?? "TEXT") === "TEXT",
  ).length;
  const awaitingReply = !peerReplied && mySent >= 1;

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
      .then(() =>
        queryClient.invalidateQueries({
          queryKey: ["messages", conversationId],
        }),
      );
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
      return { backgroundImage: `url(${chatSettings.wallpaperUrl})`, backgroundSize: "cover", backgroundPosition: "center" };
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

  async function submit(text: string) {
    const value = text.trim();

    if (!value || !currentUserId || sending) return;

    if (awaitingReply) {
      toast.info(
        fr
          ? "Attendez la réponse avant d'envoyer un autre message."
          : "Wait for a reply before sending another message.",
      );
      return;
    }

    setSending(true);
    setFailed(null);
    setPending((p) => [...p, value]);

    const { error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        body: value,
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

    void queryClient.invalidateQueries({
      queryKey: ["messages", conversationId],
    });

    void queryClient.invalidateQueries({
      queryKey: ["conversations"],
    });
  }

  /** Remove one of my own messages for everybody in the thread. */
  async function remove(id: string) {
    setConfirmDelete(null);

    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("chat delete failed", error);
      toast.error(
        error.message ||
          (fr ? "Message non supprimé" : "Message not deleted"),
      );
      return;
    }

    toast.success(fr ? "Message supprimé" : "Message deleted");

    void queryClient.invalidateQueries({
      queryKey: ["messages", conversationId],
    });

    void queryClient.invalidateQueries({
      queryKey: ["conversations"],
    });
  }

  return (
    <div className={cn("flex h-full min-h-0 min-w-0 flex-col overflow-hidden", className)}>
      <div className="flex shrink-0 items-center justify-end gap-1 px-1">
        <Dialog open={wallpaperOpen} onOpenChange={setWallpaperOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={fr ? "Fond d'écran" : "Chat wallpaper"}>
              <ImageIcon className="size-4" aria-hidden />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{fr ? "Fond de discussion" : "Chat wallpaper"}</DialogTitle>
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
              {fr ? "Choisir dans ma galerie" : "Choose from my gallery"}
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
        className="min-h-0 min-w-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto overscroll-contain rounded-2xl px-1 py-2 touch-pan-y [scrollbar-gutter:stable]"
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
            <p className="text-sm font-semibold text-foreground">
              {t("chat.none")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("chat.noneCopy")}
            </p>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.day} className="space-y-1.5">
              <p className="sticky top-0 z-10 mx-auto w-fit rounded-full bg-muted/90 px-3 py-0.5 text-[11px] font-semibold text-muted-foreground backdrop-blur">
                {dayLabel(group.items[0]!.created_at, fr)}
              </p>

              {group.items.map((m, index) => {
                const kind = m.kind ?? "TEXT";

                if (kind === "INVOICE" || kind === "SYSTEM") {
                  return (
                    <InvoiceMessage
                      key={m.id}
                      kind={kind}
                      body={m.body}
                      metadata={m.metadata ?? {}}
                    />
                  );
                }

                const mine = m.sender_id === currentUserId;
                const prev = group.items[index - 1];
                const next = group.items[index + 1];

                const startsRun =
                  !prev ||
                  prev.sender_id !== m.sender_id ||
                  (prev.kind ?? "TEXT") !== "TEXT";

                const endsRun =
                  !next ||
                  next.sender_id !== m.sender_id ||
                  (next.kind ?? "TEXT") !== "TEXT";

                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex items-end gap-2",
                      mine ? "justify-end" : "justify-start",
                      startsRun && "mt-2.5",
                    )}
                  >
                    {!mine ? (
                      <Avatar
                        path={peerAvatar ?? null}
                        name={peerName ?? "ASH"}
                        className={cn("size-7 text-[10px]", !endsRun && "invisible")}
                      />
                    ) : null}

                    <div
                      onContextMenu={(e) => {
                        if (!mine) return;
                        e.preventDefault();
                        setConfirmDelete(m.id);
                      }}
                      onPointerDown={() => {
                        if (!mine) return;

                        pressRef.current = window.setTimeout(
                          () => setConfirmDelete(m.id),
                          500,
                        );
                      }}
                      onPointerUp={() => {
                        if (pressRef.current)
                          window.clearTimeout(pressRef.current);
                      }}
                      onPointerLeave={() => {
                        if (pressRef.current)
                          window.clearTimeout(pressRef.current);
                      }}
                      className={cn(
                        "group relative max-w-[78%] px-3.5 py-2 shadow-sm transition-colors",
                        mine
                          ? "rounded-2xl bg-primary text-primary-foreground"
                          : "rounded-2xl bg-muted text-foreground",
                        mine && !endsRun && "rounded-br-md",
                        mine && endsRun && "rounded-br-sm",
                        !mine && !endsRun && "rounded-bl-md",
                        !mine && endsRun && "rounded-bl-sm",
                      )}
                    >
                      {mine ? (
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(m.id)}
                          aria-label={
                            fr
                              ? "Supprimer le message"
                              : "Delete message"
                          }
                          className="absolute -left-8 top-1/2 hidden size-7 -translate-y-1/2 place-items-center rounded-full bg-card text-muted-foreground shadow-sm group-hover:grid hover:text-destructive"
                        >
                          <Trash2
                            className="size-3.5"
                            aria-hidden
                          />
                        </button>
                      ) : null}

                      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {m.body}
                      </p>

                      {confirmDelete === m.id ? (
                        <span className="mt-2 flex items-center justify-end gap-2 text-[11px] font-semibold">
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(null)}
                            className={cn(
                              "rounded-full px-2 py-0.5",
                              mine
                                ? "bg-primary-foreground/20"
                                : "bg-background",
                            )}
                          >
                            {fr ? "Annuler" : "Cancel"}
                          </button>

                          <button
                            type="button"
                            onClick={() => void remove(m.id)}
                            className="rounded-full bg-destructive px-2 py-0.5 text-destructive-foreground"
                          >
                            {fr ? "Supprimer" : "Delete"}
                          </button>
                        </span>
                      ) : null}

                      {endsRun ? (
                        <span
                          className={cn(
                            "mt-1 flex items-center justify-end gap-1 text-[10px]",
                            mine
                              ? "text-primary-foreground/75"
                              : "text-muted-foreground",
                          )}
                        >
                          {timeLabel(m.created_at, fr)}

                          {mine ? (
                            m.read_at ? (
                              <CheckCheck
                                className="size-3"
                                aria-hidden
                              />
                            ) : (
                              <Check
                                className="size-3"
                                aria-hidden
                              />
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
          <div
            key={`pending-${i}`}
            className="flex justify-end"
          >
            <div className="max-w-[78%] rounded-2xl rounded-br-sm bg-primary/70 px-3.5 py-2 text-primary-foreground">
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                {text}
              </p>

              <span className="mt-1 flex items-center justify-end gap-1 text-[10px] text-primary-foreground/80">
                <Loader2
                  className="size-3 animate-spin"
                  aria-hidden
                />
                {fr ? "Envoi…" : "Sending…"}
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
              <AlertCircle
                className="size-3"
                aria-hidden
              />
              {fr
                ? "Échec — réessayer"
                : "Failed — tap to retry"}
            </button>
          </div>
        ) : null}

        {peerTyping ? (
          <div className="flex items-end gap-2">
            <Avatar path={peerAvatar ?? null} name={peerName ?? "ASH"} className="size-7 text-[10px]" />
            <span className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-3 py-2">
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className="size-1.5 animate-bounce rounded-full bg-muted-foreground"
                  style={{ animationDelay: `${dot * 120}ms` }}
                  aria-hidden
                />
              ))}
              <span className="sr-only">{fr ? "En train d'écrire" : "Typing"}</span>
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

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit(body);
        }}
        className="flex min-w-0 shrink-0 items-end gap-2 border-t border-border bg-background pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:pb-2"
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <Textarea
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
            className="min-h-10 max-h-32 resize-none overflow-y-auto rounded-2xl overscroll-contain"
          />

          <span className="mt-1 px-1 text-[10px] text-muted-foreground">
            {body.length > 800
              ? `${body.length}/1000`
              : fr
                ? "Entrée pour envoyer · Maj+Entrée = nouvelle ligne"
                : "Enter to send · Shift+Enter = new line"}
          </span>
        </div>

        <Button
          type="submit"
          size="icon"
          className="mb-5 size-10 shrink-0 rounded-full"
          disabled={
            sending || awaitingReply || body.trim().length === 0
          }
          aria-label={t("chat.send")}
        >
          {sending ? (
            <Loader2
              className="size-4 animate-spin"
              aria-hidden
            />
          ) : (
            <Send
              className="size-4"
              aria-hidden
            />
          )}
        </Button>
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
  const { lang } = useI18n();
  const fr = lang === "fr";

  if (kind === "SYSTEM") {
    return (
      <p className="mx-auto max-w-[90%] rounded-full bg-muted px-3 py-1 text-center text-[11px] text-muted-foreground">
        {body}
      </p>
    );
  }

  const invoice = String(
    metadata["invoice_number"] ?? "",
  );

  const total = Number(
    metadata["total"] ?? metadata["price"] ?? 0,
  );

  const fee = Number(
    metadata["platform_fee"] ?? 0,
  );

  const net = Number(
    metadata["provider_amount"] ?? 0,
  );

  const service = String(
    metadata["service_title"] ?? "",
  );

  return (
    <article className="mx-auto w-full max-w-[92%] rounded-2xl border border-primary/30 bg-primary/5 p-3">
      <header className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-primary">
          <ReceiptText
            className="size-4"
            aria-hidden
          />
          {fr ? "Facture ASH" : "ASH invoice"}
        </span>

        {invoice ? (
          <span className="tabular text-[11px] font-semibold text-muted-foreground">
            {invoice}
          </span>
        ) : null}
      </header>

      {service ? (
        <p className="mt-1 truncate text-sm font-semibold text-foreground">
          {service}
        </p>
      ) : null}

      <dl className="mt-2 space-y-1 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">
            {fr ? "Total payé" : "Total paid"}
          </dt>
          <dd className="tabular font-bold text-foreground">
            {formatXAF(total)}
          </dd>
        </div>

        {fee > 0 ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">
              {fr ? "Frais ASH" : "ASH fee"}
            </dt>
            <dd className="tabular text-foreground">
              {formatXAF(fee)}
            </dd>
          </div>
        ) : null}

        {net > 0 ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">
              {fr ? "Reçu par le pro" : "Provider receives"}
            </dt>
            <dd className="tabular text-foreground">
              {formatXAF(net)}
            </dd>
          </div>
        ) : null}
      </dl>

      {body ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {body}
        </p>
      ) : null}
    </article>
  );
}
