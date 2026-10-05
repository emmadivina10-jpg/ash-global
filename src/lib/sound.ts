/**
 * In-app sounds, generated with the Web Audio API so no audio files ship
 * with the app. Every sound is built from soft sine "bells" — a fundamental
 * plus a quiet octave partial with a long, smooth decay — which gives a
 * warm, polished feel instead of raw beeps.
 *
 * Members can silence message/notification sounds and tap/refresh sounds
 * separately in Settings; phones in silent mode stay silent because the
 * browser/OS mutes the audio output.
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

/**
 * One bell note: fundamental + quiet octave partial, gentle attack and a
 * long exponential decay. `at` is seconds from now, `dur` the full decay.
 */
type Note = { f: number; at: number; dur: number; vol?: number };

function playBell(notes: Note[], master: number) {
  const ctx = context();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") void ctx.resume();
    const now = ctx.currentTime;
    for (const n of notes) {
      const s = now + n.at;
      const vol = (n.vol ?? 1) * master;

      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.0001, s);
      gain.gain.exponentialRampToValueAtTime(vol, s + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, s + n.dur);

      // Fundamental
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(n.f, s);
      osc.connect(gain);
      osc.start(s);
      osc.stop(s + n.dur + 0.05);

      // Quiet octave partial for warmth
      const partialGain = ctx.createGain();
      partialGain.connect(ctx.destination);
      partialGain.gain.setValueAtTime(0.0001, s);
      partialGain.gain.exponentialRampToValueAtTime(vol * 0.25, s + 0.012);
      partialGain.gain.exponentialRampToValueAtTime(0.0001, s + n.dur * 0.6);
      const partial = ctx.createOscillator();
      partial.type = "sine";
      partial.frequency.setValueAtTime(n.f * 2, s);
      partial.connect(partialGain);
      partial.start(s);
      partial.stop(s + n.dur + 0.05);
    }
  } catch {
    /* audio blocked until interaction */
  }
}

/** Soft wooden "tok" when switching bottom tabs. */
export function playTabSound(): void {
  if (typeof window === "undefined" || uiSoundMuted()) return;
  playBell([{ f: 660, at: 0, dur: 0.09, vol: 0.9 }], 0.1);
}

/** Gentle rising chime when a pull-to-refresh is released. */
export function playRefreshSound(): void {
  if (typeof window === "undefined" || uiSoundMuted()) return;
  playBell(
    [
      { f: 523.25, at: 0, dur: 0.14 }, // C5
      { f: 783.99, at: 0.07, dur: 0.2 }, // G5
    ],
    0.12,
  );
}

/** Refresh finished — soft two-note confirmation. */
export function playRefreshDoneSound(): void {
  if (typeof window === "undefined" || uiSoundMuted()) return;
  playBell(
    [
      { f: 880, at: 0, dur: 0.16 }, // A5
      { f: 1318.5, at: 0.08, dur: 0.28 }, // E6
    ],
    0.09,
  );
}

/** Warm three-note chime for new notifications (respects notification mute). */
export function playNotificationSound(): void {
  if (typeof window === "undefined" || soundMuted()) return;
  playBell(
    [
      { f: 659.25, at: 0, dur: 0.4 }, // E5
      { f: 830.61, at: 0.1, dur: 0.4 }, // G#5
      { f: 987.77, at: 0.2, dur: 0.6 }, // B5
    ],
    0.13,
  );
}

/** Plays the ASH message chime, unless the member muted in-app sounds. */
export function playMessageSound(): void {
  if (typeof window === "undefined" || soundMuted()) return;
  playBell(
    [
      { f: 987.77, at: 0, dur: 0.35 }, // B5
      { f: 1318.5, at: 0.12, dur: 0.5 }, // E6
    ],
    0.14,
  );
}
