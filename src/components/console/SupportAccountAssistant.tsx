import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getStaffMemberAIThread } from "@/lib/member-insights.functions";
import { MemberAIAssistant } from "./MemberAIAssistant";
import { Button } from "@/components/ui/button";
import { MessageSquareText, X } from "lucide-react";
export function SupportAccountAssistant({
  userId,
  onUseReply,
}: {
  userId: string;
  onUseReply: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const history = useServerFn(getStaffMemberAIThread);
  const query = useQuery({
    queryKey: ["console", "member-ai", userId],
    queryFn: () => history({ data: { userId } }),
    enabled: open,
    retry: false,
  });
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
        <MessageSquareText className="size-4" />
        AI reply assistance
      </Button>
      {open ? (
        <div className="fixed inset-y-4 right-4 z-40 flex w-[calc(100%-2rem)] max-w-md flex-col rounded-lg border border-border bg-background p-3 shadow-raised">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mb-2 self-end"
            aria-label="Close account assistant"
            onClick={() => setOpen(false)}
          >
            <X />
          </Button>
          {query.data ? (
            <MemberAIAssistant
              key={query.data.id}
              userId={userId}
              threadId={query.data.id}
              initialMessages={JSON.parse(query.data.messagesJson)}
              onUseReply={(text) => {
                onUseReply(text);
                setOpen(false);
              }}
            />
          ) : (
            <p role="status" className="p-4 text-sm">
              {query.isError
                ? "Secure suggested replies are awaiting approval of the staff insights update."
                : "Loading account assistance…"}
            </p>
          )}
        </div>
      ) : null}
    </>
  );
}
