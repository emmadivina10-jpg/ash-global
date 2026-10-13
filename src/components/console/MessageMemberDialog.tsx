import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Send, ShieldAlert, X } from "lucide-react";
import { messageMember, searchMembers } from "@/lib/ops.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type MessageTarget = { userId: string; name: string } | null;

/**
 * Writes to one member. Support and admin seats send a normal message;
 * the security team sends a flagged security alert.
 */
export function MessageMemberDialog({
  open,
  onClose,
  target,
  kind = "MESSAGE",
}: {
  open: boolean;
  onClose: () => void;
  target?: MessageTarget;
  kind?: "MESSAGE" | "SECURITY";
}) {
  const send = useServerFn(messageMember);
  const find = useServerFn(searchMembers);
  const [term, setTerm] = useState("");
  const [picked, setPicked] = useState<MessageTarget>(target ?? null);
  const [subject, setSubject] = useState(
    kind === "SECURITY" ? "Security check on your account" : "",
  );
  const [body, setBody] = useState("");

  const results = useQuery({
    queryKey: ["console", "member-search", term],
    queryFn: () => find({ data: { term } }),
    enabled: open && !target && term.trim().length >= 2,
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!picked) throw new Error("NO_MEMBER");
      return send({ data: { userId: picked.userId, subject, body, kind } });
    },
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(`Message not sent (${result.error}).`);
        return;
      }
      toast.success("Message delivered to the member.");
      setBody("");
      setSubject(kind === "SECURITY" ? "Security check on your account" : "");
      setPicked(target ?? null);
      onClose();
    },
    onError: () => toast.error("Message not sent."),
  });

  if (!open) return null;

  const active = picked ?? target ?? null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
      <button type="button" aria-label="Close" className="absolute inset-0" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Message a member"
        className="relative w-full max-w-lg space-y-4 rounded-3xl border border-border bg-card p-5 shadow-raised"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-lg font-extrabold text-foreground">
              {kind === "SECURITY" ? "Send a security alert" : "Message a member"}
            </p>
            <p className="text-xs text-muted-foreground">
              Lands in their notifications and opens a thread they can reply to.
            </p>
          </div>
          <Button size="icon" variant="ghost" aria-label="Close" onClick={onClose}>
            <X className="size-4" aria-hidden />
          </Button>
        </div>

        {target ? (
          <p className="rounded-xl bg-muted p-3 text-sm font-semibold text-foreground">
            To: {target.name}
          </p>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="member-search">Find a member</Label>
            <Input
              id="member-search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Name, email or phone"
            />
            {active ? (
              <p className="text-xs font-semibold text-primary">Selected: {active.name}</p>
            ) : null}
            {results.data && results.data.length > 0 ? (
              <div className="max-h-44 overflow-y-auto rounded-xl border border-border">
                {results.data.map((member) => (
                  <button
                    key={member.user_id}
                    type="button"
                    onClick={() =>
                      setPicked({
                        userId: member.user_id,
                        name: member.full_name ?? member.email ?? "Member",
                      })
                    }
                    className="flex w-full items-center justify-between gap-3 border-b border-border px-3 py-2 text-left last:border-0 hover:bg-muted"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {member.full_name ?? "Member"}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {member.email}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10px] font-bold uppercase text-muted-foreground">
                      {member.account_status}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="member-subject">Subject</Label>
          <Input
            id="member-subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value.slice(0, 140))}
            placeholder={kind === "SECURITY" ? "Unusual sign-in detected" : "About your account"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="member-body">Message</Label>
          <Textarea
            id="member-body"
            rows={5}
            value={body}
            onChange={(event) => setBody(event.target.value.slice(0, 4000))}
            placeholder="Write to them directly…"
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => submit.mutate()}
            disabled={
              submit.isPending || !active || subject.trim().length === 0 || body.trim().length === 0
            }
          >
            {submit.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : kind === "SECURITY" ? (
              <ShieldAlert className="size-4" aria-hidden />
            ) : (
              <Send className="size-4" aria-hidden />
            )}
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
