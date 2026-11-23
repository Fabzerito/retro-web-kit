// Minimal 8-bit RGBA PNG encoder, pixel canvas helpers, and 5x7 bitmap font.
// Zero dependencies (Node stdlib only).
import zlib from "node:zlib";

// 5x7 bitmap font: 7 rows, 5-bit integers (bit 4 = leftmost pixel)
export const FONT_5X7 = {
  A: [14, 17, 17, 31, 17, 17, 17],
  B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14],
  D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31],
  F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15],
  H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14],
  J: [7, 2, 2, 2, 2, 18, 12],
  K: [17, 18, 20, 24, 20, 18, 17],
  L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17],
  N: [17, 25, 21, 19, 17, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13],
  R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30],
  T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 27, 17],
  X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4],
  Z: [31, 1, 2, 4, 8, 16, 31],
  "0": [14, 17, 19, 21, 25, 17, 14],
  "1": [4, 12, 4, 4, 4, 4, 14],
  "2": [14, 17, 1, 6, 8, 16, 31],
  "3": [31, 2, 4, 2, 1, 17, 14],
  "4": [2, 6, 10, 18, 31, 2, 2],
  "5": [31, 16, 30, 1, 1, 17, 14],
  "6": [6, 8, 16, 30, 17, 17, 14],
  "7": [31, 1, 2, 4, 8, 8, 8],
  "8": [14, 17, 17, 14, 17, 17, 14],
  "9": [14, 17, 17, 15, 1, 2, 12],
  " ": [0, 0, 0, 0, 0, 0, 0],
  "!": [4, 4, 4, 4, 4, 0, 4],
  ".": [0, 0, 0, 0, 0, 12, 12],
  ",": [0, 0, 0, 0, 0, 4, 8],
  "-": [0, 0, 0, 31, 0, 0, 0],
  ":": [0, 12, 12, 0, 12, 12, 0],
  ";": [0, 4, 4, 0, 4, 4, 8],
  "'": [4, 4, 8, 0, 0, 0, 0],
  '"': [10, 10, 0, 0, 0, 0, 0],
  "&": [12, 18, 20, 8, 21, 18, 13],
  "+": [0, 4, 4, 31, 4, 4, 0],
  "_": [0, 0, 0, 0, 0, 0, 31],
  "/": [1, 2, 4, 8, 16, 0, 0],
  "*": [0, 21, 14, 31, 14, 21, 0],
  "?": [14, 17, 1, 2, 4, 0, 4],
  "<": [2, 4, 8, 16, 8, 4, 2],
  ">": [8, 4, 2, 1, 2, 4, 8],
  "(": [2, 4, 8, 8, 8, 4, 2],
  ")": [8, 4, 2, 2, 2, 4, 8],
  "~": [0, 0, 8, 21, 2, 0, 0],
  "#": [10, 31, 10, 10, 31, 10, 0],
  "@": [14, 17, 23, 21, 23, 16, 14],
};

export function glyph(ch) {
  return FONT_5X7[ch] || FONT_5X7[ch.toUpperCase()] || FONT_5X7["?"];
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = ~0;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

export function encodePNG(w, h, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const stride = w * 4 + 1;
  const raw = Buffer.alloc(stride * h);
  for (let y = 0; y < h; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

export function createCanvas(w, h, [r, g, b] = [0, 0, 0], a = 255) {
  const px = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    px[i * 4] = r;
    px[i * 4 + 1] = g;
    px[i * 4 + 2] = b;
    px[i * 4 + 3] = a;
  }
  return { w, h, px };
}

export function setPx(c, x, y, [r, g, b], a = 255) {
  if (x < 0 || y < 0 || x >= c.w || y >= c.h) return;
  const i = (y * c.w + x) * 4;
  c.px[i] = r;
  c.px[i + 1] = g;
  c.px[i + 2] = b;
  c.px[i + 3] = a;
}

export function setPxWrap(c, x, y, col, a = 255) {
  const s = c.w;
  const t = c.h;
  setPx(c, ((x % s) + s) % s, ((y % t) + t) % t, col, a);
}

export function fillRect(c, x, y, w, h, col, a = 255) {
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) setPx(c, px, py, col, a);
  }
}

export function drawBevelBorder(c, thickness = 1, baseColor = [192, 192, 192]) {
  const light = mixRgb(baseColor, [255, 255, 255], 0.55);
  const dark = mixRgb(baseColor, [0, 0, 0], 0.55);
  for (let t = 0; t < thickness; t++) {
    for (let x = t; x < c.w - t; x++) {
      setPx(c, x, t, light);
      setPx(c, x, c.h - 1 - t, dark);
    }
    for (let y = t; y < c.h - t; y++) {
      setPx(c, t, y, light);
      setPx(c, c.w - 1 - t, y, dark);
    }
  }
}

export function mixRgb([r, g, b], [r2, g2, b2], f) {
  return [
    Math.round(r + (r2 - r) * f),
    Math.round(g + (g2 - g) * f),
    Math.round(b + (b2 - b) * f),
  ];
}

export function drawText(c, text, x, y, col, scale = 1) {
  let cx = x;
  for (const ch of text) {
    const g = glyph(ch);
    for (let row = 0; row < 7; row++) {
      for (let colIdx = 0; colIdx < 5; colIdx++) {
        if ((g[row] >> (4 - colIdx)) & 1) {
          fillRect(c, cx + colIdx * scale, y + row * scale, scale, scale, col);
        }
      }
    }
    cx += 6 * scale;
  }
}

export function measureText(text, scale = 1) {
  if (!text.length) return 0;
  return (text.length * 6 - 1) * scale;
}

export function parseColor(value, fallback) {
  if (Array.isArray(value) && value.length === 3 && value.every((n) => typeof n === "number" && Number.isFinite(n))) {
    return value.map((n) => Math.max(0, Math.min(255, Math.round(n))));
  }
  if (typeof value === "string") {
    const s = value.trim();
    const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
    if (hex) {
      let h = hex[1];
      if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    const parts = s.split(",").map((p) => Number(p.trim()));
    if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
      return parts.map((n) => Math.max(0, Math.min(255, Math.round(n))));
    }
  }
  return fallback;
}
