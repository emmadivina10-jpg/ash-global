import { describe, expect, it, vi } from "vitest";
import { createVoicePlayback } from "../src/components/refer/voice-playback";

describe("WhatsApp voice playback", () => {
  it("pauses the first voice when another voice claims playback", () => {
    const voices = createVoicePlayback(),
      pause = vi.fn();
    const ticket = voices.claim("one", pause);
    voices.claim("two", vi.fn());
    expect(pause).toHaveBeenCalledOnce();
    expect(ticket !== null && voices.owns("one", ticket)).toBe(false);
  });
  it("plays the next voice when the active voice finishes", () => {
    const voices = createVoicePlayback(),
      next = vi.fn();
    voices.register("two", next);
    voices.claim("one", vi.fn());
    voices.ended("one", "two");
    expect(next).toHaveBeenCalledOnce();
  });
  it("does not advance when an inactive voice finishes", () => {
    const voices = createVoicePlayback(),
      next = vi.fn();
    voices.register("three", next);
    voices.claim("two", vi.fn());
    voices.ended("one", "three");
    expect(next).not.toHaveBeenCalled();
  });
  it("recording stops playback and invalidates pending play requests", () => {
    const voices = createVoicePlayback(),
      pause = vi.fn();
    const ticket = voices.claim("one", pause);
    voices.beginRecording("record");
    expect(pause).toHaveBeenCalledOnce();
    expect(ticket !== null && voices.owns("one", ticket)).toBe(false);
    expect(voices.claim("two", vi.fn())).toBeNull();
    voices.endRecording("record");
    expect(voices.claim("two", vi.fn())).not.toBeNull();
  });
  it("unmounting the active player releases playback", () => {
    const voices = createVoicePlayback(),
      pause = vi.fn();
    const unregister = voices.register("one", vi.fn());
    const ticket = voices.claim("one", pause);
    unregister();
    expect(pause).toHaveBeenCalledOnce();
    expect(ticket !== null && voices.owns("one", ticket)).toBe(false);
  });
});
