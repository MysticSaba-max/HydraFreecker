(() => {
  const ICONS = {
    chart:
      '<line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/>',
    scissors:
      '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" x2="8.12" y1="4" y2="15.88"/><line x1="14.47" x2="20" y1="14.48" y2="20"/><line x1="8.12" x2="12" y1="8.12" y2="12"/>',
    trash:
      '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    download:
      '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    info:
      '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    github:
      '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>',
    activity:
      '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    target:
      '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    clock:
      '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    server:
      '<rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/>',
    flame:
      '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    external:
      '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'
  };

  function icon(name, opts) {
    const size = (opts && opts.size) || 16;
    const stroke = (opts && opts.stroke) || 2;
    const cls = 'movix-icon' + (opts && opts.class ? ' ' + opts.class : '');
    return `<svg class="${cls}" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(s) {
    return escapeHtml(s);
  }

  function formatRelative(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '—';
    const diff = Date.now() - ts;
    if (diff < 0) return d.toLocaleDateString();
    if (diff < 60000) return "à l'instant";
    if (diff < 3600000) return Math.floor(diff / 60000) + ' min';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' h';
    if (diff < 7 * 86400000) return Math.floor(diff / 86400000) + ' j';
    return d.toLocaleDateString();
  }

  function successRate(stats) {
    const t = (stats.totals.success || 0) + (stats.totals.fail || 0);
    if (!t) return '—';
    return Math.round((stats.totals.success / t) * 100) + '%';
  }

  function hostInitial(name) {
    return ((name || '?')[0] || '?').toUpperCase();
  }

  function renderStatCards(stats) {
    const total = (stats.totals.success || 0) + (stats.totals.fail || 0);
    return `
      <div class="hf-stat-cards">
        <div class="hf-stat-card hf-stat-success">
          <div class="hf-stat-icon">${icon('check', { size: 16 })}</div>
          <div class="hf-stat-value" data-stat="success">${stats.totals.success || 0}</div>
          <div class="hf-stat-label">Réussis</div>
        </div>
        <div class="hf-stat-card hf-stat-fail">
          <div class="hf-stat-icon">${icon('x', { size: 16 })}</div>
          <div class="hf-stat-value" data-stat="fail">${stats.totals.fail || 0}</div>
          <div class="hf-stat-label">Échoués</div>
        </div>
        <div class="hf-stat-card hf-stat-hydra">
          <div class="hf-stat-icon hf-scissors-icon">${icon('scissors', { size: 16 })}</div>
          <div class="hf-stat-value" data-stat="hydra">${stats.hydraCut || 0}</div>
          <div class="hf-stat-label">Hydres coupées</div>
        </div>
      </div>
      <div class="hf-stat-summary">
        <span>${icon('target', { size: 12 })} Taux <strong>${successRate(stats)}</strong></span>
        <span>${icon('activity', { size: 12 })} Total <strong>${total}</strong></span>
      </div>
    `;
  }

  function renderHostsList(stats) {
    const hosts = Object.entries(stats.hosts || {})
      .sort((a, b) => (b[1].count || 0) - (a[1].count || 0))
      .slice(0, 5);
    if (!hosts.length) {
      return `
        <section class="hf-section">
          <h3 class="hf-section-title">${icon('server', { size: 13 })} Top hébergeurs</h3>
          <div class="hf-empty">Aucune résolution pour l'instant.</div>
        </section>
      `;
    }
    const max = hosts[0][1].count || 1;
    return `
      <section class="hf-section">
        <h3 class="hf-section-title">${icon('server', { size: 13 })} Top hébergeurs</h3>
        <ul class="hf-hosts">
          ${hosts
            .map(
              ([name, h]) => `
            <li class="hf-host">
              ${
                h.icon
                  ? `<img src="${escapeAttr(h.icon)}" alt="" class="hf-host-icon" referrerpolicy="no-referrer">`
                  : `<span class="hf-host-icon hf-host-icon-fallback">${escapeHtml(hostInitial(name))}</span>`
              }
              <div class="hf-host-body">
                <div class="hf-host-name">${escapeHtml(name)}</div>
                <div class="hf-host-bar"><div class="hf-host-bar-fill" style="width:${Math.round(
                  ((h.count || 0) / max) * 100
                )}%"></div></div>
              </div>
              <div class="hf-host-count">${h.count || 0}</div>
            </li>`
            )
            .join('')}
        </ul>
      </section>
    `;
  }

  function renderHistory(stats) {
    const hist = stats.history || [];
    if (!hist.length) {
      return `
        <section class="hf-section">
          <h3 class="hf-section-title">${icon('clock', { size: 13 })} Historique</h3>
          <div class="hf-empty">Aucun lien dans l'historique.</div>
        </section>
      `;
    }
    return `
      <section class="hf-section">
        <h3 class="hf-section-title">${icon('clock', { size: 13 })} Dernières résolutions (${hist.length})</h3>
        <ul class="hf-history">
          ${hist
            .map(
              (it) => `
            <li class="hf-history-item ${it.success === false ? 'hf-history-fail' : ''}">
              ${
                it.hostIcon
                  ? `<img src="${escapeAttr(it.hostIcon)}" alt="" class="hf-host-icon" referrerpolicy="no-referrer">`
                  : `<span class="hf-host-icon hf-host-icon-fallback">${escapeHtml(hostInitial(it.host))}</span>`
              }
              <div class="hf-history-body">
                <div class="hf-history-name" title="${escapeAttr(it.filename || '—')}">${escapeHtml(
                it.filename || '—'
              )}</div>
                <div class="hf-history-meta">${escapeHtml(it.host || '—')} · ${escapeHtml(
                formatRelative(it.date)
              )}</div>
              </div>
              ${
                it.url
                  ? `<a href="${escapeAttr(
                      it.url
                    )}" target="_blank" rel="noreferrer noopener" class="hf-history-open" aria-label="Ouvrir le lien">${icon(
                      'external',
                      { size: 13 }
                    )}</a>`
                  : ''
              }
            </li>`
            )
            .join('')}
        </ul>
      </section>
    `;
  }

  function renderExtensionToggle(stats) {
    const enabled = stats.prefs && stats.prefs.extensionEnabled !== false;
    return `
      <section class="hf-section">
        <h3 class="hf-section-title">${icon('flame', { size: 13 })} Extension</h3>
        <div class="hf-toggle-row">
          <div class="hf-toggle-text">
            <div class="hf-toggle-label">Activer HydraFreecker</div>
            <div class="hf-toggle-desc">Quand désactivé : aucun appel à api.movix.tax, aucune coupe de dialog. Hydracker reprend sa résolution native.</div>
          </div>
          <label class="hf-switch hf-switch-power" aria-label="Activer HydraFreecker">
            <input type="checkbox" id="hf-extension-toggle" ${enabled ? 'checked' : ''} />
            <span class="hf-switch-track"><span class="hf-switch-thumb"></span></span>
          </label>
        </div>
      </section>
    `;
  }

  function renderSlayer(stats) {
    const enabled = stats.prefs && stats.prefs.hydraSlayerEnabled !== false;
    const extEnabled = stats.prefs && stats.prefs.extensionEnabled !== false;
    return `
      <section class="hf-section ${extEnabled ? '' : 'hf-section-disabled'}">
        <h3 class="hf-section-title">${icon('scissors', { size: 13 })} Hydra Slayer</h3>
        <div class="hf-toggle-row">
          <div class="hf-toggle-text">
            <div class="hf-toggle-label">Couper l'hydre</div>
            <div class="hf-toggle-desc">Ferme automatiquement le dialog "Téléchargement Premium" d'Hydracker. Chaque coupe incrémente le compteur.</div>
          </div>
          <label class="hf-switch" aria-label="Activer Hydra Slayer">
            <input type="checkbox" id="hf-slayer-toggle" ${enabled ? 'checked' : ''} ${extEnabled ? '' : 'disabled'} />
            <span class="hf-switch-track"><span class="hf-switch-thumb"></span></span>
          </label>
        </div>
      </section>
    `;
  }

  function renderAbout(stats, version) {
    return `
      <section class="hf-section">
        <h3 class="hf-section-title">${icon('info', { size: 13 })} À propos</h3>
        <dl class="movix-grid hf-about-grid">
          <div class="movix-grid-row"><dt>Version</dt><dd>${escapeHtml(version || '1.1.0')}</dd></div>
          <div class="movix-grid-row"><dt>Installé</dt><dd>${escapeHtml(formatRelative(stats.installedAt))}</dd></div>
        </dl>
        <div class="hf-actions">
          <button type="button" class="movix-btn movix-btn-ghost" data-action="export">${icon('download', {
            size: 13
          })}<span>Export JSON</span></button>
          <button type="button" class="movix-btn movix-btn-ghost hf-btn-danger" data-action="reset">${icon(
            'trash',
            { size: 13 }
          )}<span>Reset stats</span></button>
          <a class="movix-btn movix-btn-ghost" href="https://github.com/MysticSaba-max/HydraFreecker" target="_blank" rel="noreferrer noopener">${icon(
            'github',
            { size: 13 }
          )}<span>GitHub</span></a>
        </div>
      </section>
    `;
  }

  function renderBody(stats, version) {
    return `
      ${renderStatCards(stats)}
      ${renderHostsList(stats)}
      ${renderHistory(stats)}
      ${renderExtensionToggle(stats)}
      ${renderSlayer(stats)}
      ${renderAbout(stats, version)}
    `;
  }

  function pulse(el) {
    if (!el) return;
    el.classList.remove('hf-pulse');
    void el.offsetWidth;
    el.classList.add('hf-pulse');
  }

  function animateSwitch(input, on) {
    const wrap = input && input.closest && input.closest('.hf-switch');
    if (!wrap) return;
    wrap.removeAttribute('data-anim');
    void wrap.offsetWidth;
    wrap.setAttribute('data-anim', on ? 'on' : 'off');
    setTimeout(() => {
      if (wrap.getAttribute('data-anim') === (on ? 'on' : 'off')) {
        wrap.removeAttribute('data-anim');
      }
    }, 720);
  }

  function statsChanged(a, b) {
    if (!a || !b) return true;
    return (
      a.totals.success !== b.totals.success ||
      a.totals.fail !== b.totals.fail ||
      a.hydraCut !== b.hydraCut ||
      (a.history && a.history.length) !== (b.history && b.history.length) ||
      Object.keys(a.hosts || {}).length !== Object.keys(b.hosts || {}).length
    );
  }

  function syncToggleStates(container, stats) {
    const extOn = stats.prefs && stats.prefs.extensionEnabled !== false;
    const slayerOn = stats.prefs && stats.prefs.hydraSlayerEnabled !== false;
    const extEl = container.querySelector('#hf-extension-toggle');
    if (extEl && extEl.checked !== extOn) extEl.checked = extOn;
    const slayerEl = container.querySelector('#hf-slayer-toggle');
    if (slayerEl && slayerEl.checked !== slayerOn) slayerEl.checked = slayerOn;
    if (slayerEl) slayerEl.disabled = !extOn;
    const slayerSection = slayerEl && slayerEl.closest('.hf-section');
    if (slayerSection) {
      slayerSection.classList.toggle('hf-section-disabled', !extOn);
    }
  }

  function wire(container, getStats, opts) {
    const slayer = container.querySelector('#hf-slayer-toggle');
    if (slayer) {
      slayer.addEventListener('change', async () => {
        animateSwitch(slayer, slayer.checked);
        await window.HFStats.setPref('hydraSlayerEnabled', slayer.checked);
        const card = container.querySelector('.hf-stat-hydra .hf-scissors-icon');
        if (slayer.checked && card) pulse(card);
        if (opts && opts.onSlayerChange) opts.onSlayerChange(slayer.checked);
      });
    }

    const extToggle = container.querySelector('#hf-extension-toggle');
    if (extToggle) {
      extToggle.addEventListener('change', async () => {
        animateSwitch(extToggle, extToggle.checked);
        await window.HFStats.setPref('extensionEnabled', extToggle.checked);
        if (opts && opts.onExtensionChange) opts.onExtensionChange(extToggle.checked);
      });
    }

    const exportBtn = container.querySelector('[data-action="export"]');
    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        const data = JSON.stringify(await window.HFStats.get(), null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hydrafreecker-stats-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      });
    }

    const resetBtn = container.querySelector('[data-action="reset"]');
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        const ok = window.confirm('Reset toutes les stats ? Action irréversible.');
        if (!ok) return;
        await window.HFStats.reset();
        if (opts && opts.onReset) opts.onReset();
      });
    }
  }

  async function attach(container, opts) {
    let stats = await window.HFStats.get();
    container.innerHTML = renderBody(stats, opts && opts.version);
    wire(container, () => stats, opts);

    const unsubscribe = window.HFStats.onChange((fresh) => {
      const prev = stats;
      stats = fresh;
      if (statsChanged(prev, fresh)) {
        container.innerHTML = renderBody(fresh, opts && opts.version);
        wire(container, () => stats, opts);
        if (fresh.totals.success > prev.totals.success) {
          pulse(container.querySelector('[data-stat="success"]'));
        }
        if (fresh.totals.fail > prev.totals.fail) {
          pulse(container.querySelector('[data-stat="fail"]'));
        }
        if (fresh.hydraCut > prev.hydraCut) {
          pulse(container.querySelector('[data-stat="hydra"]'));
          pulse(container.querySelector('.hf-stat-hydra .hf-scissors-icon'));
        }
      } else {
        syncToggleStates(container, fresh);
      }
    });
    if (opts && opts.onUnsubscribe) opts.onUnsubscribe(unsubscribe);
    return stats;
  }

  window.HFMenu = { attach, renderBody, icon, escapeHtml, escapeAttr, formatRelative };
})();
