import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Hash, Loader2, LockKeyhole, MessagesSquare, Search, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { StaffMessage } from "@/lib/ops.functions";
import logo from "@/assets/ash-logo.png.asset.json";

export const STAFF_CHANNELS = [
  { id: "GENERAL", label: "General" },
  { id: "LEADERSHIP", label: "Leadership" },
  { id: "SUPPORT", label: "Support" },
  { id: "REVENUE", label: "Revenue" },
  { id: "GROWTH", label: "Growth" },
  { id: "TRUST", label: "Trust" },
  { id: "CYBERSECURITY", label: "Security" },
] as const;

type Props = {
  channel: string;
  onChannelChange: (channel: string) => void;
  messages: StaffMessage[];
  me?: string;
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  pending: boolean;
  loading: boolean;
  error?: string;
  previews: Record<string, StaffMessage | undefined>;
};

export function StaffChatWorkspace({ channel, onChannelChange, messages, me, draft, onDraftChange, onSend, pending, loading, error, previews }: Props) {
  const [search, setSearch] = useState("");
  const [showThread, setShowThread] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const label = STAFF_CHANNELS.find((item) => item.id === channel)?.label ?? "General";
  const lastId = messages.at(-1)?.id;

  useEffect(() => {
    const pane = scrollRef.current;
    if (pane) pane.scrollTop = pane.scrollHeight;
  }, [lastId, channel, showThread]);

  return (
    <div className="flex h-full min-h-0 w-full text-team-foreground">
      <section aria-label="Team channels" className={cn("w-full shrink-0 flex-col border-team-line bg-team-surface md:flex md:w-80 md:border-r", showThread ? "hidden" : "flex")}>
        <header className="flex h-20 shrink-0 items-center gap-3 bg-team-elevated px-5 pr-14 md:pr-5">
          <img src={logo.url} alt="ASH" className="size-11 rounded-full object-contain" />
          <div><h2 className="font-display text-base font-bold">Team chat</h2><p className="mt-0.5 flex items-center gap-1 text-xs text-team-muted"><LockKeyhole className="size-3" />ASH employees</p></div>
        </header>
        <div className="border-b border-team-line p-3">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-3 size-4 text-team-muted" /><Input aria-label="Search team channels" placeholder="Search department or team" value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 rounded-lg border-team-line bg-team-elevated pl-9 text-team-foreground placeholder:text-team-muted focus-visible:ring-team-accent" /></div>
          <p className="mt-3 flex items-center gap-2 px-1 text-xs font-semibold text-team-accent"><MessagesSquare className="size-4" />Channels</p>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto" aria-label="Department conversations">
          {STAFF_CHANNELS.filter((item) => item.label.toLowerCase().includes(search.trim().toLowerCase())).map((item) => {
            const latest = previews[item.id];
            return <Button key={item.id} variant="ghost" onClick={() => { onChannelChange(item.id); setShowThread(true); }} aria-pressed={channel === item.id} className={cn("h-20 w-full justify-start gap-3 rounded-none border-b border-team-line/50 px-4 text-left hover:bg-team-elevated hover:text-team-foreground", channel === item.id && "bg-team-elevated")}>
              <span className={cn("grid size-11 shrink-0 place-items-center rounded-full border border-team-line bg-team-background", channel === item.id ? "text-team-gold" : "text-team-accent")}><Hash className="size-5" /></span>
              <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold">{item.label}</span>{latest ? <time className="shrink-0 text-[10px] font-normal text-team-muted">{new Date(latest.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time> : null}</span><span className="mt-1 block truncate text-xs font-normal text-team-muted">{latest ? `${latest.author_name}: ${latest.body}` : `#${item.label.toLowerCase()}`}</span></span>
            </Button>;
          })}
          {!STAFF_CHANNELS.some((item) => item.label.toLowerCase().includes(search.trim().toLowerCase())) ? <p className="p-6 text-center text-sm text-team-muted">No channels found</p> : null}
        </nav>
      </section>
      <section aria-label={`${label} conversation`} className={cn("min-h-0 min-w-0 flex-1 flex-col bg-team-background md:flex", showThread ? "flex" : "hidden")}>
        <header className="flex h-20 shrink-0 items-center gap-3 border-b border-team-line bg-team-elevated px-3 pr-14 md:px-5 md:pr-14">
          <Button variant="ghost" size="icon" aria-label="Back to channels" onClick={() => setShowThread(false)} className="shrink-0 text-team-muted hover:bg-team-surface hover:text-team-foreground md:hidden"><ArrowLeft className="size-5" /></Button>
          <span className="grid size-10 shrink-0 place-items-center rounded-full border border-team-gold/30 bg-team-surface text-team-gold"><Hash className="size-5" /></span>
          <div className="min-w-0"><h3 className="truncate text-sm font-semibold">{label}</h3><p className="mt-1 text-xs text-team-muted">Internal team channel</p></div>
        </header>
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 md:px-8" role="log" aria-label="Team messages" aria-live="polite">
          {loading ? <Loader2 className="mx-auto my-8 size-5 animate-spin text-team-accent" aria-label="Loading messages" /> : null}
          {!loading && !error && messages.length === 0 ? <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-team-muted"><MessagesSquare className="size-9 text-team-accent" /><p className="text-sm">No messages in #{label.toLowerCase()} yet.</p></div> : null}
          {messages.map((message, index) => {
            const mine = message.author_name === me;
            const day = new Date(message.created_at).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
            const previous = messages[index - 1];
            const newDay = !previous || new Date(previous.created_at).toDateString() !== new Date(message.created_at).toDateString();
            return <div key={message.id}>
              {newDay ? <div className="my-5 text-center"><span className="rounded-md bg-team-elevated px-3 py-1.5 text-[11px] text-team-muted">{day}</span></div> : null}
              <div className={cn("mb-3 flex", mine ? "justify-end" : "justify-start")}><div className={cn("min-w-0 max-w-[88%] rounded-lg px-3 py-2 md:max-w-[75%]", mine ? "rounded-tr-none bg-team-outgoing" : "rounded-tl-none bg-team-elevated")}>
                <p className="text-xs font-semibold text-team-gold">{message.author_name}</p><p className="mt-0.5 text-[10px] text-team-muted">{message.author_department.replace(/_/g, " ")}</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">{message.body}</p>
                <time dateTime={message.created_at} title={new Date(message.created_at).toLocaleString()} className="mt-1 block text-right text-[10px] text-team-muted">{new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
              </div></div>
            </div>;
          })}
        </div>
        {error ? <p role="alert" className="shrink-0 border-t border-team-line bg-team-surface px-4 py-2 text-xs text-team-gold">{error}</p> : null}
        <form onSubmit={(event) => { event.preventDefault(); if (draft.trim() && !pending) onSend(); }} className="flex shrink-0 items-end gap-3 border-t border-team-line bg-team-elevated p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:p-4">
          <Textarea rows={1} value={draft} onChange={(event) => onDraftChange(event.target.value.slice(0, 4000))} aria-label={`Message ${label}`} placeholder="Type a message" className="max-h-32 min-h-11 flex-1 resize-none rounded-lg border-team-line bg-team-surface text-team-foreground placeholder:text-team-muted focus-visible:ring-team-accent" />
          <Button type="submit" size="icon" disabled={pending || !draft.trim()} aria-label="Send message" className="size-11 shrink-0 rounded-full bg-team-accent text-team-background hover:bg-team-accent/90">{pending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}</Button>
        </form>
      </section>
    </div>
  );
}