(() => {
  const KEY = 'hf:stats';
  const HISTORY_MAX = 10;

  function defaults() {
    return {
      version: 1,
      totals: { success: 0, fail: 0 },
      hydraCut: 0,
      hosts: {},
      history: [],
      prefs: { hydraSlayerEnabled: true, extensionEnabled: true, slashAnimEnabled: true },
      installedAt: Date.now()
    };
  }

  function merge(data) {
    if (!data || typeof data !== 'object') return defaults();
    const d = defaults();
    return {
      version: data.version || 1,
      totals: {
        success: Number(data.totals && data.totals.success) || 0,
        fail: Number(data.totals && data.totals.fail) || 0
      },
      hydraCut: Number(data.hydraCut) || 0,
      hosts: data.hosts && typeof data.hosts === 'object' ? data.hosts : {},
      history: Array.isArray(data.history) ? data.history : [],
      prefs: { ...d.prefs, ...(data.prefs || {}) },
      installedAt: data.installedAt || Date.now()
    };
  }

  async function get() {
    try {
      const res = await chrome.storage.local.get(KEY);
      const data = res[KEY];
      const merged = merge(data);
      if (!data || !data.installedAt) {
        await chrome.storage.local.set({ [KEY]: merged });
      }
      return merged;
    } catch (_) {
      return defaults();
    }
  }

  async function set(data) {
    try {
      await chrome.storage.local.set({ [KEY]: data });
    } catch (_) {}
  }

  let updateQueue = Promise.resolve();
  async function update(mutator) {
    const next = updateQueue.then(async () => {
      const data = await get();
      mutator(data);
      await set(data);
      return data;
    });
    updateQueue = next.catch(() => {});
    return next;
  }

  async function incrementSuccess(host) {
    return update((d) => {
      d.totals.success = (d.totals.success || 0) + 1;
      if (host && host.name) {
        const key = host.name;
        if (!d.hosts[key]) d.hosts[key] = { count: 0, icon: '' };
        d.hosts[key].count = (d.hosts[key].count || 0) + 1;
        if (host.icon) d.hosts[key].icon = host.icon;
      }
    });
  }

  async function incrementFail() {
    return update((d) => {
      d.totals.fail = (d.totals.fail || 0) + 1;
    });
  }

  async function incrementHydraCut() {
    return update((d) => {
      d.hydraCut = (d.hydraCut || 0) + 1;
    });
  }

  async function pushHistory(entry) {
    return update((d) => {
      const item = {
        filename: entry.filename || '',
        host: entry.host || '',
        hostIcon: entry.hostIcon || '',
        url: entry.url || '',
        lienId: entry.lienId || '',
        success: entry.success !== false,
        date: Date.now()
      };
      d.history.unshift(item);
      if (d.history.length > HISTORY_MAX) d.history.length = HISTORY_MAX;
    });
  }

  async function setPref(key, value) {
    return update((d) => {
      d.prefs = d.prefs || {};
      d.prefs[key] = value;
    });
  }

  async function reset() {
    try {
      await chrome.storage.local.remove(KEY);
    } catch (_) {}
  }

  function onChange(handler) {
    if (!chrome.storage || !chrome.storage.onChanged) return () => {};
    const listener = (changes, area) => {
      if (area !== 'local' || !changes[KEY]) return;
      try {
        handler(merge(changes[KEY].newValue));
      } catch (_) {}
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }

  const api = {
    get,
    set,
    update,
    incrementSuccess,
    incrementFail,
    incrementHydraCut,
    pushHistory,
    setPref,
    reset,
    onChange,
    HISTORY_MAX,
    KEY
  };

  if (typeof window !== 'undefined') window.HFStats = api;
  if (typeof self !== 'undefined') self.HFStats = api;
})();
