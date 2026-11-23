// Page archetypes for optional static HTML starter sites (zero dependencies).

export const ARCHETYPE_NAMES = [
  "home",
  "about",
  "links",
  "guestbook",
  "gallery",
  "music",
  "downloads",
  "blog",
  "shrine",
  "blank",
];

export const ARCHETYPE_META = {
  home: { label: "Home", title: "Home", description: "Welcome banner, What's New update log, and guestbook callout" },
  about: { label: "About Me", title: "About Me", description: "Webmaster bio and classic 90s stats table" },
  links: { label: "Cool Links", title: "Cool Links", description: "Categorized web directory and 88x31 button exchange" },
  guestbook: { label: "Guestbook", title: "Guestbook", description: "Interactive localStorage guestbook form + period signatures" },
  gallery: { label: "Gallery", title: "Pixel Gallery", description: "Classic bordered thumbnail table with retro captions" },
  music: { label: "MIDI Jukebox", title: "MIDI Jukebox", description: "Interactive Web Audio 8-bit chiptune player (explicit Play/Stop, no autoplay)" },
  downloads: { label: "Downloads", title: "Downloads", description: "90s file archive table with file sizes, formats, and descriptions" },
  blog: { label: "WebJournal", title: "WebJournal", description: "Dated 90s diary entries with Current Mood & Now Playing" },
  shrine: { label: "Fan Shrine", title: "Fan Shrine", description: "Obsessive 90s topic shrine with trivia, quotes, and top picks" },
  blank: { label: "New Page", title: "New Page", description: "Clean starter page matching the site layout" },
};

export function escHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function slugToTitle(slug) {
  return slug
    .replace(/\.html?$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/**
 * Parse a pages spec string or array like "home,about,gallery,cats:shrine,guestbook".
 * Returns normalized page descriptors: { slug, file, type, label, title }.
 */
export function parsePagesSpec(pagesSpec) {
  const rawList = Array.isArray(pagesSpec)
    ? pagesSpec
    : typeof pagesSpec === "string" && pagesSpec.trim()
      ? pagesSpec.split(",").map((s) => s.trim()).filter(Boolean)
      : ["home", "about", "links", "guestbook"];

  const seen = new Set();
  const pages = [];

  for (const item of rawList) {
    let slugPart;
    let typePart;
    if (typeof item === "string") {
      const [s, t] = item.split(":").map((x) => x.trim());
      slugPart = s.toLowerCase().replace(/\.html?$/i, "").replace(/[^a-z0-9_-]/g, "-");
      typePart = (t || (ARCHETYPE_META[slugPart] ? slugPart : "blank")).toLowerCase();
    } else if (item && typeof item === "object") {
      slugPart = String(item.slug || item.file || "page")
        .toLowerCase()
        .replace(/\.html?$/i, "")
        .replace(/[^a-z0-9_-]/g, "-");
      typePart = String(item.type || (ARCHETYPE_META[slugPart] ? slugPart : "blank")).toLowerCase();
    } else {
      continue;
    }

    if (!slugPart) continue;
    if (!ARCHETYPE_META[typePart]) {
      throw new Error(`Unknown page archetype "${typePart}". Available: ${ARCHETYPE_NAMES.join(", ")}`);
    }
    const file = slugPart === "home" || slugPart === "index" ? "index.html" : `${slugPart}.html`;
    const slug = file === "index.html" ? "home" : slugPart;
    if (seen.has(slug)) continue;
    seen.add(slug);

    const meta = ARCHETYPE_META[typePart];
    const customName = slug !== typePart && slug !== "home";
    const defaultTitle = customName ? slugToTitle(slug) : meta.title;
    const defaultLabel = customName ? slugToTitle(slug) : meta.label;

    pages.push({
      slug,
      file,
      type: typePart,
      label: (typeof item === "object" && item.label) || defaultLabel,
      title: (typeof item === "object" && item.title) || defaultTitle,
    });
  }

  if (!pages.some((p) => p.file === "index.html")) {
    pages.unshift({
      slug: "home",
      file: "index.html",
      type: "home",
      label: "Home",
      title: "Home",
    });
  }

  return pages;
}

/**
 * Render era-authentic inner HTML for a page archetype.
 */
export function renderArchetypeHtml(type, ctx) {
  const { siteTitle, owner, topic, year, heading, title, pages = [] } = ctx;
  const h = escHtml(heading || title || ARCHETYPE_META[type]?.title || "Page");
  const st = escHtml(siteTitle);
  const ow = escHtml(owner);
  const tp = escHtml(topic);
  const yr = escHtml(year);
  const hasGuestbook = pages.length === 0 || pages.some((p) => p.file === "guestbook.html");
  const hasLinks = pages.length === 0 || pages.some((p) => p.file === "links.html");
  const extraPage = pages.find((p) => p.file !== "index.html" && p.file !== "guestbook.html");

  switch (type) {
    case "home": {
      const updates = [];
      if (hasGuestbook) {
        updates.push(`                <li><b>11/21/${yr}:</b> Added the shiny new <a href="guestbook.html">Guestbook</a>! Go sign it!</li>`);
      }
      if (hasLinks) {
        updates.push(`                <li><b>11/14/${yr}:</b> Built a brand new <a href="links.html">Cool Links</a> page with my favorite sites.</li>`);
      } else if (extraPage) {
        updates.push(`                <li><b>11/14/${yr}:</b> Launched the brand new <a href="${escHtml(extraPage.file)}">${escHtml(extraPage.label)}</a> section!</li>`);
      }
      updates.push(`                <li><b>11/02/${yr}:</b> Launched ${st}! Still under construction forever!</li>`);
      const signNote = hasGuestbook
        ? `Don't forget to <a href="guestbook.html">sign my guestbook</a> before you surf away.`
        : `Bookmark this page in Netscape and come back soon!`;
      return `            <h1 class="title">Welcome to ${st}!</h1>
            <p><span class="blink hot">NEW!</span> <font face="Verdana" size="2">Last updated 11/21/${yr}</font></p>
            <p>Hey there cyber-surfer! I'm <b>${ow}</b>, and this is my little slice of cyberspace all about <b>${tp}</b>.</p>
            <div class="panel">
              <div class="panel-title">~ What's New ~</div>
              <ul>
${updates.join("\n")}
              </ul>
            </div>
            <p>Grab my 88x31 button and link back to me! ${signNote}</p>`;
    }

    case "about":
      return `            <h1 class="title">About ${ow}</h1>
            <p>Hi! My handle is <b>${ow}</b> and I love <b>${tp}</b>.</p>
            <div class="panel">
              <div class="panel-title">~ My Stats ~</div>
              <table width="100%" cellpadding="4" cellspacing="0" border="1">
                <tr><td><b>Webmaster:</b></td><td>${ow}</td></tr>
                <tr><td><b>Favorite Topic:</b></td><td>${tp}</td></tr>
                <tr><td><b>Browser:</b></td><td>Netscape Navigator 4.0 / IE 4</td></tr>
                <tr><td><b>Connection:</b></td><td>56k Dial-Up Modem</td></tr>
                <tr><td><b>HTML Editor:</b></td><td>Notepad.exe</td></tr>
              </table>
            </div>`;

    case "links":
      return `            <h1 class="title">Cool Links Across Cyberspace</h1>
            <p>Check out these totally rad web destinations (opens in a new window):</p>
            <div class="panel">
              <div class="panel-title">~ Retro Web Archives ~</div>
              <ul>
                <li><a href="https://gifcities.org/" target="_blank" rel="noopener">GifCities</a> - Internet Archive's GeoCities Animated GIF Search</li>
                <li><a href="https://neocities.org/" target="_blank" rel="noopener">Neocities</a> - Free personal web hosting like it's 1998</li>
                <li><a href="https://www.cameronsworld.net/" target="_blank" rel="noopener">Cameron's World</a> - A love letter to the Internet of old</li>
                <li><a href="https://cyber.dabamos.de/88x31/" target="_blank" rel="noopener">88x31 Button Archive</a> - Classic micro-banners</li>
              </ul>
            </div>
            <br>
            <div class="panel">
              <div class="panel-title">~ Link Back To Me! ~</div>
              <center>
                <img src="assets/btn-home.png" width="88" height="31" alt="${st}"><br>
                <font face="Verdana" size="1">Save this 88x31 button locally and link to ${st}!</font>
              </center>
            </div>`;

    case "guestbook":
      return `            <h1 class="title">Sign My Guestbook!</h1>
            <p>Stopped by ${st}? Leave a message below! <font face="Verdana" size="1">(Entries are stored locally in your browser; connect Formspree or Netlify Forms for a shared backend.)</font></p>
            <retro-guestbook></retro-guestbook>
            <div class="entry">
              <b>CyberSurfer99</b> <i>- 11/20/${yr}</i>
              <p>Awesome page ${ow}!! Love the starfield background. Check out my page too!</p>
            </div>
            <div class="entry">
              <b>PixelWizard</b> <i>- 11/18/${yr}</i>
              <p>Totally rad ${tp} shrine! Signing from my Pentium II 350MHz :)</p>
            </div>
            <div class="entry">
              <b>StarGazer_X</b> <i>- 11/12/${yr}</i>
              <p>First!! Cool buttons and marquee, bookmarked in Netscape!</p>
            </div>`;

    case "gallery":
      return `            <h1 class="title">${h}</h1>
            <p>Hand-picked graphics and pixel artifacts curated by <b>${ow}</b>! Best viewed in 256+ colors.</p>
            <div class="panel">
              <div class="panel-title">~ Featured Graphics ~</div>
              <table width="100%" cellpadding="8" cellspacing="4" border="1">
                <tr align="center">
                  <td>
                    <img src="assets/banner.png" width="160" alt="Site Banner"><br>
                    <font face="Verdana" size="1"><b>Main Site Banner</b><br>468x60 PNG</font>
                  </td>
                  <td>
                    <img src="assets/badge-construction.gif" alt="Under Construction"><br>
                    <font face="Verdana" size="1"><b>Hazard Badge</b><br>Animated GIF89a</font>
                  </td>
                  <td>
                    <img src="assets/badge-new.gif" alt="NEW!"><br>
                    <font face="Verdana" size="1"><b>Blinking NEW!</b><br>Animated GIF89a</font>
                  </td>
                </tr>
                <tr align="center">
                  <td>
                    <img src="assets/btn-home.png" width="88" height="31" alt="Home Button"><br>
                    <font face="Verdana" size="1"><b>88x31 Home Button</b></font>
                  </td>
                  <td>
                    <img src="assets/btn-guestbook.png" width="88" height="31" alt="Guestbook Button"><br>
                    <font face="Verdana" size="1"><b>88x31 Guestbook</b></font>
                  </td>
                  <td>
                    <img src="assets/btn-netscape.png" width="88" height="31" alt="Netscape Button"><br>
                    <font face="Verdana" size="1"><b>Netscape 4.0 Badge</b></font>
                  </td>
                </tr>
              </table>
            </div>`;

    case "music":
      return `            <h1 class="title">${h}</h1>
            <p>Turn your SoundBlaster 16 speakers UP! Because modern browsers block MIDI autoplay, click a track below to play authentic 8-bit square-wave chiptunes.</p>
            <retro-chiptune></retro-chiptune>`;

    case "downloads":
      return `            <h1 class="title">${h}</h1>
            <p>Freeware, wallpapers, and retro goodies for <b>${tp}</b> fans! Estimated download time on 56k modem shown below.</p>
            <div class="panel">
              <div class="panel-title">~ File Archive ~</div>
              <table width="100%" cellpadding="5" cellspacing="0" border="1">
                <tr><th>File</th><th>Description</th><th>Size</th><th>56k ETA</th></tr>
                <tr>
                  <td><a href="assets/bg-stars.png" download>bg-stars.png</a></td>
                  <td>Seamless tiled starfield wallpaper</td>
                  <td align="right">~1 KB</td>
                  <td align="center">1 sec</td>
                </tr>
                <tr>
                  <td><a href="assets/btn-home.png" download>btn-home.png</a></td>
                  <td>Official ${st} 88x31 link button</td>
                  <td align="right">~1 KB</td>
                  <td align="center">1 sec</td>
                </tr>
                <tr>
                  <td><a href="assets/banner.png" download>banner.png</a></td>
                  <td>Classic 468x60 web banner</td>
                  <td align="right">~2 KB</td>
                  <td align="center">1 sec</td>
                </tr>
                <tr>
                  <td><a href="assets/badge-new.gif" download>badge-new.gif</a></td>
                  <td>Animated blinking NEW! GIF badge</td>
                  <td align="right">~1 KB</td>
                  <td align="center">1 sec</td>
                </tr>
              </table>
            </div>`;

    case "blog": {
      const gbTail = hasGuestbook
        ? ` Don't forget to sign the <a href="guestbook.html">guestbook</a>!`
        : "";
      return `            <h1 class="title">${h}</h1>
            <p>${ow}'s personal cyber-diary about <b>${tp}</b> and late-night HTML coding.</p>
            <div class="entry">
              <b>11/21/${yr} - Late Night Site Overhaul!</b><br>
              <font face="Verdana" size="1"><i>Current Mood: Stoked | Listening to: 8-bit chiptunes</i></font>
              <p>Finally got the beveled tables and starfield tiling just right! Spent two hours picking the loudest neon colors in Notepad.${gbTail}</p>
            </div>
            <div class="entry">
              <b>11/10/${yr} - Why ${tp} Rules</b><br>
              <font face="Verdana" size="1"><i>Current Mood: Nostalgic | Listening to: Dial-up handshake</i></font>
              <p>Nothing beats building your own corner of the Internet from scratch. No algorithms, just tables, GIFs, and WebRings.</p>
            </div>
            <div class="entry">
              <b>11/02/${yr} - Hello Cyberspace!</b><br>
              <font face="Verdana" size="1"><i>Current Mood: Excited | Listening to: MIDI loops</i></font>
              <p>Welcome to the very first entry on ${st}. Grab a Surge soda and stay awhile!</p>
            </div>`;
    }

    case "shrine":
      return `            <h1 class="title">${h}</h1>
            <p>Dedicated to the absolute greatest thing in the universe: <b>${tp}</b>!</p>
            <div class="panel">
              <div class="panel-title">~ Top 5 Reasons ${tp} Is Totally Rad ~</div>
              <ol>
                <li>Timeless 90s charm that never gets old.</li>
                <li>Looks incredible on a 15-inch CRT monitor at 800x600.</li>
                <li>Infinite creative energy and handmade soul.</li>
                <li>Brings the whole WebRing community together.</li>
                <li>Certified 100% awesome by ${ow}!</li>
              </ol>
            </div>
            <br>
            <div class="panel">
              <div class="panel-title">~ Shrine Trivia ~</div>
              <table width="100%" cellpadding="4" cellspacing="0" border="1">
                <tr><td><b>Founded:</b></td><td>${yr}</td></tr>
                <tr><td><b>Curator:</b></td><td>${ow}</td></tr>
                <tr><td><b>Rating:</b></td><td><span class="blink hot">5 / 5 STARS!</span></td></tr>
              </table>
            </div>`;

    default:
      return `            <h1 class="title">${h}</h1>
            <p>Welcome to the <b>${h}</b> page on ${st}! More totally rad ${tp} content is under construction.</p>`;
  }
}
