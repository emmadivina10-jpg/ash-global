import { useRef, useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { vibrateDevice } from "@/lib/push";
import { cn } from "@/lib/utils";
import type { ReactionBreakdown, ReactionType } from "@/lib/social.queries";

export const REACTIONS: Array<{ type: ReactionType; emoji: string; label: string }> = [
  { type: "love", emoji: "❤️", label: "Love" },
  { type: "like", emoji: "👍", label: "Like" },
  { type: "haha", emoji: "😂", label: "Haha" },
  { type: "wow", emoji: "😮", label: "Wow" },
  { type: "sad", emoji: "😢", label: "Sad" },
  { type: "angry", emoji: "😡", label: "Angry" },
];

export function ReactionButton({ value, total, breakdown, onChange, disabled, compact = false }: {
  value: ReactionType | null;
  total: number;
  breakdown?: ReactionBreakdown;
  onChange: (value: ReactionType | null) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);
  const held = useRef(false);
  const selected = REACTIONS.find((reaction) => reaction.type === value);
  const start = () => {
    held.current = false;
    timer.current = window.setTimeout(() => {
      held.current = true;
      setOpen(true);
      void vibrateDevice([0, 35]);
    }, 420);
  };
  const clear = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  const choose = (type: ReactionType) => {
    onChange(value === type ? null : type);
    setOpen(false);
    void vibrateDevice([0, 25]);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          className={cn("gap-1.5 touch-manipulation", value && "text-primary", compact && "h-7 px-2 text-[11px]")}
          onPointerDown={start}
          onPointerUp={() => { clear(); if (!held.current) onChange(value ? null : "like"); }}
          onPointerCancel={clear}
          onPointerLeave={clear}
          aria-label={selected ? `${selected.label}, ${total} reactions` : `React, ${total} reactions`}
        >
          {selected ? <span aria-hidden>{selected.emoji}</span> : <Heart className="size-4" aria-hidden />}
          {total > 0 ? total : compact ? "" : "React"}
        </Button>
      </PopoverAnchor>
      <PopoverContent side="top" align="start" sideOffset={8} className="flex w-auto gap-1 rounded-full border-primary/15 bg-popover/95 p-1.5 shadow-[var(--shadow-brand)] backdrop-blur-xl">
        {REACTIONS.map((reaction) => (
          <button key={reaction.type} type="button" title={reaction.label} aria-label={reaction.label} onClick={() => choose(reaction.type)} className={cn("grid size-10 place-items-center rounded-full text-xl transition-transform hover:scale-125 hover:bg-primary/10 active:scale-95", value === reaction.type && "bg-primary/10 ring-1 ring-primary/30")}>
            {reaction.emoji}
          </button>
        ))}
      </PopoverContent>
      {!compact && breakdown && total > 0 ? (
        <span className="sr-only">{REACTIONS.filter((r) => breakdown[r.type] > 0).map((r) => `${r.label} ${breakdown[r.type]}`).join(", ")}</span>
      ) : null}
    </Popover>
  );
}

export function ReactionSummary({ breakdown }: { breakdown: ReactionBreakdown }) {
  const active = REACTIONS.filter((reaction) => breakdown[reaction.type] > 0);
  if (active.length === 0) return <span className="text-[11px] text-muted-foreground">Be the first to react</span>;
  return <span className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">{active.map((reaction) => <span key={reaction.type}>{reaction.emoji} {breakdown[reaction.type]}</span>)}</span>;
}