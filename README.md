# retro-web-kit

**Stack-agnostic**, zero-dependency **CLI (`rwk`)**, **MCP server**, and portable **Agent Skill** toolbox for building authentic 90s/2000s GeoCities & Neocities websites in **any language, framework, or boilerplate** (HTML, React, Vue, Svelte, Astro, Next.js, Django, Flask, Rails, PHP, Go, Hugo, etc.).

- **Bring your own stack** — drop generated PNGs/GIFs, standalone `retro.css` + CSS variables, zero-dependency Web Components, and the universal auditor straight into whatever repo or boilerplate you prefer.
- **Zero dependencies** — Node.js >= 20 standard library only (built-in RGBA PNG encoder, animated GIF89a + LZW encoder, 5x7 bitmap pixel font, static HTTP server).
- **Harness-agnostic** — works in any terminal or MCP client (Pi, Claude Code, Codex, Cursor, Windsurf, etc.).

---

## Core Toolbox (Stack-Agnostic)

Point output paths at your stack's static/public folder (`public/assets/`, `static/assets/`, `assets/`, `wwwroot/assets/`, etc.):

- **Drop-in Styling & Tokens (`export-css`, `tokens`, `themes`, `snippets`)**:
  - Export a standalone `retro.css` with CSS custom properties (`--retro-*`) and 90s chrome/bevel/marquee/blink classes for 5 themes (`space`, `geocities-classic`, `cyber`, `matrix`, `pastel-y2k`).
  - Export raw JSON tokens for any language or CSS pipeline.
- **Framework-Agnostic Web Components (`export-widgets`)**:
  - Single zero-dependency `retro-widgets.js` registering `<retro-marquee>`, `<retro-blink>`, `<retro-counter>`, `<retro-window>`, `<retro-chiptune>`, and `<retro-guestbook>` — works natively in plain HTML, React, Vue, Svelte, Astro, Django, Rails, PHP, and Go templates.
- **Procedural 90s Graphic Generators**:
  - `generate-starfield` (seamlessly tileable starfield PNG)
  - `generate-button` (beveled `88x31` pixel-text web button PNG)
  - `generate-divider` (`diamond`, `rainbow`, `construction`, `stars` PNG)
  - `generate-banner` (`468x60` beveled web banner PNG)
  - `generate-badge` (animated GIF89a `blink`, `rainbow`, `construction`)
- **Real Period Asset Search & Verified Local Fetch**:
  - `search-gifs` (Internet Archive's **GifCities**) & `search-buttons` (`88x31` archive)
  - `fetch-asset` downloads locally and verifies image magic bytes so HTML 404 pages are never saved as `.gif`.
- **Universal Site Audit (`audit`)**:
  - Scans `.html`, `.jsx`/`.tsx`, `.vue`, `.svelte`, `.astro`, `.php`, `.erb`, `.jinja`/`.j2`, `.njk`, `.hbs`, `.twig`, `.tmpl`/`.gohtml`, and `.css`/`.scss`/`.less` for hotlinked external assets, missing/corrupt/unused images, broken local links, and deprecated `<marquee>`/`<blink>` tags.
- **Preview & Single-File Bundler (`preview`, `bundle`)**:
  - Local static preview server and single-file standalone HTML bundler (inlines CSS/JS/images as data URIs).

---

## Quick Start

Install from GitHub (or link locally from a clone) so `rwk` (also aliased as `retro-web-kit`) and `retro-web-kit-mcp` work directly anywhere:

```bash
# From GitHub
npm i -g github:Fabzerito/retro-web-kit

# Or from a local clone
npm link
```

### Example: Plugging `retro-web-kit` into ANY existing project (Django, Astro, React, Rails, PHP, Go...)

```bash
# 1. Drop in standalone theme CSS & Web Components (set --asset-prefix to match your stack's static URL)
rwk export-css static/css/retro.css --theme cyber --asset-prefix /static/assets
rwk export-widgets static/js/retro-widgets.js

# 2. Generate custom local 90s graphics into your static folder
rwk generate-starfield static/assets/bg-stars.png --sky "#120026"
rwk generate-banner static/assets/banner.png --title "MY CYBER PORTAL" --subtitle "POWERED BY FLASK 1998"
rwk generate-button static/assets/btn-home.png --text "HOME" --bg "#400060" --fg "#00ffff"
rwk generate-badge static/assets/badge-new.gif --text "NEW!" --style rainbow --scale 2

# 3. Search & locally download real 90s GIFs / 88x31 buttons (never hotlink!)
rwk search-gifs "under construction" --limit 5
rwk search-buttons netscape --limit 5
rwk fetch-asset "https://cyber.dabamos.de/88x31/netscape-as.gif" static/assets/netscape.gif

# 4. Audit your templates, CSS, and static assets across the whole project
rwk audit . --assets-dir static/assets
```

Then use the exported stylesheet, local images, and standard Web Components in any template (Jinja, ERB, PHP, JSX, Astro, Vue, Go, plain HTML):

```html
<link rel="stylesheet" href="/static/css/retro.css">
<retro-marquee speed="14"><span class="rainbow big">*** WELCOME TO CYBERSPACE ***</span></retro-marquee>
<retro-window title="README.TXT" closable>Built with my favorite stack, styled like 1998!</retro-window>
<retro-counter start="1337"></retro-counter>
<retro-chiptune></retro-chiptune>
<script src="/static/js/retro-widgets.js"></script>
```

---

## Optional: Zero-Build Static HTML Starter

> **Completely optional.** Skip this if you're using your own boilerplate, framework, or backend language.

If you have no stack preference and just want a quick multi-page plain HTML site ready for Neocities or Netlify Drop:

```bash
rwk starter my-site \
  --title "CyberCat's Lair" \
  --owner "CyberCat" \
  --topic "retro gaming and chiptunes" \
  --theme cyber \
  --pages home,about,gallery,music,cats:shrine,downloads,blog,guestbook

# Optional helpers for sites created with `starter`:
rwk add-page midi --dir my-site --type music --title "MIDI Room"
rwk sync my-site --theme matrix --marquee "*** SYNCED ACROSS ALL PAGES ***"
rwk preview my-site --port 8080 --open
rwk bundle my-site --entry index.html --out my-site/standalone.html
```

Run `rwk --help`, `rwk themes`, or `rwk archetypes` for all commands (every command supports `--json`). You can also invoke the CLI with its full name `retro-web-kit`.

---

## MCP Server Setup

After installing globally or running `npm link`, point your MCP client at `retro-web-kit-mcp` (also aliased as `rwk-mcp`, or run `node /absolute/path/to/retro-web-kit/src/mcp.mjs`):

```json
{
  "mcpServers": {
    "retro-web-kit": {
      "command": "retro-web-kit-mcp"
    }
  }
}
```

### Exposed MCP Capabilities
- **Core Stack-Agnostic Tools (14):** `generate_starfield`, `generate_button`, `generate_divider`, `generate_banner`, `generate_badge`, `search_gifs`, `search_buttons`, `fetch_asset`, `export_css`, `export_widgets`, `theme_tokens`, `retro_snippets`, `audit_site`, `bundle_site`
- **Optional Static HTML Starter Tools (3):** `create_starter_site`, `add_page`, `sync_site`
- **Resources (2):** `retro-web-kit://docs/design-tokens`, `retro-web-kit://docs/asset-sources`
- **Prompt (1):** `build-geocities-site`

---

## Agent Skill Installation

`skills/retro-web-kit/` follows the portable Agent Skills format (`SKILL.md` + `references/`):

```bash
ln -s "$(pwd)/skills/retro-web-kit" ~/.agents/skills/retro-web-kit
```

---

## Development & Tests

```bash
npm test
```
