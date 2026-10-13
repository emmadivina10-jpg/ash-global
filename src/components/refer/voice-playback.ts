/** One owner across chats, including requests still resolving their signed URL. */
export function createVoicePlayback() {
  let version = 0;
  let active: { id: string; pause: () => void } | null = null;
  const recordings = new Set<string>();
  const players = new Map<string, () => void>();
  return {
    register(id: string, play: () => void) {
      players.set(id, play);
      return () => {
        players.delete(id);
        if (active?.id === id) this.stop();
      };
    },
    claim(id: string, pause: () => void) {
      this.stop();
      if (recordings.size) return null;
      active = { id, pause };
      return version;
    },
    owns(id: string, ticket: number) {
      return !recordings.size && active?.id === id && version === ticket;
    },
    stop() {
      version += 1;
      const previous = active;
      active = null;
      previous?.pause();
    },
    release(id: string) {
      if (active?.id === id) this.stop();
    },
    ended(id: string, nextId?: string) {
      if (active?.id !== id) return;
      this.stop();
      if (nextId && !recordings.size) players.get(nextId)?.();
    },
    beginRecording(id: string) {
      recordings.add(id);
      this.stop();
    },
    endRecording(id: string) {
      recordings.delete(id);
    },
  };
}
export const voicePlayback = createVoicePlayback();
