import { ArrowLeft, X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useOverlayBack } from "@/lib/overlay-back";

/** Portfolio items are stored as plain objects; the extension tells us how to render them. */
export function isVideoSource(source: string | null | undefined): boolean {
  if (!source) return false;
  const clean = source.split("?")[0]?.toLowerCase() ?? "";
  return /\.(mp4|webm|mov|m4v|ogv)$/.test(clean);
}

export type LightboxMedia = { url: string; caption?: string | null; isVideo: boolean };

/** Full-screen viewer for a portfolio photo or video. */
export function MediaLightbox({
  media,
  onClose,
}: {
  media: LightboxMedia | null;
  onClose: () => void;
}) {
  const { tx } = useI18n();
  useOverlayBack(Boolean(media), onClose);
  useEffect(() => {
    if (!media) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [media, onClose]);
  if (!media || typeof document === "undefined") return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={tx("Photo viewer", "Visionneuse photo")}
      className="fixed inset-0 z-[150] flex h-[100dvh] flex-col bg-media-backdrop text-on-dark"
      onClick={onClose}
    >
      <header className="flex shrink-0 items-center justify-between px-3 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]" onClick={(event) => event.stopPropagation()}>
        <Button
          variant="ghost"
          aria-label={tx("Back", "Retour")}
          onClick={onClose}
          className="h-11 gap-2 rounded-full bg-on-dark/15 px-4 text-on-dark hover:bg-on-dark/25 hover:text-on-dark"
          autoFocus
        >
          <ArrowLeft className="size-5" aria-hidden />
          {tx("Back", "Retour")}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={tx("Close", "Fermer")}
          onClick={onClose}
          className="size-11 rounded-full text-on-dark hover:bg-on-dark/15 hover:text-on-dark"
        >
          <X className="size-5" aria-hidden />
        </Button>
      </header>
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col items-center justify-center pb-[calc(1rem+env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
        {media.isVideo ? (
          <video
            src={media.url}
            controls
            autoPlay
            playsInline
            className="min-h-0 max-h-full w-full flex-1 object-contain"
          />
        ) : (
          <img
            src={media.url}
            alt={media.caption ?? ""}
            className="min-h-0 max-h-full w-full flex-1 object-contain"
          />
        )}
        {media.caption ? (
          <p className="mt-3 max-h-24 shrink-0 overflow-y-auto px-4 text-center text-sm text-on-dark/80">{media.caption}</p>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
