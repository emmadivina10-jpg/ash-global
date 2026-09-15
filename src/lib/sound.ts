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
