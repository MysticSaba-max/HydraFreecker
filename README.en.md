<div align="right">

[🇫🇷 Français](README.md) · **🇬🇧 English**

</div>

# HydraFreecker

<img src="icons/128.png" alt="HydraFreecker" width="96" align="right">

> **Hydracker, jailbroken.** One click. Direct link. Zero crappy popup.

Chrome extension that hijacks Hydracker's premium-download button and resolves the link through the Movix API instead. Drop-in replacement: same click, different backend, custom modal.

Replaces the `https://hydracker.com/api/v1/content/liens/{id}` request with `https://api.movix.tax/api/darkiworld/decode/{id}?title_id={titleId}`, spoofs `Referer`/`Origin` to `https://movix.tax`, and renders a custom modal with the response.

---

## Features

- **Transparent interception** — works with Hydracker's existing UI; no extra button to click.
- **Header spoofing** — `Referer` and `Origin` rewritten via `declarativeNetRequest` so the Movix API accepts the request.
- **Native-feeling modal** — shadcn-inspired dark theme, animated open/close, Lucide icons, copy/open/download buttons.
- **Rich metadata** — quality, languages (with custom inline flag badges, no broken Windows emojis), size, host (with favicon), uploader, votes, dates, source/provider, IDs.
- **Raw response inspector** — collapsible JSON view with smooth height animation.
- **Site dialog killer** — auto-removes Hydracker's own "Téléchargement Premium" dialog so only the HydraFreecker modal is shown.

## Install (developer mode)

1. Clone or download this repo.
2. Open `chrome://extensions` and enable **Developer mode** (top-right).
3. Click **Load unpacked** → select the `HydraFreecker` folder.
4. Visit `https://hydracker.com`, open any title, click a download host icon.

The extension exposes no popup/options page — it just works in the background.

## How it works

```
[ Hydracker page ]
       │
       │  user clicks 1Fichier (or any host) icon
       ▼
[ interceptor.js  (MAIN world, document_start) ]
       │  hooks  window.fetch  +  XMLHttpRequest
       │  matches  GET /api/v1/content/liens/{id}
       │  captures title_id from /api/v1/titles/{title_id}/content/liens
       │  aborts original request, postMessage → ISOLATED world
       ▼
[ content.js  (ISOLATED world) ]
       │  opens custom modal (loading state)
       │  also kills Hydracker's own "Téléchargement Premium" dialog
       │  chrome.runtime.sendMessage → background
       ▼
[ background.js  (service worker) ]
       │  fetch  https://api.movix.tax/api/darkiworld/decode/{lienId}?title_id={titleId}
       │  declarativeNetRequest sets  Referer: https://movix.tax/
       │                              Origin:  https://movix.tax
       │  returns parsed JSON
       ▼
[ content.js renders ]
       │  filename, quality pill, language flags, size, host badge,
       │  copy/open/download buttons, metadata grid, raw JSON inspector
       ▼
[ user clicks Télécharger → opens direct URL in new tab ]
```

## File structure

| File              | Role                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------- |
| `manifest.json`   | MV3 manifest. Permissions: `declarativeNetRequest`. Hosts: hydracker.com, api.movix.tax. |
| `rules.json`      | declarativeNetRequest rule — rewrites `Referer`/`Origin` on Movix API calls.          |
| `interceptor.js`  | Runs in MAIN world. Patches `fetch` + `XMLHttpRequest` to intercept Hydracker's lien endpoint. |
| `content.js`      | Runs in ISOLATED world. Modal UI, site-dialog watcher, message bridge.                |
| `background.js`   | Service worker. Performs the cross-origin Movix fetch.                                |
| `modal.css`       | shadcn-style dialog, animations, pills, flag badges, icons.                           |
| `icons/`          | Extension icons (16/32/48/128 PNG) + source SVG.                                      |

## Customizing

### Add more language flags

Edit the `FLAGS` map in `content.js`:

```js
const FLAGS = {
  fr: ['#0055A4', '#FFFFFF', '#EF4135'],
  // [top, middle, bottom] colors for a 3-stripe badge
  xx: ['#color1', '#color2', '#color3'],
};
```

The first two letters of the language name are overlaid on top of the stripes — no Unicode emoji dependency.

### Change the API endpoint

Both endpoints are hard-coded in three places:

- Match pattern in `interceptor.js` (`LIEN_RE`)
- URL build in `background.js`
- Header rewrite condition in `rules.json` (`urlFilter`)

To point at a different debrid backend, update all three.

### Adjust the modal

`modal.css` exposes shadcn HSL variables at the top of `#movix-modal-root` — tweak colors, radii, fonts, animation timings there.

## Notes & caveats

- **`AbortError` in console** — Hydracker may log the aborted fetch. Harmless.
- **Direct DL may be absent** — for some links the Movix API returns the original host URL (`embed_url.lien`) rather than a debrided direct download. The modal will surface whatever URL is available.
- **`title_id` is best-effort** — pulled from the most recent `/api/v1/titles/{id}/content/liens` fetch, falling back to the page URL pattern. If neither matches, the parameter is omitted from the Movix request.

## License

[MIT](LICENSE). Use at your own risk — this depends on the third-party Movix API and on Hydracker's current page structure; both can change.
