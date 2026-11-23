---
name: retro-web-kit
description: "Stack-agnostic 90s GeoCities & Neocities web toolbox (rwk CLI + MCP) for ANY language or framework (HTML, React, Vue, Svelte, Astro, Next.js, Django, Flask, Rails, PHP, Go, Hugo...) — drop-in retro CSS & tokens, zero-dependency Web Components, procedural starfields/banners/dividers/88x31 buttons/animated GIF badges, real GifCities & 88x31 search/download, universal site audit, and an optional static HTML starter."
---

# retro-web-kit (Stack-Agnostic 90s GeoCities & Neocities Toolbox)

`retro-web-kit` (CLI: `rwk`, also aliased as `retro-web-kit`) is a **bring-your-own-stack** retro asset, styling, widget, and auditing toolbox. Use it inside **any** project, language, or boilerplate the user wants (existing repo, React/Vite, Next.js, Astro, Svelte, Vue, Django, Flask, Rails, PHP, Go templates, Hugo, or plain HTML).

## Reference docs (read before styling or sourcing assets)
- Design tokens & aesthetic rules: `references/design-tokens.md`
- Curated 90s asset archives & mirrors: `references/sources.md`
- Static deployment notes: `references/deploy.md`

## Core Stack-Agnostic Toolbox (use in ANY project)

Just point output paths at whatever static/public folder the user's stack uses (e.g. `public/assets/`, `static/assets/`, `assets/`, `wwwroot/assets/`).

| Task | MCP Tool | CLI Command |
|---|---|---|
| Export standalone `retro.css` + CSS vars | `export_css` | `rwk export-css public/retro.css --theme cyber --asset-prefix /assets` |
| Export zero-dependency Web Components | `export_widgets` | `rwk export-widgets public/retro-widgets.js` |
| Get raw JSON theme tokens | `theme_tokens` | `rwk tokens [theme]` |
| Drop-in HTML/CSS/JS recipes | `retro_snippets` | `rwk snippets [category]` |
| Tileable starfield PNG | `generate_starfield` | `rwk generate-starfield <static>/bg-stars.png --sky "#000033"` |
| 88x31 beveled button PNG | `generate_button` | `rwk generate-button <static>/btn-cool.png --text "COOL SITE"` |
| Horizontal divider PNG | `generate_divider` | `rwk generate-divider <static>/divider.png --style rainbow` |
| 468x60 retro banner PNG | `generate_banner` | `rwk generate-banner <static>/banner.png --title "MY HOMEPAGE"` |
| Animated GIF89a badge | `generate_badge` | `rwk generate-badge <static>/badge-hot.gif --text "HOT!" --style blink` |
| Search real GeoCities GIFs | `search_gifs` | `rwk search-gifs "under construction" --limit 10` |
| Search 88x31 button archive | `search_buttons` | `rwk search-buttons netscape --limit 10` |
| Download & verify an image locally | `fetch_asset` | `rwk fetch-asset <url> <static>/construction.gif` |
| Audit ANY project (HTML/JSX/Vue/Svelte/Astro/PHP/Jinja/ERB/Go/CSS) | `audit_site` | `rwk audit [dir] [--assets-dir static/assets]` |
| Bundle static HTML into single file | `bundle_site` | `rwk bundle [dir] --entry index.html --out standalone.html` |
| Preview static folder locally | — | `rwk preview [dir] --port 8080 --open` |

### Drop-in Web Components (`export-widgets`)
Once `retro-widgets.js` is loaded via `<script>` or imported in any framework, you immediately get standard custom elements with zero dependencies:
- `<retro-marquee speed="14">...</retro-marquee>`
- `<retro-blink>NEW!</retro-blink>`
- `<retro-counter start="1337"></retro-counter>`
- `<retro-window title="README.TXT" closable>...</retro-window>`
- `<retro-chiptune></retro-chiptune>` (Web Audio 8-bit synth, click-to-play)
- `<retro-guestbook></retro-guestbook>` (localStorage interactive guestbook)

---

## Optional Zero-Build Static HTML Starter

> **Completely optional.** Skip this section entirely if the user already has a project or wants another framework/language (React, Astro, Vue, Django, Rails, PHP, Go, etc.).

Only use these helpers when the user specifically wants a quick, zero-build plain HTML site out of the box:

| Optional Helper | MCP Tool | CLI Command |
|---|---|---|
| Create optional static HTML starter | `create_starter_site` | `rwk starter [dir] --theme space --pages home,about,gallery,music,guestbook` |
| Add a page to a starter site | `add_page` | `rwk add-page cats --dir . --type shrine --title "Cat Shrine"` |
| Sync shared nav/chrome/theme via `retro.json` | `sync_site` | `rwk sync [dir] --theme cyber --marquee "..."` |

---

## Standard Workflow (Bring Your Own Stack)

1. **Respect the user's stack first.**
   - If the user asks for React, Astro, Svelte, Vue, Next.js, Django, Flask, Rails, PHP, Go, Hugo, or an existing repo, build in **that** stack — do **not** run `starter` / `create_starter_site`.
   - If the user has no stack preference and just wants a quick static GeoCities site, you may optionally use `starter` / `create_starter_site`.
2. **Plug in styling & widgets.**
   - Export `retro.css` (`rwk export-css --theme <theme> --asset-prefix <url-prefix>`) and optionally `retro-widgets.js` (`rwk export-widgets`) into the project's static/public folder, or pull raw `tokens` for custom styling.
   - Themes: `space`, `geocities-classic`, `cyber`, `matrix`, `pastel-y2k`.
3. **Generate & fetch authentic local media (never hotlink!).**
   - Generate local PNGs & animated GIFs (`generate-starfield`, `generate-banner`, `generate-divider`, `generate-button`, `generate-badge`) into the project's static/assets folder.
   - Optionally search real period GIFs (`search-gifs`) and 88x31 buttons (`search-buttons`) and download them locally with `fetch-asset` (which validates magic bytes automatically).
4. **Audit before finishing.**
   - Run `rwk audit` / `audit_site` (pass `--assets-dir` if the stack uses a non-standard static directory) and resolve all errors (zero hotlinks, zero missing/corrupt images, zero broken local asset links).

## Aesthetic Rules (apply regardless of language or framework)
- Never hotlink external image URLs — always save locally into the project's static/assets folder.
- No modern SaaS minimalism, no rounded corners (`border-radius`), no soft blur drop-shadows, no Inter/Roboto/system-ui as the primary font.
- Use CSS `.marquee` / `.blink` or `<retro-marquee>` / `<retro-blink>` instead of raw deprecated `<marquee>` / `<blink>` HTML tags.
