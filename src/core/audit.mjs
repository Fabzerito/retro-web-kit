// Stack-agnostic retro site auditor.
// Scans any web project (plain HTML, React, Vue, Svelte, Astro, PHP, Django/Jinja, Rails/ERB,
// Go templates, Hugo, etc.) for hotlinked external assets, missing local assets, broken relative
// links, corrupt/non-image files, unused images, and deprecated <marquee>/<blink> tags.
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { resolve, join, dirname, relative } from "node:path";
import { detectImageFormat } from "./fetcher.mjs";

const IGNORE_DIRS = new Set([
  "node_modules",
  "dist",
  "build",
  ".git",
  ".next",
  ".nuxt",
  ".svelte-kit",
  ".astro",
  "__pycache__",
  ".venv",
  "venv",
  "vendor",
  "target",
]);

const MARKUP_EXT_RE = /\.(html?|htm|jsx|tsx|vue|svelte|astro|php|erb|ejs|njk|hbs|jinja2?|j2|twig|tmpl|gohtml)$/i;
const JSX_LIKE_RE = /\.(jsx|tsx|vue|svelte|astro)$/i;
const CSS_EXT_RE = /\.(css|scss|less)$/i;
const IMAGE_EXT_RE = /\.(gif|png|jpe?g|webp|bmp|ico)$/i;

// Common static/public root directories across ecosystems (HTML, Vite/Next/Astro, Django/Flask, Rails, Hugo, .NET)
const DEFAULT_STATIC_ROOTS = ["", "public", "static", "assets", "wwwroot"];

function walkFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || IGNORE_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, out);
    else out.push(full);
  }
  return out;
}

function isExternal(url) {
  return /^(https?:|\/\/)/i.test(url);
}

function isDynamicTemplateExpr(url) {
  // Skip template expressions like {{ url_for(...) }}, <%= asset_path %>, ${foo}, {$var}
  return /(\{\{|\}\}|<%|%>|\$\{|\{\s*\$)/.test(url);
}

function isSkippableUrl(url) {
  return /^(mailto:|tel:|javascript:|data:|#)/i.test(url) || !url.trim() || isDynamicTemplateExpr(url);
}

function stripQueryHash(url) {
  return url.split(/[?#]/)[0];
}

function resolveCandidate(projectDir, fileDir, cleanUrl, staticRoots) {
  const candidates = [];
  if (cleanUrl.startsWith("/")) {
    const trimmed = cleanUrl.replace(/^\/+/, "");
    for (const root of staticRoots) {
      candidates.push(root ? resolve(projectDir, root, trimmed) : resolve(projectDir, trimmed));
    }
  } else {
    candidates.push(resolve(fileDir, cleanUrl));
    const trimmed = cleanUrl.replace(/^\.\//, "");
    for (const root of staticRoots) {
      if (root) candidates.push(resolve(projectDir, root, trimmed));
    }
  }
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

/**
 * Audit any web project directory for retro-web-kit hygiene.
 * @param {string} [dirPath="."]
 * @param {string} [cwd=process.cwd()]
 * @param {{ assetsDir?: string, staticRoots?: string[] }} [opts]
 */
export function auditSite(dirPath = ".", cwd = process.cwd(), opts = {}) {
  const dir = resolve(cwd, dirPath);
  if (!existsSync(dir)) {
    throw new Error(`Directory not found: ${dir}`);
  }

  const staticRoots = [];
  if (opts.assetsDir) {
    staticRoots.push(String(opts.assetsDir));
    const parent = dirname(String(opts.assetsDir));
    if (parent && parent !== ".") staticRoots.push(parent);
  }
  if (Array.isArray(opts.staticRoots)) {
    staticRoots.push(...opts.staticRoots);
  }
  for (const r of DEFAULT_STATIC_ROOTS) {
    if (!staticRoots.includes(r)) staticRoots.push(r);
  }

  const files = walkFiles(dir);
  const markupFiles = files.filter((f) => MARKUP_EXT_RE.test(f));
  const cssFiles = files.filter((f) => CSS_EXT_RE.test(f));
  const imageFiles = files.filter((f) => IMAGE_EXT_RE.test(f));

  const issues = [];
  const warnings = [];
  const referencedAssets = new Set();

  if (markupFiles.length === 0) {
    issues.push({
      type: "no-markup",
      file: ".",
      message: "No HTML or template files found in project directory.",
    });
  }

  for (const file of markupFiles) {
    const rel = relative(dir, file);
    const content = readFileSync(file, "utf8");
    const isJsxLike = JSX_LIKE_RE.test(file);

    // Flag lowercase HTML <marquee>/<blink>, but not PascalCase components (<Marquee>/<Blink>)
    if (isJsxLike ? /<(marquee|blink)\b/.test(content) : /<(marquee|blink)\b/i.test(content)) {
      warnings.push({
        type: "deprecated-tag",
        file: rel,
        message: "Uses deprecated <marquee> or <blink> tag; prefer CSS .marquee / .blink or <retro-marquee>/<retro-blink>.",
      });
    }

    // Check <img src>, <script src>, <audio src>, <video src>, <source src>, <iframe src>
    const srcRe = /<(img|script|audio|video|source|iframe)\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi;
    let m;
    while ((m = srcRe.exec(content)) !== null) {
      const tag = m[1].toLowerCase();
      const rawUrl = m[2].trim();
      if (isSkippableUrl(rawUrl)) continue;
      if (isExternal(rawUrl)) {
        issues.push({
          type: "hotlink",
          file: rel,
          target: rawUrl,
          message: `Hotlinked external <${tag}> asset "${rawUrl}" — download locally instead.`,
        });
        continue;
      }
      const clean = stripQueryHash(rawUrl);
      const found = resolveCandidate(dir, dirname(file), clean, staticRoots);
      if (!found) {
        issues.push({
          type: "missing-asset",
          file: rel,
          target: rawUrl,
          message: `Missing local <${tag}> target "${rawUrl}".`,
        });
      } else {
        referencedAssets.add(found);
      }
    }

    // Also catch string-literal references to local image paths (e.g. arrays/dicts in JSX, Vue, PHP, Jinja)
    const imgLitRe = /["']([^"'`\s]+\.(?:gif|png|jpe?g|webp|bmp|ico))["']/gi;
    while ((m = imgLitRe.exec(content)) !== null) {
      const rawUrl = m[1].trim();
      if (isSkippableUrl(rawUrl)) continue;
      if (isExternal(rawUrl)) continue;
      const clean = stripQueryHash(rawUrl);
      const found = resolveCandidate(dir, dirname(file), clean, staticRoots);
      if (found) referencedAssets.add(found);
    }

    // Check <link href> and <a href>
    const hrefRe = /<(a|link)\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi;
    while ((m = hrefRe.exec(content)) !== null) {
      const tag = m[1].toLowerCase();
      const rawUrl = m[2].trim();
      if (isSkippableUrl(rawUrl)) continue;
      if (isExternal(rawUrl)) {
        if (tag === "link") {
          warnings.push({
            type: "external-stylesheet",
            file: rel,
            target: rawUrl,
            message: `External <link> "${rawUrl}" — self-host CSS for full retro permanence.`,
          });
        }
        continue;
      }
      const clean = stripQueryHash(rawUrl);
      if (!clean) continue;

      // For server-rendered / SPA routes without file extensions (e.g. href="/about"), only verify <link> or file-extension links
      const hasFileExt = /\.[a-z0-9]{1,6}$/i.test(clean);
      if (tag === "a" && !hasFileExt) continue;

      const found = resolveCandidate(dir, dirname(file), clean, staticRoots);
      if (!found) {
        issues.push({
          type: "broken-link",
          file: rel,
          target: rawUrl,
          message: `Broken local <${tag}> link "${rawUrl}".`,
        });
      } else {
        referencedAssets.add(found);
      }
    }
  }

  // Check CSS url(...)
  for (const file of cssFiles) {
    const rel = relative(dir, file);
    const css = readFileSync(file, "utf8");
    const urlRe = /url\(\s*["']?([^"')]+)["']?\s*\)/gi;
    let m;
    while ((m = urlRe.exec(css)) !== null) {
      const rawUrl = m[1].trim();
      if (isSkippableUrl(rawUrl)) continue;
      if (isExternal(rawUrl)) {
        issues.push({
          type: "hotlink",
          file: rel,
          target: rawUrl,
          message: `Hotlinked external CSS url("${rawUrl}") — save locally instead.`,
        });
        continue;
      }
      const clean = stripQueryHash(rawUrl);
      const found = resolveCandidate(dir, dirname(file), clean, staticRoots);
      if (!found) {
        issues.push({
          type: "missing-asset",
          file: rel,
          target: rawUrl,
          message: `Missing CSS asset "${rawUrl}".`,
        });
      } else {
        referencedAssets.add(found);
      }
    }
  }

  // Validate image magic bytes and check for dial-up size & unused assets
  let totalAssetBytes = 0;
  for (const img of imageFiles) {
    const rel = relative(dir, img);
    const st = statSync(img);
    totalAssetBytes += st.size;
    const buf = readFileSync(img);
    const fmt = detectImageFormat(buf);
    if (!fmt) {
      issues.push({
        type: "invalid-image",
        file: rel,
        message: `"${rel}" is not a valid image file (corrupt or HTML error page).`,
      });
    }
    if (st.size > 512 * 1024) {
      warnings.push({
        type: "large-asset",
        file: rel,
        message: `"${rel}" is ${Math.round(st.size / 1024)} KB — heavy for 56k dial-up!`,
      });
    }
    if (!referencedAssets.has(img)) {
      warnings.push({
        type: "unused-asset",
        file: rel,
        message: `"${rel}" is not referenced by any template, markup, or CSS file.`,
      });
    }
  }

  const ok = issues.length === 0;
  return {
    ok,
    dir,
    stats: {
      markupFiles: markupFiles.length,
      cssFiles: cssFiles.length,
      imageFiles: imageFiles.length,
      totalAssetKB: Number((totalAssetBytes / 1024).toFixed(1)),
    },
    issues,
    warnings,
    summary: ok
      ? `Audit passed (${markupFiles.length} markup/template file(s), ${imageFiles.length} image(s), ${warnings.length} warning(s)).`
      : `Audit found ${issues.length} issue(s) and ${warnings.length} warning(s).`,
  };
}
