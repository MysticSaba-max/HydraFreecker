// API base is resolved dynamically from the Movix address list so a domain
// rotation (block → new mirror) doesn't require shipping a new build. We use
// the `primary` domain only — no multi-domain fallback — per design choice.
const ADDRESS_URL = 'https://movix.online/address.json';
const STORAGE_KEY = 'movixApiBase';

let apiBase = null; // e.g. "https://api.movix.date"

function apiBaseFromPrimary(json) {
  try {
    const host = new URL(json.primary.url).host; // "movix.date"
    return 'https://api.' + host;
  } catch (_) {
    return null;
  }
}

async function refreshApiBase() {
  try {
    const res = await fetch(ADDRESS_URL, { cache: 'no-store' });
    if (!res.ok) return apiBase;
    const base = apiBaseFromPrimary(await res.json());
    if (base) {
      apiBase = base;
      try { await chrome.storage.local.set({ [STORAGE_KEY]: base }); } catch (_) {}
    }
  } catch (_) {}
  return apiBase;
}

async function ensureApiBase() {
  if (apiBase) return apiBase;
  try {
    const r = await chrome.storage.local.get(STORAGE_KEY);
    if (r && r[STORAGE_KEY]) apiBase = r[STORAGE_KEY];
  } catch (_) {}
  if (!apiBase) await refreshApiBase();
  return apiBase;
}

// Warm from cache on worker start, then refresh in the background to stay current.
ensureApiBase().then(() => refreshApiBase());

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== 'movix:fetch') return;
  const { lienId, titleId } = msg;

  (async () => {
    const base = await ensureApiBase();
    if (!base) {
      sendResponse({
        ok: false,
        status: 0,
        error: "Adresse de l'API Movix indisponible (address.json injoignable)."
      });
      return;
    }

    let url = `${base}/api/darkiworld/decode/${encodeURIComponent(lienId)}`;
    if (titleId) url += `?title_id=${encodeURIComponent(titleId)}`;

    try {
      const res = await fetch(url, {
        method: 'GET',
        credentials: 'omit',
        headers: { Accept: 'application/json' }
      });
      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch (_) {}
      sendResponse({ ok: res.ok, status: res.status, data, raw: data ? null : text });
    } catch (err) {
      sendResponse({ ok: false, status: 0, error: String((err && err.message) || err) });
    }
  })();

  return true; // async sendResponse
});
