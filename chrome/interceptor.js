(() => {
  let lastTitleId = null;

  function detectTitleFromUrl() {
    const m =
      location.pathname.match(/\/titres?\/(\d+)/i) ||
      location.pathname.match(/\/titles?\/(\d+)/i);
    if (m) lastTitleId = m[1];
  }
  detectTitleFromUrl();
  window.addEventListener('popstate', detectTitleFromUrl);

  const notify = (lienId, titleId) => {
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
      if (lm && /^get$/i.test(method)) {
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
        if (lm && /^get$/i.test(method)) {
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
})();
