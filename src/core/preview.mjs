// Local static preview server and single-file standalone HTML bundler.
// Zero dependencies.
import http from "node:http";
import { readFileSync, writeFileSync, existsSync, statSync } from "node:fs";
import { resolve, join, dirname, extname } from "node:path";
import { safeOutPath } from "./generators.mjs";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".bmp": "image/bmp",
  ".mid": "audio/midi",
  ".midi": "audio/midi",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".txt": "text/plain; charset=utf-8",
};

function mimeFor(filePath) {
  return MIME[extname(filePath).toLowerCase()] || "application/octet-stream";
}

function toDataUri(filePath) {
  const buf = readFileSync(filePath);
  return `data:${mimeFor(filePath)};base64,${buf.toString("base64")}`;
}

/**
 * Bundle an HTML page into a single self-contained HTML string (or write to disk if `out` is given)
 * by inlining local <link rel="stylesheet">, <script src>, CSS url(...), and <img src>.
 */
export function bundlePage(
  { dir = ".", entry = "index.html", out, maxInlineBytes = 256 * 1024, allowAbsolute = false } = {},
  cwd = process.cwd(),
) {
  const rootDir = resolve(cwd, dir);
  const entryPath = resolve(rootDir, entry);
  if (!existsSync(entryPath)) {
    throw new Error(`Entry file not found: ${entryPath}`);
  }

  let html = readFileSync(entryPath, "utf8");
  const entryDir = dirname(entryPath);
  let inlinedAssets = 0;

  const inlineCssUrls = (css, cssDir) =>
    css.replace(/url\(\s*["']?([^"')]+)["']?\s*\)/gi, (full, rawUrl) => {
      if (/^(https?:|\/\/|data:)/i.test(rawUrl)) return full;
      const assetPath = resolve(cssDir, rawUrl.split(/[?#]/)[0]);
      if (!existsSync(assetPath)) return full;
      if (statSync(assetPath).size > maxInlineBytes) return full;
      inlinedAssets++;
      return `url("${toDataUri(assetPath)}")`;
    });

  // Inline <link rel="stylesheet" href="...">
  html = html.replace(
    /<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi,
    (full, href) => {
      if (/^(https?:|\/\/|data:)/i.test(href)) return full;
      const cssPath = resolve(entryDir, href.split(/[?#]/)[0]);
      if (!existsSync(cssPath)) return full;
      const css = inlineCssUrls(readFileSync(cssPath, "utf8"), dirname(cssPath));
      inlinedAssets++;
      return `<style>\n${css}\n</style>`;
    },
  );

  // Also inline url(...) inside existing <style> tags
  html = html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (full, css) => {
    const updated = inlineCssUrls(css, entryDir);
    return full.replace(css, updated);
  });

  // Inline <script src="..."></script>
  html = html.replace(
    /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>\s*<\/script>/gi,
    (full, src) => {
      if (/^(https?:|\/\/|data:)/i.test(src)) return full;
      const jsPath = resolve(entryDir, src.split(/[?#]/)[0]);
      if (!existsSync(jsPath)) return full;
      const js = readFileSync(jsPath, "utf8").replace(/<\/script>/gi, "<\\/script>");
      inlinedAssets++;
      return `<script>\n${js}\n</script>`;
    },
  );

  // Inline <img src="...">
  html = html.replace(/(<img\b[^>]*\bsrc=["'])([^"']+)(["'][^>]*>)/gi, (full, pre, src, post) => {
    if (/^(https?:|\/\/|data:)/i.test(src)) return full;
    const imgPath = resolve(entryDir, src.split(/[?#]/)[0]);
    if (!existsSync(imgPath)) return full;
    if (statSync(imgPath).size > maxInlineBytes) return full;
    inlinedAssets++;
    return `${pre}${toDataUri(imgPath)}${post}`;
  });

  let outFull = null;
  if (out) {
    outFull = safeOutPath(out, cwd, { allowAbsolute: Boolean(allowAbsolute) });
    writeFileSync(outFull, html, "utf8");
  }

  return {
    entry: entryPath,
    out: out ?? null,
    path: outFull,
    bytes: Buffer.byteLength(html, "utf8"),
    inlinedAssets,
    html,
    summary: out
      ? `Bundled ${entry} (${inlinedAssets} local asset(s) inlined, ${Buffer.byteLength(html, "utf8")} bytes) to ${out}.`
      : `Bundled ${entry} (${inlinedAssets} local asset(s) inlined, ${Buffer.byteLength(html, "utf8")} bytes).`,
  };
}

/**
 * Start a zero-dependency local HTTP preview server for a static site directory.
 */
export function startPreviewServer({ dir = ".", host = "127.0.0.1", port = 0 } = {}, cwd = process.cwd()) {
  const rootDir = resolve(cwd, dir);
  if (!existsSync(rootDir)) {
    throw new Error(`Site directory not found: ${rootDir}`);
  }

  const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url || "/", `http://${host}`);
    let pathname = decodeURIComponent(reqUrl.pathname);
    if (pathname.endsWith("/")) pathname += "index.html";
    const target = resolve(rootDir, "." + pathname);

    // Prevent directory traversal outside rootDir
    if (target !== rootDir && !target.startsWith(rootDir + "/") && !target.startsWith(rootDir + "\\")) {
      res.writeHead(403, { "Content-Type": "text/plain" });
      res.end("403 Forbidden");
      return;
    }

    let fileToServe = target;
    if (existsSync(fileToServe) && statSync(fileToServe).isDirectory()) {
      fileToServe = join(fileToServe, "index.html");
    }

    if (!existsSync(fileToServe) || statSync(fileToServe).isDirectory()) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("404 Not Found");
      return;
    }

    try {
      const data = readFileSync(fileToServe);
      res.writeHead(200, { "Content-Type": mimeFor(fileToServe), "Cache-Control": "no-store" });
      res.end(data);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end(`500 Internal Server Error: ${err.message}`);
    }
  });

  return new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      const addr = server.address();
      const actualPort = typeof addr === "object" && addr ? addr.port : port;
      resolvePromise({
        server,
        host,
        port: actualPort,
        url: `http://${host}:${actualPort}/`,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}
