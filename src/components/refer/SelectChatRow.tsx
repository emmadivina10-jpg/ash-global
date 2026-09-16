import { type ReactNode, useRef, useState } from "react";
import { Check, Lock, LockOpen, MoreHorizontal, Pin, PinOff, Archive, ArchiveRestore } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const HOLD_MS = 450;
const MOVE_TOLERANCE = 10;

/**
 * A conversation row that enters selection mode on a long press, the way
 * WhatsApp does: the row highlights, a round tick appears at its side, and
 * the list header offers the bin.
 */
export function SelectChatRow({
  children,
  fr,
  pinned,
  locked,
  archived,
  selecting,
  selected,
  onLongPress,
  onToggleSelect,
  onOpen,
  onTogglePin,
  onToggleLock,
  onArchive,
}: {
  children: ReactNode;
  fr: boolean;
  pinned: boolean;
  locked: boolean;
  archived: boolean;
  selecting: boolean;
  selected: boolean;
  onLongPress: () => void;
  onToggleSelect: () => void;
  onOpen: () => void;
  onTogglePin: () => void;
  onToggleLock: () => void;
  onArchive: () => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const held = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);

  function clear() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    origin.current = null;
  }

  function start(x: number, y: number) {
    held.current = false;
    origin.current = { x, y };
    timer.current = setTimeout(() => {
      held.current = true;
      onLongPress();
    }, HOLD_MS);
  }

  function moved(x: number, y: number) {
    const from = origin.current;
    if (!from) return;
    if (Math.abs(x - from.x) > MOVE_TOLERANCE || Math.abs(y - from.y) > MOVE_TOLERANCE) clear();
  }

  return (
    <div
      className={cn(
        "relative border-b border-border transition-colors",
        selected ? "bg-primary/10" : "bg-background",
      )}
      onTouchStart={(event) => {
        const touch = event.touches[0];
        if (touch) start(touch.clientX, touch.clientY);
      }}
      onTouchMove={(event) => {
        const touch = event.touches[0];
        if (touch) moved(touch.clientX, touch.clientY);
      }}
      onTouchEnd={clear}
      onTouchCancel={clear}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse" && event.button === 0) start(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (event.pointerType === "mouse") moved(event.clientX, event.clientY);
      }}
      onPointerUp={clear}
      onPointerLeave={clear}
      onContextMenu={(event) => {
        event.preventDefault();
        onLongPress();
      }}
      onClickCapture={(event) => {
        if (held.current) {
          held.current = false;
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (selecting) {
          event.preventDefault();
          event.stopPropagation();
          onToggleSelect();
        }
      }}
    >
      <div className="flex items-center">
        {selecting ? (
          <span className="pl-3">
            <span
              className={cn(
                "grid size-6 place-items-center rounded-full border-2 transition-colors",
                selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
              )}
              aria-hidden
            >
              {selected ? <Check className="size-3.5" /> : null}
            </span>
          </span>
        ) : null}
        <div className="min-w-0 flex-1" onClick={() => (selecting ? onToggleSelect() : onOpen())}>
          {children}
        </div>
      </div>

      <div className="absolute right-2 top-1 flex items-center gap-0.5">
        {pinned ? <Pin className="size-3 text-primary" aria-hidden /> : null}
        {locked ? <Lock className="size-3 text-muted-foreground" aria-hidden /> : null}
        {selecting ? null : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={fr ? "Options de discussion" : "Chat options"}
            onClick={(event) => {
              event.stopPropagation();
              setMenuOpen((open) => !open);
            }}
            className="size-8 rounded-full text-muted-foreground"
          >
            <MoreHorizontal className="size-4" aria-hidden />
          </Button>
        )}
      </div>

      {menuOpen && !selecting ? (
        <div className="absolute right-2 top-9 z-20 w-44 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
          <MenuItem
            icon={pinned ? PinOff : Pin}
            label={pinned ? (fr ? "Désépingler" : "Unpin") : fr ? "Épingler" : "Pin chat"}
            onClick={() => {
              setMenuOpen(false);
              onTogglePin();
            }}
          />
          <MenuItem
            icon={locked ? LockOpen : Lock}
            label={locked ? (fr ? "Déverrouiller" : "Unlock chat") : fr ? "Verrouiller" : "Lock chat"}
            onClick={() => {
              setMenuOpen(false);
              onToggleLock();
            }}
          />
          <MenuItem
            icon={archived ? ArchiveRestore : Archive}
            label={archived ? (fr ? "Désarchiver" : "Unarchive") : fr ? "Archiver" : "Archive"}
            onClick={() => {
              setMenuOpen(false);
              onArchive();
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick }: { icon: typeof Pin; label: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className="h-auto w-full justify-start rounded-none px-3 py-2.5 text-left text-xs font-semibold"
    >
      <Icon className="size-4" aria-hidden />
      {label}
    </Button>
  );
}
