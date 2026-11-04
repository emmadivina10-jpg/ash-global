import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, LifeBuoy, Sparkles, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type PlusAction = {
  id: string;
  icon: typeof Sparkles;
  en: string;
  fr: string;
  enHint: string;
  frHint: string;
  /** "purple" tile for ASH AI, "gold" tile for ASH Support. */
  tone: "purple" | "gold";
  onSelect: () => void;
};

/**
 * The premium plus-button panel: a dark glass floating card that emerges from
 * the plus button with a short staggered animation. Primary actions are the
 * two hero cards (ASH AI, ASH Support); secondary actions (contact, group)
 * stay available below so nothing existing is lost.
 */
export function PlusActionPanel({
  open,
  onClose,
  actions,
  secondary,
  triggerRef,
}: {
  open: boolean;
  onClose: () => void;
  actions: PlusAction[];
  secondary?: ReactNode;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const { tx } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);

  // Focus the first card on open; return focus to the plus button on close.
  useEffect(() => {
    if (!open) return;
    const first = panelRef.current?.querySelector<HTMLElement>("[data-plus-card]");
    first?.focus();
    return () => triggerRef.current?.focus();
  }, [open, triggerRef]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      const cards = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>("[data-plus-card]") ?? [],
      );
      if (cards.length === 0) return;
      const index = cards.indexOf(document.activeElement as HTMLElement);
      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        cards[(index + 1) % cards.length]?.focus();
      } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        cards[(index - 1 + cards.length) % cards.length]?.focus();
      } else if (event.key === "Tab") {
        // Keep focus inside the panel.
        const focusable = Array.from(
          panelRef.current?.querySelectorAll<HTMLElement>(
            "button, a[href], [data-plus-card]",
          ) ?? [],
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  // Portal to <body>: the Messages page uses transformed/sticky containers
  // that would otherwise trap the fixed panel in a lower stacking context.
  return createPortal(
    <div className="fixed inset-0 z-[70]">
      {/* scrim */}
      <button
        type="button"
        aria-label={tx("Close", "Fermer")}
        onClick={onClose}
        className="plus-scrim absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={tx("Quick actions", "Actions rapides")}
        className="plus-panel absolute right-3 top-[calc(4.5rem+env(safe-area-inset-top))] w-[min(92vw,360px)] rounded-3xl border border-white/10 p-3 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7),0_0_40px_-10px_rgba(75,0,130,0.45)]"
        style={{
          background: "rgba(18,18,24,0.94)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          transformOrigin: "top right",
        }}
      >
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-xs font-bold uppercase tracking-widest text-[#A1A1AA]">
            {tx("Quick actions", "Actions rapides")}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label={tx("Close", "Fermer")}
            className="grid size-8 place-items-center rounded-full text-[#A1A1AA] transition-colors hover:bg-white/10 hover:text-[#F5F5F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="space-y-2">
          {actions.map((action, index) => (
            <button
              key={action.id}
              type="button"
              data-plus-card
              onClick={() => {
                onClose();
                action.onSelect();
              }}
              className="plus-card group flex w-full items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3 text-left transition-all duration-150 ease-out hover:-translate-y-0.5 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass active:scale-[0.98]"
              style={{ animationDelay: `${index * 40}ms` }}
            >
              <span
                className={cn(
                  "grid size-11 shrink-0 place-items-center rounded-[14px] ring-1",
                  action.tone === "purple"
                    ? "bg-royal/25 text-brass ring-royal/40"
                    : "bg-brass/15 text-brass ring-brass/35",
                )}
              >
                <action.icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-[#F5F5F7]">
                  {tx(action.en, action.fr)}
                </span>
                <span className="mt-0.5 block truncate text-xs text-[#A1A1AA]">
                  {tx(action.enHint, action.frHint)}
                </span>
              </span>
              <ChevronRight
                className="size-4 shrink-0 text-[#A1A1AA] transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-brass"
                aria-hidden
              />
            </button>
          ))}
        </div>

        {secondary ? (
          <div className="mt-2 space-y-1 border-t border-white/10 pt-2">{secondary}</div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
