import { ArrowLeft, X } from "lucide-react";
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
  useOverlayBack(Boolean(media), onClose);
  if (!media) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={media.caption ?? "Portfolio media"}
      className="fixed inset-0 z-[60] grid place-items-center bg-black/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Back"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute left-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-10 grid size-11 place-items-center rounded-full bg-black/55 text-white backdrop-blur"
      >
        <ArrowLeft className="size-5" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <X className="size-5" aria-hidden />
      </button>
      <div className="max-h-[85vh] w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        {media.isVideo ? (
          <video
            src={media.url}
            controls
            autoPlay
            playsInline
            className="max-h-[85vh] w-full rounded-2xl bg-black"
          />
        ) : (
          <img
            src={media.url}
            alt={media.caption ?? ""}
            className="max-h-[85vh] w-full rounded-2xl object-contain"
          />
        )}
        {media.caption ? (
          <p className="mt-3 text-center text-sm text-white/80">{media.caption}</p>
        ) : null}
      </div>
    </div>
  );
}
