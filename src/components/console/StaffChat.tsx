import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MessagesSquare } from "lucide-react";
import { getStaffChat, postStaffMessage, type StaffMessage } from "@/lib/ops.functions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StaffChatWorkspace, STAFF_CHANNELS } from "@/components/console/StaffChatWorkspace";

/** Existing staff channel transport, presented as an ASH chat workspace. */
export function StaffChat() {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<string>("GENERAL");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const load = useServerFn(getStaffChat);
  const post = useServerFn(postStaffMessage);
  const query = useQuery({
    queryKey: ["console", "staff-chat", channel],
    queryFn: () => load({ data: { channel } }),
    refetchInterval: open ? 8000 : false,
    enabled: open,
  });
  const send = useMutation({
    mutationFn: async ({ text, target }: { text: string; target: string }) => {
      const result = await post({ data: { channel: target, body: text } });
      if (!result.ok) throw new Error("Message not sent. Please try again.");
    },
    onSuccess: async (_, { target, text }) => {
      setDrafts((current) => current[target] === text ? { ...current, [target]: "" } : current);
      await queryClient.invalidateQueries({ queryKey: ["console", "staff-chat", target] });
    },
  });
  const previews: Record<string, StaffMessage | undefined> = {};
  for (const item of STAFF_CHANNELS) {
    const cached = queryClient.getQueryData<{ messages: StaffMessage[] }>(["console", "staff-chat", item.id]);
    previews[item.id] = cached?.messages.at(-1);
  }
  const draft = drafts[channel] ?? "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" aria-label="Open team chat">
          <MessagesSquare className="size-4" aria-hidden />
          <span className="hidden sm:inline">Team chat</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="h-dvh max-h-dvh w-full max-w-none gap-0 overflow-hidden border-team-line bg-team-background p-0 text-team-foreground shadow-raised sm:rounded-none md:h-[min(800px,90dvh)] md:w-[94vw] md:max-w-6xl md:rounded-lg [&>button]:text-team-muted [&>button]:hover:text-team-foreground [&>button]:focus:ring-team-accent">
        <DialogTitle className="sr-only">ASH Team chat</DialogTitle>
        <DialogDescription className="sr-only">Employee department conversations</DialogDescription>
        <StaffChatWorkspace
          channel={channel}
          onChannelChange={(value) => { setChannel(value); send.reset(); }}
          messages={query.data?.messages ?? []}
          me={query.data?.me}
          draft={draft}
          onDraftChange={(value) => setDrafts((current) => ({ ...current, [channel]: value }))}
          onSend={() => send.mutate({ text: draft, target: channel })}
          pending={send.isPending}
          loading={query.isPending && query.isFetching}
          error={query.isError ? "Messages could not be loaded. Please reopen Team chat to try again." : send.isError ? "Message not sent. Please try again." : undefined}
          previews={previews}
        />
      </DialogContent>
    </Dialog>
  );
}
