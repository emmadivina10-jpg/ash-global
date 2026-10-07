import { describe, expect, it } from "vitest";
import { encode } from "fast-png";
import { photoHashes } from "../src/lib/identity-photo.server";

const png = (width: number, height: number, data: number[], extra?: Uint8Array) => {
  const file = encode({ width, height, channels: 4, depth: 8, data: new Uint8Array(data) });
  if (!extra) return file;
  // Same pixels, different file bytes: append an ancillary-free trailing byte copy before IEND is not valid, so re-encode with text.
  return encode({ width, height, channels: 4, depth: 8, data: new Uint8Array(data), text: { note: "copy" } });
};

describe("verified photo comparison", () => {
  it("matches pixels even when the file bytes differ", () => {
    const pixels = [12, 30, 40, 255, 100, 90, 70, 255];
    const a = photoHashes(png(2, 1, pixels));
    const b = photoHashes(png(2, 1, pixels, new Uint8Array([1])));
    expect(a.file_hash).not.toBe(b.file_hash);
    expect(a.pixel_hash).toBe(b.pixel_hash);
  });
  it("treats RGB and RGBA versions of the same opaque image as equal", () => {
    const rgb = encode({ width: 1, height: 1, channels: 3, depth: 8, data: new Uint8Array([5, 6, 7]) });
    const rgba = encode({ width: 1, height: 1, channels: 4, depth: 8, data: new Uint8Array([5, 6, 7, 255]) });
    expect(photoHashes(rgb).pixel_hash).toBe(photoHashes(rgba).pixel_hash);
  });
  it("does not match a different image", () => {
    const a = photoHashes(png(1, 1, [10, 20, 30, 255]));
    const b = photoHashes(png(1, 1, [90, 80, 70, 255]));
    expect(a.pixel_hash).not.toBe(b.pixel_hash);
  });
  it("rejects invalid files without strikes", () => {
    expect(() => photoHashes(new Uint8Array([1, 2, 3]))).toThrow();
  });
});
