// Procedural retro 90s graphic asset generators (PNG and animated GIF89a).
// Zero dependencies.
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve, isAbsolute } from "node:path";
import {
  createCanvas,
  setPx,
  setPxWrap,
  fillRect,
  drawBevelBorder,
  drawText,
  measureText,
  encodePNG,
  parseColor,
  mixRgb,
} from "./png.mjs";
import { encodeGIF } from "./gif.mjs";

export function safeOutPath(out, cwd = process.cwd(), { allowAbsolute = false } = {}) {
  if (typeof out !== "string" || !out.trim()) {
    throw new Error("out must be a non-empty path");
  }
  const normalized = out.trim();
  if (!allowAbsolute && (isAbsolute(normalized) || normalized.split(/[\\/]/).includes(".."))) {
    throw new Error("out must be a relative path inside the target directory");
  }
  const full = resolve(cwd, normalized);
  mkdirSync(dirname(full), { recursive: true });
  return full;
}

function clampInt(v, fallback, lo, hi) {
  const n = typeof v === "number" && Number.isFinite(v) ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

// Seeded PRNG (mulberry32) so tests or users can pass a seed if desired
function makeRng(seed) {
  if (seed === undefined || seed === null) return Math.random;
  let a = Number(seed) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a seamlessly tileable 90s starfield background PNG.
 */
export function generateStarfield(opts = {}, cwd = process.cwd()) {
  const size = clampInt(opts.size, 128, 16, 512);
  const stars = clampInt(opts.stars, 90, 5, 2000);
  const sky = parseColor(opts.sky, [0, 0, 51]);
  const rand = makeRng(opts.seed);

  const c = createCanvas(size, size, sky);
  const palette = [
    [255, 255, 255],
    [255, 255, 153],
    [153, 255, 255],
    [255, 153, 255],
    [255, 255, 255],
    [204, 204, 255],
  ];

  for (let i = 0; i < stars; i++) {
    const x = Math.floor(rand() * size);
    const y = Math.floor(rand() * size);
    const col = palette[Math.floor(rand() * palette.length)];
    setPxWrap(c, x, y, col);
    if (rand() < 0.15) {
      setPxWrap(c, x + 1, y, col);
      setPxWrap(c, x, y + 1, col);
      setPxWrap(c, x + 1, y + 1, col);
    }
  }

  const png = encodePNG(size, size, c.px);
  const full = safeOutPath(opts.out, cwd, { allowAbsolute: Boolean(opts.allowAbsolute) });
  writeFileSync(full, png);
  return {
    out: opts.out,
    path: full,
    width: size,
    height: size,
    bytes: png.length,
    format: "png",
    summary: `Wrote tileable ${size}x${size} starfield PNG (${stars} stars) to ${opts.out} (${png.length} bytes).`,
  };
}

/**
 * Generate an authentic 88x31 beveled web button PNG with 5x7 pixel text.
 */
export function generateButton(opts = {}, cwd = process.cwd()) {
  const text = String(opts.text ?? "MY SITE").toUpperCase().slice(0, 14);
  const bg = parseColor(opts.bg, [0, 0, 128]);
  const fg = parseColor(opts.fg, [255, 255, 0]);
  const accent = opts.accent ? parseColor(opts.accent, null) : null;

  const c = createCanvas(88, 31, bg);
  if (accent) {
    // Classic split-color 88x31 bar on the left
    fillRect(c, 2, 2, 10, 27, accent);
  }
  drawBevelBorder(c, 2, bg);

  const areaLeft = accent ? 13 : 2;
  const areaW = 88 - areaLeft - 2;
  const tw = measureText(text, 1);
  const tx = areaLeft + Math.max(0, Math.floor((areaW - tw) / 2));
  // Drop shadow for extra crispness
  drawText(c, text, tx + 1, 13, mixRgb(bg, [0, 0, 0], 0.7), 1);
  drawText(c, text, tx, 12, fg, 1);

  const png = encodePNG(88, 31, c.px);
  const full = safeOutPath(opts.out, cwd, { allowAbsolute: Boolean(opts.allowAbsolute) });
  writeFileSync(full, png);
  return {
    out: opts.out,
    path: full,
    width: 88,
    height: 31,
    bytes: png.length,
    format: "png",
    text,
    summary: `Wrote 88x31 button "${text}" to ${opts.out} (${png.length} bytes).`,
  };
}

/**
 * Generate a classic horizontal divider PNG (styles: diamond, rainbow, construction, stars).
 */
export function generateDivider(opts = {}, cwd = process.cwd()) {
  const width = clampInt(opts.width, 468, 40, 2000);
  const style = String(opts.style ?? "diamond").toLowerCase();
  const color = parseColor(opts.color, [255, 0, 255]);
  const height = 20;

  const c = createCanvas(width, height, [0, 0, 0], 0);
  const cy = 10;

  if (style === "rainbow") {
    const colors = [
      [255, 0, 0],
      [255, 136, 0],
      [255, 255, 0],
      [0, 255, 0],
      [0, 255, 255],
      [0, 102, 255],
      [255, 0, 255],
    ];
    for (let x = 0; x < width; x++) {
      const col = colors[Math.floor((x / width) * colors.length) % colors.length];
      for (let y = 7; y <= 12; y++) setPx(c, x, y, col);
      setPx(c, x, 6, [255, 255, 255]);
      setPx(c, x, 13, [64, 64, 64]);
    }
  } else if (style === "construction") {
    // Black & yellow hazard stripe bar
    for (let y = 4; y <= 15; y++) {
      for (let x = 0; x < width; x++) {
        const stripe = Math.floor((x + y) / 8) % 2 === 0;
        setPx(c, x, y, stripe ? [255, 220, 0] : [20, 20, 20]);
      }
    }
    for (let x = 0; x < width; x++) {
      setPx(c, x, 3, [255, 255, 255]);
      setPx(c, x, 16, [0, 0, 0]);
    }
  } else if (style === "stars") {
    for (let x = 0; x < width; x++) setPx(c, x, cy, color);
    const starCol = [255, 255, 128];
    for (let cx = 12; cx < width - 8; cx += 24) {
      for (let d = -5; d <= 5; d++) {
        setPx(c, cx + d, cy, starCol);
        setPx(c, cx, cy + d, starCol);
      }
      for (let d = -2; d <= 2; d++) {
        setPx(c, cx + d, cy + d, [255, 255, 255]);
        setPx(c, cx + d, cy - d, [255, 255, 255]);
      }
    }
  } else {
    // Classic diamond pattern
    for (let x = 0; x < width; x++) setPx(c, x, cy, color);
    for (let cx = 7; cx < width; cx += 14) {
      for (let dy = -4; dy <= 4; dy++) {
        const half = 4 - Math.abs(dy);
        for (let dx = -half; dx <= half; dx++) setPx(c, cx + dx, cy + dy, color);
      }
    }
  }

  const png = encodePNG(width, height, c.px);
  const full = safeOutPath(opts.out, cwd, { allowAbsolute: Boolean(opts.allowAbsolute) });
  writeFileSync(full, png);
  return {
    out: opts.out,
    path: full,
    width,
    height,
    style,
    bytes: png.length,
    format: "png",
    summary: `Wrote ${width}x${height} ${style} divider PNG to ${opts.out} (${png.length} bytes).`,
  };
}

/**
 * Generate a classic 468x60 web banner PNG (great for headers, ad-parodies, or webring banners).
 */
export function generateBanner(opts = {}, cwd = process.cwd()) {
  const width = clampInt(opts.width, 468, 200, 1200);
  const height = clampInt(opts.height, 60, 40, 200);
  const title = String(opts.title ?? "WELCOME TO MY HOMEPAGE!").toUpperCase().slice(0, 34);
  const subtitle = String(opts.subtitle ?? "EST. 1998 - BEST VIEWED AT 800X600").toUpperCase().slice(0, 60);
  const bg = parseColor(opts.bg, [0, 0, 102]);
  const fg = parseColor(opts.fg, [255, 255, 0]);
  const accent = parseColor(opts.accent, [0, 255, 255]);

  const c = createCanvas(width, height, bg);

  // Subtle retro horizontal gradient + scanlines
  for (let y = 0; y < height; y++) {
    const shade = y % 2 === 0 ? 0.08 : -0.08;
    const rowCol = mixRgb(bg, shade > 0 ? [255, 255, 255] : [0, 0, 0], Math.abs(shade));
    for (let x = 0; x < width; x++) setPx(c, x, y, rowCol);
  }

  // Scattered twinkle pixels
  const rand = makeRng(opts.seed ?? 1998);
  for (let i = 0; i < 45; i++) {
    setPx(c, Math.floor(rand() * width), Math.floor(rand() * height), [255, 255, 255]);
  }

  drawBevelBorder(c, 3, [192, 192, 192]);

  // Title (scale 2 if it fits, else scale 1)
  const scale = measureText(title, 2) <= width - 20 ? 2 : 1;
  const titleW = measureText(title, scale);
  const titleX = Math.max(8, Math.floor((width - titleW) / 2));
  const titleY = subtitle ? Math.floor(height * 0.22) : Math.floor((height - 7 * scale) / 2);
  drawText(c, title, titleX + 2, titleY + 2, [0, 0, 0], scale);
  drawText(c, title, titleX, titleY, fg, scale);

  if (subtitle) {
    const subW = measureText(subtitle, 1);
    const subX = Math.max(8, Math.floor((width - subW) / 2));
    const subY = Math.min(height - 14, titleY + 7 * scale + 8);
    drawText(c, subtitle, subX, subY, accent, 1);
  }

  const png = encodePNG(width, height, c.px);
  const full = safeOutPath(opts.out, cwd, { allowAbsolute: Boolean(opts.allowAbsolute) });
  writeFileSync(full, png);
  return {
    out: opts.out,
    path: full,
    width,
    height,
    bytes: png.length,
    format: "png",
    summary: `Wrote ${width}x${height} banner PNG to ${opts.out} (${png.length} bytes).`,
  };
}

/**
 * Generate an animated GIF89a badge (e.g. blinking "NEW!", "HOT!", "UNDER CONSTRUCTION", "COOL!").
 * Styles: blink, rainbow, construction.
 */
export function generateAnimatedBadge(opts = {}, cwd = process.cwd()) {
  const text = String(opts.text ?? "NEW!").toUpperCase().slice(0, 22);
  const style = String(opts.style ?? "blink").toLowerCase();
  const delayCs = clampInt(opts.delayCs, 30, 5, 200);
  const scale = clampInt(opts.scale, 1, 1, 3);

  const padX = 8;
  const padY = 6;
  const width = Math.max(44, measureText(text, scale) + padX * 2);
  const height = Math.max(20, 7 * scale + padY * 2);
  const tx = Math.floor((width - measureText(text, scale)) / 2);
  const ty = Math.floor((height - 7 * scale) / 2);

  const frames = [];

  if (style === "rainbow") {
    const palette = [
      [255, 0, 0],
      [255, 165, 0],
      [255, 255, 0],
      [0, 255, 0],
      [0, 255, 255],
      [255, 0, 255],
    ];
    for (let f = 0; f < palette.length; f++) {
      const c = createCanvas(width, height, [0, 0, 64]);
      drawBevelBorder(c, 2, [192, 192, 192]);
      drawText(c, text, tx + 1, ty + 1, [0, 0, 0], scale);
      drawText(c, text, tx, ty, palette[f], scale);
      frames.push({ px: c.px, delayCs });
    }
  } else if (style === "construction") {
    // 4-frame scrolling yellow/black hazard border with blinking text
    for (let f = 0; f < 4; f++) {
      const c = createCanvas(width, height, [20, 20, 20]);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (y < 4 || y >= height - 4 || x < 4 || x >= width - 4) {
            const stripe = Math.floor((x + y + f * 3) / 6) % 2 === 0;
            setPx(c, x, y, stripe ? [255, 220, 0] : [20, 20, 20]);
          }
        }
      }
      const col = f % 2 === 0 ? [255, 255, 0] : [255, 80, 0];
      drawText(c, text, tx, ty, col, scale);
      frames.push({ px: c.px, delayCs });
    }
  } else {
    // Classic 2-frame blinking badge (yellow-on-red <-> red-on-yellow)
    const fg = parseColor(opts.fg, [255, 255, 0]);
    const bg = parseColor(opts.bg, [220, 0, 0]);
    const c1 = createCanvas(width, height, bg);
    drawBevelBorder(c1, 2, bg);
    drawText(c1, text, tx, ty, fg, scale);

    const c2 = createCanvas(width, height, fg);
    drawBevelBorder(c2, 2, fg);
    drawText(c2, text, tx, ty, bg, scale);

    frames.push({ px: c1.px, delayCs }, { px: c2.px, delayCs });
  }

  const gif = encodeGIF(width, height, frames, { loop: 0, transparent: false });
  const full = safeOutPath(opts.out, cwd, { allowAbsolute: Boolean(opts.allowAbsolute) });
  writeFileSync(full, gif);
  return {
    out: opts.out,
    path: full,
    width,
    height,
    frames: frames.length,
    style,
    bytes: gif.length,
    format: "gif",
    summary: `Wrote ${width}x${height} animated GIF badge "${text}" (${frames.length} frames, ${style}) to ${opts.out} (${gif.length} bytes).`,
  };
}
