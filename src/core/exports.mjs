// Standalone theme CSS, CSS custom property tokens, and zero-dependency Web Components
// (works in plain HTML, React, Vue, Svelte, Astro, Django, Rails, PHP, Go templates, etc.).
import { writeFileSync } from "node:fs";
import { getTheme, THEMES } from "./snippets.mjs";
import { safeOutPath } from "./generators.mjs";

/**
 * Build a standalone retro theme stylesheet with CSS custom properties + utility classes.
 * Works in any framework or backend template engine.
 */
export function buildRetroCss(themeInput = "space", { assetPrefix = "./assets", starfield = true } = {}) {
  const theme = typeof themeInput === "string" ? getTheme(themeInput) : themeInput;
  const c = theme.css;
  const prefix = String(assetPrefix ?? "./assets").replace(/\/+$/, "");
  const bgValue = starfield ? `${c.bodyBg} url("${prefix}/bg-stars.png") repeat` : c.bodyBg;

  return `/* retro-web-kit stylesheet — theme: ${theme.name} (${theme.label})
 * Framework-agnostic: drop into any HTML, React, Vue, Svelte, Astro, Django, Rails, PHP, or Go project. */

:root {
  --retro-body-bg: ${c.bodyBg};
  --retro-text: ${c.text};
  --retro-page-bg: ${c.pageBg};
  --retro-panel-bg: ${c.panelBg};
  --retro-panel-title-bg: ${c.panelTitleBg};
  --retro-panel-title-fg: ${c.panelTitleFg};
  --retro-heading: ${c.heading};
  --retro-link: ${c.link};
  --retro-visited: ${c.visited};
  --retro-active: ${c.active};
  --retro-nav-link: ${c.navLink};
  --retro-accent: ${c.accent};
  --retro-counter-fg: ${c.counterFg};
  --retro-counter-bg: ${c.counterBg};
  --retro-border-light: ${c.borderLight};
  --retro-border-dark: ${c.borderDark};
  --retro-heading-font: ${c.headingFont};
  --retro-body-font: ${c.bodyFont};
}

body {
  background: ${bgValue};
  color: var(--retro-text);
  font-family: var(--retro-body-font);
  cursor: crosshair;
  margin: 12px;
}

a { color: var(--retro-link); }
a:visited { color: var(--retro-visited); }
a:active { color: var(--retro-active); }
.nav a, .panel a { color: var(--retro-nav-link); }
.nav a.active-nav { font-weight: bold; text-decoration: underline; }

.center { text-align: center; }
.small-ui { font-family: Verdana, Arial, sans-serif; font-size: 11px; }

table.page, .retro-page {
  background: var(--retro-page-bg);
  border: 3px outset var(--retro-border-light);
}

.panel {
  border: 2px outset var(--retro-border-light);
  background: var(--retro-panel-bg);
  padding: 6px;
}

.panel-title {
  border: 2px inset var(--retro-border-dark);
  background: var(--retro-panel-title-bg);
  color: var(--retro-panel-title-fg);
  font-family: Verdana, Arial, sans-serif;
  font-size: 12px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 6px;
  padding: 2px;
}

.retro-window {
  border: 3px outset var(--retro-border-light);
  background: var(--retro-panel-bg);
}
.retro-window-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--retro-panel-title-bg);
  color: var(--retro-panel-title-fg);
  font-family: Verdana, Arial, sans-serif;
  font-size: 12px;
  font-weight: bold;
  padding: 3px 6px;
  border-bottom: 2px solid var(--retro-border-dark);
}
.retro-window-body { padding: 8px; }

.title {
  color: var(--retro-heading);
  font-family: var(--retro-heading-font);
  margin-top: 4px;
}

.hot { color: #ff0000; font-weight: bold; }
.big { font-size: 24px; font-weight: bold; }
.accent { color: var(--retro-accent); }

.counter {
  font-family: "Courier New", Courier, monospace;
  font-size: 20px;
  color: var(--retro-counter-fg);
  background: var(--retro-counter-bg);
  border: 2px inset var(--retro-border-dark);
  padding: 2px 8px;
  letter-spacing: 2px;
  display: inline-block;
}

hr.retro {
  border: 0;
  border-top: 2px ridge var(--retro-border-light);
  margin: 10px 0;
}

.webring {
  background: var(--retro-panel-title-bg);
  color: var(--retro-panel-title-fg);
  border: 3px outset var(--retro-border-light);
  font-family: Verdana, Arial, sans-serif;
  font-size: 11px;
  margin-top: 10px;
}
.webring a { color: var(--retro-nav-link); }

button, input[type="submit"] {
  border: 2px outset var(--retro-border-light);
  background: #c0c0c0;
  color: #000000;
  font-family: Verdana, Arial, sans-serif;
  font-size: 12px;
  padding: 3px 10px;
  cursor: pointer;
}
button:active, input[type="submit"]:active {
  border-style: inset;
}

input[type="text"], input[type="url"], textarea {
  border: 2px inset var(--retro-border-dark);
  background: #ffffff;
  color: #000000;
  font-family: "Courier New", Courier, monospace;
  padding: 2px 4px;
}

/* HTML5-compliant recreations of deprecated 90s tags */
.marquee {
  overflow: hidden;
  white-space: nowrap;
  border: 2px inset var(--retro-border-dark);
  background: #000000;
  padding: 3px;
}
.marquee-inner {
  display: inline-block;
  padding-left: 100%;
  animation: retro-marquee 14s linear infinite;
}
@keyframes retro-marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-100%); }
}

.blink { animation: retro-blink 1s step-start infinite; }
@keyframes retro-blink { 50% { opacity: 0; } }

.rainbow {
  background: linear-gradient(90deg, #ff0000, #ff8800, #ffff00, #00ff00, #00ffff, #0066ff, #ff00ff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.entry {
  border: 2px inset var(--retro-border-dark);
  background: var(--retro-panel-bg);
  padding: 6px;
  margin-bottom: 8px;
}
`;
}

/**
 * Build a zero-dependency Web Components bundle (<retro-marquee>, <retro-blink>,
 * <retro-counter>, <retro-window>, <retro-chiptune>, <retro-guestbook>) usable in any
 * HTML page or frontend framework (React, Vue, Svelte, Astro, Rails, Django, PHP, etc.).
 */
export function buildRetroWidgetsJs() {
  return `/* retro-web-kit widgets — framework-agnostic Web Components (zero dependencies).
 * Drop into any page or bundle:
 *   <retro-marquee speed="14">*** WELCOME TO MY HOMEPAGE ***</retro-marquee>
 *   <retro-blink>NEW!</retro-blink>
 *   <retro-counter start="1337"></retro-counter>
 *   <retro-window title="README.TXT">Hello 1998!</retro-window>
 *   <retro-chiptune></retro-chiptune>
 *   <retro-guestbook></retro-guestbook>
 */
(function () {
  if (typeof customElements === "undefined") return;

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  if (!customElements.get("retro-marquee")) {
    class RetroMarquee extends HTMLElement {
      connectedCallback() {
        const speed = Number(this.getAttribute("speed") || 14);
        const content = this.innerHTML;
        this.innerHTML =
          '<div class="marquee"><div class="marquee-inner" style="animation-duration:' +
          speed + 's">' + content + "</div></div>";
      }
    }
    customElements.define("retro-marquee", RetroMarquee);
  }

  if (!customElements.get("retro-blink")) {
    class RetroBlink extends HTMLElement {
      connectedCallback() {
        this.classList.add("blink");
      }
    }
    customElements.define("retro-blink", RetroBlink);
  }

  if (!customElements.get("retro-counter")) {
    class RetroCounter extends HTMLElement {
      connectedCallback() {
        const start = Number(this.getAttribute("start") || 1337);
        const digits = Number(this.getAttribute("digits") || 6);
        const key = this.getAttribute("storage-key") || "retro_web_hits_" + (location.pathname || "index");
        const count = Number(localStorage.getItem(key) || start - 1) + 1;
        localStorage.setItem(key, String(count));
        this.innerHTML = '<span class="counter">' + String(count).padStart(digits, "0") + "</span>";
      }
    }
    customElements.define("retro-counter", RetroCounter);
  }

  if (!customElements.get("retro-window")) {
    class RetroWindow extends HTMLElement {
      connectedCallback() {
        const title = this.getAttribute("title") || "Window";
        const closable = this.hasAttribute("closable");
        const body = this.innerHTML;
        this.innerHTML =
          '<div class="retro-window">' +
          '<div class="retro-window-bar"><span>' + esc(title) + "</span>" +
          (closable ? '<button type="button" data-close style="padding:0 6px;font-weight:bold">X</button>' : "") +
          "</div>" +
          '<div class="retro-window-body">' + body + "</div></div>";
        const btn = this.querySelector("[data-close]");
        if (btn) btn.addEventListener("click", () => this.remove());
      }
    }
    customElements.define("retro-window", RetroWindow);
  }

  if (!customElements.get("retro-chiptune")) {
    const TRACKS = [
      { name: "Cyber Highway", tempo: 170, notes: [523, 659, 784, 659, 880, 784, 659, 587] },
      { name: "Midnight Starfield", tempo: 210, notes: [440, 523, 659, 523, 587, 494, 440, 392] },
      { name: "Dial-Up Dreamscape", tempo: 150, notes: [330, 392, 494, 659, 587, 494, 392, 440] },
    ];
    class RetroChiptune extends HTMLElement {
      connectedCallback() {
        this._timer = null;
        this._ctx = null;
        this.innerHTML =
          '<div class="panel"><div class="panel-title">~ SoundBlaster Chiptune Jukebox ~</div>' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center">' +
          TRACKS.map((t, i) => '<button type="button" data-track="' + i + '">Play ' + esc(t.name) + "</button>").join("") +
          '<button type="button" data-stop>Stop</button></div>' +
          '<div data-status class="small-ui center" style="margin-top:6px">Status: Stopped</div></div>';
        this.querySelectorAll("[data-track]").forEach((b) => {
          b.addEventListener("click", () => this._play(Number(b.dataset.track)));
        });
        this.querySelector("[data-stop]").addEventListener("click", () => this._stop());
      }
      disconnectedCallback() { this._stop(); }
      _stop() {
        if (this._timer) { clearInterval(this._timer); this._timer = null; }
        const st = this.querySelector("[data-status]");
        if (st) st.textContent = "Status: Stopped";
      }
      _play(idx) {
        this._stop();
        const tr = TRACKS[idx] || TRACKS[0];
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this._ctx = this._ctx || new AC();
        if (this._ctx.state === "suspended") this._ctx.resume();
        let step = 0;
        const st = this.querySelector("[data-status]");
        if (st) st.textContent = "Now Playing: " + tr.name;
        const tick = () => {
          const osc = this._ctx.createOscillator();
          const gain = this._ctx.createGain();
          osc.type = "square";
          osc.frequency.value = tr.notes[step % tr.notes.length];
          gain.gain.setValueAtTime(0.06, this._ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + tr.tempo / 1000);
          osc.connect(gain);
          gain.connect(this._ctx.destination);
          osc.start();
          osc.stop(this._ctx.currentTime + tr.tempo / 1000);
          step++;
        };
        tick();
        this._timer = setInterval(tick, tr.tempo);
      }
    }
    customElements.define("retro-chiptune", RetroChiptune);
  }

  if (!customElements.get("retro-guestbook")) {
    class RetroGuestbook extends HTMLElement {
      connectedCallback() {
        const key = this.getAttribute("storage-key") || "retro_web_guestbook_v1";
        this.innerHTML =
          '<div class="panel"><div class="panel-title">~ Sign My Guestbook ~</div>' +
          '<form data-gb><table cellpadding="4">' +
          '<tr><td>Name:</td><td><input type="text" name="name" size="26" required></td></tr>' +
          '<tr><td>Homepage:</td><td><input type="url" name="url" size="26" placeholder="http://..."></td></tr>' +
          '<tr><td valign="top">Message:</td><td><textarea name="msg" rows="3" cols="32" required></textarea></td></tr>' +
          '<tr><td></td><td><button type="submit">Sign Guestbook!</button></td></tr>' +
          '</table></form></div><br><div data-list></div>';
        const form = this.querySelector("[data-gb]");
        const list = this.querySelector("[data-list]");
        const load = () => { try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; } };
        const render = () => {
          list.innerHTML = load().map((r) =>
            '<div class="entry"><b>' + esc(r.name) + "</b>" +
            (r.url ? ' (<a href="' + esc(r.url) + '" target="_blank" rel="noopener">homepage</a>)' : "") +
            " <i>- " + esc(r.date) + "</i><p>" + esc(r.msg) + "</p></div>"
          ).join("");
        };
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          const fd = new FormData(form);
          const rows = load();
          rows.unshift({
            name: String(fd.get("name") || "Anonymous").trim(),
            url: String(fd.get("url") || "").trim(),
            msg: String(fd.get("msg") || "").trim(),
            date: new Date().toLocaleDateString("en-US"),
          });
          localStorage.setItem(key, JSON.stringify(rows));
          form.reset();
          render();
        });
        render();
      }
    }
    customElements.define("retro-guestbook", RetroGuestbook);
  }
})();
`;
}

/**
 * Export a standalone theme CSS file (or return CSS string if `out` is omitted).
 */
export function exportCss(
  { theme = "space", assetPrefix = "./assets", starfield = true, out, allowAbsolute = false } = {},
  cwd = process.cwd(),
) {
  const t = getTheme(theme);
  const css = buildRetroCss(t, { assetPrefix, starfield });
  let full = null;
  if (out) {
    full = safeOutPath(out, cwd, { allowAbsolute: Boolean(allowAbsolute) });
    writeFileSync(full, css, "utf8");
  }
  return {
    theme: t.name,
    out: out ?? null,
    path: full,
    bytes: Buffer.byteLength(css, "utf8"),
    css,
    summary: out
      ? `Wrote standalone retro CSS (theme: ${t.name}, ${Buffer.byteLength(css, "utf8")} bytes) to ${out}.`
      : `Generated standalone retro CSS (theme: ${t.name}, ${Buffer.byteLength(css, "utf8")} bytes).`,
  };
}

/**
 * Export the zero-dependency Web Components widgets bundle (or return JS string if `out` is omitted).
 */
export function exportWidgets({ out, allowAbsolute = false } = {}, cwd = process.cwd()) {
  const js = buildRetroWidgetsJs();
  let full = null;
  if (out) {
    full = safeOutPath(out, cwd, { allowAbsolute: Boolean(allowAbsolute) });
    writeFileSync(full, js, "utf8");
  }
  return {
    out: out ?? null,
    path: full,
    bytes: Buffer.byteLength(js, "utf8"),
    components: [
      "retro-marquee",
      "retro-blink",
      "retro-counter",
      "retro-window",
      "retro-chiptune",
      "retro-guestbook",
    ],
    js,
    summary: out
      ? `Wrote framework-agnostic Web Components (${Buffer.byteLength(js, "utf8")} bytes) to ${out}.`
      : `Generated framework-agnostic Web Components (${Buffer.byteLength(js, "utf8")} bytes).`,
  };
}

/**
 * Return theme design tokens (colors, fonts, RGB values) for any stack (CSS, Tailwind config, Python/Go/Rust, etc.).
 */
export function exportThemeTokens(themeName) {
  if (themeName) {
    return getTheme(themeName);
  }
  return THEMES;
}
