/**
 * In-app notification sound.
 *
 * A short two-note chime generated with the Web Audio API, so no audio file
 * ships with the app. Members can silence it in Settings; phones in silent
 * mode stay silent because the browser/OS mutes the audio output.
 */
const MUTE_KEY = "ash.sound.muted";

export function soundMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSoundMuted(muted: boolean) {
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* private mode — preference is not remembered */
  }
}

type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
  __ashAudioCtx?: AudioContext;
};

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const win = window as AudioWindow;
  const Ctor = window.AudioContext ?? win.webkitAudioContext;
  if (!Ctor) return null;
  if (!win.__ashAudioCtx) win.__ashAudioCtx = new Ctor();
  return win.__ashAudioCtx;
}

/** Plays the ASH message chime, unless the member muted in-app sounds. */
export function playMessageSound(): void {
  if (typeof window === "undefined" || soundMuted()) return;
  const ctx = context();
  if (!ctx) return;

  try {
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    [880, 1320].forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, now + index * 0.11);
      osc.connect(gain);
      osc.start(now + index * 0.11);
      osc.stop(now + index * 0.11 + 0.3);
    });
  } catch {
    /* audio blocked until the member interacts with the page */
  }
}

const UI_MUTE_KEY = "ash.sound.ui.muted";

export function uiSoundMuted(): boolean {
  try {
    return window.localStorage.getItem(UI_MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setUiSoundMuted(muted: boolean) {
  try {
    window.localStorage.setItem(UI_MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* not remembered */
  }
}

type Tone = { f: number; at: number; dur: number; type?: OscillatorType; to?: number };

function play(tones: Tone[], peak: number) {
  const ctx = context();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    for (const t of tones) {
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      const s = now + t.at;
      gain.gain.setValueAtTime(0.0001, s);
      gain.gain.exponentialRampToValueAtTime(peak, s + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, s + t.dur);
      const osc = ctx.createOscillator();
      osc.type = t.type ?? "sine";
      osc.frequency.setValueAtTime(t.f, s);
      if (t.to) osc.frequency.exponentialRampToValueAtTime(t.to, s + t.dur);
      osc.connect(gain);
      osc.start(s);
      osc.stop(s + t.dur + 0.02);
    }
  } catch {
    /* audio blocked until interaction */
  }
}

/** Soft "tock" when switching bottom tabs. */
export function playTabSound(): void {
  if (typeof window === "undefined" || uiSoundMuted()) return;
  play([{ f: 620, to: 420, at: 0, dur: 0.07, type: "triangle" }], 0.12);
}

/** Rising "pop" when a pull-to-refresh is released. */
export function playRefreshSound(): void {
  if (typeof window === "undefined" || uiSoundMuted()) return;
  play([{ f: 380, to: 760, at: 0, dur: 0.12, type: "sine" }], 0.14);
}

/** Refresh finished — light confirming tick. */
export function playRefreshDoneSound(): void {
  if (typeof window === "undefined" || uiSoundMuted()) return;
  play([{ f: 1180, at: 0, dur: 0.06, type: "sine" }], 0.08);
}

/** Three-note bell for new notifications (respects the notification mute). */
export function playNotificationSound(): void {
  if (typeof window === "undefined" || soundMuted()) return;
  play(
    [
      { f: 784, at: 0, dur: 0.35 },
      { f: 988, at: 0.09, dur: 0.35 },
      { f: 1175, at: 0.18, dur: 0.5 },
    ],
    0.16,
  );
}
