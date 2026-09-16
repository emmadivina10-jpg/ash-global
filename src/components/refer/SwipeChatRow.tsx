import {
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useRef,
  useState,
} from "react";
import { Archive, ArchiveRestore, Lock, LockOpen, MoreHorizontal, Pin, PinOff, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const REVEAL = 88;
const AXIS_LOCK_DISTANCE = 9;
const OPEN_THRESHOLD = 42;

type DragState = {
  pointerId: number;
  x: number;
  y: number;
  origin: number;
  axis: "pending" | "horizontal" | "vertical";
};

/** A direction-locked conversation row that preserves vertical list scrolling. */
export function SwipeChatRow({
  children,
  archived,
  pinned,
  locked,
  fr,
  openSide,
  onOpenSideChange,
  onArchive,
  onDelete,
  onTogglePin,
  onToggleLock,
}: {
  children: ReactNode;
  archived: boolean;
  pinned: boolean;
  locked: boolean;
  fr: boolean;
  openSide: "archive" | "delete" | null;
  onOpenSideChange: (side: "archive" | "delete" | null) => void;
  onArchive: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onToggleLock: () => void;
}) {
  const restingOffset = openSide === "archive" ? REVEAL : openSide === "delete" ? -REVEAL : 0;
  const [dragOffset, setDragOffset] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const drag = useRef<DragState | null>(null);
  const dragged = useRef(false);
  const offset = dragOffset ?? restingOffset;

  function start(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    drag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      origin: restingOffset,
      axis: "pending",
    };
    dragged.current = false;
  }

  function move(event: ReactPointerEvent<HTMLDivElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const dx = event.clientX - active.x;
    const dy = event.clientY - active.y;

    if (active.axis === "pending" && Math.max(Math.abs(dx), Math.abs(dy)) >= AXIS_LOCK_DISTANCE) {
      active.axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? "horizontal" : "vertical";
      if (active.axis === "horizontal") {
        event.currentTarget.setPointerCapture(event.pointerId);
        setMenuOpen(false);
      }
    }
    if (active.axis !== "horizontal") return;

    event.preventDefault();
    dragged.current = true;
    const resistance = Math.abs(active.origin + dx) > REVEAL ? 0.28 : 1;
    const next = active.origin + dx * resistance;
    setDragOffset(Math.max(-REVEAL * 1.12, Math.min(REVEAL * 1.12, next)));
  }

  function finish(event: ReactPointerEvent<HTMLDivElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (active.axis === "horizontal") {
      const finalOffset = dragOffset ?? active.origin;
      onOpenSideChange(
        finalOffset >= OPEN_THRESHOLD ? "archive" : finalOffset <= -OPEN_THRESHOLD ? "delete" : null,
      );
    }
    drag.current = null;
    setDragOffset(null);
  }

  function requestDelete() {
    onOpenSideChange(null);
    setMenuOpen(false);
    setConfirmDelete(true);
  }

  return (
    <div className="relative isolate overflow-hidden border-b border-border bg-muted">
      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          onOpenSideChange(null);
          onArchive();
        }}
        className="absolute inset-y-0 left-0 h-full w-[88px] flex-col gap-1 rounded-none bg-muted px-1 text-[11px] font-bold text-foreground hover:bg-muted"
      >
        {archived ? <ArchiveRestore className="size-5" aria-hidden /> : <Archive className="size-5" aria-hidden />}
        {archived ? (fr ? "Restaurer" : "Restore") : fr ? "Archiver" : "Archive"}
      </Button>

      <Button
        type="button"
        variant="destructive"
        onClick={requestDelete}
        className="absolute inset-y-0 right-0 h-full w-[88px] flex-col gap-1 rounded-none px-1 text-[11px] font-bold"
      >
        <Trash2 className="size-5" aria-hidden />
        {fr ? "Supprimer" : "Delete"}
      </Button>

      <div
        className={cn(
          "relative min-w-0 bg-background will-change-transform touch-pan-y select-none",
          dragOffset === null && "transition-transform duration-200 ease-out",
        )}
        style={{ transform: `translate3d(${offset}px,0,0)` }}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={finish}
        onClickCapture={(event) => {
          if (dragged.current) {
            event.preventDefault();
            event.stopPropagation();
            dragged.current = false;
            return;
          }
          if (openSide) {
            event.preventDefault();
            event.stopPropagation();
            onOpenSideChange(null);
          }
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          setMenuOpen((open) => !open);
        }}
      >
        {children}

        <div className="absolute right-2 top-1 flex items-center gap-0.5">
          {pinned ? <Pin className="size-3 text-primary" aria-hidden /> : null}
          {locked ? <Lock className="size-3 text-muted-foreground" aria-hidden /> : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={fr ? "Options de discussion" : "Chat options"}
            onClick={(event) => {
              event.stopPropagation();
              onOpenSideChange(null);
              setMenuOpen((open) => !open);
            }}
            className="size-8 rounded-full text-muted-foreground"
          >
            <MoreHorizontal className="size-4" aria-hidden />
          </Button>
        </div>

        {menuOpen ? (
          <div className="absolute right-2 top-9 z-20 w-44 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
            <MenuItem icon={pinned ? PinOff : Pin} label={pinned ? (fr ? "Désépingler" : "Unpin") : fr ? "Épingler" : "Pin chat"} onClick={() => { setMenuOpen(false); onTogglePin(); }} />
            <MenuItem icon={locked ? LockOpen : Lock} label={locked ? (fr ? "Déverrouiller" : "Unlock chat") : fr ? "Verrouiller" : "Lock chat"} onClick={() => { setMenuOpen(false); onToggleLock(); }} />
            <MenuItem icon={archived ? ArchiveRestore : Archive} label={archived ? (fr ? "Désarchiver" : "Unarchive") : fr ? "Archiver" : "Archive"} onClick={() => { setMenuOpen(false); onArchive(); }} />
            <MenuItem destructive icon={Trash2} label={fr ? "Supprimer" : "Delete chat"} onClick={requestDelete} />
          </div>
        ) : null}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-lg sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{fr ? "Supprimer cette discussion ?" : "Delete this chat?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {fr
                ? "Cette action retire la discussion. Les discussions liées à une réservation seront archivées à la place."
                : "This removes the conversation. Booking-linked chats will be archived instead."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{fr ? "Annuler" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {fr ? "Supprimer" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, destructive = false }: { icon: typeof Pin; label: string; onClick: () => void; destructive?: boolean }) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={cn("h-auto w-full justify-start rounded-none px-3 py-2.5 text-left text-xs font-semibold", destructive && "text-destructive hover:text-destructive")}
    >
      <Icon className="size-4" aria-hidden />
      {label}
    </Button>
  );
}