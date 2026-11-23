// Optional static HTML starter kit (zero build step, ready for Neocities / Netlify Drop).
// Completely optional: users/agents can use any language or framework and simply drop in
// retro-web-kit's assets, exported CSS, Web Components, snippets, and auditor.
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { getTheme } from "./snippets.mjs";
import {
  generateStarfield,
  generateButton,
  generateDivider,
  generateBanner,
  generateAnimatedBadge,
} from "./generators.mjs";
import { buildRetroCss, buildRetroWidgetsJs } from "./exports.mjs";
import {
  ARCHETYPE_META,
  ARCHETYPE_NAMES,
  escHtml,
  parsePagesSpec,
  renderArchetypeHtml,
  slugToTitle,
} from "./archetypes.mjs";

export function renderPageShell({
  siteTitle,
  pageTitle,
  owner,
  email,
  year,
  marqueeText,
  navLinks,
  activeHref,
  bodyHtml,
}) {
  const navHtml = navLinks
    .map((l) => {
      const cls = activeHref === l.href ? ' class="active-nav"' : "";
      return `              <a href="${escHtml(l.href)}"${cls}>${escHtml(l.label)}</a><br>`;
    })
    .join("\n");

  const guestbookHref = navLinks.find((l) => l.href === "guestbook.html")?.href || "index.html";
  const linksHref = navLinks.find((l) => l.href === "links.html")?.href || "index.html";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escHtml(pageTitle)} - ${escHtml(siteTitle)}</title>
  <link rel="stylesheet" href="css/retro.css">
</head>
<body data-sparkle="on">
  <table class="page" align="center" width="800" cellpadding="6" cellspacing="0" border="1">
    <tr><td>

      <retro-marquee speed="14"><span class="rainbow big">${escHtml(marqueeText)}</span></retro-marquee>

      <br>
      <center>
        <img src="assets/banner.png" width="468" height="60" alt="${escHtml(siteTitle)}"><br><br>
        <img src="assets/badge-construction.gif" alt="Under Construction">
        <img src="assets/badge-new.gif" alt="NEW!">
      </center>

      <hr class="retro">
      <center><img src="assets/divider.png" alt="------"></center>

      <table class="layout" width="100%" cellpadding="8">
        <tr>
          <td class="nav" width="160" valign="top">
            <div class="panel">
              <div class="panel-title">~ Navigation ~</div>
              <!-- NAV_LINKS_START -->
${navHtml}
              <!-- NAV_LINKS_END -->
              <hr class="retro">
              <center>
                <a href="index.html"><img src="assets/btn-home.png" width="88" height="31" alt="Home" border="0"></a><br>
                <a href="${escHtml(guestbookHref)}"><img src="assets/btn-guestbook.png" width="88" height="31" alt="Guestbook" border="0"></a><br>
                <img src="assets/btn-netscape.png" width="88" height="31" alt="Netscape Now!">
              </center>
            </div>
            <br>
            <div class="panel">
              <div class="panel-title">~ Visitor Counter ~</div>
              <center>
                <retro-counter start="1337"></retro-counter><br>
                <font face="Verdana" size="1">since ${escHtml(year)}</font>
              </center>
            </div>
          </td>
          <td valign="top">
            <!-- RETRO_CONTENT_START -->
${bodyHtml}
            <!-- RETRO_CONTENT_END -->
          </td>
        </tr>
      </table>

      <table class="webring" align="center" width="90%" cellpadding="4" cellspacing="0" border="1">
        <tr><td colspan="3" align="center"><b>~ Member of the 90s Retro WebRing ~</b></td></tr>
        <tr>
          <td><a href="${escHtml(linksHref)}">&laquo; Prev Site</a></td>
          <td align="center"><a href="index.html">Hub</a> | <a href="${escHtml(linksHref)}">List All Sites</a></td>
          <td align="right"><a href="${escHtml(linksHref)}">Next Site &raquo;</a></td>
        </tr>
      </table>

      <hr class="retro">
      <center>
        <font face="Verdana" size="1">
          Best viewed in Netscape Navigator 4.0 at 800x600 &bull; &copy; ${escHtml(year)} ${escHtml(owner)} &bull;
          <a href="mailto:${escHtml(email)}">Email ${escHtml(owner)}!</a>
        </font>
      </center>

    </td></tr>
  </table>
  <script src="js/retro-widgets.js"></script>
</body>
</html>
`;
}

function generateStarterAssets(dir, { title, owner, year, theme }) {
  return [
    generateStarfield({ out: "assets/bg-stars.png", sky: theme.skyRgb, seed: 1998 }, dir),
    generateDivider(
      { out: "assets/divider.png", color: theme.dividerColor, style: theme.dividerStyle },
      dir,
    ),
    generateBanner(
      {
        out: "assets/banner.png",
        title: title.slice(0, 30),
        subtitle: `EST. ${year} - ${owner.toUpperCase()}'S CORNER OF THE WEB`,
        bg: theme.bannerBg,
        fg: theme.bannerFg,
        accent: theme.bannerAccent,
      },
      dir,
    ),
    generateButton(
      { out: "assets/btn-home.png", text: "HOME", bg: theme.buttonBg, fg: theme.buttonFg, accent: theme.buttonAccent },
      dir,
    ),
    generateButton(
      { out: "assets/btn-guestbook.png", text: "GUESTBOOK", bg: theme.buttonBg, fg: theme.buttonFg, accent: theme.buttonAccent },
      dir,
    ),
    generateButton(
      { out: "assets/btn-netscape.png", text: "NETSCAPE 4.0", bg: [0, 102, 102], fg: [255, 255, 255], accent: [0, 204, 204] },
      dir,
    ),
    generateAnimatedBadge({ out: "assets/badge-new.gif", text: "NEW!", style: "blink" }, dir),
    generateAnimatedBadge(
      { out: "assets/badge-construction.gif", text: "UNDER CONSTRUCTION", style: "construction" },
      dir,
    ),
  ];
}

function writeRetroManifest(dir, manifest) {
  writeFileSync(join(dir, "retro.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

function readRetroManifest(dir) {
  const p = join(dir, "retro.json");
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}

/**
 * OPTIONAL: Create a ready-to-edit static HTML starter site (no build step, Neocities-ready).
 * Not required — all asset generators, CSS/widget exports, search/fetch, and audit work in any stack.
 */
export function createStarterSite(opts = {}, baseDir = process.cwd()) {
  const dir = opts.dir ? resolve(baseDir, opts.dir) : baseDir;
  const title = String(opts.title ?? "CoolDude's Cyber Homepage").trim();
  const owner = String(opts.owner ?? "CoolDude").trim();
  const topic = String(opts.topic ?? "90s computers, MIDI music, and cyberspace").trim();
  const email = String(
    opts.email ?? `${owner.toLowerCase().replace(/[^a-z0-9]/g, "") || "webmaster"}@example.com`,
  ).trim();
  const year = String(opts.year ?? "1998").trim();
  const theme = getTheme(opts.theme ?? "space");
  const pages = parsePagesSpec(opts.pages);
  const marqueeText = `*** WELCOME TO ${title.toUpperCase()} *** BEST VIEWED AT 800x600 ***`;

  mkdirSync(join(dir, "css"), { recursive: true });
  mkdirSync(join(dir, "js"), { recursive: true });
  mkdirSync(join(dir, "assets"), { recursive: true });

  const assets = generateStarterAssets(dir, { title, owner, year, theme });
  writeFileSync(join(dir, "css", "retro.css"), buildRetroCss(theme, { assetPrefix: "../assets" }), "utf8");
  writeFileSync(join(dir, "js", "retro-widgets.js"), buildRetroWidgetsJs(), "utf8");

  const navLinks = pages.map((p) => ({ href: p.file, label: p.label }));

  for (const p of pages) {
    const bodyHtml = renderArchetypeHtml(p.type, {
      siteTitle: title,
      owner,
      topic,
      year,
      title: p.title,
      heading: p.title,
      pages,
    });
    const html = renderPageShell({
      siteTitle: title,
      pageTitle: p.title,
      owner,
      email,
      year,
      marqueeText,
      navLinks,
      activeHref: p.file,
      bodyHtml,
    });
    writeFileSync(join(dir, p.file), html, "utf8");
  }

  writeRetroManifest(dir, {
    schemaVersion: 1,
    title,
    owner,
    topic,
    email,
    year,
    theme: theme.name,
    marqueeText,
    pages,
  });

  return {
    dir,
    theme: theme.name,
    pages: pages.map((p) => p.file),
    files: [
      "retro.json",
      ...pages.map((p) => p.file),
      "css/retro.css",
      "js/retro-widgets.js",
      ...assets.map((a) => a.out),
    ],
    summary: `Created optional static HTML starter "${title}" (theme: ${theme.name}) in ${dir} with ${pages.length} pages and ${assets.length} local assets.`,
  };
}

// Backwards-compatible alias
export const scaffoldSite = createStarterSite;

/**
 * Add a new HTML page (with optional archetype) to a static HTML starter site and sync navigation.
 */
export function addPage(opts = {}, baseDir = process.cwd()) {
  const dir = opts.dir ? resolve(baseDir, opts.dir) : baseDir;
  const rawSlug = String(opts.filename ?? opts.slug ?? "").trim();
  if (!rawSlug) throw new Error("filename (e.g. gallery.html or gallery) is required");
  if (rawSlug.includes("/") || rawSlug.includes("\\") || rawSlug.includes("..")) {
    throw new Error("filename must be a simple filename or slug like gallery.html");
  }

  const slug = rawSlug.replace(/\.html?$/i, "").toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const filename = `${slug}.html`;
  const type = String(opts.type ?? (ARCHETYPE_META[slug] ? slug : "blank")).toLowerCase();
  if (!ARCHETYPE_META[type]) {
    throw new Error(`Unknown page archetype "${type}". Available: ${ARCHETYPE_NAMES.join(", ")}`);
  }

  const indexPath = join(dir, "index.html");
  if (!existsSync(indexPath)) {
    throw new Error(`No index.html found in ${dir}. (add-page is for static HTML starter sites.)`);
  }

  const defaultMeta = ARCHETYPE_META[type];
  const customSlugName = slug !== type;
  const title = String(opts.title ?? (customSlugName ? slugToTitle(slug) : defaultMeta.title)).trim();
  const label = String(opts.label ?? opts.title ?? (customSlugName ? slugToTitle(slug) : defaultMeta.label)).trim();
  const heading = String(opts.heading ?? title).trim();

  const manifest = readRetroManifest(dir);
  const bodyHtml =
    opts.contentHtml ??
    renderArchetypeHtml(type, {
      siteTitle: manifest?.title || "Retro Homepage",
      owner: manifest?.owner || "Webmaster",
      topic: manifest?.topic || "the 90s web",
      year: manifest?.year || "1998",
      title,
      heading,
      pages: manifest?.pages || [],
    });

  const targetPath = join(dir, filename);

  if (manifest) {
    if (!manifest.pages.some((p) => p.file === filename)) {
      manifest.pages.push({ slug, file: filename, type, label, title });
    }
    writeRetroManifest(dir, manifest);

    const navLinks = manifest.pages.map((p) => ({ href: p.file, label: p.label }));
    const newHtml = renderPageShell({
      siteTitle: manifest.title,
      pageTitle: title,
      owner: manifest.owner,
      email: manifest.email,
      year: manifest.year,
      marqueeText: manifest.marqueeText,
      navLinks,
      activeHref: filename,
      bodyHtml,
    });
    writeFileSync(targetPath, newHtml, "utf8");

    const syncRes = syncSite({ dir }, dir);
    return {
      slug,
      type,
      file: filename,
      path: targetPath,
      navUpdatedIn: syncRes.syncedPages,
      summary: `Created ${filename} (archetype: ${type}) in ${dir} and synced navigation across ${syncRes.syncedPages.length} page(s).`,
    };
  }

  // Fallback for plain HTML sites without retro.json
  const indexHtml = readFileSync(indexPath, "utf8");
  let newHtml = indexHtml.replace(/<title>([^<]*)<\/title>/i, (_, prev) => {
    const parts = prev.split(" - ");
    const sitePart = parts.length > 1 ? parts.slice(1).join(" - ") : prev;
    return `<title>${escHtml(title)} - ${sitePart}</title>`;
  });
  const replaced = newHtml.replace(
    /(<td\s+valign="top">)([\s\S]*?)(<\/td>\s*<\/tr>\s*<\/table>)/i,
    `$1\n            <!-- RETRO_CONTENT_START -->\n${bodyHtml}\n            <!-- RETRO_CONTENT_END -->\n          $3`,
  );
  if (replaced === newHtml) {
    throw new Error('Could not locate main content cell (<td valign="top">) in index.html');
  }
  writeFileSync(targetPath, replaced, "utf8");

  const htmlFiles = readdirSync(dir).filter((f) => f.endsWith(".html"));
  const navEntry = `              <a href="${escHtml(filename)}">${escHtml(label)}</a><br>`;
  const updatedPages = [];
  for (const file of htmlFiles) {
    const fp = join(dir, file);
    const src = readFileSync(fp, "utf8");
    if (src.includes(`href="${filename}"`)) continue;
    if (src.includes("<!-- NAV_LINKS_END -->")) {
      writeFileSync(fp, src.replace("<!-- NAV_LINKS_END -->", `${navEntry}\n              <!-- NAV_LINKS_END -->`), "utf8");
      updatedPages.push(file);
    }
  }

  return {
    slug,
    type,
    file: filename,
    path: targetPath,
    navUpdatedIn: updatedPages,
    summary: `Created ${filename} (archetype: ${type}) in ${dir} and updated navigation in ${updatedPages.length} page(s).`,
  };
}

/**
 * Sync shared chrome (nav, marquee, banner, footer, webring, theme/CSS) across all pages
 * of a static HTML starter site using retro.json, without overwriting unique page bodies.
 */
export function syncSite(opts = {}, baseDir = process.cwd()) {
  const dir = opts.dir ? resolve(baseDir, opts.dir) : baseDir;
  const manifest = readRetroManifest(dir);
  if (!manifest) {
    throw new Error(`No retro.json found in ${dir}. sync is for static HTML starter sites created with starter.`);
  }

  let themeChanged = false;
  if (opts.theme && opts.theme !== manifest.theme) {
    getTheme(opts.theme);
    manifest.theme = opts.theme;
    themeChanged = true;
  }
  if (opts.title) manifest.title = String(opts.title).trim();
  if (opts.owner) manifest.owner = String(opts.owner).trim();
  if (opts.email) manifest.email = String(opts.email).trim();
  if (opts.year) manifest.year = String(opts.year).trim();
  if (opts.marqueeText) manifest.marqueeText = String(opts.marqueeText).trim();
  writeRetroManifest(dir, manifest);

  const theme = getTheme(manifest.theme);
  if (themeChanged || opts.regenerateCss) {
    writeFileSync(join(dir, "css", "retro.css"), buildRetroCss(theme, { assetPrefix: "../assets" }), "utf8");
  }

  const navLinks = manifest.pages.map((p) => ({ href: p.file, label: p.label }));
  const syncedPages = [];
  const skippedPages = [];

  for (const p of manifest.pages) {
    const fp = join(dir, p.file);
    if (!existsSync(fp)) {
      skippedPages.push(p.file);
      continue;
    }
    const existing = readFileSync(fp, "utf8");
    const contentMatch = /<!-- RETRO_CONTENT_START -->\r?\n?([\s\S]*?)\r?\n?[ \t]*<!-- RETRO_CONTENT_END -->/.exec(
      existing,
    );
    if (!contentMatch) {
      skippedPages.push(p.file);
      continue;
    }
    const updated = renderPageShell({
      siteTitle: manifest.title,
      pageTitle: p.title,
      owner: manifest.owner,
      email: manifest.email,
      year: manifest.year,
      marqueeText: manifest.marqueeText,
      navLinks,
      activeHref: p.file,
      bodyHtml: contentMatch[1],
    });
    writeFileSync(fp, updated, "utf8");
    syncedPages.push(p.file);
  }

  return {
    dir,
    theme: manifest.theme,
    syncedPages,
    skippedPages,
    summary: `Synced shared chrome across ${syncedPages.length} HTML page(s) in ${dir} (theme: ${manifest.theme}).`,
  };
}
