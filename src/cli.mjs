#!/usr/bin/env node
// retro-web-kit (rwk) CLI: stack-agnostic zero-dependency toolbox for 90s GeoCities & Neocities aesthetics.
// Works inside any project/language/framework; also includes an optional static HTML starter.
import { execFile } from "node:child_process";
import { readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  generateStarfield,
  generateButton,
  generateDivider,
  generateBanner,
  generateAnimatedBadge,
  searchGifCities,
  searchButtons88x31,
  fetchAsset,
  getRetroSnippets,
  THEMES,
  ARCHETYPE_META,
  ARCHETYPE_NAMES,
  exportCss,
  exportWidgets,
  exportThemeTokens,
  createStarterSite,
  addPage,
  syncSite,
  auditSite,
  bundlePage,
  startPreviewServer,
} from "./core/index.mjs";

function parseArgs(argv) {
  const positionals = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--") {
      positionals.push(...argv.slice(i + 1));
      break;
    }
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq !== -1) {
        flags[a.slice(2, eq)] = a.slice(eq + 1);
      } else {
        const key = a.slice(2);
        const next = argv[i + 1];
        if (next === undefined || next.startsWith("--")) {
          flags[key] = true;
        } else {
          flags[key] = next;
          i++;
        }
      }
    } else if (a === "-h") {
      flags.help = true;
    } else if (a === "-v") {
      flags.version = true;
    } else {
      positionals.push(a);
    }
  }
  return { positionals, flags };
}

function openBrowser(url) {
  const cmd = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  execFile(cmd, args, () => {});
}

const HELP = `retro-web-kit (rwk) — Stack-agnostic 90s GeoCities & Neocities toolbox (zero dependencies)

Use with ANY language or framework (HTML, React, Vue, Svelte, Astro, Next.js,
Django, Flask, Rails, PHP, Go, Hugo...) — just point output paths at your project's
static/public folder.

Usage:
  rwk <command> [options]           (also available as: retro-web-kit <command>)

Asset Generators (PNG & animated GIF89a):
  generate-starfield <out>   Generate a tileable starfield PNG
                             Flags: --size 128 --stars 90 --sky "#000033" --seed
  generate-button <out>      Generate an 88x31 beveled web button PNG
                             Flags: --text "MY SITE" --bg "#000080" --fg "#ffff00" --accent
  generate-divider <out>     Generate a horizontal divider PNG
                             Flags: --width 468 --style (diamond|rainbow|construction|stars) --color "#ff00ff"
  generate-banner <out>      Generate a 468x60 retro banner PNG
                             Flags: --title --subtitle --width 468 --height 60 --bg --fg --accent
  generate-badge <out>       Generate an animated GIF89a badge (e.g. blinking NEW!)
                             Flags: --text "NEW!" --style (blink|rainbow|construction) --delay 30 --scale 1 --fg --bg

Real Period Archives (download locally, never hotlink):
  search-gifs <query>        Search GifCities (Internet Archive) for real GeoCities GIFs
                             Flags: --limit 12
  search-buttons <query>     Search 88x31 web button archive by keyword
                             Flags: --limit 15
  fetch-asset <url> <out>    Download a period image locally & validate magic bytes

Drop-in CSS, Web Components & Design Tokens (for ANY stack):
  export-css [out]           Export standalone retro.css with CSS variables + theme classes
                             Flags: --theme (${Object.keys(THEMES).join("|")}) --asset-prefix "./assets" --no-starfield
  export-widgets [out]       Export zero-dependency Web Components (<retro-marquee>, <retro-blink>,
                             <retro-counter>, <retro-window>, <retro-chiptune>, <retro-guestbook>)
  tokens [theme]             Print JSON theme tokens (colors, RGB, fonts) for any stack
  themes                     List available retro themes
  snippets [category]        Print drop-in HTML/CSS/JS recipes

Audit, Preview & Bundle (works across stacks):
  audit [dir]                Check any project (HTML/JSX/Vue/Svelte/Astro/PHP/Jinja/ERB/Go/CSS) for
                             hotlinks, missing/corrupt/unused images, broken links, deprecated tags
                             Flags: --assets-dir static/assets
  bundle [dir]               Bundle an HTML page into a single standalone HTML file (data URIs)
                             Flags: --entry index.html --out dist/standalone.html
  preview [dir]              Start a local static HTTP preview server
                             Flags: --port 8080 --host 127.0.0.1 --open

Optional Static HTML Starter (skip this if you already have a framework/boilerplate):
  starter [dir]              (Optional) Generate a zero-build static HTML starter site
                             Flags: --theme --pages home,about,gallery,music,downloads,blog,shrine,links,guestbook
                                    --title --owner --topic --email --year
  add-page <file|slug>       (Optional starter helper) Add an HTML page & sync nav
                             Flags: --dir --type (${ARCHETYPE_NAMES.join("|")}) --title --label --heading
  sync [dir]                 (Optional starter helper) Sync shared chrome & theme from retro.json
                             Flags: --theme --title --owner --email --year --marquee --regenerate-css
  archetypes                 List page archetypes for starter --pages / add-page --type

Global flags:
  --json                     Print machine-readable JSON output
  -v, --version              Show version
  -h, --help                 Show this help
`;

function printResult(result, asJson) {
  if (asJson) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    return;
  }
  if (typeof result === "string") {
    process.stdout.write(result + "\n");
  } else if (result && typeof result.summary === "string") {
    process.stdout.write(result.summary + "\n");
  } else {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  }
}

export async function runCli(argv = process.argv.slice(2)) {
  const { positionals, flags } = parseArgs(argv);
  const cmd = positionals[0];
  const asJson = Boolean(flags.json);

  if (flags.version || cmd === "version") {
    const pkg = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "package.json"), "utf8"));
    process.stdout.write(`retro-web-kit (rwk) ${pkg.version}\n`);
    return 0;
  }
  if (!cmd || flags.help || cmd === "help") {
    process.stdout.write(HELP);
    return 0;
  }

  try {
    switch (cmd) {
      case "starter": {
        const res = createStarterSite({
          dir: positionals[1] || flags.dir || ".",
          pages: flags.pages,
          title: flags.title,
          owner: flags.owner,
          topic: flags.topic,
          email: flags.email,
          year: flags.year,
          theme: flags.theme,
        });
        printResult(res, asJson);
        return 0;
      }

      case "add-page": {
        const res = addPage({
          dir: flags.dir || ".",
          filename: positionals[1] || flags.filename,
          type: flags.type,
          title: flags.title,
          label: flags.label,
          heading: flags.heading,
        });
        printResult(res, asJson);
        return 0;
      }

      case "sync": {
        const res = syncSite({
          dir: positionals[1] || flags.dir || ".",
          theme: flags.theme,
          title: flags.title,
          owner: flags.owner,
          email: flags.email,
          year: flags.year,
          marqueeText: flags.marquee,
          regenerateCss: Boolean(flags["regenerate-css"]),
        });
        printResult(res, asJson);
        return 0;
      }

      case "export-css": {
        const out = positionals[1] || flags.out;
        const res = exportCss({
          theme: flags.theme || "space",
          assetPrefix: flags["asset-prefix"] || "./assets",
          starfield: !flags["no-starfield"],
          out,
          allowAbsolute: true,
        });
        if (asJson) {
          const { css: _css, ...meta } = res;
          printResult(out ? meta : res, true);
        } else if (out) {
          process.stdout.write(res.summary + "\n");
        } else {
          process.stdout.write(res.css);
        }
        return 0;
      }

      case "export-widgets": {
        const out = positionals[1] || flags.out;
        const res = exportWidgets({ out, allowAbsolute: true });
        if (asJson) {
          const { js: _js, ...meta } = res;
          printResult(out ? meta : res, true);
        } else if (out) {
          process.stdout.write(res.summary + "\n");
        } else {
          process.stdout.write(res.js);
        }
        return 0;
      }

      case "tokens": {
        const res = exportThemeTokens(positionals[1] || flags.theme);
        process.stdout.write(JSON.stringify(res, null, 2) + "\n");
        return 0;
      }

      case "generate-starfield": {
        const out = positionals[1] || flags.out;
        const res = generateStarfield({
          out,
          size: flags.size,
          stars: flags.stars,
          sky: flags.sky,
          seed: flags.seed,
          allowAbsolute: true,
        });
        printResult(res, asJson);
        return 0;
      }

      case "generate-button": {
        const out = positionals[1] || flags.out;
        const res = generateButton({
          out,
          text: flags.text,
          bg: flags.bg,
          fg: flags.fg,
          accent: flags.accent,
          allowAbsolute: true,
        });
        printResult(res, asJson);
        return 0;
      }

      case "generate-divider": {
        const out = positionals[1] || flags.out;
        const res = generateDivider({
          out,
          width: flags.width,
          style: flags.style,
          color: flags.color,
          allowAbsolute: true,
        });
        printResult(res, asJson);
        return 0;
      }

      case "generate-banner": {
        const out = positionals[1] || flags.out;
        const res = generateBanner({
          out,
          title: flags.title,
          subtitle: flags.subtitle,
          width: flags.width,
          height: flags.height,
          bg: flags.bg,
          fg: flags.fg,
          accent: flags.accent,
          allowAbsolute: true,
        });
        printResult(res, asJson);
        return 0;
      }

      case "generate-badge": {
        const out = positionals[1] || flags.out;
        const res = generateAnimatedBadge({
          out,
          text: flags.text,
          style: flags.style,
          delayCs: flags.delay,
          scale: flags.scale,
          fg: flags.fg,
          bg: flags.bg,
          allowAbsolute: true,
        });
        printResult(res, asJson);
        return 0;
      }

      case "search-gifs": {
        const q = positionals.slice(1).join(" ") || flags.query;
        const results = await searchGifCities(q, { limit: flags.limit });
        if (asJson) {
          printResult(results, true);
        } else if (results.length === 0) {
          process.stdout.write(`No GIFs found for "${q}".\n`);
        } else {
          for (const r of results) {
            const dims = r.width && r.height ? `${r.width}x${r.height}` : "?x?";
            process.stdout.write(`${r.url}  (${dims})\n`);
          }
        }
        return 0;
      }

      case "search-buttons": {
        const q = positionals.slice(1).join(" ") || flags.query;
        const results = await searchButtons88x31(q, { limit: flags.limit });
        if (asJson) {
          printResult(results, true);
        } else if (results.length === 0) {
          process.stdout.write(`No 88x31 buttons found matching "${q}".\n`);
        } else {
          for (const r of results) {
            process.stdout.write(`${r.filename}\t${r.url}\n`);
          }
        }
        return 0;
      }

      case "fetch-asset": {
        const url = positionals[1] || flags.url;
        const out = positionals[2] || flags.out;
        const res = await fetchAsset({ url, out, allowAbsolute: true });
        printResult(res, asJson);
        return 0;
      }

      case "snippets": {
        const res = getRetroSnippets(positionals[1] || flags.category);
        process.stdout.write(JSON.stringify(res, null, 2) + "\n");
        return 0;
      }

      case "themes": {
        const list = Object.values(THEMES).map((t) => ({ name: t.name, label: t.label }));
        if (asJson) {
          printResult(list, true);
        } else {
          for (const t of list) process.stdout.write(`${t.name.padEnd(20)} ${t.label}\n`);
        }
        return 0;
      }

      case "archetypes": {
        const list = ARCHETYPE_NAMES.map((name) => ({ name, ...ARCHETYPE_META[name] }));
        if (asJson) {
          printResult(list, true);
        } else {
          for (const a of list) process.stdout.write(`${a.name.padEnd(14)} ${a.description}\n`);
        }
        return 0;
      }

      case "audit": {
        const dir = positionals[1] || flags.dir || ".";
        const res = auditSite(dir, process.cwd(), { assetsDir: flags["assets-dir"] });
        if (asJson) {
          printResult(res, true);
        } else {
          process.stdout.write(`${res.summary}\n`);
          for (const i of res.issues) process.stdout.write(`  [ERROR] ${i.file}: ${i.message}\n`);
          for (const w of res.warnings) process.stdout.write(`  [WARN]  ${w.file}: ${w.message}\n`);
        }
        return res.ok ? 0 : 1;
      }

      case "bundle": {
        const dir = positionals[1] || flags.dir || ".";
        const res = bundlePage({
          dir,
          entry: flags.entry || "index.html",
          out: flags.out,
          allowAbsolute: true,
        });
        if (asJson) {
          const { html: _html, ...meta } = res;
          printResult(flags.out ? meta : res, true);
        } else if (flags.out) {
          process.stdout.write(res.summary + "\n");
        } else {
          process.stdout.write(res.html);
        }
        return 0;
      }

      case "preview": {
        const dir = positionals[1] || flags.dir || ".";
        const port = flags.port !== undefined ? Number(flags.port) : 8080;
        const host = flags.host || "127.0.0.1";
        const srv = await startPreviewServer({ dir, host, port });
        process.stdout.write(`Serving ${dir} at ${srv.url} (Ctrl+C to stop)\n`);
        if (flags.open) openBrowser(srv.url);
        await new Promise((resolveStop) => {
          process.once("SIGINT", async () => {
            await srv.close();
            resolveStop();
          });
          process.once("SIGTERM", async () => {
            await srv.close();
            resolveStop();
          });
        });
        return 0;
      }

      default:
        process.stderr.write(`Unknown command: ${cmd}\nRun "rwk --help" for usage.\n`);
        return 1;
    }
  } catch (err) {
    if (asJson) {
      process.stdout.write(JSON.stringify({ error: err.message }) + "\n");
    } else {
      process.stderr.write(`Error: ${err.message}\n`);
    }
    return 1;
  }
}

// Run when invoked directly (handles symlinked global bins like npm link)
const isMain =
  process.argv[1] &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  runCli().then((code) => process.exit(code));
}
