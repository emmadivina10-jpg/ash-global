import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useQueryClient } from "@tanstack/react-query";

import {
  AlertCircle,
  Check,
  CheckCheck,
  Loader2,
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

function dayLabel(
  iso: string,
  fr: boolean,
) {
  const date = new Date(iso);

  const today = new Date();

  const yesterday = new Date(
    today.getTime() - 86400000,
  );

  if (
    date.toDateString() ===
    today.toDateString()
  ) {
    return fr
      ? "Aujourd'hui"
      : "Today";
  }

  if (
    date.toDateString() ===
    yesterday.toDateString()
  ) {
    return fr
      ? "Hier"
      : "Yesterday";
  }

  return date.toLocaleDateString(
    fr ? "fr-FR" : "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );
}

function timeLabel(
  iso: string,
  fr: boolean,
) {
  return new Date(
    iso,
  ).toLocaleTimeString(
    fr ? "fr-FR" : "en-GB",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

export function ChatThread({
  conversationId,
  currentUserId,
  className,
  quickReplies = [],
  peerName,
  peerUserId,
}: {
  conversationId: string;
  currentUserId:
    | string
    | undefined;
  className?: string;
  quickReplies?: string[];
  peerName?: string;
  peerUserId?: string | null;
}) {
  const { t, lang } = useI18n();

  const fr = lang === "fr";

  const queryClient =
    useQueryClient();

  const {
    data,
    isLoading,
  } =
    useMessages(
      conversationId,
    );

  const [body, setBody] =
    useState("");

  const [sending, setSending] =
    useState(false);

  const [pending, setPending] =
    useState<string[]>([]);

  const [failed, setFailed] =
    useState<string | null>(
      null,
    );

  const [
    confirmDelete,
    setConfirmDelete,
  ] = useState<string | null>(
    null,
  );

  const messagesScrollRef =
    useRef<HTMLDivElement>(
      null,
    );

  const pressRef =
    useRef<number | null>(
      null,
    );

  const messages =
    (data ?? []) as unknown as ChatMessage[];

  const peerInitials = (
    peerName ?? "ASH"
  )
    .trim()
    .slice(0, 2)
    .toUpperCase();

  /* ------------------------------------------------------------------------
     Keep scrolling inside the message list only.

     IMPORTANT:
     Never use scrollIntoView() here.

     scrollIntoView() can cause iOS Safari/WKWebView to scroll the
     authenticated shell instead of just the conversation.
  ------------------------------------------------------------------------ */

  useEffect(() => {
    const node =
      messagesScrollRef.current;

    if (!node) return;

    /*
     * Do not animate the initial load.
     * It feels much more like WhatsApp if the conversation opens
     * already positioned at the latest message.
     */
    node.scrollTo({
      top: node.scrollHeight,
      behavior:
        messages.length > 1
          ? "smooth"
          : "auto",
    });
  }, [
    messages.length,
    pending.length,
  ]);

  /* ------------------------------------------------------------------------
     Mark incoming messages as read
  ------------------------------------------------------------------------ */

  useEffect(() => {
    if (
      !currentUserId ||
      messages.length === 0
    ) {
      return;
    }

    const unread =
      messages
        .filter(
          (message) =>
            message.sender_id !==
              currentUserId &&
            !message.read_at,
        )
        .map(
          (message) =>
            message.id,
        );

    if (unread.length === 0) {
      return;
    }

    void supabase
      .from("messages")
      .update({
        read_at:
          new Date().toISOString(),
      })
      .in("id", unread)
      .then(() =>
        queryClient.invalidateQueries(
          {
            queryKey: [
              "messages",
              conversationId,
            ],
          },
        ),
      );
  }, [
    messages,
    currentUserId,
    conversationId,
    queryClient,
  ]);

  /* ------------------------------------------------------------------------
     Group messages by day
  ------------------------------------------------------------------------ */

  const grouped = useMemo(() => {
    const out: {
      day: string;
      items: ChatMessage[];
    }[] = [];

    for (const message of messages) {
      const key =
        dayKey(
          message.created_at,
        );

      const last =
        out[out.length - 1];

      if (
        last &&
        last.day === key
      ) {
        last.items.push(
          message,
        );
      } else {
        out.push({
          day: key,
          items: [message],
        });
      }
    }

    return out;
  }, [messages]);

  /* ------------------------------------------------------------------------
     Send message
  ------------------------------------------------------------------------ */

  async function submit(
    text: string,
  ) {
    const value =
      text.trim();

    if (
      !value ||
      !currentUserId ||
      sending
    ) {
      return;
    }

    setSending(true);

    setFailed(null);

    setPending((previous) => [
      ...previous,
      value,
    ]);

    const { error } =
      await supabase
        .from("messages")
        .insert({
          conversation_id:
            conversationId,
          sender_id:
            currentUserId,
          body: value,
        });

    setSending(false);

    setPending((previous) =>
      previous.filter(
        (item) =>
          item !== value,
      ),
    );

    if (error) {
      console.error(
        "chat send failed",
        error,
      );

      toast.error(
        error.message ||
          "Message not sent — tap to retry",
      );

      setFailed(value);

      return;
    }

    setBody("");

    void queryClient.invalidateQueries(
      {
        queryKey: [
          "messages",
          conversationId,
        ],
      },
    );

    void queryClient.invalidateQueries(
      {
        queryKey: [
          "conversations",
        ],
      },
    );
  }

  /* ------------------------------------------------------------------------
     Delete own message
  ------------------------------------------------------------------------ */

  async function remove(
    id: string,
  ) {
    setConfirmDelete(null);

    const { error } =
      await supabase
        .from("messages")
        .delete()
        .eq("id", id);

    if (error) {
      console.error(
        "chat delete failed",
        error,
      );

      toast.error(
        error.message ||
          (fr
            ? "Message non supprimé"
            : "Message not deleted"),
      );

      return;
    }

    toast.success(
      fr
        ? "Message supprimé"
        : "Message deleted",
    );

    void queryClient.invalidateQueries(
      {
        queryKey: [
          "messages",
          conversationId,
        ],
      },
    );

    void queryClient.invalidateQueries(
      {
        queryKey: [
          "conversations",
        ],
      },
    );
  }

  /* ------------------------------------------------------------------------
     Render
  ------------------------------------------------------------------------ */

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col",
        className,
      )}
    >
      {/* ---------------------------------------------------------------
          REPORT
      --------------------------------------------------------------- */}

      <div className="flex shrink-0 items-center justify-end px-1">
        <ReportDialog
          targetType="MESSAGE"
          targetId={
            conversationId
          }
          targetUserId={
            peerUserId ?? null
          }
          targetLabel={peerName}
          compact
        />
      </div>

      {/* ---------------------------------------------------------------
          MESSAGE SCROLLER

          This is the ONLY scrolling area in the conversation.
      --------------------------------------------------------------- */}

      <div
        ref={messagesScrollRef}
        className={cn(
          "min-h-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto overscroll-contain px-1 py-2",

          /*
           * Helps iOS maintain momentum scrolling inside the actual
           * conversation instead of pushing the shell.
           */
          "[-webkit-overflow-scrolling:touch]",
        )}
      >
        {/* Loading */}

        {isLoading ? (
          <div className="space-y-3 py-4">
            {[0, 1, 2].map(
              (index) => (
                <div
                  key={index}
                  className={cn(
                    "h-9 max-w-[60%] animate-pulse rounded-2xl bg-muted",

                    index % 2 === 1
                      ? "ml-auto"
                      : "",
                  )}
                />
              ),
            )}
          </div>
        ) : messages.length ===
          0 ? (
          /* Empty */

          <div className="py-8 text-center">
            <p className="text-sm font-semibold text-foreground">
              {t("chat.none")}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              {t(
                "chat.noneCopy",
              )}
            </p>
          </div>
        ) : (
          /* Messages */

          grouped.map(
            (group) => (
              <div
                key={group.day}
                className="space-y-1.5"
              >
                {/* Date */}

                <p className="sticky top-0 z-10 mx-auto w-fit rounded-full bg-muted/90 px-3 py-0.5 text-[11px] font-semibold text-muted-foreground backdrop-blur">
                  {dayLabel(
                    group.items[0]!
                      .created_at,
                    fr,
                  )}
                </p>

                {group.items.map(
                  (
                    message,
                    index,
                  ) => {
                    const kind =
                      message.kind ??
                      "TEXT";

                    /* ---------------------------------------------------
                       Invoice/system messages
                    --------------------------------------------------- */

                    if (
                      kind ===
                        "INVOICE" ||
                      kind ===
                        "SYSTEM"
                    ) {
                      return (
                        <InvoiceMessage
                          key={
                            message.id
                          }
                          kind={kind}
                          body={
                            message.body
                          }
                          metadata={
                            message.metadata ??
                            {}
                          }
                        />
                      );
                    }

                    const mine =
                      message.sender_id ===
                      currentUserId;

                    const previous =
                      group.items[
                        index - 1
                      ];

                    const next =
                      group.items[
                        index + 1
                      ];

                    const startsRun =
                      !previous ||
                      previous.sender_id !==
                        message.sender_id ||
                      (previous.kind ??
                        "TEXT") !==
                        "TEXT";

                    const endsRun =
                      !next ||
                      next.sender_id !==
                        message.sender_id ||
                      (next.kind ??
                        "TEXT") !==
                        "TEXT";

                    return (
                      <div
                        key={
                          message.id
                        }
                        className={cn(
                          "flex items-end gap-2",
                          mine
                            ? "justify-end"
                            : "justify-start",
                          startsRun &&
                            "mt-2.5",
                        )}
                      >
                        {/* ------------------------------------------------
                            Other person's avatar
                        ------------------------------------------------ */}

                        {!mine ? (
                          <span
                            className={cn(
                              "grid size-7 shrink-0 place-items-center rounded-full bg-primary/15 text-[10px] font-bold text-primary",
                              !endsRun &&
                                "invisible",
                            )}
                            aria-hidden
                          >
                            {
                              peerInitials
                            }
                          </span>
                        ) : null}

                        {/* ------------------------------------------------
                            Message bubble
                        ------------------------------------------------ */}

                        <div
                          onContextMenu={(
                            event,
                          ) => {
                            if (!mine)
                              return;

                            event.preventDefault();

                            setConfirmDelete(
                              message.id,
                            );
                          }}
                          onPointerDown={() => {
                            if (!mine)
                              return;

                            pressRef.current =
                              window.setTimeout(
                                () =>
                                  setConfirmDelete(
                                    message.id,
                                  ),
                                500,
                              );
                          }}
                          onPointerUp={() => {
                            if (
                              pressRef.current
                            ) {
                              window.clearTimeout(
                                pressRef.current,
                              );
                            }
                          }}
                          onPointerLeave={() => {
                            if (
                              pressRef.current
                            ) {
                              window.clearTimeout(
                                pressRef.current,
                              );
                            }
                          }}
                          className={cn(
                            "group relative max-w-[78%] px-3.5 py-2 shadow-sm transition-colors",

                            mine
                              ? "rounded-2xl bg-primary text-primary-foreground"
                              : "rounded-2xl bg-muted text-foreground",

                            mine &&
                              !endsRun &&
                              "rounded-br-md",

                            mine &&
                              endsRun &&
                              "rounded-br-sm",

                            !mine &&
                              !endsRun &&
                              "rounded-bl-md",

                            !mine &&
                              endsRun &&
                              "rounded-bl-sm",
                          )}
                        >
                          {/* Desktop delete shortcut */}

                          {mine ? (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmDelete(
                                  message.id,
                                )
                              }
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

                          {/* Message text */}

                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                            {
                              message.body
                            }
                          </p>

                          {/* Delete confirmation */}

                          {confirmDelete ===
                          message.id ? (
                            <span className="mt-2 flex items-center justify-end gap-2 text-[11px] font-semibold">
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmDelete(
                                    null,
                                  )
                                }
                                className={cn(
                                  "rounded-full px-2 py-0.5",

                                  mine
                                    ? "bg-primary-foreground/20"
                                    : "bg-background",
                                )}
                              >
                                {fr
                                  ? "Annuler"
                                  : "Cancel"}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  void remove(
                                    message.id,
                                  )
                                }
                                className="rounded-full bg-destructive px-2 py-0.5 text-destructive-foreground"
                              >
                                {fr
                                  ? "Supprimer"
                                  : "Delete"}
                              </button>
                            </span>
                          ) : null}

                          {/* Timestamp */}

                          {endsRun ? (
                            <span
                              className={cn(
                                "mt-1 flex items-center justify-end gap-1 text-[10px]",

                                mine
                                  ? "text-primary-foreground/75"
                                  : "text-muted-foreground",
                              )}
                            >
                              {timeLabel(
                                message.created_at,
                                fr,
                              )}

                              {mine ? (
                                message.read_at ? (
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
                  },
                )}
              </div>
            ),
          )
        )}

        {/* ---------------------------------------------------------------
            Pending messages
        --------------------------------------------------------------- */}

        {pending.map(
          (text, index) => (
            <div
              key={`pending-${index}`}
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

                  {fr
                    ? "Envoi…"
                    : "Sending…"}
                </span>
              </div>
            </div>
          ),
        )}

        {/* ---------------------------------------------------------------
            Failed message
        --------------------------------------------------------------- */}

        {failed ? (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() =>
                void submit(
                  failed,
                )
              }
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
      </div>

      {/* ---------------------------------------------------------------
          QUICK REPLIES
      --------------------------------------------------------------- */}

      {quickReplies.length >
      0 ? (
        <div className="flex shrink-0 gap-2 overflow-x-auto px-1 pb-2">
          {quickReplies.map(
            (quickReply) => (
              <button
                key={quickReply}
                type="button"
                onClick={() =>
                  void submit(
                    quickReply,
                  )
                }
                className="shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted hover:text-foreground"
              >
                {quickReply}
              </button>
            ),
          )}
        </div>
      ) : null}

      {/* ---------------------------------------------------------------
          MESSAGE COMPOSER

          No sticky positioning.
          No bottom nav dependency.
          It belongs entirely to the chat.
      --------------------------------------------------------------- */}

      <form
        onSubmit={(event) => {
          event.preventDefault();

          void submit(body);
        }}
        className="shrink-0 flex items-end gap-2 border-t border-border bg-background pt-2 pb-2"
      >
        <div className="flex min-w-0 flex-1 flex-col">
          <Textarea
            rows={1}
            value={body}
            onChange={(event) =>
              setBody(
                event.target.value.slice(
                  0,
                  1000,
                ),
              )
            }
            onKeyDown={(event) => {
              if (
                event.key ===
                  "Enter" &&
                !event.shiftKey
              ) {
                event.preventDefault();

                void submit(body);
              }
            }}
            placeholder={t(
              "chat.placeholder",
            )}
            aria-label={t(
              "chat.placeholder",
            )}
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
            sending ||
            body.trim()
              .length === 0
          }
          aria-label={t(
            "chat.send",
          )}
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

/* ==========================================================================
   ASH INVOICE / SYSTEM MESSAGE
============================================================================ */

function InvoiceMessage({
  kind,
  body,
  metadata,
}: {
  kind: string;
  body: string;
  metadata: Record<
    string,
    unknown
  >;
}) {
  const { lang } =
    useI18n();

  const fr = lang === "fr";

  /* ------------------------------------------------------------------------
     SYSTEM MESSAGE
  ------------------------------------------------------------------------ */

  if (kind === "SYSTEM") {
    return (
      <p className="mx-auto max-w-[90%] rounded-full bg-muted px-3 py-1 text-center text-[11px] text-muted-foreground">
        {body}
      </p>
    );
  }

  /* ------------------------------------------------------------------------
     Invoice
  ------------------------------------------------------------------------ */

  const invoice = String(
    metadata[
      "invoice_number"
    ] ?? "",
  );

  const total = Number(
    metadata["total"] ??
      metadata["price"] ??
      0,
  );

  const fee = Number(
    metadata[
      "platform_fee"
    ] ?? 0,
  );

  const net = Number(
    metadata[
      "provider_amount"
    ] ?? 0,
  );

  const service = String(
    metadata[
      "service_title"
    ] ?? "",
  );

  return (
    <article className="mx-auto w-full max-w-[92%] rounded-2xl border border-primary/30 bg-primary/5 p-3">
      <header className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-primary">
          <ReceiptText
            className="size-4"
            aria-hidden
          />

          {fr
            ? "Facture ASH"
            : "ASH invoice"}
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
            {fr
              ? "Total payé"
              : "Total paid"}
          </dt>

          <dd className="tabular font-bold text-foreground">
            {formatXAF(total)}
          </dd>
        </div>

        {fee > 0 ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">
              {fr
                ? "Frais ASH"
                : "ASH fee"}
            </dt>

            <dd className="tabular text-foreground">
              {formatXAF(fee)}
            </dd>
          </div>
        ) : null}

        {net > 0 ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">
              {fr
                ? "Reçu par le pro"
                : "Provider receives"}
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
