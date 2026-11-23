# Deploying a Retro Static Site

If your site is static HTML (or built to a static output folder like `dist/`, `build/`, or `public/` from Astro/Vite/Hugo/etc.), upload that folder to any of the hosts below. Server-rendered stacks (Django, Rails, PHP, Go) deploy normally with your generated assets inside their static directory.

## Pre-deploy Checklist
1. Run `rwk audit .` (or `audit_site`) and confirm **0 errors** (no hotlinks, no broken links, no corrupt images).
2. Check how it looks locally at 800x600 using `rwk preview . --open`.

## Hosting Options
- **Neocities** (closest modern successor to GeoCities):
  1. Create a free account at https://neocities.org.
  2. Drag and drop your site folder in the dashboard (or run `neocities push .`) so `index.html` is at the root.
  3. Live at `https://<name>.neocities.org`. Tag it with `90s` / `retro` in the Neocities directory!
- **GitHub Pages:**
  1. Push the folder to a GitHub repository.
  2. Enable **Settings → Pages → Deploy from branch** (root folder).
  3. Live at `https://<user>.github.io/<repo>/`.
- **Netlify Drop:**
  1. Drag the folder directly onto https://app.netlify.com/drop for an instant live URL.
- **Single-File Portable HTML:**
  - Run `rwk bundle . --entry index.html --out dist/standalone.html` to produce a single self-contained HTML file you can email or drop anywhere.
