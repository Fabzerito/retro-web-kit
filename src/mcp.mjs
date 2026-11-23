#!/usr/bin/env node
// retro-web-kit MCP server (stdio JSON-RPC 2.0, zero dependencies, stack- & harness-agnostic).
// Designed to plug into ANY language, framework, or boilerplate; also offers an optional static HTML starter.
import { createInterface } from "node:readline";
import { readFileSync, existsSync, realpathSync } from "node:fs";
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
  ARCHETYPE_NAMES,
  exportCss,
  exportWidgets,
  exportThemeTokens,
  createStarterSite,
  addPage,
  syncSite,
  auditSite,
  bundlePage,
} from "./core/index.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const PKG_VERSION = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8")).version;

const COLOR_SCHEMA = {
  oneOf: [
    { type: "string", description: 'Hex color like "#000033" or RGB csv like "0,0,51"' },
    {
      type: "array",
      items: { type: "number" },
      minItems: 3,
      maxItems: 3,
      description: "RGB array [r, g, b]",
    },
  ],
};

export const TOOLS = [
  // ---- Stack-agnostic asset generators ----
  {
    name: "generate_starfield",
    description:
      "Generate a seamlessly tileable 90s starfield background PNG into any project's static/assets directory.",
    inputSchema: {
      type: "object",
      properties: {
        out: { type: "string", description: "Relative output path, e.g. public/assets/bg-stars.png or static/bg-stars.png" },
        size: { type: "number", description: "Tile size in px (16-512), default 128" },
        stars: { type: "number", description: "Number of stars (5-2000), default 90" },
        sky: COLOR_SCHEMA,
        seed: { type: "number", description: "Optional PRNG seed for deterministic output" },
      },
      required: ["out"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
  },
  {
    name: "generate_button",
    description: "Generate an authentic 88x31 beveled web button PNG with 5x7 pixel text (max 14 chars).",
    inputSchema: {
      type: "object",
      properties: {
        out: { type: "string", description: "Relative output path, e.g. public/assets/btn-home.png" },
        text: { type: "string", description: "Button text (max 14 chars), default 'MY SITE'" },
        fg: COLOR_SCHEMA,
        bg: COLOR_SCHEMA,
        accent: COLOR_SCHEMA,
      },
      required: ["out"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
  },
  {
    name: "generate_divider",
    description: "Generate a horizontal divider PNG (styles: diamond, rainbow, construction, stars).",
    inputSchema: {
      type: "object",
      properties: {
        out: { type: "string", description: "Relative output path, e.g. assets/divider.png" },
        width: { type: "number", description: "Width in px (40-2000), default 468" },
        style: {
          type: "string",
          enum: ["diamond", "rainbow", "construction", "stars"],
          description: "Divider style, default 'diamond'",
        },
        color: COLOR_SCHEMA,
      },
      required: ["out"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
  },
  {
    name: "generate_banner",
    description: "Generate a classic 468x60 beveled retro web banner PNG with title and subtitle.",
    inputSchema: {
      type: "object",
      properties: {
        out: { type: "string", description: "Relative output path, e.g. assets/banner.png" },
        title: { type: "string", description: "Main banner title" },
        subtitle: { type: "string", description: "Smaller subtitle line" },
        width: { type: "number", description: "Width in px, default 468" },
        height: { type: "number", description: "Height in px, default 60" },
        bg: COLOR_SCHEMA,
        fg: COLOR_SCHEMA,
        accent: COLOR_SCHEMA,
      },
      required: ["out"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
  },
  {
    name: "generate_badge",
    description:
      "Generate an animated GIF89a retro badge (e.g. blinking 'NEW!', 'HOT!', rainbow text, or scrolling hazard 'UNDER CONSTRUCTION').",
    inputSchema: {
      type: "object",
      properties: {
        out: { type: "string", description: "Relative output path ending in .gif, e.g. assets/badge-new.gif" },
        text: { type: "string", description: "Badge text (max 22 chars), default 'NEW!'" },
        style: {
          type: "string",
          enum: ["blink", "rainbow", "construction"],
          description: "Animation style, default 'blink'",
        },
        delayCs: { type: "number", description: "Frame delay in centiseconds (100 = 1s), default 30" },
        scale: { type: "number", description: "Pixel font scale (1-3), default 1" },
        fg: COLOR_SCHEMA,
        bg: COLOR_SCHEMA,
      },
      required: ["out"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
  },

  // ---- Real period archive search & local download ----
  {
    name: "search_gifs",
    description:
      "Search GifCities (Internet Archive's GeoCities GIF index) for authentic 90s animated GIFs. Returns direct URLs to download locally with fetch_asset.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search keywords, e.g. 'under construction', 'dancing', 'mail'" },
        limit: { type: "number", description: "Max results (1-50), default 12" },
      },
      required: ["query"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "search_buttons",
    description:
      "Search the 88x31 web button archive (cyber.dabamos.de/88x31/) by filename keyword (e.g. 'netscape', 'geocities', 'html', 'linux').",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Keyword(s) to match against button filenames" },
        limit: { type: "number", description: "Max results (1-50), default 15" },
      },
      required: ["query"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "fetch_asset",
    description:
      "Download a period image URL into any relative project path (e.g. static/assets/uc.gif) and verify its magic bytes so broken HTML 404 pages are never saved.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "http(s) URL of the image to download" },
        out: { type: "string", description: "Relative output path inside the project" },
      },
      required: ["url", "out"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
  },

  // ---- Drop-in CSS, Web Components, Tokens & Snippets (for ANY stack) ----
  {
    name: "export_css",
    description:
      "Export a standalone, framework-agnostic retro.css stylesheet (with CSS custom properties + 90s classes) to drop into ANY stack (React, Vue, Svelte, Astro, Django, Rails, PHP, Go, Hugo, plain HTML).",
    inputSchema: {
      type: "object",
      properties: {
        theme: { type: "string", enum: Object.keys(THEMES), description: "Theme preset, default 'space'" },
        assetPrefix: {
          type: "string",
          description: "URL prefix to bg-stars.png (e.g. './assets', '/static/assets', '../assets')",
        },
        starfield: { type: "boolean", description: "Include tiled bg-stars.png rule on body (default true)" },
        out: { type: "string", description: "Optional relative file path to write retro.css; omit to return CSS text" },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
  },
  {
    name: "export_widgets",
    description:
      "Export zero-dependency browser Web Components (<retro-marquee>, <retro-blink>, <retro-counter>, <retro-window>, <retro-chiptune>, <retro-guestbook>) that work in plain HTML and every frontend/backend framework.",
    inputSchema: {
      type: "object",
      properties: {
        out: { type: "string", description: "Optional relative output path (e.g. public/retro-widgets.js); omit to return JS text" },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
  },
  {
    name: "theme_tokens",
    description:
      "Return machine-readable 90s theme design tokens (hex colors, RGB arrays, fonts) for integrating retro-web-kit into any styling system or language.",
    inputSchema: {
      type: "object",
      properties: {
        theme: { type: "string", enum: Object.keys(THEMES), description: "Optional single theme name; omit for all themes" },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "retro_snippets",
    description:
      "Return drop-in retro HTML/CSS/JS recipes (marquee, blink, rainbow, chromePanels, hitCounter, guestbook, webring, sparkleCursor, crtScanlines, footer).",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Optional single snippet category to return" },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },

  // ---- Stack-agnostic audit & static bundler ----
  {
    name: "audit_site",
    description:
      "Stack-agnostic retro audit: scans HTML, JSX/TSX, Vue, Svelte, Astro, PHP, Jinja, ERB, Go templates, and CSS for hotlinked external assets, missing/corrupt/unused images, broken local links, and deprecated tags.",
    inputSchema: {
      type: "object",
      properties: {
        dir: { type: "string", description: "Project directory to audit (default: current working directory)" },
        assetsDir: {
          type: "string",
          description: "Optional custom static/assets root relative to dir (auto-checks root, public/, static/, assets/, wwwroot/)",
        },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "bundle_site",
    description:
      "Bundle a static HTML page (default index.html) into a single self-contained HTML document with CSS, JS, and local images inlined as data URIs.",
    inputSchema: {
      type: "object",
      properties: {
        dir: { type: "string", description: "Site directory (default: current working directory)" },
        entry: { type: "string", description: "HTML entry file relative to dir (default: index.html)" },
        out: { type: "string", description: "Optional relative output path to write the bundled HTML file" },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
  },

  // ---- OPTIONAL zero-build static HTML starter (skip when using another stack/boilerplate) ----
  {
    name: "create_starter_site",
    description:
      "OPTIONAL convenience helper: generate a zero-build static HTML GeoCities starter site with customizable pages/archetypes. Skip this completely if the user wants another language, framework, or boilerplate — use export_css, export_widgets, generate_*, fetch_asset, and audit_site directly instead.",
    inputSchema: {
      type: "object",
      properties: {
        dir: { type: "string", description: "Target directory (default: current working directory)" },
        pages: {
          oneOf: [
            {
              type: "string",
              description: "Comma-separated page list or slug:archetype pairs, e.g. 'home,about,gallery,music,cats:shrine,guestbook'",
            },
            { type: "array", items: { type: "string" } },
          ],
          description: `Pages to create (archetypes: ${ARCHETYPE_NAMES.join(", ")}). Defaults to home,about,links,guestbook.`,
        },
        title: { type: "string", description: "Site title" },
        owner: { type: "string", description: "Webmaster handle/name" },
        topic: { type: "string", description: "What the site is about" },
        email: { type: "string", description: "Webmaster email for the footer" },
        year: { type: "string", description: "Retro copyright year, default '1998'" },
        theme: { type: "string", enum: Object.keys(THEMES), description: "Visual theme preset" },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
  },
  {
    name: "add_page",
    description:
      "Optional static HTML starter helper: add a new HTML page (with an archetype) to a site created with create_starter_site and sync its navigation.",
    inputSchema: {
      type: "object",
      properties: {
        dir: { type: "string", description: "Site directory (default: current directory)" },
        filename: { type: "string", description: "Page filename or slug, e.g. gallery.html or cats" },
        type: { type: "string", enum: ARCHETYPE_NAMES, description: `Page layout archetype (${ARCHETYPE_NAMES.join(", ")})` },
        title: { type: "string", description: "Page <title> text" },
        label: { type: "string", description: "Navigation link text" },
        heading: { type: "string", description: "Main <h1> heading" },
        contentHtml: { type: "string", description: "Optional custom inner HTML for the page body" },
      },
      required: ["filename"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
  },
  {
    name: "sync_site",
    description:
      "Optional static HTML starter helper: sync shared chrome (nav, marquee, banner, footer, webring, theme/CSS) from retro.json across every HTML page without overwriting custom page bodies.",
    inputSchema: {
      type: "object",
      properties: {
        dir: { type: "string", description: "Site directory (default: current directory)" },
        theme: { type: "string", enum: Object.keys(THEMES), description: "Optional new theme to apply" },
        title: { type: "string", description: "Optional updated site title" },
        owner: { type: "string", description: "Optional updated webmaster handle" },
        email: { type: "string", description: "Optional updated contact email" },
        year: { type: "string", description: "Optional updated retro copyright year" },
        marqueeText: { type: "string", description: "Optional updated marquee banner text" },
        regenerateCss: { type: "boolean", description: "Force regenerating css/retro.css" },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false },
  },
];

export const RESOURCES = [
  {
    uri: "retro-web-kit://docs/design-tokens",
    name: "90s Retro Web Design Tokens",
    description: "Era-authentic fonts, neon palettes, bevels, layout rules, and aesthetic bans (stack-agnostic).",
    mimeType: "text/markdown",
    file: join(REPO_ROOT, "skills", "retro-web-kit", "references", "design-tokens.md"),
  },
  {
    uri: "retro-web-kit://docs/asset-sources",
    name: "90s Period Asset Archives & References",
    description: "Curated sources for real GeoCities GIFs, 88x31 buttons, tileable backgrounds, and mirrors.",
    mimeType: "text/markdown",
    file: join(REPO_ROOT, "skills", "retro-web-kit", "references", "sources.md"),
  },
];

export const PROMPTS = [
  {
    name: "build-geocities-site",
    description: "Stack-agnostic prompt to build an authentic 1998 GeoCities-style website in any chosen language or framework.",
    arguments: [
      { name: "topic", description: "Subject of the website", required: true },
      { name: "owner", description: "Webmaster handle/name", required: false },
      { name: "stack", description: "Preferred language/framework (e.g. plain HTML, Astro, React, Django, Rails, PHP, Go)", required: false },
      { name: "theme", description: `Theme preset (${Object.keys(THEMES).join(", ")})`, required: false },
    ],
  },
];

export async function callTool(name, args = {}, cwd = process.cwd()) {
  switch (name) {
    case "generate_starfield":
      return JSON.stringify(generateStarfield(args, cwd), null, 2);
    case "generate_button":
      return JSON.stringify(generateButton(args, cwd), null, 2);
    case "generate_divider":
      return JSON.stringify(generateDivider(args, cwd), null, 2);
    case "generate_banner":
      return JSON.stringify(generateBanner(args, cwd), null, 2);
    case "generate_badge":
      return JSON.stringify(generateAnimatedBadge(args, cwd), null, 2);
    case "search_gifs":
      return JSON.stringify(await searchGifCities(args.query, { limit: args.limit }), null, 2);
    case "search_buttons":
      return JSON.stringify(await searchButtons88x31(args.query, { limit: args.limit }), null, 2);
    case "fetch_asset":
      return JSON.stringify(await fetchAsset(args, cwd), null, 2);
    case "export_css": {
      const res = exportCss(args, cwd);
      const { css, ...meta } = res;
      return JSON.stringify(args.out ? meta : { ...meta, css }, null, 2);
    }
    case "export_widgets": {
      const res = exportWidgets(args, cwd);
      const { js, ...meta } = res;
      return JSON.stringify(args.out ? meta : { ...meta, js }, null, 2);
    }
    case "theme_tokens":
      return JSON.stringify(exportThemeTokens(args.theme), null, 2);
    case "retro_snippets": {
      const snippets = getRetroSnippets(args.category);
      const payload = args.category ? snippets : { themes: Object.keys(THEMES), snippets };
      return JSON.stringify(payload, null, 2);
    }
    case "audit_site":
      return JSON.stringify(auditSite(args.dir ?? ".", cwd, { assetsDir: args.assetsDir }), null, 2);
    case "bundle_site": {
      const res = bundlePage(args, cwd);
      const { html, ...meta } = res;
      return JSON.stringify(args.out ? meta : { ...meta, html }, null, 2);
    }
    case "create_starter_site":
      return JSON.stringify(createStarterSite(args, cwd), null, 2);
    case "add_page":
      return JSON.stringify(addPage(args, cwd), null, 2);
    case "sync_site":
      return JSON.stringify(syncSite(args, cwd), null, 2);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export async function handleRpc(method, params = {}, cwd = process.cwd()) {
  switch (method) {
    case "initialize":
      return {
        protocolVersion: params.protocolVersion || "2024-11-05",
        capabilities: { tools: {}, resources: {}, prompts: {} },
        serverInfo: { name: "retro-web-kit", version: PKG_VERSION },
      };
    case "ping":
      return {};
    case "tools/list":
      return { tools: TOOLS };
    case "tools/call":
      try {
        const text = await callTool(params.name, params.arguments ?? {}, cwd);
        return { content: [{ type: "text", text }] };
      } catch (err) {
        return { content: [{ type: "text", text: err.message }], isError: true };
      }
    case "resources/list":
      return {
        resources: RESOURCES.map(({ file: _file, ...r }) => r),
      };
    case "resources/read": {
      const found = RESOURCES.find((r) => r.uri === params.uri);
      if (!found || !existsSync(found.file)) {
        throw Object.assign(new Error(`Resource not found: ${params.uri}`), { code: -32002 });
      }
      return {
        contents: [
          {
            uri: found.uri,
            mimeType: found.mimeType,
            text: readFileSync(found.file, "utf8"),
          },
        ],
      };
    }
    case "prompts/list":
      return { prompts: PROMPTS };
    case "prompts/get": {
      if (params.name !== "build-geocities-site") {
        throw Object.assign(new Error(`Unknown prompt: ${params.name}`), { code: -32602 });
      }
      const topic = params.arguments?.topic || "retro computing and 90s nostalgia";
      const owner = params.arguments?.owner || "CyberSurfer";
      const stack = params.arguments?.stack || "whatever stack fits best (or the optional static HTML starter)";
      const theme = params.arguments?.theme || "space";
      return {
        description: "Build an authentic 1998 GeoCities-style website in any stack",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text:
                `Build an authentic 1998 GeoCities-style website about "${topic}" for webmaster "${owner}" using theme "${theme}" and stack: ${stack}. ` +
                `Use export_css + export_widgets + generate_* + search_gifs/fetch_asset (saving all media locally, never hotlinking) inside the chosen stack — or optionally create_starter_site if using plain static HTML — and finish with audit_site to verify zero errors.`,
            },
          },
        ],
      };
    }
    default:
      return undefined;
  }
}

async function startStdioServer() {
  const send = (msg) => process.stdout.write(JSON.stringify({ jsonrpc: "2.0", ...msg }) + "\n");
  for await (const line of createInterface({ input: process.stdin })) {
    if (!line.trim()) continue;
    let req;
    try {
      req = JSON.parse(line);
    } catch {
      send({ id: null, error: { code: -32700, message: "Parse error" } });
      continue;
    }
    if (req.id === undefined) continue; // notification
    try {
      const result = await handleRpc(req.method, req.params ?? {});
      if (result === undefined) {
        send({ id: req.id, error: { code: -32601, message: `Unknown method: ${req.method}` } });
      } else {
        send({ id: req.id, result });
      }
    } catch (err) {
      send({ id: req.id, error: { code: err.code || -32603, message: err.message } });
    }
  }
}

const isMain =
  process.argv[1] &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
  startStdioServer();
}
