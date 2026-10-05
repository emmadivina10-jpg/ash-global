import { createHash } from "node:crypto";
import jpeg from "jpeg-js";
import { PNG } from "pngjs";

/** Exact file and decoded-pixel matching, never face recognition. */
export function photoHashes(bytes: Uint8Array) {
  const fileHash = createHash("sha256").update(bytes).digest("hex");
  let image: { width: number; height: number; data: Uint8Array };
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    image = jpeg.decode(bytes, { useTArray: true, maxResolutionInMP: 20, maxMemoryUsageInMB: 96 });
  } else if (bytes[0] === 0x89 && bytes[1] === 0x50) {
    const buffer = Buffer.from(bytes);
    if (buffer.length < 24 || buffer.readUInt32BE(16) * buffer.readUInt32BE(20) > 20_000_000) throw new Error("PHOTO_TOO_LARGE");
    image = PNG.sync.read(buffer);
  } else {
    throw new Error("Please choose a JPG or PNG profile picture.");
  }
  return {
    file_hash: fileHash,
    pixel_hash: createHash("sha256").update(`${image.width}x${image.height}:`).update(image.data).digest("hex"),
  };
}