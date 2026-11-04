import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { trackEvent } from "@/lib/activity";
import { videoOrientation } from "@/lib/campus-channel-policy";

/** Hold for a silent preview; optionally autoplay the most visible feed video. */
export function DiscoverVideo({ src, poster, title, compact = false, autoPlayOnVisible = false }: { src: string; poster?: string | undefined; title: string; compact?: boolean; autoPlayOnVisible?: boolean }) {
  const { tx } = useI18n();
  const ref = useRef<HTMLVideoElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const suppressClick = useRef(false);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const trackedView = useRef(false);
  const [opened, setOpened] = useState(false);
  const [autoPlaying, setAutoPlaying] = useState(false);
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
    if (!video) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting || entry.intersectionRatio < 0.6) {
        video.pause();
        setAutoPlaying(false);
        return;
      }
      if (!autoPlayOnVisible || !video.paused) return;
      video.muted = !opened;
      void video.play().then(() => {
        setAutoPlaying(true);
        if (!trackedView.current) {
          trackedView.current = true;
          trackEvent({ event_type: "view", surface: "feed", target_type: "post", target_id: video.dataset["postId"] ?? null });
        }
      }).catch(() => setFailed(true));
    }, { threshold: [0, 0.6] });
    observer.observe(video);
    const onVisibility = () => { if (document.hidden) { video.pause(); setAutoPlaying(false); } };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clear();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      video.pause();
    };
  }, [autoPlayOnVisible, opened]);

  const open = () => {
    if (suppressClick.current) { suppressClick.current = false; return; }
    clear();
    const video = ref.current;
    if (!video) return;
    setOpened(true);
    setAutoPlaying(false);
    setFailed(false);
    video.removeAttribute("poster");
    video.currentTime = 0;
    video.muted = false;
    void video.play().catch(() => setFailed(true));
  };

  return (
    <div data-orientation={orientation} className={`discover-video-stage relative w-full overflow-hidden bg-black ${compact || orientation === "landscape" ? "aspect-video" : "h-[min(75dvh,48rem)]"}`}>
      <video
        ref={ref}
        data-post-id={autoPlayOnVisible ? title : undefined}
        src={src}
        poster={opened || preview ? undefined : poster}
        muted={!opened}
        controls={opened || autoPlaying}
        playsInline
        preload="metadata"
        aria-label={title}
        className="absolute inset-0 h-full w-full object-contain"
        onError={() => setFailed(true)}
        onLoadedMetadata={(event) => setOrientation(videoOrientation(event.currentTarget.videoWidth, event.currentTarget.videoHeight))}
        onPlay={(event) => {
          for (const other of document.querySelectorAll("video")) if (other !== event.currentTarget) other.pause();
        }}
        onClick={() => { if (autoPlaying && !opened) open(); }}
      />
      {!opened && !autoPlaying ? (
        <Button
          variant="ghost"
          aria-label={`${tx("Play video", "Lire la vidéo")} — ${title}`}
          className="absolute inset-0 h-full w-full rounded-none p-0 hover:bg-transparent touch-pan-y"
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            suppressClick.current = false;
            origin.current = { x: event.clientX, y: event.clientY };
            clear();
            timer.current = setTimeout(() => {
              const video = ref.current;
              if (!video) return;
              held.current = true;
              setPreview(true);
              video.removeAttribute("poster");
              video.muted = true;
              void video.play().catch(() => setFailed(true));
            }, 220);
          }}
          onPointerMove={(event) => {
            const start = origin.current;
            if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12) stopPreview();
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
