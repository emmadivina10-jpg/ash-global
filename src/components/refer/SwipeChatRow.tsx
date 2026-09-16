import { type ReactNode, useRef, useState } from "react";
import { Archive, ArchiveRestore, Lock, LockOpen, Pin, PinOff, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A WhatsApp-style chat row: swipe right to archive, swipe left to delete.
 * The same actions sit behind a long press so they work with a mouse too.
 */
export function SwipeChatRow({
  children,
  archived,
  pinned,
  locked,
  fr,
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
  onArchive: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onToggleLock: () => void;
}) {
  const [offset, setOffset] = useState(0);
  const startX = useRef<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const reveal = 96;

  return (
    <div className="relative overflow-hidden">
      {/* Archive sits on the left, revealed by a swipe to the right. */}
      <button
        type="button"
        onClick={() => {
          setOffset(0);
          onArchive();
        }}
        className="absolute inset-y-0 left-0 flex w-24 items-center justify-center gap-1 bg-muted text-xs font-bold text-foreground"
      >
        {archived ? <ArchiveRestore className="size-4" aria-hidden /> : <Archive className="size-4" aria-hidden />}
        {archived ? (fr ? "Sortir" : "Restore") : fr ? "Archiver" : "Archive"}
      </button>

      {/* Delete sits on the right, revealed by a swipe to the left. */}
      <button
        type="button"
        onClick={() => {
          setOffset(0);
          onDelete();
        }}
        className="absolute inset-y-0 right-0 flex w-24 items-center justify-center gap-1 bg-destructive text-xs font-bold text-destructive-foreground"
      >
        <Trash2 className="size-4" aria-hidden />
        {fr ? "Supprimer" : "Delete"}
      </button>

      <div
        className="relative bg-background transition-transform duration-200"
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={(event) => {
          startX.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchMove={(event) => {
          if (startX.current === null) return;
          const delta = (event.touches[0]?.clientX ?? 0) - startX.current;
          setOffset(Math.max(-reveal, Math.min(reveal, delta)));
        }}
        onTouchEnd={() => {
          startX.current = null;
          setOffset((value) => (value > 48 ? reveal : value < -48 ? -reveal : 0));
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          setMenuOpen((open) => !open);
        }}
      >
        {children}

        <div className="absolute right-2 top-1 flex items-center gap-1">
          {pinned ? <Pin className="size-3 text-primary" aria-hidden /> : null}
          {locked ? <Lock className="size-3 text-muted-foreground" aria-hidden /> : null}
          <button
            type="button"
            aria-label={fr ? "Options de discussion" : "Chat options"}
            onClick={(event) => {
              event.stopPropagation();
              setMenuOpen((open) => !open);
            }}
            className="rounded-full px-1.5 text-xs font-bold text-muted-foreground hover:text-foreground"
          >
            ⋯
          </button>
        </div>

        {menuOpen ? (
          <div className="absolute right-2 top-7 z-20 w-44 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
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
            <MenuItem
              icon={Trash2}
              label={fr ? "Supprimer" : "Delete chat"}
              onClick={() => {
                setMenuOpen(false);
                onDelete();
              }}
            />
          </div>
        ) : null}
      </div>
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
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-foreground hover:bg-muted",
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </button>
  );
}
