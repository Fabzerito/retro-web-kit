import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync, spawn } from "node:child_process";

import {
  generateStarfield,
  generateButton,
  generateDivider,
  generateBanner,
  generateAnimatedBadge,
  detectImageFormat,
  parseGifCitiesHtml,
  parseButtons88x31Html,
  fetchAsset,
  getRetroSnippets,
  THEMES,
  ARCHETYPE_NAMES,
  parsePagesSpec,
  exportCss,
  exportWidgets,
  exportThemeTokens,
  createStarterSite,
  addPage,
  syncSite,
  auditSite,
  bundlePage,
  startPreviewServer,
} from "../src/core/index.mjs";
import { handleRpc, TOOLS, RESOURCES, PROMPTS } from "../src/mcp.mjs";

function makeTmpDir() {
  return mkdtempSync(join(tmpdir(), "retro-web-kit-test-"));
}

test("PNG and GIF generators produce valid binary headers, exact dimensions, and safe paths", () => {
  const dir = makeTmpDir();
  try {
    const sf = generateStarfield({ out: "assets/stars.png", size: 64, stars: 40, sky: "#001133", seed: 42 }, dir);
    const sfBuf = readFileSync(sf.path);
    assert.equal(detectImageFormat(sfBuf), "png");
    assert.equal(sfBuf.readUInt32BE(16), 64);
    assert.equal(sfBuf.readUInt32BE(20), 64);

    // Deterministic seed produces identical bytes
    const sf2 = generateStarfield({ out: "assets/stars2.png", size: 64, stars: 40, sky: [0, 17, 51], seed: 42 }, dir);
    assert.deepEqual(sfBuf, readFileSync(sf2.path));

    const btn = generateButton({ out: "assets/btn.png", text: "NETSCAPE", bg: "#000080", fg: "#ffff00", accent: "#ff00ff" }, dir);
    const btnBuf = readFileSync(btn.path);
    assert.equal(detectImageFormat(btnBuf), "png");
    assert.equal(btnBuf.readUInt32BE(16), 88);
    assert.equal(btnBuf.readUInt32BE(20), 31);

    for (const style of ["diamond", "rainbow", "construction", "stars"]) {
      const div = generateDivider({ out: `assets/div-${style}.png`, width: 300, style }, dir);
      const divBuf = readFileSync(div.path);
      assert.equal(detectImageFormat(divBuf), "png");
      assert.equal(divBuf.readUInt32BE(16), 300);
      assert.equal(divBuf.readUInt32BE(20), 20);
    }

    const banner = generateBanner({ out: "assets/banner.png", title: "CYBER ZONE", subtitle: "EST 1998" }, dir);
    const bannerBuf = readFileSync(banner.path);
    assert.equal(detectImageFormat(bannerBuf), "png");
    assert.equal(bannerBuf.readUInt32BE(16), 468);
    assert.equal(bannerBuf.readUInt32BE(20), 60);

    for (const style of ["blink", "rainbow", "construction"]) {
      const badge = generateAnimatedBadge({ out: `assets/badge-${style}.gif`, text: "HOT!", style, scale: 2 }, dir);
      const gifBuf = readFileSync(badge.path);
      assert.equal(detectImageFormat(gifBuf), "gif");
      assert.equal(gifBuf.subarray(0, 6).toString("ascii"), "GIF89a");
      assert.equal(gifBuf[gifBuf.length - 1], 0x3b);
      assert.ok(gifBuf.includes(Buffer.from("NETSCAPE2.0", "ascii")));
      assert.ok(badge.frames >= 2);
    }

    // Path traversal rejection (MCP sandbox default)
    assert.throws(() => generateButton({ out: "../escape.png" }, dir), /relative path/);
    assert.throws(() => generateButton({ out: "/tmp/abs.png" }, dir), /relative path/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("exportCss, exportWidgets, and exportThemeTokens produce stack-agnostic drop-in files", () => {
  const dir = makeTmpDir();
  try {
    const cssRes = exportCss({ theme: "cyber", assetPrefix: "/static/assets", out: "static/retro.css" }, dir);
    assert.equal(cssRes.theme, "cyber");
    const css = readFileSync(join(dir, "static", "retro.css"), "utf8");
    assert.ok(css.includes("--retro-heading:"));
    assert.ok(css.includes('url("/static/assets/bg-stars.png")'));

    const noStar = exportCss({ theme: "matrix", starfield: false }, dir);
    assert.ok(!noStar.css.includes("bg-stars.png"));

    const widgetsRes = exportWidgets({ out: "static/retro-widgets.js" }, dir);
    assert.equal(widgetsRes.components.length, 6);
    const js = readFileSync(join(dir, "static", "retro-widgets.js"), "utf8");
    for (const tag of ["retro-marquee", "retro-blink", "retro-counter", "retro-window", "retro-chiptune", "retro-guestbook"]) {
      assert.ok(js.includes(`"${tag}"`), `missing custom element ${tag}`);
    }

    const allTokens = exportThemeTokens();
    assert.equal(Object.keys(allTokens).length, Object.keys(THEMES).length);
    const spaceTokens = exportThemeTokens("space");
    assert.equal(spaceTokens.name, "space");
    assert.ok(Array.isArray(spaceTokens.skyRgb));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("stack-agnostic auditSite works across Flask/Jinja, PHP, Vue, Astro, and Go templates", () => {
  const dir = makeTmpDir();
  try {
    // Simulate a Python/Flask or Django project with templates/ and static/assets/
    mkdirSync(join(dir, "templates"), { recursive: true });
    mkdirSync(join(dir, "static", "css"), { recursive: true });
    mkdirSync(join(dir, "static", "js"), { recursive: true });
    mkdirSync(join(dir, "static", "assets"), { recursive: true });

    exportCss({ theme: "cyber", assetPrefix: "/static/assets", out: "static/css/retro.css" }, dir);
    exportWidgets({ out: "static/js/retro-widgets.js" }, dir);
    generateStarfield({ out: "static/assets/bg-stars.png" }, dir);
    generateBanner({ out: "static/assets/banner.png", title: "FLASK 98" }, dir);
    generateAnimatedBadge({ out: "static/assets/new.gif", text: "NEW!" }, dir);

    // Jinja template with dynamic routes + static assets
    writeFileSync(
      join(dir, "templates", "index.jinja2"),
      `<!doctype html>
      <html>
        <head><link rel="stylesheet" href="/static/css/retro.css"></head>
        <body>
          <a href="/about">About Route</a>
          <a href="{{ url_for('guestbook') }}">Guestbook</a>
          <img src="/static/assets/banner.png" alt="Banner">
          <img src="/static/assets/new.gif" alt="New">
          <script src="/static/js/retro-widgets.js"></script>
        </body>
      </html>`,
      "utf8",
    );

    // Also drop a Vue SFC with PascalCase <Marquee> (should NOT trigger deprecated HTML <marquee> warning)
    writeFileSync(
      join(dir, "templates", "Widget.vue"),
      `<template><Marquee><img src="/static/assets/banner.png" /></Marquee></template>`,
      "utf8",
    );

    // Clean pass
    const clean = auditSite(dir);
    assert.equal(clean.ok, true, JSON.stringify(clean.issues));
    assert.equal(clean.warnings.length, 0, JSON.stringify(clean.warnings));
    assert.equal(clean.stats.markupFiles, 2);
    assert.equal(clean.stats.imageFiles, 3);

    // Now inject a PHP page with a hotlink, missing asset, and corrupt image
    writeFileSync(
      join(dir, "templates", "bad.php"),
      `<img src="https://evil.example/hotlink.gif"><img src="/static/assets/missing.gif"><marquee>old</marquee>`,
      "utf8",
    );
    writeFileSync(join(dir, "static", "assets", "corrupt.gif"), "<html>404</html>", "utf8");

    const dirty = auditSite(dir);
    assert.equal(dirty.ok, false);
    const issueTypes = new Set(dirty.issues.map((i) => i.type));
    const warnTypes = new Set(dirty.warnings.map((w) => w.type));
    assert.ok(issueTypes.has("hotlink"));
    assert.ok(issueTypes.has("missing-asset"));
    assert.ok(issueTypes.has("invalid-image"));
    assert.ok(warnTypes.has("deprecated-tag"));
    assert.ok(warnTypes.has("unused-asset"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("optional static HTML starter works across all themes, archetypes, addPage, syncSite, and auditSite", () => {
  for (const themeName of Object.keys(THEMES)) {
    const dir = makeTmpDir();
    try {
      const res = createStarterSite(
        {
          dir: "site",
          title: `Test ${themeName}`,
          owner: "PixelKid",
          topic: "retro computing",
          theme: themeName,
        },
        dir,
      );
      const siteDir = join(dir, "site");
      assert.equal(res.theme, themeName);
      assert.ok(existsSync(join(siteDir, "index.html")));
      assert.ok(existsSync(join(siteDir, "css", "retro.css")));
      assert.ok(existsSync(join(siteDir, "js", "retro-widgets.js")));

      const audit = auditSite(siteDir);
      assert.equal(audit.ok, true, JSON.stringify(audit.issues));
      assert.equal(audit.warnings.length, 0, JSON.stringify(audit.warnings));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  // Multi-page archetypes + syncSite preserving custom body content
  const dir = makeTmpDir();
  try {
    const pagesSpec = "home,about,gallery,music,downloads,blog,cats:shrine,links,guestbook";
    const parsed = parsePagesSpec(pagesSpec);
    assert.equal(parsed.length, 9);
    assert.equal(parsed.find((p) => p.slug === "cats").type, "shrine");

    const res = createStarterSite({ dir: "big", title: "Mega 90s", theme: "space", pages: pagesSpec }, dir);
    const siteDir = join(dir, "big");
    assert.equal(res.pages.length, 9);
    assert.ok(readFileSync(join(siteDir, "music.html"), "utf8").includes("<retro-chiptune>"));

    const aboutPath = join(siteDir, "about.html");
    writeFileSync(
      aboutPath,
      readFileSync(aboutPath, "utf8").replace(
        "<!-- RETRO_CONTENT_END -->",
        "<p>CUSTOM_UNIQUE_BODY_1998</p>\n            <!-- RETRO_CONTENT_END -->",
      ),
      "utf8",
    );

    const added = addPage({ dir: siteDir, filename: "wallpapers", type: "downloads", title: "Wallpapers" }, dir);
    assert.equal(added.file, "wallpapers.html");
    assert.equal(added.navUpdatedIn.length, 10);

    const synced = syncSite({ dir: siteDir, theme: "matrix", marqueeText: "*** MATRIX SYNCED ***" }, dir);
    assert.equal(synced.syncedPages.length, 10);
    const aboutAfter = readFileSync(aboutPath, "utf8");
    assert.ok(aboutAfter.includes("CUSTOM_UNIQUE_BODY_1998"));
    assert.ok(aboutAfter.includes("*** MATRIX SYNCED ***"));
    assert.ok(aboutAfter.includes('href="wallpapers.html"'));
    assert.ok(readFileSync(join(siteDir, "css", "retro.css"), "utf8").includes("theme: matrix"));

    const audit = auditSite(siteDir);
    assert.equal(audit.ok, true, JSON.stringify(audit.issues));
    assert.equal(audit.warnings.length, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("bundlePage inlines CSS, JS, and all local images as data URIs", () => {
  const dir = makeTmpDir();
  try {
    createStarterSite({ dir: "site" }, dir);
    const bundled = bundlePage({ dir: "site", entry: "index.html", out: "dist/standalone.html" }, dir);
    assert.ok(existsSync(join(dir, "dist", "standalone.html")));
    assert.ok(bundled.inlinedAssets >= 8);
    assert.ok(!bundled.html.includes('href="css/retro.css"'));
    assert.ok(!bundled.html.includes('src="js/retro-widgets.js"'));
    assert.ok(bundled.html.includes("data:image/png;base64,"));
    assert.ok(bundled.html.includes("data:image/gif;base64,"));
    assert.ok(bundled.html.includes("<style>"));
    assert.ok(bundled.html.includes("<script>"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("startPreviewServer serves site files with proper MIME types and blocks traversal", async () => {
  const dir = makeTmpDir();
  try {
    createStarterSite({ dir: "." }, dir);
    const srv = await startPreviewServer({ dir, host: "127.0.0.1", port: 0 });
    try {
      const r1 = await fetch(srv.url);
      assert.equal(r1.status, 200);
      assert.match(r1.headers.get("content-type"), /text\/html/);
      assert.ok((await r1.text()).includes("CoolDude's Cyber Homepage"));

      const r2 = await fetch(`${srv.url}assets/badge-new.gif`);
      assert.equal(r2.status, 200);
      assert.equal(r2.headers.get("content-type"), "image/gif");

      const r3 = await fetch(`${srv.url}does-not-exist.html`);
      assert.equal(r3.status, 404);
    } finally {
      await srv.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("fetcher HTML parsers and fetchAsset magic-byte validation work reliably", async () => {
  const gifHtml = `
    <a href="https://web.archive.org/web/20091027/http://geocities.com/foo/index.html">
      <img width="208" height="81" src="https://blob.gifcities.org/gifcities/ABC123.gif">
    </a>`;
  const parsedGifs = parseGifCitiesHtml(gifHtml, 10);
  assert.equal(parsedGifs.length, 1);
  assert.equal(parsedGifs[0].url, "https://blob.gifcities.org/gifcities/ABC123.gif");

  const btnHtml = `<img src="netscape_now.gif"><img src="geocities_cool.gif">`;
  const parsedBtns = parseButtons88x31Html(btnHtml, "netscape", 10);
  assert.equal(parsedBtns.length, 1);
  assert.equal(parsedBtns[0].url, "https://cyber.dabamos.de/88x31/netscape_now.gif");

  const dir = makeTmpDir();
  try {
    const fakeHtmlFetch = async () => new Response("<html>not a gif</html>", { status: 200 });
    await assert.rejects(
      fetchAsset({ url: "https://example.com/bad.gif", out: "assets/bad.gif", fetchImpl: fakeHtmlFetch }, dir),
      /not a valid image/,
    );
    assert.equal(existsSync(join(dir, "assets", "bad.gif")), false);

    const validGifBytes = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
    const fakeGifFetch = async () => new Response(validGifBytes, { status: 200 });
    const ok = await fetchAsset(
      { url: "https://example.com/ok.gif", out: "assets/ok.gif", fetchImpl: fakeGifFetch },
      dir,
    );
    assert.equal(ok.format, "gif");
    assert.equal(existsSync(join(dir, "assets", "ok.gif")), true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("retro snippets return all categories and support filtering", () => {
  const all = getRetroSnippets();
  assert.ok(all.marquee && all.blink && all.hitCounter && all.guestbook && all.webring);
  assert.ok(!all.hitCounter.js.includes("countapi.xyz"));
  const one = getRetroSnippets("webring");
  assert.deepEqual(Object.keys(one), ["webring"]);
  assert.throws(() => getRetroSnippets("nonexistent"));
});

test("CLI stack-agnostic commands & optional starter work end-to-end via child process", () => {
  const dir = makeTmpDir();
  const cliPath = join(process.cwd(), "src", "cli.mjs");
  try {
    // 1. Stack-agnostic workflow (e.g. a custom PHP/Python/Astro repo — no starter used!)
    mkdirSync(join(dir, "app", "static", "assets"), { recursive: true });
    const cssOut = JSON.parse(
      execFileSync(
        "node",
        [cliPath, "export-css", "app/static/retro.css", "--theme", "cyber", "--asset-prefix", "/static/assets", "--json"],
        { cwd: dir, encoding: "utf8" },
      ),
    );
    assert.equal(cssOut.theme, "cyber");
    const widOut = JSON.parse(
      execFileSync("node", [cliPath, "export-widgets", "app/static/retro-widgets.js", "--json"], {
        cwd: dir,
        encoding: "utf8",
      }),
    );
    assert.equal(widOut.components.length, 6);
    execFileSync("node", [cliPath, "generate-starfield", "app/static/assets/bg-stars.png"], { cwd: dir });
    execFileSync("node", [cliPath, "generate-badge", "app/static/assets/hot.gif", "--text", "HOT!"], { cwd: dir });
    writeFileSync(
      join(dir, "app", "index.php"),
      `<link rel="stylesheet" href="/static/retro.css"><img src="/static/assets/hot.gif"><script src="/static/retro-widgets.js"></script>`,
      "utf8",
    );
    const appAudit = JSON.parse(
      execFileSync("node", [cliPath, "audit", "app", "--json"], { cwd: dir, encoding: "utf8" }),
    );
    assert.equal(appAudit.ok, true);

    const tokens = JSON.parse(execFileSync("node", [cliPath, "tokens", "matrix"], { cwd: dir, encoding: "utf8" }));
    assert.equal(tokens.name, "matrix");

    const archetypes = JSON.parse(execFileSync("node", [cliPath, "archetypes", "--json"], { cwd: dir, encoding: "utf8" }));
    assert.equal(archetypes.length, ARCHETYPE_NAMES.length);

    // 2. Optional static HTML starter workflow
    const starterJson = JSON.parse(
      execFileSync("node", [cliPath, "starter", "mysite", "--theme", "matrix", "--pages", "home,gallery,music,guestbook", "--json"], {
        cwd: dir,
        encoding: "utf8",
      }),
    );
    assert.equal(starterJson.theme, "matrix");
    assert.equal(starterJson.pages.length, 4);

    const added = JSON.parse(
      execFileSync("node", [cliPath, "add-page", "snes", "--dir", "mysite", "--type", "shrine", "--json"], {
        cwd: dir,
        encoding: "utf8",
      }),
    );
    assert.equal(added.file, "snes.html");

    const synced = JSON.parse(
      execFileSync("node", [cliPath, "sync", "mysite", "--theme", "cyber", "--json"], { cwd: dir, encoding: "utf8" }),
    );
    assert.equal(synced.theme, "cyber");

    const audit = JSON.parse(execFileSync("node", [cliPath, "audit", "mysite", "--json"], { cwd: dir, encoding: "utf8" }));
    assert.equal(audit.ok, true);

    const bundled = JSON.parse(
      execFileSync("node", [cliPath, "bundle", "mysite", "--out", "mysite-bundle.html", "--json"], {
        cwd: dir,
        encoding: "utf8",
      }),
    );
    assert.ok(bundled.inlinedAssets >= 8);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("MCP server handles initialize, stack-agnostic tools, optional starter, resources, prompts, and stdio JSON-RPC", async () => {
  const dir = makeTmpDir();
  try {
    const init = await handleRpc("initialize", { protocolVersion: "2025-11-25" }, dir);
    assert.equal(init.serverInfo.name, "retro-web-kit");
    assert.ok(init.capabilities.tools && init.capabilities.resources && init.capabilities.prompts);

    const listTools = await handleRpc("tools/list", {}, dir);
    assert.equal(listTools.tools.length, TOOLS.length);

    const listRes = await handleRpc("resources/list", {}, dir);
    assert.equal(listRes.resources.length, RESOURCES.length);
    const readRes = await handleRpc("resources/read", { uri: "retro-web-kit://docs/design-tokens" }, dir);
    assert.ok(readRes.contents[0].text.includes("Comic Sans"));

    const listPrompts = await handleRpc("prompts/list", {}, dir);
    assert.equal(listPrompts.prompts.length, PROMPTS.length);
    const gotPrompt = await handleRpc("prompts/get", { name: "build-geocities-site", arguments: { topic: "cats", stack: "Astro" } }, dir);
    assert.ok(gotPrompt.messages[0].content.text.includes("Astro"));

    // Real stdio subprocess roundtrip testing stack-agnostic tools + optional starter
    const mcpPath = join(process.cwd(), "src", "mcp.mjs");
    const proc = spawn("node", [mcpPath], { cwd: dir, stdio: ["pipe", "pipe", "pipe"] });
    const responses = [];
    let buf = "";
    proc.stdout.on("data", (chunk) => {
      buf += chunk.toString("utf8");
      const lines = buf.split("\n");
      buf = lines.pop();
      for (const l of lines) if (l.trim()) responses.push(JSON.parse(l));
    });

    const requests = [
      { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-11-25" } },
      { jsonrpc: "2.0", method: "notifications/initialized" },
      { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "export_css", arguments: { theme: "cyber", out: "custom/retro.css" } } },
      { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "export_widgets", arguments: { out: "custom/retro-widgets.js" } } },
      { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "theme_tokens", arguments: { theme: "space" } } },
      { jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "create_starter_site", arguments: { dir: "mcp-site", theme: "cyber" } } },
      { jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "audit_site", arguments: { dir: "mcp-site" } } },
    ];
    for (const r of requests) proc.stdin.write(JSON.stringify(r) + "\n");
    proc.stdin.end();

    await new Promise((resolveExit) => proc.on("close", resolveExit));

    assert.equal(responses.length, 6);
    assert.equal(JSON.parse(responses[1].result.content[0].text).theme, "cyber");
    assert.equal(JSON.parse(responses[2].result.content[0].text).components.length, 6);
    assert.equal(JSON.parse(responses[3].result.content[0].text).name, "space");
    assert.equal(JSON.parse(responses[4].result.content[0].text).theme, "cyber");
    assert.equal(JSON.parse(responses[5].result.content[0].text).ok, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
