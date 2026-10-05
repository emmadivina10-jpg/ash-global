import { type ReactNode, useRef, useState } from "react";
import {
  Check,
  Lock,
  LockOpen,
  MoreHorizontal,
  Pin,
  PinOff,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChatActionDialog } from "./ChatActionDialog";

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
  label,
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
  label?: string;
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
        selected ? "bg-primary/10" : "bg-background/70",
      )}
      onTouchStart={(event) => {
        if ((event.target as HTMLElement).closest("button")) return;
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
        if ((event.target as HTMLElement).closest("button")) return;
        if (event.pointerType === "mouse" && event.button === 0)
          start(event.clientX, event.clientY);
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
        if ((event.target as HTMLElement).closest("[data-chat-avatar]")) return;
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
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/40",
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

      {pinned ? (
        <span
          title={fr ? "Épinglée" : "Pinned chat"}
           className="pointer-events-none absolute bottom-3 right-12 z-10 grid size-6 place-items-center rounded-full bg-success text-success-foreground ring-2 ring-background"
        >
          <Pin className="size-3.5 fill-current" aria-hidden />
        </span>
      ) : null}
      {locked ? (
        <Lock className="absolute right-5 top-3 size-3.5 text-muted-foreground" aria-hidden />
      ) : null}
      <div className="absolute bottom-3 right-3 flex items-center gap-1">
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

      <ChatActionDialog
        open={menuOpen && !selecting}
        onOpenChange={setMenuOpen}
        title={label ?? (fr ? "Options de discussion" : "Chat options")}
      >
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
      </ChatActionDialog>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Pin;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className="h-14 w-full justify-start gap-4 rounded-lg bg-muted/60 px-4 text-left text-base font-semibold hover:bg-success/15"
    >
      <Icon className="size-4" aria-hidden />
      {label}
    </Button>
  );
}
