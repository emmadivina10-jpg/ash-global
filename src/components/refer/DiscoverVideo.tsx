import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

/** Hold for a silent preview; open playback retains native seek/fullscreen controls. */
export function DiscoverVideo({ src, poster, title }: { src: string; poster?: string | undefined; title: string }) {
  const { tx } = useI18n();
  const ref = useRef<HTMLVideoElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const suppressClick = useRef(false);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const [opened, setOpened] = useState(false);
  const [preview, setPreview] = useState(false);
  const [failed, setFailed] = useState(false);
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
      if (!entry?.isIntersecting) video.pause();
    });
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
  const open = () => {
    if (suppressClick.current) { suppressClick.current = false; return; }
    clear();
    const video = ref.current;
    if (!video) return;
    setOpened(true);
    setFailed(false);
    video.removeAttribute("poster");
    video.currentTime = 0;
    video.muted = false;
    void video.play().catch(() => setFailed(true));
  };
  return (
    <div className="discover-video-stage relative aspect-video w-full overflow-hidden">
      <video
        ref={ref}
        src={src}
        poster={opened || preview ? undefined : poster}
        muted={!opened}
        controls={opened}
        playsInline
        preload="metadata"
        aria-label={title}
        className="absolute inset-0 h-full w-full object-contain"
        onError={() => setFailed(true)}
        onPlay={(event) => {
          for (const other of document.querySelectorAll("video")) {
            if (other !== event.currentTarget) other.pause();
          }
        }}
      />
      {!opened && (
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
          {!preview && <span className="grid size-14 place-items-center rounded-full bg-background/80 text-primary ring-1 ring-primary/40 backdrop-blur-sm"><Play className="size-6 fill-current" aria-hidden /></span>}
        </Button>
      )}
      {failed && <p role="status" className="absolute left-3 top-3 bg-background/90 px-3 py-2 text-sm text-foreground">{tx("Video could not play. Please try again.", "Lecture impossible. Veuillez réessayer.")}</p>}
    </div>
  );
}