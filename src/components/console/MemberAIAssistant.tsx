import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import ashLogo from "@/assets/ash-logo.png.asset.json";
export function MemberAIAssistant({
  userId,
  threadId,
  initialMessages,
  onUseReply,
}: {
  userId: string;
  threadId: string;
  initialMessages: UIMessage[];
  onUseReply?: (reply: string) => void;
}) {
  const [input, setInput] = useState("");
  const textarea = useRef<HTMLTextAreaElement>(null);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/staff-member-ai",
        body: { userId, threadId },
        credentials: "same-origin",
      }),
    [userId, threadId],
  );
  const { messages, sendMessage, status, error, stop } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
  });
  const busy = status === "streaming" || status === "submitted";
  useEffect(() => {
    if (!busy) textarea.current?.focus();
  }, [busy, threadId]);
  return (
    <aside className="flex h-[620px] min-h-0 min-w-0 flex-col rounded-lg border border-border bg-background">
      <header className="flex items-center gap-2 border-b border-border p-3">
        <img src={ashLogo.url} alt="ASH" className="size-8 object-contain" />
        <h2 className="font-semibold">ASH Intelligence</h2>
      </header>
      <div className="flex flex-wrap gap-1 border-b border-border p-2">
        {["Analyze this account", "Recommend next steps", "Suggest a client reply"].map((text) => (
          <Button
            key={text}
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => void sendMessage({ text })}
          >
            {text}
          </Button>
        ))}
      </div>
      <Conversation className="min-h-0">
        <ConversationContent className="gap-4">
          {messages.map((message) => (
            <Message from={message.role} key={message.id}>
              <MessageContent
                className={
                  message.role === "user"
                    ? "group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground"
                    : ""
                }
              >
                {message.parts.map((part, i) =>
                  part.type === "text" ? (
                    <MessageResponse key={i}>{part.text}</MessageResponse>
                  ) : null,
                )}
              </MessageContent>
              {message.role === "assistant" && onUseReply ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="self-start"
                  onClick={() =>
                    onUseReply(
                      message.parts
                        .filter((p) => p.type === "text")
                        .map((p) => p.text)
                        .join("\n"),
                    )
                  }
                >
                  Copy to reply draft
                </Button>
              ) : null}
            </Message>
          ))}
          {status === "submitted" ? <Shimmer>Reviewing account…</Shimmer> : null}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      {error ? (
        <p role="alert" className="px-3 py-2 text-sm text-destructive">
          {error.message}
        </p>
      ) : null}
      <div className="shrink-0 border-t border-border p-3">
        <PromptInput
          onSubmit={async () => {
            if (!input.trim() || busy) return;
            const text = input;
            setInput("");
            await sendMessage({ text });
            textarea.current?.focus();
          }}
        >
          <PromptInputTextarea
            ref={textarea}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this member…"
            autoFocus
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit
              status={status}
              disabled={!busy && !input.trim()}
              onStop={() => void stop()}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </aside>
  );
}
