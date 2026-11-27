/* Standalone room store script (D-038). Copied unchanged into each standalone store as shopify/src/site.js and built into
   the theme's main script. Films that play as they scroll into view, the menu, collection filters, the private shortlist
   with side-by-side comparison, and the adapter the shared Keep script reads (window.MF_SHORTLIST).
   Nothing leaves the browser: the shortlist lives in localStorage until the shopper asks for a link. */
(() => {
  'use strict';
  const S = window.MF_SITE || {};
  const KEY = 'mf-site-saved:' + (S.store || 'store');
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  let catalog = [];
  try { catalog = JSON.parse(($('#mf-site-catalog') || {}).textContent || '[]'); } catch { catalog = []; }
  const byHandle = new Map(catalog.map(p => [p.h, p]));

  /* ---- films: load and play muted when in view, pause when out; respect reduced motion and data saver ---- */
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || (navigator.connection && navigator.connection.saveData);
  function load(v) {
    if (v.dataset.mfLoaded) return;
    v.dataset.mfLoaded = '1';
    $$('source[data-src]', v).forEach(s => { s.src = s.dataset.src; });
    v.load();
  }
  const films = $$('video[data-mf-film], .mf-site__hero-media video, .mf-room__maker-media video');
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      const v = e.target;
      if (e.isIntersecting) { load(v); v.muted = true; const p = v.play(); if (p && p.catch) p.catch(() => {}); }
      else if (!v.paused) v.pause();
    }), {threshold: 0.25});
    films.forEach(v => io.observe(v));
  }
  $$('[data-mf-motion-toggle]').forEach(btn => {
    const v = document.getElementById(btn.getAttribute('aria-controls'));
    if (!v || reduce) return;
    btn.hidden = false;
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => {
      const stop = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', String(stop));
      btn.textContent = stop ? 'Play motion' : 'Pause motion';
      if (stop) v.pause(); else { load(v); v.play().catch(() => {}); }
    });
  });

  /* ---- menu (Sauna and Robotics layouts) ---- */
  [['menuToggle', 'navLinks'], ['mobileToggle', 'mobileMenu']].forEach(([b, m]) => {
    const btn = document.getElementById(b), menu = document.getElementById(m);
    if (!btn || !menu) return;
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      if (m === 'mobileMenu') menu.hidden = !open; else menu.classList.toggle('open', open);
    });
    menu.addEventListener('click', e => { if (e.target.closest('a')) { btn.setAttribute('aria-expanded', 'false'); if (m === 'mobileMenu') menu.hidden = true; else menu.classList.remove('open'); } });
  });

  /* ---- shortlist ---- */
  const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter(h => byHandle.has(h)) : []; } catch { return []; } };
  let saved = read();
  const write = () => { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch {} render(); };
  const toast = msg => { const t = $('#toast'); if (!t) return; t.textContent = msg; clearTimeout(toast.t); toast.t = setTimeout(() => { t.textContent = ''; }, 2600); };
  function toggle(h) {
    const at = saved.indexOf(h);
    if (at >= 0) saved.splice(at, 1); else saved.push(h);
    write();
    const p = byHandle.get(h);
    toast(at >= 0 ? `Removed ${p ? p.n : ''} from your shortlist` : `Saved ${p ? p.n : ''} to your shortlist`);
  }
  function render() {
    $$('[data-mf-saved-count]').forEach(el => { el.textContent = String(saved.length); });
    $$('[data-mf-save]').forEach(b => b.setAttribute('aria-pressed', String(saved.includes(b.dataset.mfSave))));
    const box = $('[data-mf-compare]'), empty = $('[data-mf-saved-empty]');
    if (!box) return;
    const items = saved.map(h => byHandle.get(h)).filter(Boolean);
    if (empty) empty.hidden = items.length > 0;
    box.hidden = !items.length;
    if (!items.length) { box.innerHTML = ''; return; }
    const root = S.root || '/';
    const row = (label, fn) => `<tr><th scope="row">${label}</th>${items.map(p => `<td>${fn(p)}</td>`).join('')}</tr>`;
    box.innerHTML = `<table><caption class="visually-hidden">Your saved pieces side by side</caption><thead><tr><th scope="col"><span class="visually-hidden">Detail</span></th>${items.map(p => `<th scope="col"><a href="${esc(root)}products/${esc(p.h)}">${esc(p.n)}</a></th>`).join('')}</tr></thead><tbody>`
      + row('Maker', p => esc(p.b)) + row('Kind', p => esc(p.k)) + row('Price snapshot', p => `${esc(p.p)}<br><small>at ${esc(p.m)}</small>`)
      + row('Key facts', p => `<ul>${p.f.map(f => `<li>${esc(f)}</li>`).join('')}</ul>`)
      + row('Merchant', p => `<a class="mf-buy mf-room__buy" href="${esc(p.u)}" target="_blank" rel="sponsored noopener" data-mf-placement="${esc(S.code || '')}" data-mf-cta="buy">${esc(String(S.buy || 'Check price at [Merchant] ↗').replace(/\[(Merchant|Dealer)\]/, p.m))}</a>`)
      + row('', p => `<button type="button" data-mf-save="${esc(p.h)}" aria-pressed="true">Remove</button>`)
      + '</tbody></table>';
  }
  document.addEventListener('click', e => {
    const save = e.target.closest('[data-mf-save]');
    if (save) { e.preventDefault(); toggle(save.dataset.mfSave); return; }
    const open = e.target.closest('[data-mf-saved-open]');
    if (open) { const target = $('#saved'); if (target) { e.preventDefault(); target.scrollIntoView({behavior: reduce ? 'auto' : 'smooth'}); } }
  });
  window.MF_SHORTLIST = {
    snapshot: () => saved.length ? {v: 1, items: saved.slice()} : null,
    restore: data => { if (data && Array.isArray(data.items)) { saved = data.items.filter(h => byHandle.has(h)); write(); } },
    open: () => { const t = $('#saved'); if (t) t.scrollIntoView(); else location.href = (S.root || '/') + '#saved'; },
    ids: () => saved.slice(),
    compare: () => { const t = $('#saved'); if (t) t.scrollIntoView(); },
  };

  /* ---- collection filters ---- */
  const grid = $('#mfPicks');
  if (grid) {
    const cards = $$('.mf-pick', grid), order = cards.slice();
    const state = {kind: '', maker: '', sort: ''};
    const makerSel = $('[data-mf-maker-select]'), sortSel = $('[data-mf-sort]'), count = $('[data-mf-count]'), none = $('[data-mf-empty]');
    function apply() {
      let shown = 0;
      const list = state.sort ? order.slice().sort((a, b) => ((+a.dataset.price || 0) - (+b.dataset.price || 0)) * (state.sort === 'asc' ? 1 : -1)) : order;
      list.forEach(el => grid.appendChild(el));
      cards.forEach(el => {
        const ok = (!state.kind || el.dataset.kind === state.kind) && (!state.maker || el.dataset.maker === state.maker);
        el.hidden = !ok; if (ok) shown++;
      });
      if (count) count.textContent = `${shown} ${shown === 1 ? 'piece' : 'pieces'}`;
      if (none) none.hidden = shown > 0;
      $$('[data-mf-kind]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mfKind === state.kind)));
      if (makerSel) makerSel.value = state.maker;
    }
    $$('[data-mf-kind]').forEach(b => b.addEventListener('click', () => { state.kind = b.dataset.mfKind; apply(); }));
    if (makerSel) makerSel.addEventListener('change', () => { state.maker = makerSel.value; apply(); });
    if (sortSel) sortSel.addEventListener('change', () => { state.sort = sortSel.value; apply(); });
    $$('[data-mf-reset]').forEach(b => b.addEventListener('click', () => { state.kind = ''; state.maker = ''; apply(); }));
    $$('[data-mf-filter-maker]').forEach(b => b.addEventListener('click', () => {
      state.maker = b.dataset.mfFilterMaker; state.kind = ''; apply();
      $('#shop').scrollIntoView({behavior: reduce ? 'auto' : 'smooth'});
    }));
    // ?model=<handle> (from a product page or a shared link) brings that piece into view.
    const model = new URLSearchParams(location.search).get('model');
    const hit = model && cards.find(el => el.dataset.mfRoomProduct === model);
    if (hit) { hit.scrollIntoView(); hit.classList.add('is-focus'); }
  }
  render();
})();
