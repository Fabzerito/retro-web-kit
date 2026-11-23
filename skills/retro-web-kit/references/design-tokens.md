# 90s Retro Web Design Tokens

## Era-Authentic Typography
- **Headings / Fun:** `"Comic Sans MS", "Comic Sans", cursive`
- **Body copy:** `"Times New Roman", Times, serif`
- **UI / small chrome / nav labels:** `Verdana, Arial, sans-serif`
- **Counters / hacker terminals:** `"Courier New", Courier, monospace`
- **Never** use Inter, Roboto, SF Pro, or `system-ui` as the main font.

## Palette (high contrast, deliberately loud; pick 2–4 accents)
- **Neon accents:** green `#00FF00`, magenta `#FF00FF`, cyan `#00FFFF`, yellow `#FFFF00`, hot pink `#FF69B4`
- **Deep backgrounds:** black `#000000`, space `#000033`, navy `#000066`, dark blue `#000080`, deep purple `#330066`
- **Classic link colors:** unvisited `#0000FF` (or `#66CCFF` on dark), visited `#551A8B` (or `#CC99FF`), active `#FF0000`
- **Windows 95 chrome grey:** `#DFDFDF` light, `#C0C0C0` face, `#808080` shadow

## 3D Chrome Bevels
- Raised panel: `border: 3px outset #dfdfdf;`
- Sunken well (counters, marquees, inputs): `border: 2px inset #808080;`
- Buttons swap `outset` to `inset` on `:active`.

## Layout Rules
- Fixed **800px** centered wrapper table: `<table class="page" align="center" width="800" cellpadding="6" cellspacing="0" border="1">`.
- Two-column nested table layout: narrow left sidebar (`width="160"`) for links + 88x31 buttons + visitor counter, and main content cell on the right.
- Dividers: `border-top: 2px ridge #dfdfdf` or a generated/downloaded divider image.
- Footer: `Best viewed in Netscape Navigator 4.0 at 800x600` + 90s copyright year + `mailto:` link.
- Cursor: `cursor: crosshair` on `body`.
- Audio/MIDI: browsers block autoplay; provide an explicit "PLAY MIDI" button or link instead.

## HTML5-Compliant Recreations of Deprecated Tags
```css
.marquee { overflow: hidden; white-space: nowrap; border: 2px inset #808080; background: #000; }
.marquee-inner { display: inline-block; padding-left: 100%; animation: marquee 14s linear infinite; }
@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-100%); } }

.blink { animation: blink 1s step-start infinite; }
@keyframes blink { 50% { opacity: 0; } }

.rainbow {
  background: linear-gradient(90deg, #f00, #f80, #ff0, #0f0, #0ff, #00f, #f0f);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
```

## Visual Hard Bans (apply to ANY language or framework)
No modern SaaS minimalism, no `border-radius`, no soft blur drop-shadows, no Inter/Roboto/system-ui body fonts. Use whatever language, framework, or template engine fits the project, and drop in `retro.css` (`export-css`), `retro-widgets.js` (`export-widgets`), or raw `tokens`.
