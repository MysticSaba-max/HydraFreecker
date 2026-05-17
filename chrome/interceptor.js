(() => {
  let lastTitleId = null;
  let extensionEnabled = true;

  window.addEventListener('message', (e) => {
    if (e.source !== window) return;
    const d = e.data;
    if (!d || d.source !== 'hf-config') return;
    if (typeof d.enabled === 'boolean') extensionEnabled = d.enabled;
  });

  function detectTitleFromUrl() {
    const m =
      location.pathname.match(/\/titres?\/(\d+)/i) ||
      location.pathname.match(/\/titles?\/(\d+)/i);
    if (m) lastTitleId = m[1];
  }
  detectTitleFromUrl();
  window.addEventListener('popstate', detectTitleFromUrl);

  // Dedup: click handler and fetch/XHR hooks can both fire for the same lien
  // within milliseconds. Suppress duplicates within a 1s window per lien id.
  let lastNotifyId = null;
  let lastNotifyAt = 0;
  const notify = (lienId, titleId) => {
    if (!extensionEnabled) return;
    const now = Date.now();
    if (lastNotifyId === lienId && now - lastNotifyAt < 1000) return;
    lastNotifyId = lienId;
    lastNotifyAt = now;
    window.postMessage(
      { source: 'movix-bridge', type: 'debrid', lienId, titleId },
      '*'
    );
  };

  const LIEN_RE = /\/api\/v1\/content\/liens\/(\d+)(?:[/?#]|$)/;
  const TITLE_RE = /\/api\/v1\/titles\/(\d+)\/content\/liens/;

  const origFetch = window.fetch;
  window.fetch = function (input, init) {
    try {
      const url =
        typeof input === 'string'
          ? input
          : (input && (input.url || String(input))) || '';
      const tm = url.match(TITLE_RE);
      if (tm) lastTitleId = tm[1];
      const lm = url.match(LIEN_RE);
      const method = (init && init.method) || (input && input.method) || 'GET';
      if (lm && /^get$/i.test(method) && extensionEnabled) {
        notify(lm[1], lastTitleId);
        return Promise.reject(
          new DOMException('Intercepted by Movix extension', 'AbortError')
        );
      }
    } catch (e) {}
    return origFetch.apply(this, arguments);
  };

  const OrigXHR = window.XMLHttpRequest;
  function PatchedXHR() {
    const x = new OrigXHR();
    const origOpen = x.open;
    x.open = function (method, url) {
      this._movixMethod = method;
      this._movixUrl = url;
      return origOpen.apply(this, arguments);
    };
    const origSend = x.send;
    x.send = function () {
      try {
        const url = this._movixUrl || '';
        const method = this._movixMethod || 'GET';
        const tm = url.match(TITLE_RE);
        if (tm) lastTitleId = tm[1];
        const lm = url.match(LIEN_RE);
        if (lm && /^get$/i.test(method) && extensionEnabled) {
          notify(lm[1], lastTitleId);
          this.abort();
          return;
        }
      } catch (e) {}
      return origSend.apply(this, arguments);
    };
    return x;
  }
  PatchedXHR.prototype = OrigXHR.prototype;
  window.XMLHttpRequest = PatchedXHR;

  // ---------------------------------------------------------------------------
  // Click-based fallback. Hydracker no longer fetches the lien endpoint on
  // hoster icon click — the lien data is fully cached client-side from the
  // initial list call, so clicking only triggers a React state change. The
  // fetch/XHR hooks above never fire, so we never know the user clicked.
  //
  // Listen for clicks on any hoster button (button with a favicon image) and
  // walk the row's React fiber to extract lien.id, then fire the same
  // postMessage the fetch hook would have fired. Content.js handles the rest.
  // ---------------------------------------------------------------------------
  function findLienIdFromRow(row) {
    if (!row) return null;
    const fiberKey = Object.keys(row).find(
      (k) => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
    );
    if (!fiberKey) return null;
    let fiber = row[fiberKey];
    for (let depth = 0; depth < 80 && fiber; depth++) {
      const p = fiber.memoizedProps || fiber.pendingProps;
      if (p) {
        if (p.lien && (p.lien.id || p.lien.lien_id)) return p.lien.id || p.lien.lien_id;
        if (p.row && p.row.original && p.row.original.id) return p.row.original.id;
        if (p.row && p.row.id && typeof p.row.id !== 'string') return p.row.id;
        if (p.item && p.item.id && (p.item.host || p.item.hote || p.item.qualite || p.item.langues)) return p.item.id;
        if (p.data && p.data.id && (p.data.host || p.data.hote || p.data.qualite || p.data.langues)) return p.data.id;
        if (p.value && p.value.id && (p.value.host || p.value.hote || p.value.qualite || p.value.langues)) return p.value.id;
      }
      fiber = fiber.return;
    }
    return null;
  }

  const HOSTER_IMG_RE = /favicon|1fichier|rapidgator|uptobox|nitroflare|katfile|userscloud|mediafire|doodstream|send\.cm|clicknupload|media\.cm|s2\/favicons/i;

  document.addEventListener(
    'click',
    function (e) {
      if (!extensionEnabled) return;
      try {
        const btn = e.target && e.target.closest && e.target.closest('button');
        if (!btn) return;
        const img = btn.querySelector('img');
        if (!img) return;
        const src = img.getAttribute('src') || '';
        if (!HOSTER_IMG_RE.test(src)) return;
        const row = btn.closest('[role="row"]') || btn.closest('tr');
        if (!row) return;
        const lienId = findLienIdFromRow(row);
        if (!lienId) return;
        notify(String(lienId), lastTitleId);
      } catch (_) {}
    },
    true
  );
})();
