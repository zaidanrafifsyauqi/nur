/**
 * Generates NUR PWA icons as real PNGs with zero dependencies
 * (Node built-in zlib only). Art: Deep Emerald rounded square +
 * Warm Gold crescent + Ivory star — no fonts, no external assets.
 *
 * Run: `node scripts/make-pwa-icons.mjs`
 * Output: public/icons/icon-192.png, icon-512.png, icon-512-maskable.png
 * (maskable keeps art inside the ~80% safe zone).
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const EMERALD = [15, 92, 77, 255];
const GOLD = [214, 168, 79, 255];
const IVORY = [252, 251, 247, 255];

function crc32Table() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
}
const CRC_TABLE = crc32Table();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const b of bytes) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function toPng(size, pixels) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter byte: none
    pixels
      .subarray(y * size * 4, (y + 1) * size * 4)
      .copy(raw, y * (size * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function hex(c) {
  return c.map((v) => v.toString(16).padStart(2, "0")).join("");
}

/** Paint art into RGBA buffer. scaleArt < 1 leaves maskable safe-zone padding. */
function paint(size, scaleArt) {
  const px = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const corner = size * 0.22;
  const half = size / 2;
  // Crescent + star geometry scale with the art box.
  const s = scaleArt;
  const moonR = size * 0.27 * s;
  const moonCx = cx - size * 0.04 * s;
  const moonCy = cy - size * 0.02 * s;
  const cutR = size * 0.23 * s;
  const cutCx = cx + size * 0.07 * s;
  const cutCy = cy - size * 0.07 * s;
  const starCx = cx + size * 0.17 * s;
  const starCy = cy + size * 0.13 * s;
  const starR = size * 0.035 * s;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Rounded-square background.
      const dx = Math.max(Math.abs(x - cx) - (half - corner), 0);
      const dy = Math.max(Math.abs(y - cy) - (half - corner), 0);
      let color = EMERALD;
      if (dx * dx + dy * dy > corner * corner) color = [0, 0, 0, 0];
      else {
        const inMoon =
          (x - moonCx) ** 2 + (y - moonCy) ** 2 <= moonR * moonR &&
          (x - cutCx) ** 2 + (y - cutCy) ** 2 > cutR * cutR;
        const inStar = (x - starCx) ** 2 + (y - starCy) ** 2 <= starR * starR;
        if (inMoon) color = GOLD;
        else if (inStar) color = IVORY;
      }
      const i = (y * size + x) * 4;
      px[i] = color[0];
      px[i + 1] = color[1];
      px[i + 2] = color[2];
      px[i + 3] = color[3];
    }
  }
  return px;
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "icons");
mkdirSync(outDir, { recursive: true });

for (const [name, size, scale] of [
  ["icon-192.png", 192, 1],
  ["icon-512.png", 512, 1],
  ["icon-512-maskable.png", 512, 0.8],
]) {
  const file = join(outDir, name);
  writeFileSync(file, toPng(size, paint(size, scale)));
  console.log(`${name} (${size}x${size}) emerald #${hex(EMERALD.slice(0, 3))} + gold #${hex(GOLD.slice(0, 3))}`);
}
