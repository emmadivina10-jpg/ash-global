import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Pause, Play, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const VOICE_BUCKET = "voice-notes";
export const VOICE_MAX_SECONDS = 180;
const BARS = 32;

function fmt(sec: number) {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function pickMime() {
  if (typeof MediaRecorder === "undefined") return "";
  for (const m of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return "";
}

/** Recorder bar that replaces the composer while recording, WhatsApp-style. */
export function VoiceRecorder({
  conversationId,
  userId,
  disabled,
  onSent,
}: {
  conversationId: string;
  userId: string | undefined;
  disabled?: boolean;
  onSent: (meta: { path: string; duration: number; waveform: number[] }) => Promise<boolean>;
}) {
  const { tx } = useI18n();
  const [state, setState] = useState<"idle" | "recording" | "uploading">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const started = useRef(0);
  const samples = useRef<number[]>([]);
  const cancelled = useRef(false);
  const raf = useRef<number | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);

  function cleanup() {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    void audioCtx.current?.close().catch(() => undefined);
    audioCtx.current = null;
  }

  useEffect(() => () => cleanup(), []);

  async function start() {
    if (disabled || !userId) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error(tx("Voice notes aren't supported here.", "Notes vocales non prises en charge ici."));
      return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      const mime = pickMime();
      const r = mime ? new MediaRecorder(s, { mimeType: mime }) : new MediaRecorder(s);
      chunks.current = [];
      samples.current = [];
      cancelled.current = false;
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.onstop = () => void finish(r.mimeType || mime || "audio/webm");
      rec.current = r;
      r.start(250);
      started.current = Date.now();
      setElapsed(0);
      setLevels([]);
      setState("recording");

      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      audioCtx.current = ctx;
      const an = ctx.createAnalyser();
      an.fftSize = 256;
      ctx.createMediaStreamSource(s).connect(an);
      const buf = new Uint8Array(an.frequencyBinCount);
      let last = 0;
      const tick = (t: number) => {
        const secs = (Date.now() - started.current) / 1000;
        setElapsed(secs);
        if (secs >= VOICE_MAX_SECONDS) {
          stop();
          return;
        }
        if (t - last > 90) {
          last = t;
          an.getByteTimeDomainData(buf);
          let peak = 0;
          for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
          const lvl = Math.min(1, peak / 64);
          samples.current.push(lvl);
          setLevels((l) => [...l.slice(-39), lvl]);
        }
        raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
    } catch {
      cleanup();
      toast.error(tx("Allow microphone access to record.", "Autorisez le micro pour enregistrer."));
    }
  }

  function stop(cancel = false) {
    cancelled.current = cancel;
    if (rec.current?.state === "recording") rec.current.stop();
    else cleanup();
  }

  async function finish(mime: string) {
    const duration = (Date.now() - started.current) / 1000;
    cleanup();
    if (cancelled.current || duration < 0.8 || !userId) {
      setState("idle");
      return;
    }
    setState("uploading");
    const blob = new Blob(chunks.current, { type: mime.split(";")[0] ?? "audio/webm" });
    const ext = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
    const path = `${conversationId}/${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from(VOICE_BUCKET)
      .upload(path, blob, { contentType: blob.type, upsert: false });
    if (error) {
      toast.error(tx("Voice note not sent.", "Note vocale non envoyée."));
      setState("idle");
      return;
    }
    const s = samples.current;
    const waveform = Array.from({ length: BARS }, (_, i) => {
      const slice = s.slice(Math.floor((i * s.length) / BARS), Math.floor(((i + 1) * s.length) / BARS));
      const v = slice.length ? Math.max(...slice) : 0;
      return Math.round(Math.max(0.12, v) * 100) / 100;
    });
    const ok = await onSent({ path, duration: Math.round(duration), waveform });
    if (!ok) void supabase.storage.from(VOICE_BUCKET).remove([path]);
    setState("idle");
  }

  if (state === "idle") {
    return (
      <button
        type="button"
        onClick={() => void start()}
        disabled={disabled}
        aria-label={tx("Record voice note", "Enregistrer une note vocale")}
        className="mb-5 grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform active:scale-90 disabled:opacity-50"
      >
        <Mic className="size-[18px]" aria-hidden />
      </button>
    );
  }

  return (
    <div className="absolute inset-0 z-10 flex items-center gap-2 bg-background/95 px-3 py-2 backdrop-blur">
      <button
        type="button"
        onClick={() => stop(true)}
        disabled={state === "uploading"}
        aria-label={tx("Cancel recording", "Annuler l'enregistrement")}
        className="grid size-10 shrink-0 place-items-center rounded-full text-destructive hover:bg-destructive/10"
      >
        <Trash2 className="size-5" aria-hidden />
      </button>
      <span className="flex items-center gap-1.5 text-sm font-semibold tabular-nums">
        <span className="size-2.5 animate-pulse rounded-full bg-destructive" aria-hidden />
        {fmt(elapsed)}
      </span>
      <div className="flex h-8 min-w-0 flex-1 items-center justify-end gap-[3px] overflow-hidden">
        {levels.map((l, i) => (
          <span
            key={i}
            className="w-[3px] shrink-0 rounded-full bg-primary/80"
            style={{ height: `${Math.max(12, l * 100)}%` }}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => stop()}
        disabled={state === "uploading"}
        aria-label={tx("Send voice note", "Envoyer la note vocale")}
        className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm active:scale-90"
      >
        {state === "uploading" ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Send className="size-4" aria-hidden />
        )}
      </button>
    </div>
  );
}

const urlCache = new Map<string, { url: string; at: number }>();

/** Bubble player: play/pause, waveform with progress, duration. */
export function VoiceNotePlayer({
  path,
  duration,
  waveform,
  mine,
}: {
  path: string;
  duration: number;
  waveform?: number[] | undefined;
  mine: boolean;
}) {
  const { tx } = useI18n();
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState(0);
  const [rate, setRate] = useState(1);
  const bars = waveform?.length ? waveform : Array.from({ length: BARS }, (_, i) => 0.3 + 0.5 * Math.abs(Math.sin(i * 1.7)));
  const total = duration || audio.current?.duration || 0;
  const progress = total ? Math.min(1, pos / total) : 0;

  useEffect(() => () => audio.current?.pause(), []);

  async function toggle() {
    if (audio.current && playing) {
      audio.current.pause();
      return;
    }
    if (!audio.current) {
      setLoading(true);
      let url = urlCache.get(path);
      if (!url || Date.now() - url.at > 50 * 60 * 1000) {
        const { data, error } = await supabase.storage.from(VOICE_BUCKET).createSignedUrl(path, 3600);
        if (error || !data) {
          setLoading(false);
          toast.error(tx("Couldn't play voice note.", "Lecture impossible."));
          return;
        }
        url = { url: data.signedUrl, at: Date.now() };
        urlCache.set(path, url);
      }
      const a = new Audio(url.url);
      a.playbackRate = rate;
      a.ontimeupdate = () => setPos(a.currentTime);
      a.onplay = () => setPlaying(true);
      a.onpause = () => setPlaying(false);
      a.onended = () => {
        setPlaying(false);
        setPos(0);
      };
      audio.current = a;
    }
    try {
      await audio.current.play();
    } catch {
      toast.error(tx("Couldn't play voice note.", "Lecture impossible."));
    }
    setLoading(false);
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    if (!audio.current || !total) return;
    const r = e.currentTarget.getBoundingClientRect();
    audio.current.currentTime = ((e.clientX - r.left) / r.width) * total;
  }

  function cycleRate() {
    const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
    setRate(next);
    if (audio.current) audio.current.playbackRate = next;
  }

  return (
    <div className="flex w-60 max-w-full items-center gap-2.5 py-0.5">
      <button
        type="button"
        onClick={() => void toggle()}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label={playing ? tx("Pause", "Pause") : tx("Play voice note", "Écouter la note vocale")}
        className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm active:scale-90"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : playing ? (
          <Pause className="size-4 fill-current" aria-hidden />
        ) : (
          <Play className="ml-0.5 size-4 fill-current" aria-hidden />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div
          className="flex h-7 cursor-pointer items-center gap-[2px]"
          onClick={seek}
          onPointerDown={(e) => e.stopPropagation()}
          role="presentation"
        >
          {bars.map((b, i) => (
            <span
              key={i}
              className={cn(
                "w-[3px] flex-1 rounded-full transition-colors",
                i / bars.length < progress ? "bg-primary" : mine ? "bg-foreground/25" : "bg-muted-foreground/35",
              )}
              style={{ height: `${Math.max(15, b * 100)}%` }}
            />
          ))}
        </div>
        <div className="mt-0.5 flex items-center justify-between text-[10px] text-muted-foreground tabular-nums">
          <span>{fmt(playing || pos ? pos : total)}</span>
          {playing ? (
            <button type="button" onClick={cycleRate} className="rounded-full bg-foreground/10 px-1.5 font-bold">
              {rate}×
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
