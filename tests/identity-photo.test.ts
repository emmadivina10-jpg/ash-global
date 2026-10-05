import { describe, expect, it } from "vitest";
import { PNG } from "pngjs";
import { photoHashes } from "../src/lib/identity-photo.server";

describe("verified photo comparison", () => {
  it("matches pixels independently of PNG compression", () => {
    const image = { width: 2, height: 1, data: Buffer.from([12,30,40,255,100,90,70,255]) };
    const a = photoHashes(PNG.sync.write(image, { deflateLevel: 0 }));
    const b = photoHashes(PNG.sync.write(image, { deflateLevel: 9 }));
    expect(a.file_hash).not.toBe(b.file_hash);
    expect(a.pixel_hash).toBe(b.pixel_hash);
  });
  it("does not match a different image", () => {
    const a = photoHashes(PNG.sync.write({ width: 1, height: 1, data: Buffer.from([10,20,30,255]) }));
    const b = photoHashes(PNG.sync.write({ width: 1, height: 1, data: Buffer.from([90,80,70,255]) }));
    expect(a.pixel_hash).not.toBe(b.pixel_hash);
  });
  it("rejects invalid files without strikes", () => {
    expect(() => photoHashes(new Uint8Array([1,2,3]))).toThrow();
  });
});