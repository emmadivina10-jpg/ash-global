import { createHash } from "node:crypto";
import jpeg from "jpeg-js";
import { convertIndexedToRgb, decode as decodePngFile, type DecodedPng } from "fast-png";

type RgbaImage = { width: number; height: number; data: Uint8Array };

function decodePng(bytes: Uint8Array): DecodedPng {
  return decodePngFile(bytes);
}

/** Normalises any PNG colour type / bit depth to 8-bit RGBA so equal pixels hash equally. */
function toRgba(png: DecodedPng): RgbaImage {
  const { width, height, depth } = png;
  const count = width * height;
  let channels = png.channels;
  let samples: ArrayLike<number>;
  let max = 255;
  if (png.palette) {
    samples = convertIndexedToRgb(png);
    channels = png.palette[0]?.length ?? 3;
  } else if (depth < 8) {
    const unpacked = new Uint8Array(count * channels);
    const rowBytes = Math.ceil((width * channels * depth) / 8);
    const mask = (1 << depth) - 1;
    for (let y = 0; y < height; y++) {
      for (let i = 0; i < width * channels; i++) {
        const bitPos = i * depth;
        const byte = png.data[y * rowBytes + (bitPos >> 3)] ?? 0;
        unpacked[y * width * channels + i] = (byte >> (8 - depth - (bitPos & 7))) & mask;
      }
    }
    samples = unpacked;
    max = mask;
  } else {
    samples = png.data;
    max = depth === 16 ? 65535 : 255;
  }
  const scale = (v: number) => (max === 255 ? v : Math.round((v * 255) / max));
  const out = new Uint8Array(count * 4);
  for (let p = 0; p < count; p++) {
    const s = p * channels;
    const o = p * 4;
    if (channels >= 3) {
      out[o] = scale(samples[s] ?? 0);
      out[o + 1] = scale(samples[s + 1] ?? 0);
      out[o + 2] = scale(samples[s + 2] ?? 0);
      out[o + 3] = channels === 4 ? scale(samples[s + 3] ?? 0) : 255;
    } else {
      const g = scale(samples[s] ?? 0);
      out[o] = g;
      out[o + 1] = g;
      out[o + 2] = g;
      out[o + 3] = channels === 2 ? scale(samples[s + 1] ?? 0) : 255;
    }
  }
  return { width, height, data: out };
}

/** Exact file and decoded-pixel matching, never face recognition. */
export function photoHashes(bytes: Uint8Array) {
  const fileHash = createHash("sha256").update(bytes).digest("hex");
  let image: RgbaImage;
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    image = jpeg.decode(bytes, { useTArray: true, maxResolutionInMP: 20, maxMemoryUsageInMB: 96 });
  } else if (bytes[0] === 0x89 && bytes[1] === 0x50) {
    if (bytes.length < 24) throw new Error("Please choose a JPG or PNG profile picture.");
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (view.getUint32(16) * view.getUint32(20) > 20_000_000) throw new Error("PHOTO_TOO_LARGE");
    image = toRgba(decodePng(bytes));
  } else {
    throw new Error("Please choose a JPG or PNG profile picture.");
  }
  return {
    file_hash: fileHash,
    pixel_hash: createHash("sha256").update(`${image.width}x${image.height}:`).update(image.data).digest("hex"),
  };
}
