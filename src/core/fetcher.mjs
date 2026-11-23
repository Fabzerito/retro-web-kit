// Search and download real 90s GeoCities assets (GifCities, 88x31 button archives)
// with magic-byte validation so agents never accidentally save HTML 404 pages as images.
import { writeFileSync } from "node:fs";
import { safeOutPath } from "./generators.mjs";

const USER_AGENT = "retro-web-kit/1.0 (Node.js retro asset fetcher)";

/**
 * Detect image format from magic bytes.
 * @param {Buffer} buf
 * @returns {"gif"|"png"|"jpeg"|"webp"|"ico"|"bmp"|null}
 */
export function detectImageFormat(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 6) return null;
  // GIF87a or GIF89a
  if (
    buf[0] === 0x47 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x38 &&
    (buf[4] === 0x37 || buf[4] === 0x39) &&
    buf[5] === 0x61
  ) {
    return "gif";
  }
  // PNG
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "png";
  }
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  // WebP
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }
  // BMP
  if (buf[0] === 0x42 && buf[1] === 0x4d) return "bmp";
  // ICO
  if (buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x01 && buf[3] === 0x00) return "ico";
  return null;
}

/**
 * Search GifCities (Internet Archive's GeoCities GIF index) for period-authentic GIFs.
 */
export async function searchGifCities(query, { limit = 12, timeoutMs = 12000, fetchImpl = fetch } = {}) {
  const q = String(query ?? "").trim();
  if (!q) throw new Error("query must be a non-empty search string");
  const safeLimit = Math.max(1, Math.min(50, Math.round(Number(limit) || 12)));
  const url = `https://gifcities.org/search?q=${encodeURIComponent(q)}&offset=0&page_size=${safeLimit}`;

  const res = await fetchImpl(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new Error(`GifCities search failed with HTTP ${res.status}`);
  }
  const html = await res.text();
  return parseGifCitiesHtml(html, safeLimit);
}

export function parseGifCitiesHtml(html, limit = 12) {
  const results = [];
  const seen = new Set();
  // Match <a href="..."><img ... src="https://blob.gifcities.org/gifcities/....gif">
  const blockRe =
    /<a\s+[^>]*href="(https?:\/\/web\.archive\.org\/[^"]+)"[^>]*>[\s\S]*?<img\s+([^>]*src="(https:\/\/blob\.gifcities\.org\/gifcities\/[^"]+\.gif)"[^>]*)>/gi;

  let m;
  while ((m = blockRe.exec(html)) !== null && results.length < limit) {
    const sourcePage = m[1];
    const attrs = m[2];
    const gifUrl = m[3];
    if (seen.has(gifUrl)) continue;
    seen.add(gifUrl);
    const wm = /\bwidth="(\d+)"/i.exec(attrs);
    const hm = /\bheight="(\d+)"/i.exec(attrs);
    results.push({
      url: gifUrl,
      width: wm ? Number(wm[1]) : null,
      height: hm ? Number(hm[1]) : null,
      sourcePage,
    });
  }

  // Fallback: pick up any direct blob.gifcities.org URLs if markup changed slightly
  if (results.length === 0) {
    const imgRe = /https:\/\/blob\.gifcities\.org\/gifcities\/[A-Za-z0-9._-]+\.gif/gi;
    let im;
    while ((im = imgRe.exec(html)) !== null && results.length < limit) {
      if (seen.has(im[0])) continue;
      seen.add(im[0]);
      results.push({ url: im[0], width: null, height: null, sourcePage: null });
    }
  }

  return results;
}

/**
 * Search 88x31 buttons on cyber.dabamos.de/88x31/ across all gallery index pages by filename keyword.
 */
export async function searchButtons88x31(query, { limit = 15, timeoutMs = 12000, fetchImpl = fetch } = {}) {
  const q = String(query ?? "").trim().toLowerCase();
  if (!q) throw new Error("query must be a non-empty search string");
  const safeLimit = Math.max(1, Math.min(50, Math.round(Number(limit) || 15)));
  const baseUrl = "https://cyber.dabamos.de/88x31/";
  const pages = ["index.html", "index2.html", "index3.html", "index4.html", "index5.html"];

  const fetched = await Promise.allSettled(
    pages.map(async (page) => {
      const res = await fetchImpl(new URL(page, baseUrl).href, {
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    }),
  );

  const htmlPages = fetched.filter((r) => r.status === "fulfilled").map((r) => r.value);
  if (htmlPages.length === 0) {
    throw new Error("88x31 archive lookup failed on all index pages");
  }
  return parseButtons88x31Html(htmlPages.join("\n"), q, safeLimit, baseUrl);
}

export function parseButtons88x31Html(html, query, limit = 15, baseUrl = "https://cyber.dabamos.de/88x31/") {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const results = [];
  const seen = new Set();
  const re = /src="([^"]+\.(?:gif|png))"/gi;
  let m;
  while ((m = re.exec(html)) !== null && results.length < limit) {
    const file = m[1];
    const lower = file.toLowerCase();
    if (!tokens.every((t) => lower.includes(t))) continue;
    const url = /^https?:\/\//i.test(file) ? file : new URL(file, baseUrl).href;
    if (seen.has(url)) continue;
    seen.add(url);
    results.push({ filename: file.split("/").pop(), url, width: 88, height: 31 });
  }
  return results;
}

/**
 * Download an image URL to a local relative path and validate its magic bytes.
 */
export async function fetchAsset(
  { url, out, maxBytes = 2 * 1024 * 1024, timeoutMs = 15000, fetchImpl = fetch, allowAbsolute = false } = {},
  cwd = process.cwd(),
) {
  if (typeof url !== "string" || !/^https?:\/\//i.test(url.trim())) {
    throw new Error("url must be an http:// or https:// URL");
  }
  const full = safeOutPath(out, cwd, { allowAbsolute: Boolean(allowAbsolute) });
  const res = await fetchImpl(url.trim(), {
    headers: { "User-Agent": USER_AGENT },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) throw new Error(`Downloaded file from ${url} is empty`);
  if (buf.length > maxBytes) {
    throw new Error(`Downloaded file (${buf.length} bytes) exceeds maxBytes (${maxBytes})`);
  }
  const format = detectImageFormat(buf);
  if (!format) {
    throw new Error(
      `Downloaded content from ${url} is not a valid image (first bytes: ${buf.subarray(0, 16).toString("hex")})`,
    );
  }
  writeFileSync(full, buf);
  return {
    url: url.trim(),
    out,
    path: full,
    format,
    bytes: buf.length,
    summary: `Downloaded ${format.toUpperCase()} (${buf.length} bytes) to ${out}.`,
  };
}
