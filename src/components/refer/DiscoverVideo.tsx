import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { trackEvent } from "@/lib/activity";
import { videoOrientation } from "@/lib/campus-channel-policy";

/** A thumbnail-first video: hold to preview, and pause automatically when scrolled away. */
export function DiscoverVideo({ src, poster, title, compact = false }: { src: string; poster?: string | undefined; title: string; compact?: boolean }) {
  const { tx } = useI18n();
  const ref = useRef<HTMLVideoElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const suppressClick = useRef(false);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const trackedView = useRef(false);
  const [opened, setOpened] = useState(false);
  const [preview, setPreview] = useState(false);
  const [failed, setFailed] = useState(false);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("landscape");

  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const stopPreview = () => {
    clear();
    origin.current = null;
    if (held.current) {
      ref.current?.pause();
      held.current = false;
      setPreview(false);
      suppressClick.current = true;
    }
  };

  useEffect(() => {
    const video = ref.current;
    if (!video || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting || entry.intersectionRatio < 0.6) {
        video.pause();
        setPreview(false);
        held.current = false;
      }
    }, { threshold: [0, 0.6] });
    observer.observe(video);
    const onVisibility = () => { if (document.hidden) video.pause(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clear();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      video.pause();
    };
  }, []);

  const playHeldPreview = () => {
    const video = ref.current;
    if (!video || opened) return;
    held.current = true;
    setPreview(true);
    setFailed(false);
    video.muted = true;
    void video.play().then(() => {
      if (!trackedView.current) {
        trackedView.current = true;
        trackEvent({ event_type: "view", surface: "feed", target_type: "post", target_id: video.dataset["postId"] ?? null });
      }
    }).catch(() => setFailed(true));
  };

  const open = () => {
    if (suppressClick.current) { suppressClick.current = false; return; }
    clear();
    const video = ref.current;
    if (!video) return;
    setOpened(true);
    setPreview(false);
    held.current = false;
    setFailed(false);
    video.muted = false;
    void video.play().catch(() => setFailed(true));
  };

  return (
    <div data-orientation={orientation} className={`discover-video-stage relative w-full overflow-hidden bg-black ${compact || orientation === "landscape" ? "aspect-video" : "h-[min(75dvh,48rem)]"}`}>
      <video
        ref={ref}
        src={src}
        poster={poster}
        muted={!opened}
        controls={opened}
        playsInline
        preload="metadata"
        aria-label={title}
        className="absolute inset-0 size-full object-contain"
        onError={() => setFailed(true)}
        onLoadedMetadata={(event) => setOrientation(videoOrientation(event.currentTarget.videoWidth, event.currentTarget.videoHeight))}
        onPlay={(event) => { for (const other of document.querySelectorAll("video")) if (other !== event.currentTarget) other.pause(); }}
      />
      {!opened ? (
        <Button
          variant="ghost"
          aria-label={`${tx("Hold to preview or tap to play", "Maintenez pour prévisualiser ou touchez pour lire")} — ${title}`}
          className="absolute inset-0 h-full w-full touch-pan-y rounded-none p-0 hover:bg-transparent"
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            suppressClick.current = false;
            origin.current = { x: event.clientX, y: event.clientY };
            clear();
            timer.current = setTimeout(playHeldPreview, 500);
          }}
          onPointerMove={(event) => {
            const start = origin.current;
            if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12) {
              if (!held.current) clear();
              else stopPreview();
            }
          }}
          onPointerUp={stopPreview}
          onPointerCancel={stopPreview}
          onPointerLeave={stopPreview}
          onContextMenu={(event) => event.preventDefault()}
          onClick={open}
        >
          {!preview ? <span className="grid size-14 place-items-center rounded-full bg-background/80 text-primary ring-1 ring-primary/40 backdrop-blur-sm"><Play className="size-6 fill-current" aria-hidden /></span> : null}
        </Button>
      ) : null}
      {failed ? <p role="status" className="absolute left-3 top-3 bg-background/90 px-3 py-2 text-sm text-foreground">{tx("Video could not play. Please try again.", "Lecture impossible. Veuillez réessayer.")}</p> : null}
    </div>
  );
}
