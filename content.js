(() => {
  const MODAL_ID = 'movix-modal-root';

  const ICONS = {
    copy:
      '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    external:
      '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    download:
      '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    hardDrive:
      '<line x1="22" x2="2" y1="12" y2="12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" x2="6.01" y1="16" y2="16"/><line x1="10" x2="10.01" y1="16" y2="16"/>',
    globe:
      '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    arrowUp: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
    arrowDown: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
    info:
      '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>'
  };

  function icon(name, opts) {
    const size = (opts && opts.size) || 16;
    const stroke = (opts && opts.stroke) || 2;
    const cls = 'movix-icon' + (opts && opts.class ? ' ' + opts.class : '');
    return `<svg class="${cls}" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  }
  const SITE_DIALOG_TITLES = [
    'Téléchargement Premium',
    'Téléchargement premium',
    'Premium Download'
  ];

  let siteDialogObserver = null;

  function killSiteDialog(root = document) {
    const dialogs = root.querySelectorAll('[role="dialog"]');
    dialogs.forEach((d) => {
      if (d.id === MODAL_ID || d.closest('#' + MODAL_ID)) return;
      const txt = d.textContent || '';
      const match = SITE_DIALOG_TITLES.some((t) => txt.includes(t));
      if (!match) return;
      const overlay =
        d.closest('.fixed.inset-0') ||
        d.closest('[class*="z-modal"]') ||
        d.parentElement;
      (overlay || d).remove();
    });
  }

  function startSiteDialogWatcher() {
    killSiteDialog();
    if (siteDialogObserver) return;
    siteDialogObserver = new MutationObserver((muts) => {
      for (const m of muts) {
        m.addedNodes.forEach((n) => {
          if (!(n instanceof Element)) return;
          if (n.id === MODAL_ID) return;
          if (
            n.matches?.('[role="dialog"]') ||
            n.querySelector?.('[role="dialog"]')
          ) {
            killSiteDialog(n.parentNode || document);
          }
        });
      }
    });
    siteDialogObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function stopSiteDialogWatcher() {
    if (siteDialogObserver) {
      siteDialogObserver.disconnect();
      siteDialogObserver = null;
    }
  }

  window.addEventListener('message', (e) => {
    if (e.source !== window) return;
    const d = e.data;
    if (!d || d.source !== 'movix-bridge' || d.type !== 'debrid') return;
    handleDebrid(d.lienId, d.titleId);
  });

  async function handleDebrid(lienId, titleId) {
    startSiteDialogWatcher();
    const modal = openModal();
    setLoading(modal, lienId, titleId);
    try {
      const resp = await chrome.runtime.sendMessage({
        type: 'movix:fetch',
        lienId,
        titleId
      });
      if (!resp) {
        renderError(modal, 'Aucune réponse de l\'extension.', { lienId, titleId });
        return;
      }
      if (resp.error) {
        renderError(modal, resp.error, { lienId, titleId, status: resp.status });
        return;
      }
      if (!resp.data) {
        renderError(modal, 'Réponse non JSON (HTTP ' + resp.status + ').', {
          lienId,
          titleId,
          raw: resp.raw
        });
        return;
      }
      renderResult(modal, resp.data, { lienId, titleId });
    } catch (err) {
      renderError(modal, String(err && err.message || err), { lienId, titleId });
    }
  }

  function openModal() {
    closeModalImmediate();
    const root = document.createElement('div');
    root.id = MODAL_ID;
    root.setAttribute('data-state', 'open');
    root.innerHTML = `
      <div class="movix-overlay" data-state="open"></div>
      <div class="movix-content" data-state="open" role="dialog" aria-modal="true" aria-labelledby="movix-title" aria-describedby="movix-desc" tabindex="-1">
        <div class="movix-content-header">
          <h2 id="movix-title" class="movix-content-title">
            <span class="movix-logo">HF</span>
            HydraFreecker
          </h2>
          <p id="movix-desc" class="movix-content-description">Lien direct récupéré via api.movix.tax — Propulsé par l'API Movix.</p>
        </div>
        <div class="movix-body"></div>
        <div class="movix-content-footer">
          <button type="button" class="movix-btn movix-btn-ghost movix-btn-close">Fermer</button>
        </div>
        <button type="button" class="movix-content-close" aria-label="Fermer">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
          </svg>
        </button>
      </div>
    `;
    document.documentElement.appendChild(root);

    const close = () => closeModal();
    root.querySelector('.movix-overlay').addEventListener('click', close);
    root.querySelector('.movix-content-close').addEventListener('click', close);
    root.querySelector('.movix-btn-close').addEventListener('click', close);

    function escListener(e) {
      if (e.key === 'Escape') {
        close();
        document.removeEventListener('keydown', escListener);
      }
    }
    document.addEventListener('keydown', escListener);
    root._escListener = escListener;

    requestAnimationFrame(() => {
      const content = root.querySelector('.movix-content');
      content && content.focus();
    });

    return root;
  }

  function closeModalImmediate() {
    const existing = document.getElementById(MODAL_ID);
    if (existing) {
      if (existing._escListener) document.removeEventListener('keydown', existing._escListener);
      existing.remove();
    }
    stopSiteDialogWatcher();
  }

  function closeModal() {
    const existing = document.getElementById(MODAL_ID);
    if (!existing) {
      stopSiteDialogWatcher();
      return;
    }
    if (existing._escListener) document.removeEventListener('keydown', existing._escListener);
    existing.setAttribute('data-state', 'closed');
    existing.querySelectorAll('[data-state]').forEach((el) => el.setAttribute('data-state', 'closed'));
    setTimeout(() => {
      if (existing.isConnected) existing.remove();
      stopSiteDialogWatcher();
    }, 210);
  }

  function setLoading(root, lienId, titleId) {
    const body = root.querySelector('.movix-body');
    body.innerHTML = `
      <div class="movix-loading">
        <div class="movix-spinner" aria-hidden="true"></div>
        <div>
          <div class="movix-loading-title">Récupération du lien direct…</div>
          <div class="movix-meta">Lien #${escapeHtml(lienId)}${
      titleId ? ' · Titre #' + escapeHtml(titleId) : ''
    }</div>
        </div>
      </div>
    `;
  }

  function renderError(root, message, ctx) {
    const body = root.querySelector('.movix-body');
    body.innerHTML = `
      <div class="movix-alert movix-alert-error">
        <div class="movix-alert-title">Lien indisponible</div>
        <div class="movix-alert-msg">${escapeHtml(message)}</div>
      </div>
      ${ctx ? renderContextBlock(ctx) : ''}
    `;
  }

  function renderResult(root, data, ctx) {
    const body = root.querySelector('.movix-body');
    if (data.success === false) {
      body.innerHTML = `
        <div class="movix-alert movix-alert-error">
          <div class="movix-alert-title">${escapeHtml(data.error || 'Échec du débridage')}</div>
          ${data.debug ? `<div class="movix-alert-msg">debug : <code>${escapeHtml(data.debug)}</code></div>` : ''}
        </div>
        ${renderRawDetails(data, ctx)}
      `;
      wireRawDetails(body);
      return;
    }

    const embed = data.embed_url || {};
    const meta = data.metadata || {};
    const host = embed.host || {};
    const qual = embed.qual || {};

    const directUrl =
      data.directDL || data.direct_url || embed.directDL || embed.src || embed.lien || '';
    const isDebrided = !!(data.directDL || data.direct_url || embed.directDL || embed.src);

    const sizeBytes = meta.size || embed.taille || null;
    const uploadDate = meta.upload_date || embed.created_at || null;
    const checkedDate = embed.checked_date || embed.health_checked_at || null;
    const lastDl = embed.last_dl || null;
    const updatedAt = embed.updated_at || null;

    const fileName =
      guessFileName(directUrl) ||
      (host.name ? `${host.name} · #${data.id || ctx.lienId}` : `Lien #${data.id || ctx.lienId}`);

    const qualityLabel = meta.quality || embed.quality || qual.qual || (embed.qualite ? '#' + embed.qualite : '');
    const languageLabel = meta.language || embed.language || '';
    const langs = Array.isArray(embed.langues) ? embed.langues : [];
    const hostName = host.name || embed.name || '';
    const hostUrl = host.url || '';
    const hostIcon = host.icon || '';
    const hostColor = host.color || '#8b5cf6';

    const upv = Number(embed.upvotes) || 0;
    const dnv = Number(embed.downvotes) || 0;
    const votes =
      upv > 0 || dnv > 0
        ? `<span class="movix-vote">${icon('arrowUp', { size: 12 })}${upv}</span><span class="movix-vote">${icon('arrowDown', { size: 12 })}${dnv}</span>`
        : '';

    const seLabel = formatSE(embed.saison, embed.episode);

    const healthClass =
      embed.health_status === 'alive' || embed.health_status === 'ok'
        ? 'movix-health-ok'
        : embed.health_status === 'dead'
        ? 'movix-health-dead'
        : 'movix-health-unknown';

    const pills = [
      qualityLabel
        ? `<span class="movix-pill movix-pill-accent" style="--pill-color:${escapeAttr(hostColor)}">${escapeHtml(qualityLabel)}</span>`
        : '',
      langs.length
        ? `<span class="movix-pill movix-pill-langs">${langs
            .map(
              (l) =>
                `<span class="movix-lang">${flagBadge(l.flag, l.lang)}<span>${escapeHtml(l.lang || '')}</span></span>`
            )
            .join('')}</span>`
        : languageLabel
        ? `<span class="movix-pill">${icon('globe', { size: 12 })}${escapeHtml(languageLabel)}</span>`
        : '',
      sizeBytes ? `<span class="movix-pill">${icon('hardDrive', { size: 12 })}${escapeHtml(formatBytes(sizeBytes))}</span>` : '',
      hostName
        ? `<span class="movix-pill movix-pill-host">${
            hostIcon
              ? `<img src="${escapeAttr(hostIcon)}" alt="" class="movix-host-icon" referrerpolicy="no-referrer">`
              : ''
          }${escapeHtml(hostName)}</span>`
        : '',
      data.source
        ? `<span class="movix-pill movix-pill-soft">source : ${escapeHtml(data.source)}</span>`
        : '',
      data.provider
        ? `<span class="movix-pill movix-pill-soft">provider : ${escapeHtml(data.provider)}</span>`
        : ''
    ]
      .filter(Boolean)
      .join('');

    const movixId = data.id != null ? String(data.id) : '';
    const hydraId = ctx.lienId != null ? String(ctx.lienId) : '';

    const rows = [
      embed.id_user ? ['Uploader', escapeHtml(embed.id_user)] : null,
      embed.view ? ['Vues', escapeHtml(String(embed.view))] : null,
      votes ? ['Votes', `<span class="movix-votes">${votes}</span>`] : null,
      seLabel ? ['Saison / Épisode', escapeHtml(seLabel)] : null,
      embed.health_status && embed.health_status !== 'unknown'
        ? ['Santé', `<span class="${healthClass}">${escapeHtml(embed.health_status)}</span>`]
        : null,
      uploadDate ? ['Date upload', escapeHtml(formatDate(uploadDate))] : null,
      hostUrl
        ? ['Hôte URL', `<a href="${escapeAttr(hostUrl)}" target="_blank" rel="noreferrer noopener">${escapeHtml(hostUrl)}</a>`]
        : null,
      movixId && movixId !== hydraId ? ['ID Movix', escapeHtml(movixId)] : null,
      hydraId ? ['ID Hydracker', escapeHtml(hydraId)] : null,
      ctx.titleId ? ['ID Titre', escapeHtml(String(ctx.titleId))] : null
    ].filter(Boolean);

    const alertHtml = isDebrided
      ? `<div class="movix-alert movix-alert-success">
          <div class="movix-alert-title">${icon('check', { size: 14 })} Débridage réussi</div>
          <div class="movix-alert-msg">Le lien direct ci-dessous expire après un court laps de temps.</div>
        </div>`
      : '';

    body.innerHTML = `
      ${alertHtml}

      <div class="movix-card">
        <div class="movix-filename" title="${escapeHtml(fileName)}">${escapeHtml(fileName)}</div>

        ${pills ? `<div class="movix-pills">${pills}</div>` : ''}

        <div class="movix-url-row">
          <input class="movix-url" type="text" readonly value="${escapeAttr(directUrl)}" />
          <button type="button" class="movix-btn movix-btn-icon" data-action="copy" title="Copier l'URL" aria-label="Copier l'URL">${icon('copy')}</button>
          <button type="button" class="movix-btn movix-btn-icon" data-action="open" title="Ouvrir dans un nouvel onglet" aria-label="Ouvrir dans un nouvel onglet">${icon('external')}</button>
        </div>

        <div class="movix-actions">
          <a class="movix-btn movix-btn-primary" href="${escapeAttr(directUrl)}" target="_blank" rel="noreferrer noopener">
            ${icon('download')}
            <span>${isDebrided ? 'Télécharger maintenant' : 'Ouvrir chez ' + escapeHtml(hostName || "l'hôte")}</span>
          </a>
          <button type="button" class="movix-btn movix-btn-ghost" data-action="copy">${icon('copy')}<span>Copier le lien</span></button>
        </div>

        <dl class="movix-grid">
          ${rows
            .map(
              ([k, v]) =>
                `<div class="movix-grid-row"><dt>${escapeHtml(k)}</dt><dd>${v}</dd></div>`
            )
            .join('')}
        </dl>

        ${renderRawDetails(data, ctx)}
      </div>
    `;

    body.querySelectorAll('[data-action="copy"]').forEach((b) =>
      b.addEventListener('click', () => copy(directUrl, b))
    );
    body.querySelectorAll('[data-action="open"]').forEach((b) =>
      b.addEventListener('click', () => {
        if (directUrl) window.open(directUrl, '_blank', 'noopener,noreferrer');
      })
    );
    wireRawDetails(body);
  }

  const FLAGS = {
    fr: ['#0055A4', '#FFFFFF', '#EF4135'],
    gb: ['#012169', '#FFFFFF', '#C8102E'],
    en: ['#012169', '#FFFFFF', '#C8102E'],
    us: ['#B22234', '#FFFFFF', '#3C3B6E'],
    es: ['#AA151B', '#F1BF00', '#AA151B'],
    de: ['#000000', '#DD0000', '#FFCE00'],
    it: ['#008C45', '#F4F5F0', '#CD212A'],
    pt: ['#046A38', '#046A38', '#DA291C'],
    br: ['#009C3B', '#FFDF00', '#002776'],
    jp: ['#FFFFFF', '#BC002D', '#FFFFFF'],
    cn: ['#DE2910', '#FFDE00', '#DE2910'],
    kr: ['#FFFFFF', '#CD2E3A', '#003478'],
    ru: ['#FFFFFF', '#0039A6', '#D52B1E'],
    nl: ['#AE1C28', '#FFFFFF', '#21468B'],
    pl: ['#FFFFFF', '#FFFFFF', '#DC143C'],
    sa: ['#006C35', '#006C35', '#006C35'],
    tr: ['#E30A17', '#E30A17', '#FFFFFF'],
    mx: ['#006847', '#FFFFFF', '#CE1126'],
    ca: ['#FF0000', '#FFFFFF', '#FF0000'],
    in: ['#FF9933', '#FFFFFF', '#138808'],
    multi: ['#6366f1', '#8b5cf6', '#ec4899']
  };

  function flagBadge(code, label) {
    const c = (code || '').toLowerCase();
    const colors = FLAGS[c] || FLAGS.multi;
    const labelText = (label || code || '').toString().slice(0, 2).toUpperCase();
    return `<span class="movix-flag" title="${escapeAttr(label || code || '')}" aria-label="${escapeAttr(label || code || '')}">
      <span class="movix-flag-stripes" style="background:linear-gradient(to bottom, ${colors[0]} 0 33%, ${colors[1]} 33% 66%, ${colors[2]} 66% 100%)"></span>
      <span class="movix-flag-code">${escapeHtml(labelText)}</span>
    </span>`;
  }

  function renderRawDetails(data, ctx) {
    const chevron = `<svg class="movix-raw-chevron" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`;
    return `
      <div class="movix-raw" data-open="false">
        <button type="button" class="movix-raw-summary" aria-expanded="false">${chevron}<span>Réponse brute</span></button>
        <div class="movix-raw-body">
          <div class="movix-raw-inner">
            <pre>${escapeHtml(JSON.stringify({ ctx, response: data }, null, 2))}</pre>
          </div>
        </div>
      </div>
    `;
  }

  function wireRawDetails(root) {
    root.querySelectorAll('.movix-raw').forEach((raw) => {
      const summary = raw.querySelector('.movix-raw-summary');
      const body = raw.querySelector('.movix-raw-body');
      if (!summary || !body) return;
      summary.addEventListener('click', () => {
        const isOpen = raw.getAttribute('data-open') === 'true';
        if (isOpen) {
          body.style.height = body.scrollHeight + 'px';
          requestAnimationFrame(() => {
            body.style.height = '0px';
            raw.setAttribute('data-open', 'false');
            summary.setAttribute('aria-expanded', 'false');
          });
          body.addEventListener(
            'transitionend',
            () => {
              if (raw.getAttribute('data-open') === 'false') body.style.height = '';
            },
            { once: true }
          );
        } else {
          raw.setAttribute('data-open', 'true');
          summary.setAttribute('aria-expanded', 'true');
          body.style.height = '0px';
          requestAnimationFrame(() => {
            const target = body.scrollHeight;
            body.style.height = target + 'px';
          });
          body.addEventListener(
            'transitionend',
            () => {
              if (raw.getAttribute('data-open') === 'true') body.style.height = 'auto';
            },
            { once: true }
          );
        }
      });
    });
  }

  function renderContextBlock(ctx) {
    return `
      <dl class="movix-grid">
        ${Object.entries(ctx)
          .map(
            ([k, v]) =>
              `<div class="movix-grid-row"><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(
                v == null ? '—' : String(v)
              )}</dd></div>`
          )
          .join('')}
      </dl>
    `;
  }

  function copy(text, btn) {
    if (!text) return;
    const flash = () => {
      const original = btn.innerHTML;
      btn.innerHTML = icon('check') + (btn.dataset.label || '');
      btn.classList.add('movix-btn-success');
      setTimeout(() => {
        btn.innerHTML = original;
        btn.classList.remove('movix-btn-success');
      }, 1100);
    };
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        flash();
      } catch (_) {}
      ta.remove();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(flash, fallback);
    } else {
      fallback();
    }
  }

  function guessFileName(url) {
    if (!url) return '';
    try {
      const u = new URL(url);
      const last = u.pathname.split('/').filter(Boolean).pop() || '';
      return decodeURIComponent(last);
    } catch (_) {
      return '';
    }
  }

  function formatBytes(b) {
    if (!b && b !== 0) return '—';
    const u = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let v = Number(b);
    while (v >= 1024 && i < u.length - 1) {
      v /= 1024;
      i++;
    }
    return v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2) + ' ' + u[i];
  }

  function formatDate(iso) {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso);
      return d.toLocaleString();
    } catch (_) {
      return String(iso);
    }
  }

  function formatQuality(q) {
    if (q == null) return '—';
    return '#' + q;
  }

  function formatSE(s, e) {
    if (!s && !e) return '';
    return `S${s || 0}E${e || 0}`;
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
})();
