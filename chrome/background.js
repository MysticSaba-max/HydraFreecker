// API base is resolved dynamically from the Movix address list so a domain
// rotation (block → new mirror) doesn't require shipping a new build. We use
// the `primary` domain only — no multi-domain fallback — per design choice.
//
// host_permissions is https://*/* so ANY movix TLD (present or future) is
// reachable. The Referer/Origin spoof for the *current* host is installed as a
// dynamic declarativeNetRequest rule below; the static rules.json still covers
// the known TLDs as a baseline (and browsers without dynamic modifyHeaders).
const ADDRESS_URL = 'https://movix.online/address.json';
const STORAGE_KEY = 'movixApiBase';
const RULE_ID = 1;

let apiBase = null; // e.g. "https://api.movix.date"

function apiBaseFromPrimary(json) {
  try {
    return 'https://api.' + new URL(json.primary.url).host;
  } catch (_) {
    return null;
  }
}

function siteHost(base) {
  // "https://api.movix.date" → "movix.date"
  try {
    return new URL(base).host.replace(/^api\./, '');
  } catch (_) {
    return null;
  }
}

// Spoof Referer/Origin for the current API host, whatever TLD it lands on.
async function applyReferrerRule(base) {
  const host = siteHost(base);
  if (!host) return;
  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [RULE_ID],
      addRules: [
        {
          id: RULE_ID,
          priority: 1,
          action: {
            type: 'modifyHeaders',
            requestHeaders: [
              { header: 'Referer', operation: 'set', value: `https://${host}/` },
              { header: 'Origin', operation: 'set', value: `https://${host}` }
            ]
          },
          condition: {
            urlFilter: `||api.${host}/api/darkiworld/decode/`,
            resourceTypes: ['xmlhttprequest']
          }
        }
      ]
    });
  } catch (_) {}
}

async function setApiBase(base) {
  apiBase = base;
  try { await chrome.storage.local.set({ [STORAGE_KEY]: base }); } catch (_) {}
  await applyReferrerRule(base);
}

async function refreshApiBase() {
  try {
    const res = await fetch(ADDRESS_URL, { cache: 'no-store' });
    if (!res.ok) return apiBase;
    const base = apiBaseFromPrimary(await res.json());
    if (base && base !== apiBase) await setApiBase(base);
    else if (base) await applyReferrerRule(base);
  } catch (_) {}
  return apiBase;
}

async function ensureApiBase() {
  if (apiBase) return apiBase;
  try {
    const r = await chrome.storage.local.get(STORAGE_KEY);
    if (r && r[STORAGE_KEY]) {
      apiBase = r[STORAGE_KEY];
      await applyReferrerRule(apiBase);
    }
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
