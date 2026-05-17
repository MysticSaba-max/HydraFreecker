(async () => {
  const body = document.getElementById('hf-popup-body');
  if (!body) return;
  let version = '1.1.0';
  try {
    const manifest = chrome.runtime.getManifest();
    if (manifest && manifest.version) version = manifest.version;
  } catch (_) {}
  await window.HFMenu.attach(body, { version });
})();
