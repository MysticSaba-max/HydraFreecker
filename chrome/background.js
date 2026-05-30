chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== 'movix:fetch') return;
  const { lienId, titleId } = msg;
  let url = `https://api.movix.cloud/api/darkiworld/decode/${encodeURIComponent(lienId)}`;
  if (titleId) url += `?title_id=${encodeURIComponent(titleId)}`;

  fetch(url, {
    method: 'GET',
    credentials: 'omit',
    headers: { Accept: 'application/json' }
  })
    .then(async (res) => {
      const text = await res.text();
      let data = null;
      try {
        data = JSON.parse(text);
      } catch (_) {}
      sendResponse({
        ok: res.ok,
        status: res.status,
        data,
        raw: data ? null : text
      });
    })
    .catch((err) => {
      sendResponse({ ok: false, status: 0, error: String(err && err.message || err) });
    });

  return true;
});
