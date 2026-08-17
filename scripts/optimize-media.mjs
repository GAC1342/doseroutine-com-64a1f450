/**
 * Lossless size reduction helpers for CI visual artifacts.
 *
 * Two independent wins, no native deps:
 *   1. recompressPng() re-deflates the image data at maximum zlib effort and
 *      drops ancillary metadata chunks (tEXt/iTXt/zTXt/tIME) Playwright bakes
 *      in. Pixels are untouched, so diffs stay byte-exact for review.
 *   2. gzipText() shrinks HTML/JSON/JS/CSS inside the report folder. Actions
 *      artifacts are zipped anyway, so we only pre-gzip files we are NOT
 *      linking directly from the gallery.
 */
import { deflateSync, inflateSync } from "node:zlib";

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Chunks that carry no rendering information for a screenshot. */
const DROPPABLE = new Set(["tEXt", "iTXt", "zTXt", "tIME", "eXIf", "bKGD", "sPLT", "hIST"]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
};

/**
 * @param {Buffer} input raw PNG bytes
 * @returns {Buffer} a smaller PNG, or the original when nothing could be saved
 */
export function recompressPng(input) {
  try {
    if (input.length < 8 || !input.subarray(0, 8).equals(PNG_MAGIC)) return input;

    const kept = [];
    const idat = [];
    let offset = 8;
    while (offset + 8 <= input.length) {
      const length = input.readUInt32BE(offset);
      const type = input.toString("ascii", offset + 4, offset + 8);
      const data = input.subarray(offset + 8, offset + 8 + length);
      if (offset + 12 + length > input.length) return input; // truncated file
      if (type === "IDAT") idat.push(Buffer.from(data));
      else if (type === "IEND") break;
      else if (!DROPPABLE.has(type)) kept.push({ type, data: Buffer.from(data) });
      offset += 12 + length;
    }
    if (idat.length === 0) return input;

    const raw = inflateSync(Buffer.concat(idat));
    const packed = deflateSync(raw, { level: 9, memLevel: 9, windowBits: 15 });
    if (packed.length >= Buffer.concat(idat).length && kept.length === 0) return input;

    const out = Buffer.concat([
      PNG_MAGIC,
      ...kept.map((c) => chunk(c.type, c.data)),
      chunk("IDAT", packed),
      chunk("IEND", Buffer.alloc(0)),
    ]);
    return out.length < input.length ? out : input;
  } catch {
    return input; // never trade correctness for bytes
  }
}

export const humanBytes = (n) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};
